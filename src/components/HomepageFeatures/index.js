import clsx from "clsx";
import Heading from "@theme/Heading";
import styles from "./styles.module.css";
import Link from "@docusaurus/Link";
import useBaseUrl from "@docusaurus/useBaseUrl";
import { useEffect, useState } from "react";

const FeatureList = [
  {
    title: "Interactive Maps",
    Svg: require("@site/static/img/undraw_docusaurus_mountain.svg").default,
    description: (
      <>
        Explore our powerful mapping solutions with interactive examples and
        comprehensive documentation.
      </>
    ),
    link: "maps",
  },
  {
    title: "Robust API",
    Svg: require("@site/static/img/undraw_docusaurus_tree.svg").default,
    description: (
      <>
        Access our well-documented API endpoints with detailed specifications
        and examples to integrate SPL into your applications.
      </>
    ),
    link: "api",
  },
  {
    title: "Developer Resources",
    Svg: require("@site/static/img/undraw_docusaurus_react.svg").default,
    description: (
      <>
        Comprehensive guides and tutorials to help you get started with SPL
        quickly and efficiently.
      </>
    ),
    link: "docs/maps/using-spl-maps",
  },
];

function Feature({ Svg, title, description, link, isMobile }) {
  return (
    <div className={clsx("col", isMobile ? "col--12" : "col--4")}>
      <div className={styles.featureCard}>
        <div className='text--center'>
          <Svg className={styles.featureSvg} role='img' />
        </div>
        <div className='text--center padding-horiz--md'>
          <Heading as='h3'>{title}</Heading>
          <p>{description}</p>
          <div className={styles.buttons}>
            <Link
              className='button button--secondary button--sm'
              to={useBaseUrl(link)}
            >
              Learn More
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function HomepageFeatures() {
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);

  // Handle responsive layout detection
  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 576);
      setIsTablet(window.innerWidth >= 576 && window.innerWidth < 996);
    };

    // Initial check and add listener
    checkScreenSize();
    window.addEventListener("resize", checkScreenSize);

    // Cleanup
    return () => window.removeEventListener("resize", checkScreenSize);
  }, []);

  return (
    <section className={styles.features}>
      <div className='container'>
        <div className='row'>
          {FeatureList.map((props, idx) => (
            <Feature key={idx} {...props} isMobile={isMobile} />
          ))}
        </div>
      </div>
    </section>
  );
}
