import React, { useState } from "react";
import Layout from "@theme/Layout";
import MapComponent from "../../components/MapComponent";
import CopyButton from "../../components/CopyButton";
import styles from "../../components/MapComponent/styles.module.css";
import clsx from "clsx";
import Link from "@docusaurus/Link";

const mapStyles = [
  {
    id: "bgmaps-bilingual",
    name: "SPL Light Maps (Bilingual)",
    url: "https://na-maps.vng-solutions.com/styles/spl_bgmaps/style.json",
    description:
      "A clean base map with bilingual labels (English & Arabic), perfect for data visualization overlays.",
  },
  {
    id: "bgmaps-english",
    name: "SPL Light Maps (English)",
    url: "https://na-maps.vng-solutions.com/styles/spl_bgmaps_en/style.json",
    description:
      "A clean base map with English-only labels, perfect for data visualization overlays.",
  },
  {
    id: "bgmaps-arabic",
    name: "SPL Light Maps (Arabic)",
    url: "https://na-maps.vng-solutions.com/styles/spl_bgmaps_ar/style.json",
    description:
      "A clean base map with Arabic-only labels, perfect for data visualization overlays.",
  },
  {
    id: "dark-bilingual",
    name: "SPL Dark (Bilingual)",
    url: "https://na-maps.vng-solutions.com/styles/spl_dark/style.json",
    description:
      "A dark-themed map with bilingual labels (English & Arabic) for night mode or dark interfaces.",
  },
  {
    id: "dark-english",
    name: "SPL Dark (English)",
    url: "https://na-maps.vng-solutions.com/styles/spl_dark_en/style.json",
    description:
      "A dark-themed map with English-only labels for night mode or dark interfaces.",
  },
  {
    id: "dark-arabic",
    name: "SPL Dark (Arabic)",
    url: "https://na-maps.vng-solutions.com/styles/spl_dark_ar/style.json",
    description:
      "A dark-themed map with Arabic-only labels for night mode or dark interfaces.",
  },
  {
    id: "satellite-bilingual",
    name: "SPL Satellite (Bilingual)",
    url: "https://na-maps.vng-solutions.com/styles/spl_satellite/style.json",
    description:
      "High-resolution satellite imagery with bilingual labels (English & Arabic) showing real-world terrain and features.",
  },
  {
    id: "satellite-english",
    name: "SPL Satellite (English)",
    url: "https://na-maps.vng-solutions.com/styles/spl_satellite_en/style.json",
    description:
      "High-resolution satellite imagery with English-only labels showing real-world terrain and features.",
  },
  {
    id: "satellite-arabic",
    name: "SPL Satellite (Arabic)",
    url: "https://na-maps.vng-solutions.com/styles/spl_satellite_ar/style.json",
    description:
      "High-resolution satellite imagery with Arabic-only labels showing real-world terrain and features.",
  },
];

export default function Maps() {
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

              <div className='alert alert--primary' role='alert'>
                <p>
                  <strong>Looking for integration guides?</strong> Check out our{" "}
                  <Link to='/docs/maps/using-spl-maps'>
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
