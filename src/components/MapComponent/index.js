import React, { useRef, useEffect, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import useDocusaurusContext from "@docusaurus/useDocusaurusContext";
import styles from "./styles.module.css";

// The SPL styles are served by the API gateway, and the style it returns is not
// self-contained: its tile sources, label fonts (glyphs) and icons (sprite)
// point at an internal host. This mirrors the working SPL_Basemap_UAT.html
// viewer: rewrite those hosts back onto the gateway, send the subscription key
// only on gateway requests, and retry the gateway's HTTP 429 rate limiting.
// The gateway rejects bursts: several requests in flight at once, or even a few
// back to back, come back as HTTP 429. Measured against UAT, roughly one
// request every 250 ms is accepted, so requests are serialized with that gap
// and a 429 is retried with backoff instead of being dropped.
const MIN_INTERVAL_MS = 300;
let lastRequestAt = 0;
let chain = Promise.resolve();
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function scheduleRequest(run) {
  const paced = async () => {
    const wait = lastRequestAt + MIN_INTERVAL_MS - Date.now();
    if (wait > 0) await sleep(wait);
    lastRequestAt = Date.now();
    return run();
  };
  const result = chain.then(paced, paced);
  chain = result.then(
    () => undefined,
    () => undefined
  );
  return result;
}

async function gatewayFetch(url, init) {
  for (let attempt = 0; ; attempt += 1) {
    const response = await scheduleRequest(() => fetch(url, init));
    if (response.status !== 429 || attempt >= 5) return response;
    // The gateway does not expose Retry-After to the browser; back off instead.
    const retryAfter = Number(response.headers.get("Retry-After"));
    await sleep(
      retryAfter ? retryAfter * 1000 : Math.min(8000, 800 * 2 ** attempt) + Math.random() * 400
    );
  }
}

// MapLibre routes gateway requests through this protocol so the retries above
// apply to tiles, TileJSON, glyphs and sprites as well as the style itself.
const RETRY_PROTOCOL = "splretry";

function registerRetryProtocol() {
  maplibregl.addProtocol(RETRY_PROTOCOL, async (params, abortController) => {
    const url = params.url.replace(`${RETRY_PROTOCOL}://`, "https://");
    const response = await gatewayFetch(url, {
      headers: params.headers,
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

// Every origin the style references that is not the gateway's.
function foreignOrigins(style, gatewayOrigin) {
  const urls = [
    style.glyphs,
    ...[style.sprite].flat().map((s) => (typeof s === "string" ? s : s && s.url)),
  ];
  for (const source of Object.values(style.sources || {})) {
    urls.push(source.url, ...(source.tiles || []));
  }
  const origins = new Set();
  for (const url of urls) {
    if (typeof url !== "string" || !/^https:\/\//.test(url)) continue;
    const origin = new URL(url).origin;
    if (origin !== gatewayOrigin) origins.add(origin);
  }
  return origins;
}

function rewriteUrl(conn, url) {
  for (const origin of conn.rewrite) {
    if (url.startsWith(`${origin}/`)) return conn.root + url.slice(origin.length);
  }
  return url;
}

async function fetchJson(url, gateway) {
  const response = await gatewayFetch(url, {
    headers: { [gateway.keyHeader]: gateway.key },
  });
  if (!response.ok) {
    throw new Error(
      `The gateway returned HTTP ${response.status} for ${url.slice(0, 80)}. Check the subscription key is correct and active for this API.`
    );
  }
  return response.json();
}

// The gateway allows roughly 30 requests per window, so the style and each
// shared TileJSON are fetched once and reused across style switches: every
// style in the collection points at the same sources.
const styleCache = new Map();
const tileJsonCache = new Map();

async function loadStyle(styleUrl, gateway) {
  const cached = styleCache.get(styleUrl);
  if (cached) return cached;

  const baseUrl = new URL(gateway.base);
  const root = `${baseUrl.origin}${baseUrl.pathname.replace(/\/+$/, "")}`;
  const style = await fetchJson(styleUrl, gateway);
  const conn = {
    root,
    key: gateway.key,
    keyHeader: gateway.keyHeader,
    rewrite: foreignOrigins(style, baseUrl.origin),
  };

  // Inline each TileJSON so MapLibre requests tiles directly instead of
  // spending a request per source on the TileJSON document.
  for (const source of Object.values(style.sources || {})) {
    if (!source.url) continue;
    const tileJsonUrl = rewriteUrl(conn, source.url);
    let tileJson = tileJsonCache.get(tileJsonUrl);
    if (!tileJson) {
      tileJson = await fetchJson(tileJsonUrl, gateway);
      tileJsonCache.set(tileJsonUrl, tileJson);
    }
    source.tiles = tileJson.tiles;
    if (tileJson.minzoom !== undefined) source.minzoom = tileJson.minzoom;
    if (tileJson.maxzoom !== undefined) source.maxzoom = tileJson.maxzoom;
    delete source.url;
  }

  const entry = { style, conn };
  styleCache.set(styleUrl, entry);
  return entry;
}

export default function MapComponent({ styleUrl }) {
  const { siteConfig } = useDocusaurusContext();
  const gateway = {
    base: "https://apina.address.gov.sa/b2b-uat",
    keyHeader: "Ocp-Apim-Subscription-Key",
    key: "",
    ...(siteConfig.customFields && siteConfig.customFields.splGateway),
  };
  const mapContainer = useRef(null);
  const map = useRef(null);
  const conn = useRef(null);
  const [status, setStatus] = useState("Loading map…");

  useEffect(() => {
    const container = mapContainer.current;
    if (!container) return;

    if (!map.current) {
      registerRetryProtocol();
      // Arabic labels need the RTL plugin, set before the map is created.
      maplibregl.setRTLTextPlugin(
        "https://unpkg.com/@mapbox/mapbox-gl-rtl-text@0.3.0/dist/mapbox-gl-rtl-text.js",
        true
      );
      map.current = new maplibregl.Map({
        container,
        style: { version: 8, sources: {}, layers: [] },
        center: [46.915, 24.689],
        zoom: 6,
        // Rewrite internal-host URLs to the gateway and attach the key only to
        // gateway requests, leaving every other host untouched.
        transformRequest: (url, resourceType) => {
          const current = conn.current;
          if (!current) return { url };
          const target = rewriteUrl(current, url);
          if (!target.startsWith(current.root)) return { url: target };
          const headers = { [current.keyHeader]: current.key };
          // Sprite images bypass the custom protocol, as in the viewer.
          if (resourceType === "SpriteImage") return { url: target, headers };
          return {
            url: target.replace(/^https:\/\//, `${RETRY_PROTOCOL}://`),
            headers,
          };
        },
      });
      map.current.addControl(new maplibregl.NavigationControl(), "top-right");
      map.current.addControl(new maplibregl.ScaleControl({ unit: "metric" }), "bottom-right");
      map.current.on("error", (event) => {
        const code = event && event.error ? event.error.status : null;
        if (code === 401 || code === 403) {
          setStatus(
            `The gateway rejected map data requests (HTTP ${code}). The key works for the style but may not have access to the tile APIs.`
          );
        }
      });
      map.current.on("idle", () => setStatus(""));
    }

    if (!styleUrl) return;
    let cancelled = false;

    (async () => {
      try {
        setStatus("Loading map…");
        if (!gateway.key) {
          throw new Error(
            "No gateway key configured, so the styles cannot be loaded. See the gateway section on this page for the request flow."
          );
        }
        const entry = await loadStyle(styleUrl, gateway);
        if (cancelled) return;
        conn.current = entry.conn;
        // Pass the fetched style object so it is not requested a second time.
        map.current.setStyle(entry.style);
      } catch (error) {
        if (!cancelled) setStatus(error.message);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [styleUrl, gateway.base, gateway.key, gateway.keyHeader]);

  useEffect(
    () => () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
        conn.current = null;
      }
    },
    []
  );

  return (
    <div className={styles.mapWrapper}>
      {status ? (
        <p style={{ fontSize: "0.85rem", color: "var(--ifm-color-emphasis-700)" }}>{status}</p>
      ) : null}
      <div ref={mapContainer} className={styles.mapContainer} />
    </div>
  );
}
