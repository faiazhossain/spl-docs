import clsx from "clsx";
import Link from "@docusaurus/Link";
import useDocusaurusContext from "@docusaurus/useDocusaurusContext";
import useBaseUrl from "@docusaurus/useBaseUrl";
import Layout from "@theme/Layout";
import HomepageFeatures from "@site/src/components/HomepageFeatures";
import Heading from "@theme/Heading";
import styles from "./index.module.css";
import { useEffect, useState } from "react";

function HomepageHeader() {
  const { siteConfig } = useDocusaurusContext();
  return (
    <header className={clsx("hero hero--primary", styles.heroBanner)}>
      <div className='container'>
        <Heading as='h1' className='hero__title'>
          {siteConfig.title}
        </Heading>
        <p className='hero__subtitle'>{siteConfig.tagline}</p>
        <div className={styles.buttons}>
          <Link
            className='button button--secondary button--lg'
            to={useBaseUrl("docs/maps/using-spl-maps")}
          >
            Get Started with SPL Maps
          </Link>
          <Link
            className='button button--outline button--lg button--secondary'
            style={{ marginLeft: "12px" }}
            to={useBaseUrl("api")}
          >
            Explore API Docs
          </Link>
        </div>
      </div>
    </header>
  );
}

function HomePageContent() {
  const [isMobile, setIsMobile] = useState(false);

  // Handle responsive layout detection
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  return (
    <div className={styles.homeContent}>
      <div className='container'>
        <div className={clsx("row padding-vert--xl", styles.contentRow)}>
          <div className={clsx("col", isMobile ? "col--12" : "col--6")}>
            <Heading as='h2'>Powerful Location Services</Heading>
            <p className={styles.contentDescription}>
              SPL provides comprehensive location-based services and mapping
              solutions for developers. Our tools make it easy to integrate
              maps, geocoding, and spatial data into your applications.
            </p>
            <div className={styles.contentButtons}>
              <Link
                className='button button--primary'
                to={useBaseUrl("docs/maps/using-spl-maps")}
              >
                Read Documentation
              </Link>
            </div>
          </div>
          <div className={clsx("col", isMobile ? "col--12" : "col--6")}>
            <div className={styles.imageContainer}>
              <img
                src={useBaseUrl("img/spl-logo.webp")}
                alt='SPL'
                className={styles.featureImage}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const { siteConfig } = useDocusaurusContext();
  return (
    <Layout
      title={`${siteConfig.title} - Location Services Platform`}
      description='SPL provides powerful mapping and location-based services with comprehensive API documentation'
    >
      <HomepageHeader />
      <main>
        <HomePageContent />
        <HomepageFeatures />
      </main>
    </Layout>
  );
}
