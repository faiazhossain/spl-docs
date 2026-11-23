---
sidebar_label: "React Native"
sidebar_position: 3
---

<head>
  <title>React Native Documentation</title>
</head>

# React Native

A React Native (Expo) application that demonstrates map features with **SPL Maps**, integrated with **@maplibre/maplibre-react-native**. It is a complete example that you can run and use as the starting point of your own app.

## Version Info

The versions are the ones used by the example repository at the time of writing.

- **React Native**: 0.79.4
- **Expo SDK**: ~53.0.12
- **@maplibre/maplibre-react-native**: ^10.1.6
- **expo-location**: ~18.1.5

## Features

### Core Map Features

- **Simple Map Display**: Basic map rendering with the SPL style.
- **Current Location**: Real-time user location tracking with permission handling.
- **Custom Markers**: Interactive, custom-styled markers.
- **Draggable Markers**: Markers you can drag to your desired place.
- **Line Drawing**: Draw lines (polylines) between coordinates.
- **Polygon Shapes**: Create and display polygon areas.
- **Complex Geometry**: Combine multiple geometric shapes on a single map.

### UI/UX

- **Drawer Navigation**: Easy access to all map examples.
- **Loading & Error States**: Feedback while requests run.
- **Centralized Utilities**: Reusable hooks and functions.

## Screenshots & Demo

### Core Features

<table>
  <tbody>
  <tr>
    <td align="center" width="50%">
      <img src="/docs/screenshots/simple-map.png" alt="Basic map display with SPL styling" width="100%" /><br />
      <em>Basic map display</em>
    </td>
    <td align="center" width="50%">
      <img src="/docs/screenshots/current-location.png" alt="Real-time location tracking" width="100%" /><br />
      <em>Location tracking</em>
    </td>
  </tr>
  <tr>
    <td align="center" width="50%">
      <img src="/docs/screenshots/markar.png" alt="Interactive custom markers" width="100%" /><br />
      <em>Custom markers</em>
    </td>
  </tr>
  </tbody>
</table>

### Advanced Features

<table>
  <tbody>
  <tr>
    <td align="center" width="50%">
      <img src="/docs/screenshots/line.png" alt="Draw lines between coordinates" width="100%" /><br />
      <em>Draw lines between coordinates</em>
    </td>
    <td align="center" width="50%">
      <img src="/docs/screenshots/polygon.png" alt="Create polygon areas" width="100%" /><br />
      <em>Create polygon areas</em>
    </td>
  </tr>
  <tr>
    <td align="center" width="50%">
      <img src="/docs/screenshots/geometry.png" alt="Multiple geometric shapes" width="100%" /><br />
      <em>Multiple geometric shapes</em>
    </td>
    <td align="center" width="50%">
      <img src="/docs/screenshots/advanced-map.png" alt="Advanced map with multiple features" width="100%" /><br />
      <em>Advanced map with multiple features</em>
    </td>
  </tr>
  </tbody>
</table>

## Quick Start

### Prerequisites

