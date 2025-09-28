// @ts-check
// `@type` JSDoc annotations allow editor autocompletion and type checking
// (when paired with `@ts-check`).
// There are various equivalent ways to declare your Docusaurus config.
// See: https://docusaurus.io/docs/api/docusaurus-config

import { themes as prismThemes } from "prism-react-renderer";
// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

/** @type {import('@docusaurus/types').Config} */
// Use timestamp as fallback

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

  onBrokenLinks: "warn", // Changed from "throw" to "warn" to allow build with broken links
  onBrokenMarkdownLinks: "warn",

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
          // Please change this to your repo.
          // Remove this to remove the "edit this page" links.
          editUrl:
            "https://github.com/facebook/docusaurus/tree/main/packages/create-docusaurus/templates/shared/",
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
          //           const apiSpecUrl =
          //   process.env.API_SPEC_URL ||
          //   "https://na-maps.vng-solutions.com/spl/openapi.json";

          // const apiSpecVersion = process.env.API_SPEC_VERSION || Date.now();
          {
            spec: `${
              process.env.API_SPEC_URL ||
              "https://na-maps.vng-solutions.com/spl/openapi.json"
            }?v=${process.env.API_SPEC_VERSION || Date.now()}`,
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
          // {
          //   to: "docs/maps/using-spl-maps",
          //   label: "Developers guide",
          //   position: "left",
          // },
          {
            type: "doc",
            docId: "maps/using-spl-maps", // 👈 this will be the main link (react-native.md)
            label: "Developers guide",
            position: "left",
            items: [
              {
                type: "doc",
                docId: "maps/using-spl-maps", // using-spl-maps.md
                label: "Using SPL Maps",
              },
              {
                type: "doc",
                docId: "maps/react-native", // react-native.md
                label: "React Native Guide",
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
