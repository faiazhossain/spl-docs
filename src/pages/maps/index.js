import React, { useState } from "react";
import Layout from "@theme/Layout";
import MapComponent from "../../components/MapComponent";
import ApiKeyGuide from "../../components/ApiKeyGuide";
import CopyButton from "../../components/CopyButton";
import styles from "../../components/MapComponent/styles.module.css";
import clsx from "clsx";
import Link from "@docusaurus/Link";
import CodeBlock from "@theme/CodeBlock";
import useBaseUrl from "@docusaurus/useBaseUrl";

const mapStyles = [
  {
    id: "bgmaps-bilingual",
    name: "SPL Light Maps (Bilingual)",
    url: "https://apina.address.gov.sa/b2b-uat/styles/spl_bgmaps/style.json",
    description:
      "A clean base map with bilingual labels (English & Arabic), perfect for data visualization overlays.",
  },
  {
    id: "bgmaps-english",
    name: "SPL Light Maps (English)",
    url: "https://apina.address.gov.sa/b2b-uat/styles/spl_bgmaps_en/style.json",
    description:
      "A clean base map with English-only labels, perfect for data visualization overlays.",
  },
  {
    id: "bgmaps-arabic",
    name: "SPL Light Maps (Arabic)",
    url: "https://apina.address.gov.sa/b2b-uat/styles/spl_bgmaps_ar/style.json",
    description:
      "A clean base map with Arabic-only labels, perfect for data visualization overlays.",
  },
  {
    id: "dark-bilingual",
    name: "SPL Dark (Bilingual)",
    url: "https://apina.address.gov.sa/b2b-uat/styles/spl_dark/style.json",
    description:
      "A dark-themed map with bilingual labels (English & Arabic) for night mode or dark interfaces.",
  },
  {
    id: "dark-english",
    name: "SPL Dark (English)",
    url: "https://apina.address.gov.sa/b2b-uat/styles/spl_dark_en/style.json",
    description:
      "A dark-themed map with English-only labels for night mode or dark interfaces.",
  },
  {
    id: "dark-arabic",
    name: "SPL Dark (Arabic)",
    url: "https://apina.address.gov.sa/b2b-uat/styles/spl_dark_ar/style.json",
    description:
      "A dark-themed map with Arabic-only labels for night mode or dark interfaces.",
  },
  {
    id: "satellite-bilingual",
    name: "SPL Satellite (Bilingual)",
    url: "https://apina.address.gov.sa/b2b-uat/styles/spl_satellite/style.json",
    description:
      "High-resolution satellite imagery with bilingual labels (English & Arabic) showing real-world terrain and features.",
  },
  {
    id: "satellite-english",
    name: "SPL Satellite (English)",
    url: "https://apina.address.gov.sa/b2b-uat/styles/spl_satellite_en/style.json",
    description:
      "High-resolution satellite imagery with English-only labels showing real-world terrain and features.",
  },
  {
    id: "satellite-arabic",
    name: "SPL Satellite (Arabic)",
    url: "https://apina.address.gov.sa/b2b-uat/styles/spl_satellite_ar/style.json",
    description:
      "High-resolution satellite imagery with Arabic-only labels showing real-world terrain and features.",
  },
];

// The gateway recipe below is copied from the working SPL_Basemap_UAT.html
// viewer: the style served through a gateway (Apigee or Azure) points its
// sources, glyphs and sprite at an internal host, so those URLs have to be
// rewritten to the gateway and every gateway request needs the key header.
const gatewaySample = `const BASE = "https://apina.address.gov.sa/b2b-uat"; // gateway URL, without /styles/...
const STYLE_ID = "spl_bgmaps";
const KEY_HEADER = "Ocp-Apim-Subscription-Key"; // Apigee keys use "x-apikey"
const KEY = "YOUR_AZURE_API_KEY";

const styleUrl = BASE + "/styles/" + STYLE_ID + "/style.json";

// Arabic and bilingual styles need the RTL plugin, set before any map exists.
maplibregl.setRTLTextPlugin(
  "https://unpkg.com/@mapbox/mapbox-gl-rtl-text@0.3.0/dist/mapbox-gl-rtl-text.js",
  true
);

// 1. Read the style once and record every host it references that is not the
//    gateway. Its tile sources, label fonts and icons are on an internal host.
const style = await fetch(styleUrl, {
  headers: { [KEY_HEADER]: KEY },
}).then((res) => res.json());

const internal = new Set();
const referenced = [
  style.glyphs,
  ...[style.sprite].flat().map((s) => (typeof s === "string" ? s : s && s.url)),
  ...Object.values(style.sources || {}).flatMap((s) => [s.url, ...(s.tiles || [])]),
];
const isHttp = (url) =>
  typeof url === "string" &&
  (url.startsWith("http://") || url.startsWith("https://"));

for (const url of referenced) {
  if (!isHttp(url)) continue;
  const origin = new URL(url).origin;
  if (origin !== new URL(BASE).origin) internal.add(origin);
}

const rewrite = (url) => {
  for (const origin of internal) {
    if (url.startsWith(origin + "/")) return BASE + url.slice(origin.length);
  }
  return url;
};

// 2. Send the rewritten URLs to the gateway with the key, and leave every
//    other host (such as the MapLibre CDN) untouched.
const map = new maplibregl.Map({
  container: "map",
  style: styleUrl,
  center: [46.6753, 24.7136],
  zoom: 10,
  transformRequest: (url) => {
    const target = rewrite(url);
    return target.startsWith(BASE)
      ? { url: target, headers: { [KEY_HEADER]: KEY } }
      : { url: target };
  },
});`;

