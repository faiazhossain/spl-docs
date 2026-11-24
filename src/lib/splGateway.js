// Loading SPL map styles through the API gateway, for the demo map on this
// site. The guides under docs/maps describe the same protocol in plain
// JavaScript; keep the two in step.
//
// The gateway serves a style whose tiles, label fonts (glyphs) and icons
// (sprite) point at an internal host, so those URLs must be rewritten back
// onto the gateway, and every gateway request must carry the subscription key.
// The gateway also rejects bursts (HTTP 429), so requests are paced and a 429
// is retried with backoff instead of being dropped.

export const MIN_INTERVAL_MS = 300;
export const MAX_RETRIES = 5;

let lastRequestAt = 0;
let chain = Promise.resolve();
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Runs gateway requests one at a time, with a minimum gap between two of them.
export function paced(run) {
  const task = async () => {
    const wait = lastRequestAt + MIN_INTERVAL_MS - Date.now();
    if (wait > 0) await sleep(wait);
    lastRequestAt = Date.now();
    return run();
  };
  const result = chain.then(task, task);
  chain = result.then(
    () => undefined,
    () => undefined
  );
  return result;
}

// fetch() that always sends the key and retries an HTTP 429 with backoff.
export async function gatewayFetch(url, connection, init = {}) {
  for (let attempt = 0; ; attempt += 1) {
    const response = await paced(() =>
      fetch(url, {
        ...init,
        headers: { ...(init.headers || {}), [connection.keyHeader]: connection.key },
      })
    );
    if (response.status !== 429 || attempt >= MAX_RETRIES) return response;
    // Honour Retry-After when the gateway exposes it; back off otherwise.
    const retryAfter = Number(response.headers.get("Retry-After"));
    await sleep(
      retryAfter ? retryAfter * 1000 : Math.min(8000, 800 * 2 ** attempt) + Math.random() * 400
    );
  }
}

// Turns a gateway response into a message the reader can act on. The gateway
// answers with JSON, e.g. { "statusCode": 401, "message": "..." }.
export async function describeGatewayError(response, what) {
  const status = response.status;
  let message = "";
  try {
    message = (await response.json()).message || "";
  } catch {
    // Not JSON: fall through to the status code alone.
  }
  if (status === 401) {
    return `${what} was rejected (HTTP 401): the subscription key is missing or not valid.`;
  }
  if (status === 403) {
    const replenish = /replenished in ([\d:]+)/.exec(message);
    if (replenish) {
      return `${what} was refused (HTTP 403): the subscription key has used up its call volume quota. The gateway replenishes it in ${replenish[1]} (HH:MM:SS).`;
    }
    return `${what} was refused (HTTP 403).${message ? ` ${message}` : ""}`;
  }
  if (status === 404) {
    return `${what} was not found (HTTP 404). Check the gateway base URL and the style ID.`;
  }
  if (status === 429) {
    return `${what} is being rate limited (HTTP 429). Wait a minute and reload the page.`;
  }
  if (status >= 500) {
    return `${what} failed with a server error (HTTP ${status}). Try again later.`;
  }
  return `${what} failed (HTTP ${status}).${message ? ` ${message}` : ""}`;
}