- **Node.js 18 or newer** ([nodejs.org](https://nodejs.org))
- **Android Studio** with an Android Virtual Device, or a connected Android device
- **Xcode** for iOS (macOS only)
- Your SPL API key. If you do not have one yet, contact the SPL team.

### Step 1: Clone and install

```bash
git clone https://github.com/barikoi/spl-react-native-example.git
cd spl-react-native-example
npm install
```

The repository creates the folder `spl-react-native-example`. There is no `ios` folder to run `pod install` in: the native iOS project is generated when the app is first built.

### Step 2: Build and run the app

`@maplibre/maplibre-react-native` contains native code and **cannot run in Expo Go**. The app has to be built as a development build once. After that, every change to the JavaScript is reloaded by Metro.

```bash
# Android: builds the app and starts it on a running emulator or a connected device
npm run android

# iOS (macOS only): builds the app and starts it in the simulator
npm run ios

# Starts Metro for a development build that is already installed on the device
npm start
```

`npm run android` and `npm run ios` are the `expo run:android` and `expo run:ios` scripts of the repository. Without Android Studio or Xcode, a development build can be created in the cloud with `eas build --profile development`.

The `@maplibre/maplibre-react-native` plugin is already listed in `app.json`, so the native library is added to the project when it is built. See the [MapLibre Expo setup guide](https://maplibre.org/maplibre-react-native/docs/setup/expo).

### Step 3: Connect the app to the map

The map is loaded through the SPL API gateway, which requires your API key in the `Ocp-Apim-Subscription-Key` header on every request. MapLibre React Native downloads tiles and fonts with its own native code and has no option to add a header to those requests, so the app cannot talk to the gateway directly. The way around this is a small proxy that adds the key. It also keeps the key out of the app, where anyone could read it.

The proxy forwards every request to the gateway with the key. Save it in the repository as `proxy.mjs`:

```javascript title="proxy.mjs"
import { createServer } from "node:http";

const GATEWAY = "{{gatewayBase}}";
const KEY_HEADER = "Ocp-Apim-Subscription-Key";
const API_KEY = process.env.SPL_API_KEY; // set in your shell, never written into the app
const PORT = 3001;

createServer(async (request, response) => {
  const upstream = await fetch(GATEWAY + request.url, { headers: { [KEY_HEADER]: API_KEY } });
  response.writeHead(upstream.status, {
    "content-type": upstream.headers.get("content-type") || "application/octet-stream",
  });
  response.end(Buffer.from(await upstream.arrayBuffer()));
}).listen(PORT, () => console.log(`SPL map proxy listening on port ${PORT}`));
```

Start it with your key:

```bash
SPL_API_KEY=your_api_key node proxy.mjs      # macOS and Linux
$env:SPL_API_KEY="your_api_key"; node proxy.mjs   # Windows PowerShell
```

Then load the style through the proxy in `utils/mapUtils.ts`. The style refers to an internal host for its tiles, fonts and icons, so those addresses are pointed at the proxy as well:

```typescript title="utils/mapUtils.ts"
import Constants from "expo-constants";
import { useEffect, useState } from "react";

// The proxy runs on the computer that serves the app. On an Android emulator it
// is reached as 10.0.2.2.
const PROXY = `http://${Constants.expoConfig?.hostUri?.split(":")[0] ?? "10.0.2.2"}:3001`;
const STYLE_ID = "spl_bgmaps";

export async function fetchSplMapStyle(): Promise<any> {
  const response = await fetch(`${PROXY}/styles/${STYLE_ID}/style.json`);
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  const style = await response.json();

  // The style points its tiles, fonts and icons at an internal host.
  // Point every one of those addresses at the proxy instead.
  const origins = new Set<string>();
  const collect = (url: unknown) => {
    if (typeof url === "string" && /^https?:\/\//.test(url)) origins.add(new URL(url).origin);
  };
  collect(style.glyphs);
  collect(style.sprite);
  Object.values(style.sources ?? {}).forEach((source: any) => {
    collect(source.url);
    (source.tiles ?? []).forEach(collect);
  });
  const rewrite = (url: string) => {
    for (const origin of origins) {
      if (url.startsWith(`${origin}/`)) return PROXY + url.slice(origin.length);
    }
    return url;
  };
  if (style.glyphs) style.glyphs = rewrite(style.glyphs);
  for (const source of Object.values<any>(style.sources ?? {})) {
    if (source.url) source.url = rewrite(source.url);
    if (source.tiles) source.tiles = source.tiles.map(rewrite);
  }

  // Remove the sprite property for React Native compatibility.
  delete style.sprite;
  return style;
}

export const useSPLMapStyle = () => {
  const [styleJson, setStyleJson] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSplMapStyle()
      .then(setStyleJson)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load map style"))
      .finally(() => setLoading(false));
  }, []);

  return { styleJson, loading, error };
};
```

Start the proxy before the app, then reload the app. The **Simple Map** screen shows Riyadh with the SPL style.

## How It Works

### Basic Map Setup

```typescript
import { Camera, MapView } from "@maplibre/maplibre-react-native";
import { useSPLMapStyle } from "../../utils/mapUtils";

export default function SimpleMapScreen() {
  const { styleJson, loading, error } = useSPLMapStyle();

  if (loading) return <ActivityIndicator />;
  if (error) return <Text>Error: {error}</Text>;

  return (
    <MapView style={styles.map} mapStyle={styleJson}>
      <Camera centerCoordinate={[46.6753, 24.7136]} zoomLevel={16} />
    </MapView>
  );
}
```

### Adding Markers

```tsx
<MarkerView coordinate={[46.6753, 24.7136]}>
  <Image source={require("../assets/icons/spl-marker.webp")} />
</MarkerView>
```

### Location Tracking

```typescript
import * as Location from "expo-location";

// Request permission
const { status } = await Location.requestForegroundPermissionsAsync();

// Get the current location
const location = await Location.getCurrentPositionAsync({});
```

## Customization Guide

### Adding a New Map Feature

1. **Create a new screen** in `components/screens/`, for example `YourNewScreen.tsx`:

    ```typescript
    import { MapView } from "@maplibre/maplibre-react-native";
    import { useSPLMapStyle } from "../../utils/mapUtils";

    export default function YourNewScreen() {
      const { styleJson, loading, error } = useSPLMapStyle();

      if (loading) return <ActivityIndicator />;
      if (error) return <Text>Error: {error}</Text>;

      return <MapView mapStyle={styleJson}>{/* Your map features */}</MapView>;
    }
    ```

2. **Add a route**: create `app/your-new-screen.tsx` that renders the screen, and register it in the drawer in `app/_layout.tsx`.

## Building a Standalone App

To install the app on devices without a development tool, build it with [Expo Application Services](https://docs.expo.dev/build/introduction/):

```bash
# Install EAS CLI if you haven't already
npm install -g @expo/eas-cli

# Log in to your Expo account
eas login

# Build for Android
eas build --platform android --profile preview

# Build for iOS
eas build --platform ios --profile preview
```

The repository includes an `eas.json` with three profiles: `development` (a development build), `preview` (an installable internal build) and `production`.

## Troubleshooting

### "Map is blank or not loading"

- Is the proxy running, with the key set in `SPL_API_KEY`? The app cannot load the map without it.
- Does the device reach the proxy? On a real device, the phone and the computer must be on the same network.
- Has the style loaded without an error? Show the `error` value of `useSPLMapStyle()` on screen.
- Is the key accepted? A `401` means the key is missing or not valid, and `403 Out of call volume quota` means the quota of the key is used up. See [API Keys & Authentication](/docs/docs/maps/api-keys).

### "App crashes on startup"

- Run `npm install` again.
- Clear the Metro cache: `npm start -- --clear`.
- If you changed a native dependency, rebuild the app with `npm run android` or `npm run ios`.

### "Location not working"

- Test on a real device. Simulators do not always provide a location.
- Allow location permissions when prompted.
- Make sure location services are enabled on your device.

### "Build errors with MapLibre"

- Follow the [MapLibre Expo setup guide](https://maplibre.org/maplibre-react-native/docs/setup/expo).
- Make sure `@maplibre/maplibre-react-native` is listed in the `plugins` array of `app.json`.
- Run `npx expo install --fix` to fix version conflicts.

## Next Steps

- [Using SPL Maps in JavaScript](/docs/docs/maps/using-spl-maps)
- [API Keys & Authentication](/docs/docs/maps/api-keys)
- [MapLibre React Native documentation](https://maplibre.org/maplibre-react-native/)
