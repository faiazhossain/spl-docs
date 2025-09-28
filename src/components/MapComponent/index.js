import React, { useRef, useEffect, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import styles from "./styles.module.css";

export default function MapComponent({ styleUrl }) {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const [lng] = useState(46.915);
  const [lat] = useState(24.689);
  const [zoom] = useState(6);

  useEffect(() => {
    if (map.current) return;

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: styleUrl,
      center: [lng, lat],
      zoom: zoom,
    });

    map.current.addControl(new maplibregl.NavigationControl(), "top-right");
    map.current.addControl(new maplibregl.ScaleControl(), "bottom-right");

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, [styleUrl, lng, lat, zoom]);

  // Update the map style when styleUrl changes
  useEffect(() => {
    if (map.current && styleUrl) {
      map.current.setStyle(styleUrl);
    }
  }, [styleUrl]);

  return (
    <div className={styles.mapWrapper}>
      <div ref={mapContainer} className={styles.mapContainer} />
    </div>
  );
}
