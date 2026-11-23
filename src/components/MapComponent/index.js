import React, { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import useDocusaurusContext from "@docusaurus/useDocusaurusContext";
import styles from "./styles.module.css";
import {
  loadGatewayStyle,
  registerRetryProtocol,
  transformGatewayRequest,
} from "@site/src/lib/splGateway";

// Arabic and bilingual styles need the RTL text plugin, set before any map exists.
const RTL_TEXT_PLUGIN =
  "https://unpkg.com/@mapbox/mapbox-gl-rtl-text@0.3.0/dist/mapbox-gl-rtl-text.js";

// Draws one SPL style. Which server the map comes from is a build setting:
// either a display-only style server, or the gateway itself using the key.
export default function MapComponent({ styleId }) {
  const { siteConfig } = useDocusaurusContext();
  const fields = siteConfig.customFields || {};
  const gateway = fields.splGateway || {};
  const preview = fields.splPreview || {};

  const mapContainer = useRef(null);
  const map = useRef(null);
  const connection = useRef(null);
  const [status, setStatus] = useState({ state: "loading", message: "Loading map…" });

  useEffect(() => {
    const container = mapContainer.current;
    if (!container) return;

    if (!map.current) {
      registerRetryProtocol(maplibregl, () => connection.current);
      maplibregl.setRTLTextPlugin(RTL_TEXT_PLUGIN, true);
      map.current = new maplibregl.Map({
        container,
        style: { version: 8, sources: {}, layers: [] },
        center: [46.6753, 24.7136], // Riyadh
        zoom: 10,
        // Rewrite internal-host URLs onto the gateway and attach the key only
        // to gateway requests; other hosts are left untouched.
        transformRequest: (url, resourceType) =>
          transformGatewayRequest(connection.current, url, resourceType),
      });
      map.current.addControl(new maplibregl.NavigationControl(), "top-right");
      map.current.addControl(new maplibregl.ScaleControl({ unit: "metric" }), "bottom-right");
      map.current.on("error", (event) => {
        const error = event && event.error;
        const code = error && error.status;
        if (code === 401 || code === 403) {
          setStatus({
            state: "error",
            message: `The gateway rejected a map data request (HTTP ${code}). The key loads the style but may not have access to the tile, font or icon APIs, or its call volume quota is used up.`,
          });
        } else if (code) {
          setStatus({ state: "error", message: `A map request failed (HTTP ${code}).` });
        }
      });
      map.current.on("idle", () => setStatus({ state: "ready", message: "" }));
    }

    if (!styleId) return;
    let cancelled = false;
    const currentMap = map.current;

    (async () => {
      setStatus({ state: "loading", message: "Loading map…" });
      try {
        if (preview.base) {
          // Display-only source: its style is self-contained, nothing to rewrite.
          const response = await fetch(`${preview.base}/styles/${styleId}/style.json`);
          if (!response.ok) {
            throw new Error(`The style "${styleId}" could not be loaded (HTTP ${response.status}).`);
          }
          if (cancelled) return;
          connection.current = null;
          currentMap.setStyle(await response.json());
        } else {
          if (!gateway.key) {
            throw new Error(
              "This site was built without a gateway key, so the map cannot be loaded. See API Keys & Authentication for how your own application sends its key."
            );
          }
          const entry = await loadGatewayStyle(
            `${gateway.base}/styles/${styleId}/style.json`,
            gateway
          );
          if (cancelled) return;
          connection.current = entry.connection;
          currentMap.setStyle(entry.style);
        }
      } catch (error) {
        if (!cancelled) setStatus({ state: "error", message: error.message });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [styleId, preview.base, gateway.base, gateway.key, gateway.keyHeader]);

  useEffect(
    () => () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
        connection.current = null;
      }
    },
    []
  );

  return (
    <div className={styles.mapWrapper} data-map-state={status.state} data-map-message={status.message}>
      {status.state !== "ready" ? (
        <p
          className={status.state === "error" ? styles.mapError : styles.mapStatus}
          role={status.state === "error" ? "alert" : undefined}
        >
          {status.message}
        </p>
      ) : null}
      <div ref={mapContainer} className={styles.mapContainer} />
    </div>
  );
}
