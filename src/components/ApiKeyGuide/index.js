import React, { useState } from "react";
import clsx from "clsx";
import useDocusaurusContext from "@docusaurus/useDocusaurusContext";
import CodeBlock from "@theme/CodeBlock";
import CopyButton from "../CopyButton";
import styles from "./styles.module.css";

// How to authenticate against each gateway. The documented gateway comes from
// the site settings, so the base URL shown here can never drift from the guides.
export default function ApiKeyGuide() {
  const { siteConfig } = useDocusaurusContext();
  const gateway = (siteConfig.customFields && siteConfig.customFields.splGateway) || {};
  const [activeId, setActiveId] = useState("apim");

  const providers = [
    {
      id: "apim",
      label: "Azure API Management",
      baseUrl: gateway.base,
      headerName: gateway.keyHeader,
      keyPlaceholder: "YOUR_API_KEY",
      description:
        "For API keys issued for the SPL API gateway. Send the key in the subscription key header on every request; the map styles and the APIs use the same header.",
    },
    {
      id: "b2b",
      label: "Apigee (B2B)",
      baseUrl: "https://b2b.address.gov.sa",
      headerName: "x-apikey",
      keyPlaceholder: "YOUR_B2B_API_KEY",
      description:
        "For API keys issued through the SPL B2B (Apigee) gateway. Use this key against the B2B base URL.",
    },
  ];
  const provider = providers.find((candidate) => candidate.id === activeId) || providers[0];
  const headerLine = `${provider.headerName}: ${provider.keyPlaceholder}`;
  const curlExample = `curl --location '${provider.baseUrl}/styles/spl_satellite/style.json' \\
--header '${headerLine}'`;

  return (
    <section className={styles.apiKeyGuide}>
      <h2>API Keys</h2>
      <p>
        Every request to the SPL Maps API must be authenticated with an API key.
        Use the tab for the gateway that issued your key.
      </p>

      <div className={styles.tabs} role="tablist" aria-label="API key providers">
        {providers.map((candidate) => (
          <button
            key={candidate.id}
            type="button"
            role="tab"
            id={`api-key-tab-${candidate.id}`}
            aria-selected={activeId === candidate.id}
            aria-controls="api-key-panel"
            className={clsx(styles.tab, {
              [styles.activeTab]: activeId === candidate.id,
            })}
            onClick={() => setActiveId(candidate.id)}
          >
            {candidate.label}
          </button>
        ))}
      </div>

      <div
        className={styles.panel}
        role="tabpanel"
        id="api-key-panel"
        aria-labelledby={`api-key-tab-${provider.id}`}
      >
        <p className={styles.description}>{provider.description}</p>

        <div className={styles.fieldGroup}>
          <span className={styles.fieldLabel}>Base URL</span>
          <div className={styles.fieldRow}>
            <code className={styles.fieldValue}>{provider.baseUrl}</code>
            <CopyButton text={provider.baseUrl} label="Copy base URL" />
          </div>
        </div>

        <div className={styles.fieldGroup}>
          <span className={styles.fieldLabel}>Authentication header</span>
          <div className={styles.fieldRow}>
            <code className={styles.fieldValue}>{headerLine}</code>
            <CopyButton text={headerLine} label="Copy auth header" />
          </div>
        </div>

        <CodeBlock language="bash" title="Example request">
          {curlExample}
        </CodeBlock>

        <p className={styles.note}>
          Keep your API key secret: never commit it to source control. Send it on
          every request. See{" "}
          <a href="/docs/docs/maps/api-keys">API Keys &amp; Authentication</a> for
          the full details.
        </p>
      </div>
    </section>
  );
}