export default function Maps() {
  const viewerHref = useBaseUrl("/downloads/SPL_Basemap_UAT.html");
  const [activeStyle, setActiveStyle] = useState(mapStyles[0].url);
  const [activeStyleInfo, setActiveStyleInfo] = useState(mapStyles[0]);

  const handleStyleChange = (style) => {
    setActiveStyle(style.url);
    setActiveStyleInfo(style);
  };

  return (
    <Layout title='Maps' description='SPL Map Styles'>
      <div className='container margin-top--lg'>
        <div className='row'>
          <div className='col col--12'>
            <div className='padding-bottom--md'>
              <h1>SPL Map Styles Explorer</h1>
              <p>
                Explore the different map styles available in the SPL Maps API.
                Click on a style to view it in the map below.
              </p>

              <ApiKeyGuide />

              <div className='alert alert--primary' role='alert'>
                <p>
                  <strong>Looking for integration guides?</strong> Check out our{" "}
                  <Link to='/docs/docs/maps/using-spl-maps'>
                    developer documentation
                  </Link>{" "}
                  to learn how to use these map styles in your applications.
                </p>
              </div>

              <div className='alert alert--warning' role='alert'>
                <p>
                  <strong>Using Arabic or Bilingual styles?</strong> You must
                  enable the RTL (Right-to-Left) text plugin for proper Arabic
                  text rendering.{" "}
                  <Link to='/docs/docs/maps/rtl-text-support'>
                    Learn how to implement RTL support
                  </Link>
                  .
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className='row'>
          <div className='col col--12'>
            <div className='padding-bottom--md'>
              <h2>
                Using these styles through your gateway (Apigee or Azure)
              </h2>
              <p>
                The style URLs above are served by the SPL API gateway (
                <code>https://apina.address.gov.sa/b2b-uat</code>), so this page
                loads them exactly the way your application has to. The style
                the gateway returns is not self-contained: its vector tiles,
                label fonts and icons point at an internal host, so those URLs
                must be rewritten back onto the gateway, and every one of those
                requests must carry your subscription key.
              </p>
              <p>Doing that takes three steps:</p>
              <ol>
                <li>
                  <strong>Load the style from the gateway.</strong> The style
                  URL is <code>{`{gateway}/styles/{styleId}/style.json`}</code>,
                  for example
                  <code>
                    https://apina.address.gov.sa/b2b-uat/styles/spl_bgmaps/style.json
                  </code>
                  . The style ID accepts the same <code>_en</code> and{" "}
                  <code>_ar</code> suffixes as the styles above.
                </li>
                <li>
                  <strong>Rewrite the hosts inside the style.</strong> The
                  style served by the gateway points its tile sources, fonts
                  (<code>glyphs</code>) and icons (<code>sprite</code>) at an
                  internal host that is not reachable from the internet. Read
                  the style, collect every origin that is not your gateway, and
                  map those URLs back onto the gateway root. Without this step
                  the style loads and the map stays blank.
                </li>
                <li>
                  <strong>Send the key on gateway requests only.</strong> Add
                  your key header to requests whose URL starts with the gateway
                  base URL, and leave requests to any other host (such as the
                  MapLibre CDN) alone. Azure keys use{" "}
                  <code>Ocp-Apim-Subscription-Key</code>; Apigee keys use{" "}
                  <code>x-apikey</code>.
                </li>
              </ol>

              <CodeBlock language='javascript' title='Loading SPL Maps through a gateway'>
                {gatewaySample}
              </CodeBlock>

              <p>
                The gateway rate-limits bursts with <code>429</code> responses
                and does not send <code>Retry-After</code> to the browser, so
                keep roughly six requests in flight at a time and retry a{" "}
                <code>429</code> with a growing delay. Persisting, capped retry
                logic is what keeps a full map load from failing when many
                tiles are requested at once.
              </p>
              <p>
                <strong>
                  <a href={viewerHref} download>
                    Download the working viewer
                  </a>
                </strong>{" "}
                for a complete, browser-ready implementation of all three
                steps, and read the{" "}
                <Link to='/docs/docs/maps/html-map-viewer'>
                  HTML Map Viewer guide
                </Link>{" "}
                to try it against your gateway.
              </p>
            </div>
          </div>
        </div>

        <div className='row'>
          <div className='col col--12'>
            <div className={styles.mapCard}>
              <div className={styles.styleContainer}>
                {mapStyles.map((style) => (
                  <div
                    key={style.id}
                    className={clsx(styles.styleOption, {
                      [styles.activeStyle]: activeStyle === style.url,
                    })}
                    onClick={() => handleStyleChange(style)}
                  >
                    <h3>{style.name}</h3>
                    <p>{style.description}</p>
                    <div className={styles.urlContainer}>
                      <code className={styles.styleUrlSmall}>{style.url}</code>
                      <CopyButton text={style.url} />
                    </div>
                  </div>
                ))}
              </div>
              <div className={styles.mapWrapper}>
                <MapComponent styleUrl={activeStyle} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
