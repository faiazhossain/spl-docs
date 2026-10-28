import React, { useState } from "react";
import clsx from "clsx";
import CodeBlock from "@theme/CodeBlock";
import CopyButton from "../CopyButton";
import styles from "./styles.module.css";

// Example request per provider. Both gateways serve map styles; the Azure
// example mirrors the verified working request (style JSON returns 200 with
// the subscription key).
const API_PROVIDERS = [
  {
    id: "b2b",
    label: "B2B (Apigee)",
    baseUrl: "https://b2b.address.gov.sa",
    headerName: "x-apikey",
    keyPlaceholder: "YOUR_B2B_API_KEY",
    examplePath: "/styles/spl_satellite/style.json",
    description:
      "For API keys issued through the SPL B2B (Apigee) gateway. Use this key against the B2B base URL.",
  },
  {
    id: "azure",
    label: "Azure",
    baseUrl: "https://apina.address.gov.sa/b2b",
    headerName: "Ocp-Apim-Subscription-Key",
    keyPlaceholder: "YOUR_AZURE_API_KEY",
    examplePath: "/styles/spl_satellite/style.json",
    description:
      "For API keys issued through Azure. Azure keys work against the Azure gateway for the v1 GeoSearch endpoints and map styles. See the API Keys & Authentication page for current rendering limitations.",
  },
];

export default function ApiKeyGuide() {
  const [activeId, setActiveId] = useState(API_PROVIDERS[0].id);
  const provider =
    API_PROVIDERS.find((candidate) => candidate.id === activeId) ||
    API_PROVIDERS[0];

  const headerLine = `${provider.headerName}: ${provider.keyPlaceholder}`;
  const curlExample = `curl --location '${provider.baseUrl}${provider.examplePath}' \\
--header '${headerLine}'`;

  return (
    <section className={styles.apiKeyGuide}>
      <h2>API Keys</h2>
      <p>
        Every request to the SPL Maps API must be authenticated with an API
        key. Keys are issued through one of two gateways - use the tab that
        matches where your key came from.
      </p>

      <div
        className={styles.tabs}
        role='tablist'
        aria-label='API key providers'
      >
        {API_PROVIDERS.map((candidate) => (
          <button
            key={candidate.id}
            type='button'
            role='tab'
            id={`api-key-tab-${candidate.id}`}
            aria-selected={activeId === candidate.id}
            aria-controls='api-key-panel'
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
        role='tabpanel'
        id='api-key-panel'
        aria-labelledby={`api-key-tab-${provider.id}`}
      >
        <p className={styles.description}>{provider.description}</p>

        <div className={styles.fieldGroup}>
          <span className={styles.fieldLabel}>Base URL</span>
          <div className={styles.fieldRow}>
            <code className={styles.fieldValue}>{provider.baseUrl}</code>
            <CopyButton text={provider.baseUrl} label='Copy base URL' />
          </div>
        </div>

        <div className={styles.fieldGroup}>
          <span className={styles.fieldLabel}>Authentication header</span>
          <div className={styles.fieldRow}>
            <code className={styles.fieldValue}>{headerLine}</code>
            <CopyButton text={headerLine} label='Copy auth header' />
          </div>
        </div>

        <CodeBlock language='bash' title='Example request'>
          {curlExample}
        </CodeBlock>

        <p className={styles.note}>
          Keep your API key secret: never hard-code it in client-side code or
          commit it to source control. Send it on every request.
        </p>
      </div>
    </section>
  );
}
