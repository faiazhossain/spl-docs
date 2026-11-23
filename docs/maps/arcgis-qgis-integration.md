---
sidebar_label: "ArcGIS & QGIS Integration"
sidebar_position: 4
---

<head>
  <title>Add SPL Maps to ArcGIS and QGIS with WMTS</title>
</head>

# Add SPL Maps to ArcGIS and QGIS with WMTS

SPL Maps provides Web Map Tile Service (WMTS) endpoints for two styles. You can add them as base maps in a GIS application.

| Service | WMTS endpoint |
| --- | --- |
| **SPL Light Maps** | `{{gatewayBase}}/styles/spl_bgmaps/wmts.xml` |
| **SPL Satellite** | `{{gatewayBase}}/styles/spl_satellite/wmts.xml` |

## Authentication

The endpoints are served by the SPL API gateway, and every request needs your API key in the `{{gatewayKeyHeader}}` header. This also applies to every single map tile. The gateway does not accept the key in the URL, so the GIS application has to send the header itself.

| Application | Can it send the header? |
| --- | --- |
| **QGIS 3.44 or newer** | Yes, with an authentication configuration of the type **API Header**. See [Add SPL Maps to QGIS](#add-spl-maps-to-qgis). |
| **QGIS older than 3.44** | No. Use QGIS 3.44 or newer. |
| **ArcGIS Pro and ArcMap** | No. Neither has a setting to send a custom header with a WMTS connection. See [ArcGIS](#arcgis). |

## Add SPL Maps to QGIS

The steps were written for QGIS 3.44.

### Step 1: Store the key in an authentication configuration

The key is stored encrypted in the QGIS authentication database, so it is not written into the project file.

1. Open **Layer** › **Add Layer** › **Add WMS/WMTS Layer...** and make sure the **Layers** tab is selected.
2. Click **New** to create a connection.
3. Under **Authentication**, click the **+** button next to **Choose or create an authentication configuration**. A dialog for a new configuration opens.
4. Fill in the configuration:
   - **Name**: `SPL Map key`
   - **Method**: **API Header**
   - **Header Name**: `Ocp-Apim-Subscription-Key`
   - **Header Value**: your API key
5. Click **Save**. If QGIS asks for a master password, it is the password that protects your authentication database. You choose it the first time you store a credential.

### Step 2: Create the WMTS connection

1. Back in the connection dialog, fill in:
   - **Name**: `SPL Light Maps` or `SPL Satellite`
   - **URL**: the WMTS endpoint of the service from the table above
   - **Authentication**: select `SPL Map key`
2. Click **OK**.

### Step 3: Add the layer

1. Select the new connection and click **Connect**. The layers of the service are listed.
2. Select the layer and click **Add**. The map appears in your project.

Each style is a separate connection. Repeat Step 2 and Step 3 for the second style. The authentication configuration is created only once.

## ArcGIS

ArcGIS Pro and ArcMap cannot send the `{{gatewayKeyHeader}}` header with a WMTS connection, and the gateway does not accept the key in the URL. A direct WMTS connection from ArcGIS is therefore not possible with an API key.

Two ways around this exist:

- **Ask the SPL team** whether an ArcGIS-compatible endpoint is available for your key.
- **Use a proxy**: a small service on your network that adds the header to each request. ArcGIS then connects to the proxy instead of the gateway.

## Tips

- **Performance**: zoom to your area of interest before adding large layers.
- **Coordinate system**: make sure your project uses a coordinate system that is compatible with the map service. QGIS converts on the fly when it does not.

## Next Steps

- [API Keys & Authentication](/docs/docs/maps/api-keys)
- [Using SPL Maps in JavaScript](/docs/docs/maps/using-spl-maps)
