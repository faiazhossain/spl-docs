import React from "react";
import useDocusaurusContext from "@docusaurus/useDocusaurusContext";
import styles from "./styles.module.css";

// Shown on every page unless the site is built as SPL_ENVIRONMENT=production.
export default function EnvironmentNotice() {
  const { siteConfig } = useDocusaurusContext();
  if (siteConfig.customFields.splEnvironment !== "test") return null;

  return (
    <div className={styles.notice} role="note" aria-label="Testing and evaluation notice">
      <strong>For testing and evaluation only.</strong> This documentation and
      its endpoints are intended for testing and evaluation purposes only, not
      for production integration.
    </div>
  );
}
