---
sidebar_label: "Arabic Text Support (RTL)"
sidebar_position: 5
---

<head>
  <title>Arabic Text Support - RTL Plugin</title>
</head>

# Arabic Text Support (RTL Plugin)

## Why is the RTL Plugin Required?

When using map styles with Arabic labels (bilingual or Arabic-only), you **must** enable the RTL (Right-to-Left) text plugin. This is essential for:

1. **Proper Text Direction**: Arabic text reads from right to left, unlike English which reads left to right. Without the RTL plugin, Arabic text appears reversed and unreadable.

2. **Correct Text Shaping**: Arabic characters change their form depending on their position in a word (beginning, middle, or end). The RTL plugin applies the proper glyph shaping so Arabic text displays correctly.

3. **Bidirectional Text**: In bilingual mode, the plugin handles the interaction between Arabic and English text, so each is displayed in its correct direction.

## How to Enable RTL Support

Call `maplibregl.setRTLTextPlugin()` once, **before** the first map is created. The plugin for MapLibre GL JS 5 is `@mapbox/mapbox-gl-rtl-text` version 0.3.0:

```javascript
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

// Enable the RTL text plugin before any map exists.
maplibregl.setRTLTextPlugin(
  "https://unpkg.com/@mapbox/mapbox-gl-rtl-text@0.3.0/dist/mapbox-gl-rtl-text.js",
  true // load the plugin when it is first needed
);
```

The complete example in [Using SPL Maps in JavaScript](/docs/docs/maps/using-spl-maps) already sets the plugin. To see it working with Arabic labels, change the style ID in that example:

```javascript
const STYLE_ID = "spl_dark_ar"; // Arabic-only labels: spl_bgmaps_ar, spl_dark_ar
```

The style is loaded through the gateway like every other style, so nothing else changes.

## When to Use RTL Plugin

- ✅ **Required**: When using bilingual styles (no suffix)
- ✅ **Required**: When using Arabic-only styles (`_ar` suffix)
- ❌ **Not needed**: When using English-only styles (`_en` suffix)

## Troubleshooting

### Arabic Text Appears Reversed or Incorrect

**Problem**: Arabic text is displaying backwards or with disconnected letters.

**Solution**: Make sure you've called `setRTLTextPlugin()` **before** creating your first map instance. The plugin must be loaded before any map initialization.

### Plugin Loading Error

**Problem**: Console shows errors like `Failed to load RTL text plugin`.

**Solution**:

- Check your internet connection: the plugin is loaded from a CDN.
- Verify the plugin URL. For version 0.3.0 the file is in the `dist/` folder: `.../mapbox-gl-rtl-text@0.3.0/dist/mapbox-gl-rtl-text.js`.
- Use the plugin version that matches your MapLibre GL JS version: 0.3.0 for MapLibre GL JS 5.

### No Arabic Text Visible

**Problem**: Arabic labels don't appear on the map at all.

**Solution**:

- Verify you're using a bilingual or Arabic style ID (not the `_en` version).
- Check that the style has loaded successfully. The label fonts are loaded from the gateway, so a key that is not accepted leaves the map without labels. See [API Keys & Authentication](/docs/docs/maps/api-keys).
- Look for console errors related to font loading.

## Best Practices

1. **Load Once**: Initialize the RTL plugin only once in your application, not in every component.

2. **Early Loading**: Load the plugin as early as possible in your application lifecycle, before any maps are created.

3. **Error Handling**: Pass a callback to report a plugin that fails to load:

    ```javascript
    maplibregl.setRTLTextPlugin(
      "https://unpkg.com/@mapbox/mapbox-gl-rtl-text@0.3.0/dist/mapbox-gl-rtl-text.js",
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

- Use **bilingual** styles for applications serving both Arabic and English speakers.
- Use **English-only** (`_en`) for international applications or when Arabic support isn't needed.
- Use **Arabic-only** (`_ar`) for applications primarily serving Arabic-speaking users.
  :::

## Related Documentation

- [Using SPL Maps in JavaScript](/docs/docs/maps/using-spl-maps)
- [API Keys & Authentication](/docs/docs/maps/api-keys)
- [MapLibre setRTLTextPlugin API Reference](https://maplibre.org/maplibre-gl-js/docs/API/functions/setRTLTextPlugin/)
- [MapLibre RTL Script Example](https://maplibre.org/maplibre-gl-js/docs/examples/add-support-for-right-to-left-scripts/)
- [MapLibre GL JS Documentation](https://maplibre.org/maplibre-gl-js/docs/)
