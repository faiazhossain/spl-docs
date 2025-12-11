---
sidebar_label: "Arabic Text Support (RTL)"
sidebar_position: 4
---

<head>
  <title>Arabic Text Support - RTL Plugin</title>
</head>

# Arabic Text Support (RTL Plugin)

## Why is the RTL Plugin Required?

When using map styles with Arabic labels (bilingual or Arabic-only), you **must** enable the RTL (Right-to-Left) text plugin. This is essential for:

1. **Proper Text Direction**: Arabic text reads from right to left, unlike English which reads left to right. Without the RTL plugin, Arabic text will appear reversed and unreadable.

2. **Correct Text Shaping**: Arabic characters change their form depending on their position in a word (beginning, middle, or end). The RTL plugin ensures proper glyph shaping so Arabic text displays correctly.

3. **Bidirectional Text**: In bilingual mode, the plugin handles the complex interaction between Arabic and English text, ensuring each displays in its correct direction.

## How to Enable RTL Support

Add the RTL text plugin **before** initializing your map:

```javascript
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

// Enable RTL text plugin for proper Arabic text rendering
maplibregl.setRTLTextPlugin(
  "https://unpkg.com/@mapbox/mapbox-gl-rtl-text@0.2.3/mapbox-gl-rtl-text.js",
  null, // callback (optional)
  true // lazy load the plugin
);

// Now initialize your map
const map = new maplibregl.Map({
  container: "map",
  style: "https://na-maps.vng-solutions.com/styles/spl_dark/style.json", // Bilingual style
  center: [46.915, 24.689],
  zoom: 9,
});
```

## When to Use RTL Plugin

- ✅ **Required**: When using bilingual styles (default)
- ✅ **Required**: When using Arabic-only styles (`_ar` suffix)
- ❌ **Not needed**: When using English-only styles (`_en` suffix)

## Complete Example with RTL Support

### HTML Implementation

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>SPL Maps with Arabic Support</title>
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

    <script src="https://unpkg.com/maplibre-gl@3.x/dist/maplibre-gl.js"></script>
    <script>
      // Enable RTL text plugin BEFORE initializing the map
      maplibregl.setRTLTextPlugin(
        "https://unpkg.com/@mapbox/mapbox-gl-rtl-text@0.2.3/mapbox-gl-rtl-text.js",
        null,
        true
      );

      // Initialize the map with bilingual or Arabic style
      const map = new maplibregl.Map({
        container: "map",
        style: "https://na-maps.vng-solutions.com/styles/spl_dark/style.json",
        center: [46.915, 24.689],
        zoom: 9,
      });

      map.addControl(new maplibregl.NavigationControl(), "top-right");
      map.addControl(new maplibregl.ScaleControl(), "bottom-right");
    </script>
  </body>
</html>
```

## Troubleshooting

### Arabic Text Appears Reversed or Incorrect

**Problem**: Arabic text is displaying backwards or with disconnected letters.

**Solution**: Make sure you've called `setRTLTextPlugin()` **before** creating your first map instance. The plugin must be loaded before any map initialization.

### Plugin Loading Error

**Problem**: Console shows errors like "Failed to load RTL text plugin"

**Solution**:

- Check your internet connection (the plugin loads from CDN)
- Verify the plugin URL is correct
- Ensure you're using a compatible version (0.2.3 is recommended for MapLibre GL)

### No Arabic Text Visible

**Problem**: Arabic labels don't appear on the map at all.

**Solution**:

- Verify you're using a bilingual or Arabic style URL (not the `_en` version)
- Check if the map style has loaded successfully
- Look for any console errors related to font loading

## Best Practices

1. **Load Once**: Initialize the RTL plugin only once in your application, not in every component.

2. **Early Loading**: Load the plugin as early as possible in your application lifecycle, before any maps are created.

3. **Error Handling**: Add error handling for plugin loading:

```javascript
maplibregl.setRTLTextPlugin(
  "https://unpkg.com/@mapbox/mapbox-gl-rtl-text@0.2.3/mapbox-gl-rtl-text.js",
  (error) => {
    if (error) {
      console.error("Error loading RTL plugin:", error);
    }
  },
  true
);
```

4. **Testing**: Always test your maps with actual Arabic content to ensure proper rendering.

:::warning Important
Always initialize the RTL text plugin **before** creating your first map instance. Failing to do so will result in incorrectly displayed Arabic text that appears reversed or malformed.
:::

:::tip Choosing a Language Variant

- Use **bilingual** styles for applications serving both Arabic and English speakers
- Use **English-only** (`_en`) for international applications or when Arabic support isn't needed
- Use **Arabic-only** (`_ar`) for applications primarily serving Arabic-speaking users
  :::

## Related Documentation

- [Using SPL Maps in JavaScript](/docs/maps/using-spl-maps)
- [MapLibre setRTLTextPlugin API Reference](https://maplibre.org/maplibre-gl-js/docs/API/functions/setRTLTextPlugin/)
- [MapLibre RTL Script Example](https://maplibre.org/maplibre-gl-js/docs/examples/add-support-for-right-to-left-scripts/)
- [MapLibre GL JS Documentation](https://maplibre.org/maplibre-gl-js/docs/)

## Additional Resources

For more detailed information about RTL text support in MapLibre GL JS:

- **API Reference**: The [setRTLTextPlugin documentation](https://maplibre.org/maplibre-gl-js/docs/API/functions/setRTLTextPlugin/) provides complete technical details about the function parameters and usage.

- **Live Example**: Check out MapLibre's [interactive RTL script example](https://maplibre.org/maplibre-gl-js/docs/examples/add-support-for-right-to-left-scripts/) to see RTL text rendering in action with code samples you can experiment with.
