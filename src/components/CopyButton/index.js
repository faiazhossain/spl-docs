import React, { useState } from "react";
import styles from "./styles.module.css";

export default function CopyButton({ text, label = "Copy" }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <button
      onClick={handleCopy}
      className={styles.copyButton}
      aria-label={label}
      title={label}
    >
      {copied ? (
        <>
          <span className={styles.copyIcon}>✓</span>
          <span className={styles.copyText}>Copied!</span>
        </>
      ) : (
        <>
          <span className={styles.copyIcon}>📋</span>
        </>
      )}
    </button>
  );
}
