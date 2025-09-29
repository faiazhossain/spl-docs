---
sidebar_label: "React Native"
sidebar_position: 2
---

<head>
  <title>React Native Documentation</title>
</head>

# React Native

A comprehensive React Native (Expo) application demonstrating various map features using **SPL Maps**, Saudi's leading mapping service, integrated with **@maplibre/maplibre-react-native**. This project serves as a complete example for the React Native community.

## 📦 Version Info

- **Project Version**: 1.0.0
- **React Native**: 0.72.6
- **Expo**: ~49.0.15
- **@maplibre/maplibre-react-native**: ^9.1.0
- **expo-location**: ~16.1.0

## 📚 Documentation

This project includes comprehensive documentation to help you get started and build advanced features.

## 📱 Features

### ✨ Core Map Features

- **Simple Map Display**: Basic map rendering with SPL's style.
- **Current Location**: Real-time user location tracking with permission handling.
- **Custom Markers**: Interactive, custom-styled markers.
- **Draggable Markers**: Markers you can drag to your desired place.
- **Line Drawing**: Draw lines (polylines) between coordinates.
- **Polygon Shapes**: Create and display polygon areas.
- **Complex Geometry**: Combine multiple geometric shapes on a single map.

### 🎨 UI/UX

- **Drawer Navigation**: Easy access to all map examples.
- **Loading & Error States**: Smooth user experience during network requests.
- **Centralized Utilities**: Reusable hooks and functions for clean code.

## 🚀 Quick Start (Complete Beginner Guide)

### Prerequisites (Check These First!)

