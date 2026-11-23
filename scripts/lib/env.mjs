// Shared environment settings for the site build and the scripts.
//
// Docusaurus 3.10 does not read .env files itself, so they are loaded here.
// Secrets (the gateway key, the display-only map source) belong in .env.local,
// which is git-ignored and never committed. See README "Environment settings".

import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const SITE_DIR = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

// The gateway clients integrate with. The documentation is handed to clients,
// so this default - and every build shared outside the team - must point at the
// client-facing gateway, never at an internal (non-production) deployment.
const DEFAULT_GATEWAY_BASE = "https://apina.address.gov.sa/b2b";
const DEFAULT_KEY_HEADER = "Ocp-Apim-Subscription-Key";

// Minimal KEY=VALUE parser (no dependency): comments, blank lines, an optional
// `export` prefix, and single- or double-quoted values.
export function parseEnvFile(content) {
  const values = {};
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const match = /^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(line);
    if (!match) continue;
    let value = match[2].trim();
    const quoted =
      (value.startsWith('"') && value.endsWith('"') && value.length > 1) ||
      (value.startsWith("'") && value.endsWith("'") && value.length > 1);
    if (quoted) {
      value = value.slice(1, -1);
      if (rawLine.includes('"')) value = value.replace(/\\n/g, "\n");
    } else {
      const comment = value.indexOf(" #");
      if (comment !== -1) value = value.slice(0, comment).trim();
    }
    values[match[1]] = value;
  }
  return values;
}

// Loads .env.local into process.env. Variables that are already set (shell,
// CI, Docker build args) take precedence and are left untouched.
export function loadLocalEnv(siteDir = SITE_DIR) {
  const file = resolve(siteDir, ".env.local");
  if (!existsSync(file)) return {};
  const loaded = {};
  for (const [name, value] of Object.entries(parseEnvFile(readFileSync(file, "utf8")))) {
    if (process.env[name] === undefined) {
      process.env[name] = value;
      loaded[name] = value;
    }
  }
  return loaded;
}

const stripTrailingSlash = (url) => String(url || "").trim().replace(/\/+$/, "");

// The single source of truth for what the documentation describes.
//
//   SPL_GATEWAY_BASE         base URL of the documented gateway
//   SPL_GATEWAY_KEY_HEADER   header that carries the key
//   SPL_GATEWAY_KEY          the key itself (secret - .env.local only)
//   SPL_ENVIRONMENT          "test" (default) adds the "testing and evaluation
//                            only" notice; "production" removes it
//   SPL_PREVIEW_STYLES_BASE  optional: draw the demo map from a style server
//                            instead of the gateway (display only; never shown)
export function getSplSettings() {
  loadLocalEnv();
  const environment = process.env.SPL_ENVIRONMENT === "production" ? "production" : "test";

  return {
    environment,
    gateway: {
      base: stripTrailingSlash(process.env.SPL_GATEWAY_BASE) || DEFAULT_GATEWAY_BASE,
      keyHeader: (process.env.SPL_GATEWAY_KEY_HEADER || DEFAULT_KEY_HEADER).trim(),
      key: (process.env.SPL_GATEWAY_KEY || "").trim(),
    },
    // When set, the interactive map is drawn from this server and the gateway
    // key is not needed, so it is kept out of the build entirely.
    preview: { base: stripTrailingSlash(process.env.SPL_PREVIEW_STYLES_BASE) },
  };
}
