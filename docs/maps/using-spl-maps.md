---
sidebar_label: " SPL Maps in JavaScript"
sidebar_position: 1
---

<head>
  <title>SPL Maps in JavaScript</title>
</head>

# Using SPL Maps in JavaScript Projects

This guide explains how to integrate VNG Solutions SPL maps into your JavaScript applications.

## Installation

First, install MapLibre GL JS in your project:

```bash
# Using npm
npm install maplibre-gl

# Using yarn
yarn add maplibre-gl
```

Make sure to include the MapLibre CSS in your HTML or import it in your JS file:

```html
<link
  href="https://unpkg.com/maplibre-gl@3.x/dist/maplibre-gl.css"
  rel="stylesheet"
/>
```

Or in JavaScript/TypeScript:

```javascript
import "maplibre-gl/dist/maplibre-gl.css";
```

## Available Map Styles

VNG Solutions provides three different map styles, each available in three language variants:

### Language Variants

Each map style is available in three language options:

1. **Bilingual (Default)**: Labels displayed in both English and Arabic
2. **English Only**: Labels displayed in English only (add `_en` suffix)
3. **Arabic Only**: Labels displayed in Arabic only (add `_ar` suffix)

### Map Style URLs

1. **SPL Background Maps**: A clean base map with subtle colors

   - Bilingual: `https://na-maps.vng-solutions.com/styles/spl_bgmaps/style.json`
   - English: `https://na-maps.vng-solutions.com/styles/spl_bgmaps_en/style.json`
   - Arabic: `https://na-maps.vng-solutions.com/styles/spl_bgmaps_ar/style.json`

2. **SPL Dark**: A dark-themed map for night mode or dark interfaces

   - Bilingual: `https://na-maps.vng-solutions.com/styles/spl_dark/style.json`
   - English: `https://na-maps.vng-solutions.com/styles/spl_dark_en/style.json`
   - Arabic: `https://na-maps.vng-solutions.com/styles/spl_dark_ar/style.json`

3. **SPL Satellite**: Satellite imagery
   - Bilingual: `https://na-maps.vng-solutions.com/styles/spl_satellite/style.json`
   - English: `https://na-maps.vng-solutions.com/styles/spl_satellite_en/style.json`
   - Arabic: `https://na-maps.vng-solutions.com/styles/spl_satellite_ar/style.json`

## Basic Map Integration

Here's a simple example of how to add an SPL map to your web application:

```javascript
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

// Initialize the map when the page loads
document.addEventListener("DOMContentLoaded", () => {
  const map = new maplibregl.Map({
    container: "map", // container ID
    style: "https://na-maps.vng-solutions.com/styles/spl_bgmaps/style.json", // style URL
    center: [46.915, 24.689], // starting position [lng, lat]
    zoom: 9, // starting zoom
  });

  // Add navigation controls (zoom buttons, rotation, etc.)
  map.addControl(new maplibregl.NavigationControl(), "top-right");

  // Add scale control
  map.addControl(new maplibregl.ScaleControl(), "bottom-right");
});
```

Don't forget to add a container element to your HTML:

```html
<div id="map" style="width: 100%; height: 500px;"></div>
```

## HTML Implementation Example

For a quick start with HTML, here's a complete example of how to implement SPL Maps in a standalone HTML file:

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>SPL Maps Example</title>
    <!-- Add MapLibre GL CSS -->
    <link
      href="https://unpkg.com/maplibre-gl@3.x/dist/maplibre-gl.css"
      rel="stylesheet"
    />
    <style>
      body {
        margin: 0;
        padding: 0;
      }
      #map {
        position: absolute;
        top: 0;
        bottom: 0;
        width: 100%;
      }
    </style>
  </head>
  <body>
    <div id="map"></div>

    <!-- Add MapLibre GL JS -->
    <script src="https://unpkg.com/maplibre-gl@3.x/dist/maplibre-gl.js"></script>
    <script>
      // Initialize the map when the page loads
      document.addEventListener("DOMContentLoaded", () => {
        const map = new maplibregl.Map({
          container: "map", // container ID
          style:
            "https://na-maps.vng-solutions.com/styles/spl_bgmaps/style.json", // style URL
          center: [46.915, 24.689], // starting position [lng, lat]
          zoom: 9, // starting zoom
        });

        // Add navigation controls (zoom buttons, rotation, etc.)
        map.addControl(new maplibregl.NavigationControl(), "top-right");

        // Add scale control
        map.addControl(new maplibregl.ScaleControl(), "bottom-right");
      });
    </script>
  </body>
</html>
```

This example shows:

- How to include MapLibre GL JS from CDN
- Basic styling to make the map take up the full viewport
- Initializing the map with SPL background map style
- Adding navigation and scale controls

You can save this code as an HTML file and open it directly in a browser to see the map in action.

## Adding Markers and Popups

Enhance your maps with markers and popups:

```javascript
import maplibregl from "maplibre-gl";

const map = new maplibregl.Map({
  container: "map",
  style: "https://na-maps.vng-solutions.com/styles/spl_bgmaps/style.json",
  center: [46.915, 24.689],
  zoom: 9,
});

// Add a marker
const marker = new maplibregl.Marker({
  color: "#FF0000",
  draggable: true,
})
  .setLngLat([46.915, 24.689])
  .addTo(map);

// Add a popup
const popup = new maplibregl.Popup({ closeOnClick: false })
  .setLngLat([46.915, 24.689])
  .setHTML("<h3>New York City</h3><p>The city that never sleeps</p>")
  .addTo(map);

// Add a popup to a marker
const markerWithPopup = new maplibregl.Marker()
  .setLngLat([46.915, 24.689])
  .setPopup(new maplibregl.Popup().setHTML("<h3>Empire State Building</h3>"))
  .addTo(map);
```

## Arabic Text Support

When using bilingual or Arabic-only map styles, you need to enable the RTL (Right-to-Left) text plugin for proper Arabic text rendering. Without it, Arabic text will appear reversed and unreadable.

For detailed instructions on implementing RTL support, see our [Arabic Text Support (RTL Plugin) guide](/docs/docs/maps/rtl-text-support).

## Best Practices

1. **Handle Map Loading**: Always check if the map has loaded before adding layers or markers.

   ```javascript
   map.on("load", () => {
     // Add layers, markers, etc. here
   });
   ```

2. **Clean Up Resources**: When using with frameworks like React or Vue, make sure to clean up the map instance when the component is unmounted.

3. **Responsive Design**: Make your map container responsive to different screen sizes:

   ```css
   .map-container {
     width: 100%;
     height: 50vh; /* 50% of viewport height */
     min-height: 300px;
   }
   ```

4. **Error Handling**: Implement error handling for map loading:
   ```javascript
   map.on("error", (e) => {
     console.error("Map error:", e.error);
     // Display a user-friendly message
   });
   ```

## Additional Resources

- [Arabic Text Support (RTL Plugin)](/docs/maps/rtl-text-support)
- [MapLibre GL JS Documentation](https://maplibre.org/maplibre-gl-js/docs/)
- [MapLibre Examples](https://maplibre.org/maplibre-gl-js/docs/examples/)

## Need Help?

If you encounter any issues or have questions about using SPL maps, please contact our support team.
