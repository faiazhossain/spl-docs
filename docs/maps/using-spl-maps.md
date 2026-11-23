---
sidebar_label: "Using SPL Maps in JavaScript"
sidebar_position: 2
---

<head>
  <title>Using SPL Maps in JavaScript</title>
</head>

# Using SPL Maps in JavaScript

This guide shows how to add an SPL map to a web page with [MapLibre GL JS](https://maplibre.org/maplibre-gl-js/docs/). The map is loaded through the SPL API gateway, so every request carries your API key.

## Before you start

You need these settings, all from [API Keys & Authentication](/docs/docs/maps/api-keys):

| Setting | Value |
| --- | --- |
| Gateway base URL | `{{gatewayBase}}` |
| Header that carries the key | `{{gatewayKeyHeader}}` |
| Your API key | issued to you by the SPL team |
| A website the gateway permits | required for a page that runs in a browser, see [Using the key in a browser](#using-the-key-in-a-browser) |

## Complete example

Save this as `index.html` and replace `YOUR_API_KEY` with your key. The page needs an internet connection, because MapLibre GL JS and the map itself are loaded from the network.

The browser calls the gateway directly, so the page has to be served from a website that the gateway permits. A copy opened from disk, or a page on a website that is not permitted, is blocked by the browser. If you are not sure whether your website is permitted, see [Using the key in a browser](#using-the-key-in-a-browser) below.

```html title="index.html"
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>SPL Maps example</title>
    <link href="https://unpkg.com/maplibre-gl@5.24.1/dist/maplibre-gl.css" rel="stylesheet" />
    <style>
      html, body { margin: 0; height: 100%; }
      #map { position: absolute; inset: 0; }
      #status { position: absolute; top: 10px; left: 10px; z-index: 1; padding: 6px 10px; background: rgba(255, 255, 255, 0.9); font: 13px/1.4 system-ui, sans-serif; }
    </style>
  </head>
  <body>
    <div id="map"></div>
    <div id="status">Loading map…</div>

    <script src="https://unpkg.com/maplibre-gl@5.24.1/dist/maplibre-gl.js"></script>
    <script>
      // 1. Your settings: the gateway, the style and your API key.
      const GATEWAY = "{{gatewayBase}}";
      const STYLE_ID = "spl_bgmaps"; // spl_bgmaps, spl_dark or spl_satellite, with _en or _ar for one label language
      const KEY_HEADER = "Ocp-Apim-Subscription-Key";
      const API_KEY = "YOUR_API_KEY";

      // 2. Gateway requests: authenticated, sent one at a time and retried on 429.
      const MIN_INTERVAL_MS = 300;
      const MAX_RETRIES = 5;
      let lastRequestAt = 0;
      let queue = Promise.resolve();
      const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

      function enqueue(run) {
        const result = queue.then(async () => {
          await sleep(Math.max(0, lastRequestAt + MIN_INTERVAL_MS - Date.now()));
          lastRequestAt = Date.now();
          return run();
        });
        queue = result.then(() => undefined, () => undefined);
        return result;
      }

      async function gatewayFetch(url) {
        for (let attempt = 0; ; attempt += 1) {
          const response = await enqueue(() => fetch(url, { headers: { [KEY_HEADER]: API_KEY } }));
          if (response.status !== 429 || attempt >= MAX_RETRIES) return response;
          const retryAfter = Number(response.headers.get("Retry-After"));
          await sleep(retryAfter ? retryAfter * 1000 : 500 * 2 ** attempt);
        }
      }

      async function gatewayJson(url) {
        const response = await gatewayFetch(url);
        const body = await response.json().catch(() => null);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status} for ${url}${body && body.message ? `: ${body.message}` : ""}`);
        }
        return body;
      }

      // 3. MapLibre loads tiles, fonts and icons itself. This protocol makes
      //    those requests use gatewayFetch, so they are authenticated and retried.
      maplibregl.addProtocol("splretry", async (params) => {
        // The gateway's own scheme (https:) is used for the real request.
        const response = await gatewayFetch(params.url.replace("splretry://", `${new URL(GATEWAY).protocol}//`));
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        if (params.type === "json") return { data: await response.json() };
        return { data: await response.arrayBuffer() };
      });

      async function main() {
        // Arabic and bilingual styles need the RTL text plugin, before any map exists.
        maplibregl.setRTLTextPlugin(
          "https://unpkg.com/@mapbox/mapbox-gl-rtl-text@0.3.0/dist/mapbox-gl-rtl-text.js",
          true
        );

        // 4. Load the style once, and note every host it refers to that is not the gateway.
        const style = await gatewayJson(`${GATEWAY}/styles/${STYLE_ID}/style.json`);
        const gatewayOrigin = new URL(GATEWAY).origin;
        const referenced = [
          style.glyphs,
          ...[style.sprite].flat().map((sprite) => (typeof sprite === "string" ? sprite : sprite && sprite.url)),
          ...Object.values(style.sources).flatMap((source) => [source.url, ...(source.tiles || [])]),
        ];
        const internal = new Set(
          referenced
            .filter((url) => typeof url === "string" && /^https?:\/\//.test(url))
            .map((url) => new URL(url).origin)
            .filter((origin) => origin !== gatewayOrigin)
        );

        // 5. Create the map. Requests to the gateway get the key and go through
        //    the protocol above; requests to other hosts are left untouched.
        const map = new maplibregl.Map({
          container: "map",
          style,
          center: [46.6753, 24.7136], // Riyadh
          zoom: 10,
          transformRequest: (url, resourceType) => {
            let target = url;
            for (const origin of internal) {
              if (url.startsWith(`${origin}/`)) target = GATEWAY + url.slice(origin.length);
            }
            if (!target.startsWith(GATEWAY)) return { url: target };
            const headers = { [KEY_HEADER]: API_KEY };
            // Icon images are decoded by the browser and cannot use the protocol.
            if (resourceType === "SpriteImage") return { url: target, headers };
            return { url: target.replace(/^https?:\/\//, "splretry://"), headers };
          },
        });
        map.addControl(new maplibregl.NavigationControl(), "top-right");
        map.addControl(new maplibregl.ScaleControl({ unit: "metric" }), "bottom-right");

        const status = document.getElementById("status");
        let failed = false;
        map.on("idle", () => {
          if (!failed) status.hidden = true;
        });
        map.on("error", (event) => {
          failed = true;
          status.hidden = false;
          status.textContent = `A map request failed: ${event.error && event.error.message ? event.error.message : "unknown error"}`;
        });
      }

      main().catch((error) => {
        document.getElementById("status").textContent = error.message;
      });
    </script>
  </body>
</html>
```

## How it works

Loading a map through the gateway takes five steps. They are the same in every framework.

1. **Settings.** The gateway base URL, the style ID, the header name and your key. Load the key from an environment variable of your build tool instead of typing it into the page.

2. **Gateway requests.** One helper sends every request with the key in the header. The gateway rate-limits bursts with `429`, so the helper sends one request at a time with a short gap, and retries a `429` up to five times with a growing delay. It uses the `Retry-After` header when the gateway sends one.

3. **A protocol for the map's own requests.** MapLibre downloads tiles, label fonts and icons by itself, so those requests cannot go through the helper directly. Registering a protocol named `splretry` lets the map use `gatewayFetch` for them.

4. **Load the style once.** The style is fetched from `{gateway}/styles/{styleId}/style.json`. The style that the gateway returns is not self-contained: its tiles, fonts and icons point at an internal host that is not reachable from the internet. The example collects every host in the style that is not the gateway, so those addresses can be mapped back onto the gateway. Without this step the style loads and the map stays blank.

5. **Create the map.** `transformRequest` sees every URL the map asks for. Addresses on the internal host are rewritten onto the gateway. Requests to the gateway get the key and use the `splretry` protocol; requests to any other host, such as the CDN for MapLibre, are left untouched.

The style object is passed to the map instead of its URL, so the style is requested only once.

## Using the code in a project

The functions `enqueue`, `gatewayFetch`, `gatewayJson` and the protocol are plain JavaScript. Install MapLibre GL JS with your package manager and move them into a module:

```bash
npm install maplibre-gl
```

```javascript
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { createSplMap } from "./splGateway"; // the functions from the example

createSplMap("map", {
  gateway: "{{gatewayBase}}",
  styleId: "spl_bgmaps",
  keyHeader: "Ocp-Apim-Subscription-Key",
  apiKey: import.meta.env.VITE_SPL_API_KEY, // example for Vite: set VITE_SPL_API_KEY in your environment
});
```

The example above uses Vite's `import.meta.env`. Use whatever your build tool provides to read an environment variable, such as `process.env.REACT_APP_SPL_API_KEY` for Create React App.

## Available map styles

Three style families are available. Each comes in a bilingual version with labels in English and Arabic, and in an English-only (`_en`) and an Arabic-only (`_ar`) version.

| Style | Bilingual | English | Arabic |
| --- | --- | --- | --- |
| **SPL Light Maps**: a clean base map for data visualization | `{{gatewayBase}}/styles/spl_bgmaps/style.json` | `{{gatewayBase}}/styles/spl_bgmaps_en/style.json` | `{{gatewayBase}}/styles/spl_bgmaps_ar/style.json` |
| **SPL Dark**: a dark theme for night mode and dark interfaces | `{{gatewayBase}}/styles/spl_dark/style.json` | `{{gatewayBase}}/styles/spl_dark_en/style.json` | `{{gatewayBase}}/styles/spl_dark_ar/style.json` |
| **SPL Satellite**: satellite imagery | `{{gatewayBase}}/styles/spl_satellite/style.json` | `{{gatewayBase}}/styles/spl_satellite_en/style.json` | `{{gatewayBase}}/styles/spl_satellite_ar/style.json` |

To switch style, load the other style with `gatewayJson` and pass it to `map.setStyle()`. The internal host is the same for all styles, so the rewriting in `transformRequest` keeps working.

## Adding markers and popups

Markers and popups are added after the map has loaded. In the example, put this code inside `main()` after the map is created:

```javascript
new maplibregl.Marker({ color: "#FF0000" })
  .setLngLat([46.6753, 24.7136])
  .setPopup(new maplibregl.Popup().setHTML("<h3>Riyadh</h3>"))
  .addTo(map);
```

## Arabic text

Bilingual and Arabic-only styles need the RTL text plugin. The example sets it with `maplibregl.setRTLTextPlugin()` before the map is created. Without it, Arabic labels appear reversed. See [Arabic Text Support (RTL Plugin)](/docs/docs/maps/rtl-text-support).

## If the map does not load

The message on the page tells you what the gateway answered. The table in [API Keys & Authentication](/docs/docs/maps/api-keys) lists every message with its fix. The three common cases:

| What you see | Cause |
| --- | --- |
| `Failed to fetch`, and no status code | The browser blocked the request. The page is not served from a website that the gateway permits, or you have no connection. See [Using the key in a browser](#using-the-key-in-a-browser). |
| `HTTP 401 ... missing subscription key` or `invalid subscription key` | The key is not sent, or it is not valid. Check the header name and the key. |
| `HTTP 403 ... Out of call volume quota` | The key is valid, but its call volume quota is used up. The message says when it is replenished. |
| The style loads and the map stays blank | The addresses inside the style are not rewritten onto the gateway, or the tiles do not get the key. |

## Using the key in a browser

A browser only lets a web page call the gateway when the gateway permits the website the page is on. The permitted websites are configured on the gateway. If your website is not permitted, contact the SPL team and give them its address. An address used for local testing, such as `http://localhost:3000`, has to be permitted as well.

To avoid this, call the gateway from your backend instead. The page then calls your backend on the same website, and your backend adds the key. This also keeps the key out of the page.

## Best Practices

1. **Keep the key out of source control**: load it from an environment variable, or call the gateway from your backend when the key must stay secret.
2. **Load the style once**: request the style when the page starts and reuse the object. Every request counts against the quota of the key.
3. **Pace the requests and retry a `429`**: many requests at once are answered with `429`.
4. **Clean up**: when the page or component that shows the map goes away, call `map.remove()`.

## Next Steps

- See the map without writing code: [HTML Map Viewer](/docs/docs/maps/html-map-viewer)
- Add the map to a mobile app: [React Native](/docs/docs/maps/react-native)
- Use the map in GIS software: [ArcGIS & QGIS Integration](/docs/docs/maps/arcgis-qgis-integration)
- Look up the other APIs: [API reference](/docs/api)
- Learn more about MapLibre: [MapLibre Resources](/docs/docs/maps/maplibre-resources)