- **Node.js v18+** (Download from [nodejs.org](https://nodejs.org))
- **Expo CLI**: `npm install -g @expo/cli`
- **A code editor** (VS Code recommended)
- **Android Studio** (for Android development) OR **Xcode** (for iOS development, macOS only)

### Step-by-Step Setup for Beginners

#### 1. Clone and Install Dependencies

```bash
# Clone the repository
git clone https://github.com/barikoi/spl-react-native-example.git
cd react-native-map-example

# Install all dependencies
npm install

# Install iOS dependencies (macOS only)
cd ios && pod install && cd ..
```

#### 2. Run the Project

```bash
# Option 1: Start development server with Expo
npm start  # Launches Metro bundler - scan the QR code with Expo Go app to run

# Option 2: Run on Android emulator (Recommanded)
npm run android  # Starts app on connected Android emulator (requires Android Studio)

# Option 3: Run on iOS simulator (macOS only)
npm run ios      # Starts app on iOS simulator (requires Xcode)
```

## Development Environment Setup

> **⚠️ Important**: This project uses `@maplibre/maplibre-react-native` which requires specific Expo configuration. Make sure to follow the [MapLibre Expo Setup Guide](https://maplibre.org/maplibre-react-native/docs/setup/expo) to verify your configuration is correct.

#### For Android

1. Install Android Studio
2. Install Android SDK (minimum SDK 21)
3. Set up Android environment variables (ANDROID_HOME)
4. Create an Android Virtual Device (AVD)

#### For iOS (macOS only)

1. Install Xcode from the Mac App Store
2. Install Xcode Command Line Tools:
   ```bash
   xcode-select --install
   ```
3. Install CocoaPods:
   ```bash
   sudo gem install cocoapods
   ```

## 🚨 Common Beginner Mistakes & Solutions

### ❌ "Connectivity Issues"

**Solutions:**

- ✅ For testing with Expo Go app, ensure both your computer and mobile device are on the same network
- ✅ Check if your network allows local device communication (some corporate networks block this)
- ✅ Try switching between WiFi and mobile data if connection issues persist
- ✅ Verify your development machine's firewall isn't blocking Expo connections

### ❌ "Map is blank/not loading"

**Solutions:**

- ✅ Check if you added your API key correctly in `utils/mapUtils.ts`
- ✅ Make sure you're connected to internet
- ✅ Check browser console for error messages

### ❌ "App crashes on startup"

**Solutions:**

- ✅ Run `npm install` again
- ✅ Clear Metro cache: `npm start -- --clear`
- ✅ Make sure you have Node.js v18+ installed
- ✅ For iOS: `cd ios && pod install && cd ..`

### ❌ "Location not working"

**Solutions:**

- ✅ Test on a real device (not simulator for best results)
- ✅ Allow location permissions when prompted
- ✅ Make sure location services are enabled on your device
- ✅ Check if GPS is working in other apps

### ❌ "Build errors with MapLibre"

**Solutions:**

- ✅ Follow the [MapLibre Expo Setup Guide](https://maplibre.org/maplibre-react-native/docs/setup/expo)
- ✅ Ensure your `app.json` has the correct plugin configuration
- ✅ Run `npx expo install --fix` to fix version conflicts

## 🖼️ Screenshots & Demo

<!-- ### Core Features

<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; margin: 20px 0;">
  <div>
    <img src="/static/screenshots/simple-map.jpg" width="100%" alt="Basic map display with Barikoi styling">
    <p style="text-align: center;"><em>Basic map display</em></p>
  </div>
  <div>
    <img src="/static/screenshots/current-location.jpg" width="100%" alt="Real-time location tracking">
    <p style="text-align: center;"><em>Location tracking</em></p>
  </div>
  <div>
    <img src="/static/screenshots/markar.jpg" width="100%" alt="Interactive custom markers">
    <p style="text-align: center;"><em>Custom markers</em></p>
  </div>
</div>

### Advanced Features

<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; margin: 20px 0;">
  <div>
    <img src="/static/screenshots/line.jpg" width="100%" alt="Draw lines between coordinates">
    <p style="text-align: center;"><em>Draw lines between coordinates</em></p>
  </div>
  <div>
    <img src="/static/screenshots/polygon.jpg" width="100%" alt="Create polygon areas">
    <p style="text-align: center;"><em>Create polygon areas</em></p>
  </div>
  <div>
    <img src="/static/screenshots/geometry.jpg" width="100%" alt="Multiple geometric shapes">
    <p style="text-align: center;"><em>Multiple geometric shapes</em></p>
  </div>
  <div>
    <img src="/static/screenshots/advanced-map.jpg" width="100%" alt="Advanced map with multiple features">
    <p style="text-align: center;"><em>Advanced map with multiple features</em></p>
  </div>
</div> -->

### Core Features

<table>
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
</table>

### Advanced Features

<table>
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
</table>

## 🏗️ How It Works (Quick Overview)

### Basic Map Setup

```typescript
import { Camera, MapView, MarkerView } from "@maplibre/maplibre-react-native";
import { useSPLMapStyle } from "../../utils/mapUtils";

export default function SimpleMapScreen() {
  const { styleJson, loading, error } = useSPLMapStyle();

  if (loading) return <ActivityIndicator />;
  if (error) return <Text>Error: {error}</Text>;

  return (
    <MapView style={styles.map} mapStyle={styleJson}>
      <Camera
        centerCoordinate={[46.6773, 24.7136]} // Riyadh center
        zoomLevel={16}
      />
    </MapView>
  );
}
```

### Adding Markers

```typescript
<MarkerView coordinate={[90.364159, 23.823724]}>
  <Image source={require("../assets/icons/spl-marker.webp")} />
</MarkerView>
```

### Location Tracking

```typescript
import * as Location from "expo-location";

// Request permission
const { status } = await Location.requestForegroundPermissionsAsync();

// Get current location
const location = await Location.getCurrentPositionAsync({});
```

## 🔧 Customization Guide

### Adding a New Map Feature

1. **Create a new screen file**:

   ```bash
   touch components/screens/YourNewScreen.tsx
   ```

2. **Implement the component**:

   ```typescript
   import { MapView, Camera } from "@maplibre/maplibre-react-native";
   import { useSPLMapStyle } from "../../utils/mapUtils";

   export default function YourNewScreen() {
     const { styleJson, loading, error } = useSPLMapStyle();

     if (loading) return <ActivityIndicator />;
     if (error) return <Text>Error: {error}</Text>;

     return (
       <MapView mapStyle={styleJson}>
         {/* Your custom map features go here */}
       </MapView>
     );
   }
   ```

3. **Add to navigation**:
   Create a new file in the `app/` directory and add to `app/_layout.tsx`.

## 🚀 Publishing Your App (Complete Guide)

### Building for Production

```bash
# Install EAS CLI if you haven't already
npm install -g @expo/eas-cli

# Login to your Expo account
eas login

# Build for Android
eas build --platform android --profile production

# Build for iOS
eas build --platform ios --profile production
```

### For Google Play Store:

1. **Create Google Play Developer account** ($25 one-time fee)
2. **Build your app**: `eas build --platform android --profile production`
3. **Download APK/AAB** from Expo dashboard
4. **Upload to Google Play Console**
5. **Fill out store listing** (description, screenshots, etc.)
6. **Submit for review** (usually takes 1-3 days)

### For Apple App Store:

1. **Apple Developer account required** ($99/year)
2. **Build your app**: `eas build --platform ios --profile production`
3. **Download IPA** from Expo dashboard
4. **Use Transporter app** to upload to App Store Connect
5. **Fill out app information** in App Store Connect
6. **Submit for Apple review** (usually takes 1-7 days)

### EAS Build Configuration

This project includes a basic `eas.json` configuration:

```json
{
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal"
    },
    "production": {}
  }
}
```

**Happy Mapping! 🗺️✨**