// Every origin the style references that is not the gateway's.
export function foreignOrigins(style, gatewayOrigin) {
  const urls = [
    style.glyphs,
    ...[style.sprite].flat().map((sprite) => (typeof sprite === "string" ? sprite : sprite && sprite.url)),
  ];
  for (const source of Object.values(style.sources || {})) {
    urls.push(source.url, ...(source.tiles || []));
  }
  const origins = new Set();
  for (const url of urls) {
    if (typeof url !== "string" || !/^https?:\/\//.test(url)) continue;
    const origin = new URL(url).origin;
    if (origin !== gatewayOrigin) origins.add(origin);
  }
  return origins;
}

export function rewriteUrl(connection, url) {
  for (const origin of connection.rewrite) {
    if (!url.startsWith(`${origin}/`)) continue;
    const target = new URL(connection.root + url.slice(origin.length));
    // The gateway styles embed an expired key in a `key=` query parameter, and
    // the gateway validates that value before the header, so it has to go.
    target.searchParams.delete("key");
    return target.toString();
  }
  return url;
}

async function fetchGatewayJson(url, connection, what) {
  let response;
  try {
    response = await gatewayFetch(url, connection);
  } catch (error) {
    throw new Error(
      `${what}: the gateway did not answer (${error.message}). Check the gateway base URL and your connection.`
    );
  }
  if (!response.ok) throw new Error(await describeGatewayError(response, what));
  return response.json();
}

// Loads a style from the gateway and prepares everything the map needs.
// Styles and their shared TileJSON documents are cached, so switching between
// styles does not spend requests on them again.
const styleCache = new Map();
const tileJsonCache = new Map();

export async function loadGatewayStyle(styleUrl, gateway) {
  const cached = styleCache.get(styleUrl);
  if (cached) return cached;

  const baseUrl = new URL(gateway.base);
  const root = `${baseUrl.origin}${baseUrl.pathname.replace(/\/+$/, "")}`;
  const style = await fetchGatewayJson(styleUrl, gateway, "The style");
  const connection = {
    root,
    key: gateway.key,
    keyHeader: gateway.keyHeader,
    rewrite: foreignOrigins(style, baseUrl.origin),
  };

  // Inline each TileJSON document so the map requests tiles directly instead
  // of spending a request per source on the TileJSON document.
  for (const source of Object.values(style.sources || {})) {
    if (!source.url) continue;
    const tileJsonUrl = rewriteUrl(connection, source.url);
    let tileJson = tileJsonCache.get(tileJsonUrl);
    if (!tileJson) {
      tileJson = await fetchGatewayJson(tileJsonUrl, gateway, "The map data (TileJSON)");
      tileJsonCache.set(tileJsonUrl, tileJson);
    }
    source.tiles = tileJson.tiles;
    if (tileJson.minzoom !== undefined) source.minzoom = tileJson.minzoom;
    if (tileJson.maxzoom !== undefined) source.maxzoom = tileJson.maxzoom;
    if (tileJson.attribution !== undefined) source.attribution = tileJson.attribution;
    delete source.url;
  }

  const entry = { style, connection };
  styleCache.set(styleUrl, entry);
  return entry;
}

// MapLibre fetches tiles, fonts and sprites itself. The active connection is
// kept here so the protocol handler below can authenticate those requests.
const RETRY_SCHEME = "splretry";
let protocolRegistered = false;

export function registerRetryProtocol(maplibregl, getConnection) {
  if (protocolRegistered) return;
  protocolRegistered = true;
  maplibregl.addProtocol(RETRY_SCHEME, async (params, abortController) => {
    const connection = getConnection();
    const url = params.url.replace(`${RETRY_SCHEME}://`, "https://");
    const response = await gatewayFetch(url, connection, {
      headers: { ...(params.headers || {}), [connection.keyHeader]: connection.key },
      signal: abortController.signal,
    });
    if (!response.ok) {
      throw Object.assign(new Error(`${response.status} ${url}`), {
        status: response.status,
        url,
      });
    }
    if (params.type === "json") return { data: await response.json() };
    if (params.type === "string") return { data: await response.text() };
    return { data: await response.arrayBuffer() };
  });
}

// Gives a request to MapLibre: rewritten onto the gateway, with the key, and
// routed through the retry protocol. Requests to any other host are untouched.
export function transformGatewayRequest(connection, url, resourceType) {
  if (!connection) return { url };
  const target = rewriteUrl(connection, url);
  if (!target.startsWith(connection.root)) return { url: target };
  const headers = { [connection.keyHeader]: connection.key };
  // Sprite images are decoded by the browser and bypass the custom protocol.
  if (resourceType === "SpriteImage") return { url: target, headers };
  return {
    url: target.replace(/^https?:\/\//, `${RETRY_SCHEME}://`),
    headers,
  };
}
