---
sidebar_label: "MapLibre Resources"
sidebar_position: 5
---

<head>
  <title>MapLibre Resources - Learn MapLibre GL JS</title>
</head>

# MapLibre Resources

SPL Maps styles are rendered with **MapLibre GL JS**, an open-source mapping library. Because your SPL style URL is a standard MapLibre `style.json`, every feature, API method, and example in the official MapLibre documentation works directly with your SPL Maps integration.

This page gathers the official MapLibre resources so you can go beyond the basics covered in [Using SPL Maps in JavaScript](/docs/maps/using-spl-maps).

:::note SPL Maps and MapLibre
The SPL map style URL you pass to `new maplibregl.Map({ style })` is fully compatible with MapLibre GL JS. Anything you learn from the official MapLibre docs applies to SPL Maps without modification.
:::

## Official Documentation

These are the primary references you will return to throughout development:

| Resource | What it covers |
| --- | --- |
| [MapLibre GL JS Docs](https://maplibre.org/maplibre-gl-js/docs/) | The entry point: installation, concepts, and all reference sections. |
| [API Reference](https://maplibre.org/maplibre-gl-js/docs/API/) | Complete reference for the `Map`, `Marker`, `Popup`, and `NavigationControl` classes and every method. |
| [Examples Gallery](https://maplibre.org/maplibre-gl-js/docs/examples/) | Live, editable examples. The fastest way to learn any feature. |
| [Style Specification](https://maplibre.org/maplibre-style-spec/) | The schema behind every `style.json`: sources, layers, expressions, and paint/layout properties. |
| [Guides](https://maplibre.org/maplibre-gl-js/docs/guides/) | Topic-based walkthroughs for common tasks. |
| [Plugins](https://maplibre.org/maplibre-gl-js/docs/plugins/) | Officially listed extensions, including framework bindings. |

## Recommended Learning Path

If you are new to MapLibre, follow this order:

1. **Scan the [Examples Gallery](https://maplibre.org/maplibre-gl-js/docs/examples/)** — find a feature you need (markers, layers, drawing) and start from a working example.
2. **Read the [API Reference](https://maplibre.org/maplibre-gl-js/docs/API/)** for the [`Map`](https://maplibre.org/maplibre-gl-js/docs/API/classes/Map/) class — it covers events, methods, and the map lifecycle.
3. **Learn the [Style Specification](https://maplibre.org/maplibre-style-spec/)** to control layers, filters, and expressions. This is how you style data on the map.
4. **Browse [Plugins](https://maplibre.org/maplibre-gl-js/docs/plugins/)** when you need extra capabilities such as drawing tools or geocoding controls.

## Going Further by Topic

### Layers & Data Sources

How to display data on the map.

- [Add a GeoJSON source](https://maplibre.org/maplibre-gl-js/docs/examples/geojson-line/) — render lines and shapes from GeoJSON.
- [Vector tile sources](https://maplibre.org/maplibre-style-spec/sources/#vector) — from the style specification.
- [Raster sources](https://maplibre.org/maplibre-style-spec/sources/#raster) — imagery and raster tiles.

### Markers, Popups & Controls

- [Add a marker](https://maplibre.org/maplibre-gl-js/docs/examples/add-a-marker/) and [attach a popup to a marker](https://maplibre.org/maplibre-gl-js/docs/examples/attach-a-popup-to-a-marker-instance/).
- [Navigation, scale, and other controls](https://maplibre.org/maplibre-gl-js/docs/API/classes/NavigationControl/).

### Expressions & Styling

- [Data-driven styling with expressions](https://maplibre.org/maplibre-style-spec/expressions/) — the key to dynamic styling.
- [Style circles by category](https://maplibre.org/maplibre-gl-js/docs/examples/style-circles-category/) — a practical example.

### Authoring Map Styles

- [Maputnik](https://maplibre.org/maputnik) — a free, visual style editor for creating and editing `style.json` files. Useful if you want to customize an SPL style.

## Framework Integrations

MapLibre GL JS works in any JavaScript framework. The [Plugins page](https://maplibre.org/maplibre-gl-js/docs/plugins/) lists maintained bindings:

- **React** — [react-map-gl](https://visgl.github.io/react-map-gl/) (supports MapLibre GL).
- **Angular** — [ngx-maplibre-gl](https://github.com/maplibre/ngx-maplibre-gl) (maintained by the MapLibre org).
- **Vue** — [@indoorequal/vue-maplibre-gl](https://github.com/indoorequal/vue-maplibre-gl).
- **Svelte** — [svelte-maplibre-gl](https://github.com/MIERUNE/svelte-maplibre-gl).

For React Native (iOS and Android), see our [React Native guide](/docs/maps/react-native), which is built on [@maplibre/maplibre-react-native](https://maplibre.org/maplibre-react-native/).

## Community & Ecosystem

- [MapLibre on GitHub](https://github.com/maplibre) — source code, issues, and discussions.
- [Awesome MapLibre](https://github.com/maplibre/awesome-maplibre) — a curated list of libraries, tools, and resources.
- [Made with MapLibre](https://madewithmaplibre.com/) — projects built on MapLibre.
- [MapLibre GL JS Projects](https://maplibre.org/projects/gl-js/) — the official project showcase.

## Related SPL Maps Documentation

- [Using SPL Maps in JavaScript](/docs/maps/using-spl-maps)
- [Arabic Text Support (RTL)](/docs/maps/rtl-text-support)
- [React Native Guide](/docs/maps/react-native)
- [ArcGIS & QGIS Integration](/docs/maps/arcgis-qgis-integration)
