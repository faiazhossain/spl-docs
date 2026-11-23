// @ts-check
// `@type` JSDoc annotations allow editor autocompletion and type checking
// (when paired with `@ts-check`).
// See: https://docusaurus.io/docs/api/docusaurus-config

// This runs in Node.js - don't use client-side code here (browser APIs, JSX...).
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { themes as prismThemes } from "prism-react-renderer";
import { SITE_DIR, getSplSettings } from "./scripts/lib/env.mjs";

// Which gateway the documentation describes, and how the demo map is drawn.
// Everything comes from the environment (see README "Environment settings"),
// so a build can never mix endpoints from different environments.
const spl = getSplSettings();

// Placeholders that the guides use instead of typing an address by hand. They
// are replaced when the markdown is read, so every page, code sample and link
// shows the gateway of the current build.
const DOC_PLACEHOLDERS = {
  "{{gatewayBase}}": spl.gateway.base,
  "{{gatewayKeyHeader}}": spl.gateway.keyHeader,
};

/** @type {import('@docusaurus/types').MarkdownPreprocessor} */
function resolvePlaceholders({ filePath, fileContent }) {
  if (!fileContent.includes("{{")) return fileContent;
  let content = fileContent;
  for (const [placeholder, value] of Object.entries(DOC_PLACEHOLDERS)) {
    content = content.split(placeholder).join(value);
  }
  // A misspelled placeholder must fail the build instead of reaching readers.
  const unknown = /\{\{\s*gateway[A-Za-z]*\s*\}\}/i.exec(content);
  if (unknown) {
    throw new Error(
      `${filePath}: unknown placeholder "${unknown[0]}". Supported: ${Object.keys(DOC_PLACEHOLDERS).join(", ")}.`
    );
  }
  return content;
}

// The API reference describes the same gateway as the guides. openapi.json
// uses the {{gatewayBase}} placeholder, resolved here into a file that the
// redocusaurus theme reads. A remote spec (API_SPEC_URL) is used unchanged.
function resolveOpenApiSpec() {
  const source = process.env.API_SPEC_URL;
  if (source && /^https?:\/\//.test(source)) return source;
  const specPath = source ? resolve(SITE_DIR, source) : join(SITE_DIR, "openapi.json");
  if (!existsSync(specPath)) {
    throw new Error(`OpenAPI spec not found at ${specPath}.`);
  }
  const resolved = readFileSync(specPath, "utf8")
    .split("{{gatewayBase}}")
    .join(spl.gateway.base)
    .split("{{gatewayKeyHeader}}")
    .join(spl.gateway.keyHeader);
  const outDir = join(SITE_DIR, "node_modules", ".cache", "spl-docs");
  const outPath = join(outDir, "openapi.resolved.json");
  mkdirSync(outDir, { recursive: true });
  writeFileSync(outPath, resolved);
  return outPath;
}

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: "SPL Documentation",
  tagline: "Location Services & Mapping Platform",
  favicon: "img/favicon.ico",

  // Future flags, see https://docusaurus.io/docs/api/docusaurus-config#future
  future: {
    v4: true, // Improve compatibility with the upcoming Docusaurus v4
  },

  // Set the production url of your site here
  url: "https://na-maps.vng-solutions.com",
  // Set the /<baseUrl>/ pathname under which your site is served
  // For GitHub pages deployment, it is often '/<projectName>/'
  baseUrl: "/docs/", // Make sure baseUrl ends with a trailing slash

  // GitHub pages deployment config.
  // If you aren't using GitHub pages, you don't need these.
  organizationName: "spl", // Usually your GitHub org/user name.
  projectName: "spl-documentation", // Usually your repo name.

  customFields: {
    splGateway: {
      base: spl.gateway.base,
      keyHeader: spl.gateway.keyHeader,
      // The key is only needed when the demo map loads through the gateway.
      key: spl.preview.base ? "" : spl.gateway.key,
    },
    splEnvironment: spl.environment,
    // Display-only source for the demo map. It is never shown in the docs.
    splPreview: spl.preview,
  },

  onBrokenLinks: "warn",

  markdown: {
    // The guides write note boxes as `:::note Title`. That title form is only
    // converted into a note box when this compatibility option is on.
    mdx1Compat: {
      admonitions: true,
    },
    hooks: {
      onBrokenMarkdownLinks: "warn",
      onBrokenMarkdownImages: "warn",
    },
    preprocessor: resolvePlaceholders,
  },

  // Even if you don't use internationalization, you can use this field to set
  // useful metadata like html lang. For example, if your site is Chinese, you
  // may want to replace "en" with "zh-Hans".
  i18n: {
    defaultLocale: "en",
    locales: ["en"],
  },

  // Ensure assets are correctly prefixed
  staticDirectories: ["static"],
  trailingSlash: true,

  presets: [
    [
      "classic",
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: {
          sidebarPath: "./sidebars.js",
        },
        theme: {
          customCss: "./src/css/custom.css",
        },
      }),
    ],
    [
      "redocusaurus",
      {
        openapi: {
          // Folder to scan for *.openapi.yaml files
          path: "openapi",
          routeBasePath: "/api",
        },
        specs: [
          {
            spec: resolveOpenApiSpec(),
            id: "spl-redoc",
            route: "/api",
          },
        ],
        // Theme Options for modifying how redoc renders them
        theme: {
          // Change with your site colors
          primaryColor: "#003566",
        },
      },
    ],
  ],

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      // Replace with your project's social card
      image: "img/spl-logo.webp",
      navbar: {
        title: "SPL",
        logo: {
          alt: "Spl Logo",
          src: "img/spl-logo.webp",
        },
        items: [
          { to: "api", label: "API", position: "left" },
          { to: "maps", label: "Maps", position: "left" },
          {
            type: "doc",
            docId: "maps/using-spl-maps",
            label: "Developers guide",
            position: "left",
            items: [
              {
                type: "doc",
                docId: "maps/api-keys",
                label: "API Keys & Authentication",
              },
              {
                type: "doc",
                docId: "maps/html-map-viewer",
                label: "HTML Map Viewer",
              },
              {
                type: "doc",
                docId: "maps/using-spl-maps",
                label: "Using SPL Maps",
              },
              {
                type: "doc",
                docId: "maps/react-native",
                label: "React Native Guide",
              },
              {
                type: "doc",
                docId: "maps/arcgis-qgis-integration",
                label: "ArcGIS & QGIS Integration",
              },
              {
                type: "doc",
                docId: "maps/maplibre-resources",
                label: "MapLibre Resources",
              },
            ],
          },
          {
            href: "https://na-maps.vng-solutions.com/dashboard",
            label: "Use our map",
            position: "right",
          },
        ],
      },
      footer: {
        style: "dark",
        copyright: `Copyright © ${new Date().getFullYear()} Saudi Post Limited`,
      },
      prism: {
        theme: prismThemes.github,
        darkTheme: prismThemes.dracula,
      },
    }),
};

export default config;
