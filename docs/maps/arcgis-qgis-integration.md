# Add Maps as layers in ArcGIS and QGIS with WMTS

This tutorial will guide you through adding Maps as Web Map Tile Service (WMTS) layers in ArcMap, and QGIS. Maps provides two WMTS services that you can use as base maps or overlay layers in your GIS applications.

## Available WMTS Services

Maps provides the following WMTS services:

- **Background Maps**: `https://na-maps.vng-solutions.com/styles/spl_bgmaps/wmts.xml`
- **Satellite Maps**: `https://na-maps.vng-solutions.com/styles/spl_satellite/wmts.xml`

## Adding Maps to ArcMap

ArcMap can read WMTS protocol, which is what you'll use to add your Maps styles. You will use the WMTS endpoints provided by Maps to add them to your ArcMap project.

### Available WMTS Endpoints

Maps provides the following WMTS endpoints that are ready to use in ArcMap:

- **Background Maps**: `https://na-maps.vng-solutions.com/styles/spl_bgmaps/wmts.xml`
- **Satellite Maps**: `https://na-maps.vng-solutions.com/styles/spl_satellite/wmts.xml`

### Add your Maps in ArcMap

To get started in ArcMap:

1. **Open the Add Data dialog**: Click the **Add Data** button in the toolbar to open the Add Data dialog box.

2. **Access GIS Servers**: At the top of the dialog box, click the arrow next to **Look in:** and select **GIS Servers**.

3. **Add WMTS Server**: Double-click **Add WMTS Server** to open the Add WMTS Server dialog box.

4. **Enter WMTS URL**: In the **URL** field at the top, paste one of the Maps WMTS endpoints:

   - For background maps: `https://na-maps.vng-solutions.com/styles/spl_bgmaps/wmts.xml`
   - For satellite maps: `https://na-maps.vng-solutions.com/styles/spl_satellite/wmts.xml`

5. **Load the layers**: In the **Server Layers** section, click **Get Layers**. When prompted for a username and password, click **Cancel**. You may have to click it several times to dismiss the box.

6. **Confirm connection**: When the layers are loaded in the window, click **OK**.

7. **Add the layer**: You should see **Maps on na-maps.vng-solutions.com** in the Add Data dialog box. Double-click it, select the name of your style in the next dialog box, then click **Add**.

8. **Verify the layer**: You should see your Maps layer inside your ArcMap project. Note that each style will have to be added individually.

### Tips for ArcMap Integration

- **Multiple Styles**: Each Maps style (background and satellite) needs to be added as a separate connection
- **Layer Management**: Once added, you can manage layer order, transparency, and other properties through the Table of Contents
- **Performance**: For better performance, consider the scale range and extent of your project area
- **Coordinate System**: Ensure your project's coordinate system is compatible with the Maps service

## Adding Maps to QGIS

QGIS can also read map tiles from a WMTS server. You can add Maps layers to your QGIS project using the available WMTS endpoints.

### Build a WMTS endpoint

The WMTS endpoint that you will use to add your Maps in QGIS needs to follow this format:

- **Background Maps**: `https://na-maps.vng-solutions.com/styles/spl_bgmaps/wmts.xml`
- **Satellite Maps**: `https://na-maps.vng-solutions.com/styles/spl_satellite/wmts.xml`

These endpoints are ready to use and don't require any customization.

### Add your Maps in QGIS

To add your Maps to QGIS:

1. In QGIS, click the **Layer** menu, then select **Add Layer**, then click on **Add WMS/WMTS layer...**.

2. Make sure the **Layers** tab is selected in the dialog box. Below the dropdown menu at the top of the box, click **New**.

   ![New Connection Dialog](/img/wmts/newConnection.webp)

3. Give the layer a name (e.g., "Maps Background" or "Maps Satellite") and add one of the WMTS endpoint URLs:

   - For background maps: `https://na-maps.vng-solutions.com/styles/spl_bgmaps/wmts.xml`
   - For satellite maps: `https://na-maps.vng-solutions.com/styles/spl_satellite/wmts.xml`

   Press **OK**.

   ![Connection Details](/img/wmts/connectionDetails.webp)

4. You should see your Maps layer inside your QGIS project. Note that any style you would like to visualize will have to be added individually.

   ![See Your Map as Layer](/img/wmts/seeYourMapAsLayer.webp)
