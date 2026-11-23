import React, { useState } from "react";
import Layout from "@theme/Layout";
import Link from "@docusaurus/Link";
import useBaseUrl from "@docusaurus/useBaseUrl";
import useDocusaurusContext from "@docusaurus/useDocusaurusContext";
import clsx from "clsx";
import EnvironmentNotice from "@site/src/components/EnvironmentNotice";
import MapComponent from "@site/src/components/MapComponent";
import ApiKeyGuide from "@site/src/components/ApiKeyGuide";
import CopyButton from "@site/src/components/CopyButton";
import styles from "@site/src/components/MapComponent/styles.module.css";

// Style IDs as the gateway serves them. Each family comes in a bilingual
// version (no suffix) and with `_en` / `_ar` for a single label language.
const STYLE_FAMILIES = [
  {
    id: "spl_bgmaps",
    name: "SPL Light Maps",
    descriptions: {
      "": "A clean base map with bilingual labels (English & Arabic), perfect for data visualization overlays.",
      _en: "A clean base map with English-only labels, perfect for data visualization overlays.",
      _ar: "A clean base map with Arabic-only labels, perfect for data visualization overlays.",
    },
  },
  {
    id: "spl_dark",
    name: "SPL Dark",
    descriptions: {
      "": "A dark-themed map with bilingual labels (English & Arabic) for night mode or dark interfaces.",
      _en: "A dark-themed map with English-only labels for night mode or dark interfaces.",
      _ar: "A dark-themed map with Arabic-only labels for night mode or dark interfaces.",
    },
  },
  {
    id: "spl_satellite",
    name: "SPL Satellite",
    descriptions: {
      "": "High-resolution satellite imagery with bilingual labels (English & Arabic) showing real-world terrain and features.",
      _en: "High-resolution satellite imagery with English-only labels showing real-world terrain and features.",
      _ar: "High-resolution satellite imagery with Arabic-only labels showing real-world terrain and features.",
    },
  },
];

const VARIANTS = [
  { suffix: "", label: "Bilingual" },
  { suffix: "_en", label: "English" },
  { suffix: "_ar", label: "Arabic" },
];

function useMapStyles() {
  const { siteConfig } = useDocusaurusContext();
  const base = (siteConfig.customFields && siteConfig.customFields.splGateway && siteConfig.customFields.splGateway.base) || "";
  return STYLE_FAMILIES.flatMap((family) =>
    VARIANTS.map((variant) => {
      const styleId = family.id + variant.suffix;
      return {
        id: styleId,
        name: `${family.name} (${variant.label})`,
        url: `${base}/styles/${styleId}/style.json`,
        description: family.descriptions[variant.suffix],
      };
    })
  );
}

export default function Maps() {
  const mapStyles = useMapStyles();
  const viewerHref = useBaseUrl("/downloads/SPL_Map_Viewer.html");
  const [activeStyleId, setActiveStyleId] = useState(mapStyles[0].id);
  const activeStyle = mapStyles.find((style) => style.id === activeStyleId) || mapStyles[0];

  return (
    <Layout title="Maps" description="SPL Map Styles">
      <div className="container margin-top--lg">
        <div className="row">
          <div className="col col--12">
            <div className="padding-bottom--md">
              <h1>SPL Map Styles Explorer</h1>
              <p>
                Explore the different map styles available in the SPL Maps API.
                Click on a style to view it in the map below.
              </p>

              <EnvironmentNotice />

              <ApiKeyGuide />

              <div className="alert alert--primary" role="alert">
                <p>
                  <strong>Looking for integration guides?</strong> Check out our{" "}
                  <Link to="/docs/docs/maps/using-spl-maps">developer documentation</Link>{" "}
                  to learn how to use these map styles in your applications.
                </p>
              </div>

              <div className="alert alert--warning" role="alert">
                <p>
                  <strong>Using Arabic or Bilingual styles?</strong> You must
                  enable the RTL (Right-to-Left) text plugin for proper Arabic
                  text rendering.{" "}
                  <Link to="/docs/docs/maps/rtl-text-support">
                    Learn how to implement RTL support
                  </Link>
                  .
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="row">
          <div className="col col--12">
            <div className="padding-bottom--md">
              <h2>How your application loads these styles</h2>
              <p>
                The style URLs below are served by the SPL API gateway, so your
                application has to load them like any other gateway request. The
                style the gateway returns is not self-contained: its vector
                tiles, label fonts and icons point at an internal host, so those
                URLs must be rewritten back onto the gateway, and every one of
                those requests must carry your API key.
              </p>
              <p>Doing that takes three steps:</p>
              <ol>
                <li>
                  <strong>Load the style from the gateway.</strong> The style
                  URL is <code>{`{gateway}/styles/{styleId}/style.json`}</code>,
                  for example <code>{mapStyles[0].url}</code>. The style ID
                  accepts the same <code>_en</code> and <code>_ar</code> suffixes
                  as the styles below.
                </li>
                <li>
                  <strong>Rewrite the hosts inside the style.</strong> Read the
                  style, collect every origin that is not your gateway, and map
                  those URLs back onto the gateway root. Without this step the
                  style loads and the map stays blank.
                </li>
                <li>
                  <strong>Send the key on gateway requests only.</strong> Add
                  your key header to requests whose URL starts with the gateway
                  base URL, and leave requests to any other host (such as the
                  MapLibre CDN) alone. The gateway also rate-limits bursts with
                  <code>429</code> responses, so pace the requests and retry a{" "}
                  <code>429</code> with a growing delay.
                </li>
              </ol>
              <p>
                The{" "}
                <Link to="/docs/docs/maps/using-spl-maps">
                  Using SPL Maps in JavaScript guide
                </Link>{" "}
                contains a complete, working example of all three steps, and the{" "}
                <Link to="/docs/docs/maps/html-map-viewer">HTML Map Viewer</Link>{" "}
                shows the map in your browser without writing any code.
              </p>
              <p>
                <strong>
                  <a href={viewerHref} download>
                    Download the HTML Map Viewer
                  </a>
                </strong>
              </p>
            </div>
          </div>
        </div>

        <div className="row">
          <div className="col col--12">
            <div className={styles.mapCard}>
              <div className={styles.styleContainer}>
                {mapStyles.map((style) => (
                  <div
                    key={style.id}
                    className={clsx(styles.styleOption, {
                      [styles.activeStyle]: activeStyleId === style.id,
                    })}
                    onClick={() => setActiveStyleId(style.id)}
                  >
                    <h3>{style.name}</h3>
                    <p>{style.description}</p>
                    <div className={styles.urlContainer}>
                      <code className={styles.styleUrlSmall} title={style.url}>
                        {style.url}
                      </code>
                      <CopyButton text={style.url} />
                    </div>
                  </div>
                ))}
              </div>
              <div className={styles.mapWrapper}>
                <MapComponent styleId={activeStyle.id} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
