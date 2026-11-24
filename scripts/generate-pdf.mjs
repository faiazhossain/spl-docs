#!/usr/bin/env node
// Generates a single self-contained PDF backup of the SPL documentation site
// (guides + OpenAPI reference) from the static build output in ./build.
//
// Usage:
//   npm run pdf        (builds the site, then generates ./spl-docs.pdf)
//   node scripts/generate-pdf.mjs   (uses the existing ./build output)
//
// The PDF has a cover page, clickable outline bookmarks for every section,
// and page numbers, so developers can use it fully offline if the site is down.

import { createServer } from "node:http";
import { existsSync, mkdirSync, statSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { execSync } from "node:child_process";
import { extname, join, normalize, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer-core";
import {
  PDFDocument,
  PDFName,
  PDFHexString,
  StandardFonts,
  rgb,
} from "pdf-lib";
import { getSplSettings } from "./lib/env.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const BUILD_DIR = join(ROOT, "build");
const OUTPUT = join(ROOT, "spl-docs.pdf");
// The site is deployed under /docs/ (see baseUrl in docusaurus.config.js),
// so every URL on the static build carries that prefix.
const BASE_PATH = "/docs/";

// What the documentation describes, and how the demo map is drawn.
const spl = getSplSettings();
// Values that must never appear in a PDF that is shared with clients.
const SECRETS = {
  "gateway API key": spl.gateway.key,
  "display-only map server": spl.preview.base ? new URL(spl.preview.base).host : "",
};

// Reading order of the PDF. Paths are relative to the baseUrl, so
// "docs/maps/api-keys/" is served at /docs/docs/maps/api-keys/.
const SECTIONS = [
  {
    path: "maps/",
    fallbackTitle: "SPL Map Styles Explorer",
    // The interactive map has to be fully drawn before the page is printed.
    map: true,
  },
  { path: "docs/maps/using-spl-maps/", fallbackTitle: "Using SPL Maps" },
  { path: "docs/maps/api-keys/", fallbackTitle: "API Keys & Authentication" },
  { path: "docs/maps/html-map-viewer/", fallbackTitle: "HTML Map Viewer" },
  { path: "docs/maps/react-native/", fallbackTitle: "React Native Guide" },
  {
    path: "docs/maps/arcgis-qgis-integration/",
    fallbackTitle: "ArcGIS & QGIS Integration",
  },
  {
    path: "docs/maps/maplibre-resources/",
    fallbackTitle: "MapLibre Resources",
  },
  { path: "docs/maps/rtl-text-support/", fallbackTitle: "RTL Text Support" },
  { path: "api/", fallbackTitle: "API Reference (OpenAPI)" },
];

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css",
  ".js": "application/javascript",
  ".mjs": "application/javascript",
  ".json": "application/json",
  ".xml": "application/xml",
  ".txt": "text/plain",
  ".map": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".wasm": "application/wasm",
};

// Content that must not appear in the shared PDF: the internal SPL B2B
// (Apigee) gateway and its domain. Matched case-sensitively on purpose, so
// Azure gateway URLs such as https://apina.address.gov.sa/b2b are preserved.
const EXCLUDED_TEXT_PATTERN = "B2B|b2b\\.address\\.gov\\.sa";

// Strips interactive site chrome so only documentation content prints.
const PRINT_CSS = `
  .navbar, .navbar-sidebar, .footer, .theme-doc-sidebar-container,
  .theme-doc-toc-desktop, .theme-doc-toc-mobile, .theme-doc-footer,
  .pagination-nav, .theme-doc-breadcrumbs, .theme-back-to-top-button,
  .theme-edit-this-page, .announcement {
    display: none !important;
  }

  /* Docs main column takes the full width once sidebar/TOC are gone. */
  .row > .col:only-child {
    --ifm-col-width: 100% !important;
    flex: 0 0 100% !important;
    max-width: 100% !important;
  }
  .markdown { max-width: 100% !important; }

  /* Wrap long lines instead of clipping code samples at the page edge. Short
     inline codes such as "401" stay on one line: break only what overflows. */
  pre, pre code { white-space: pre-wrap !important; overflow-wrap: anywhere !important; }
  :not(pre) > code { white-space: normal !important; overflow-wrap: break-word; }
  td, th { overflow-wrap: break-word; }

  *, *::before, *::after {
    animation: none !important;
    transition: none !important;
  }
  img { max-width: 100% !important; height: auto !important; }

  /* Keep headings with the content that follows them. */
  h1, h2, h3, h4 { break-after: avoid-page; }
  img, tr, blockquote { break-inside: avoid-page; }

  /* Keep small boxes whole: a note or a style card is never split. */
  .alert, [class*="styleOption"] { break-inside: avoid; page-break-inside: avoid; }

  /* The map is printed as one landscape picture that stays on one page. */
  [class*="mapWrapper"] {
    height: auto !important;
    min-height: 0 !important;
    aspect-ratio: 16 / 10;
    break-inside: avoid; page-break-inside: avoid;
  }

  /* A table's first column stays wide enough for "HTTP" and a status code. */
  th:first-child, td:first-child { min-width: 4.5rem; }

  /* Reveal every tab panel: a print capture must not lose the content of
     inactive tabs (e.g. the Azure gateway docs under the B2B/Azure tabs). */
  [role="tabpanel"] { display: block !important; }
  [role="tabpanel"] ~ [role="tabpanel"] {
    margin-top: 1.5rem;
    padding-top: 1rem;
    border-top: 1px dashed #bbb;
  }
  /* Redoc leaves its inactive tabs empty; shown, they print as dark bars. */
  [role="tabpanel"]:empty { display: none !important; border: 0 !important; margin: 0 !important; padding: 0 !important; }

  /* Gallery of every map style, two pictures per row with captions. */
  .pdf-style-gallery { columns: 2; column-gap: 8mm; margin-top: 6mm; }
  .pdf-style-gallery h2 { column-span: all; break-after: avoid-page; margin-bottom: 4mm; }
  .pdf-style-item { break-inside: avoid; page-break-inside: avoid; margin: 0 0 7mm; }
  .pdf-style-item img { width: 100%; aspect-ratio: 16 / 10; object-fit: cover; border: 0.4pt solid #c8cdd6; border-radius: 3px; }
  .pdf-style-item figcaption { font-size: 9.5pt; font-weight: 600; color: #003566; margin-top: 2mm; }
`;

// A4 with the margins used for the PDF, in CSS pixels. The Maps page is laid
// out at this size before its map is captured, so the picture fits its frame.
const PRINT_WIDTH_PX = Math.round(((210 - 12 - 12) / 25.4) * 96);
const PRINT_HEIGHT_PX = Math.round(((297 - 16 - 18) / 25.4) * 96);

function findChrome() {
  if (process.env.PUPPETEER_EXECUTABLE_PATH) {
    return process.env.PUPPETEER_EXECUTABLE_PATH;
  }
  const programFiles = process.env.PROGRAMFILES || "C:\\Program Files";
  const programFilesX86 = process.env["PROGRAMFILES(X86)"] || "C:\\Program Files (x86)";
  const localAppData = process.env.LOCALAPPDATA || "";
  const candidates = [
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
    // Windows: Chrome, or Edge (Chromium-based) when Chrome is not installed.
    join(programFiles, "Google", "Chrome", "Application", "chrome.exe"),
    join(programFilesX86, "Google", "Chrome", "Application", "chrome.exe"),
    join(localAppData, "Google", "Chrome", "Application", "chrome.exe"),
    join(programFiles, "Microsoft", "Edge", "Application", "msedge.exe"),
    join(programFilesX86, "Microsoft", "Edge", "Application", "msedge.exe"),
  ];
  const found = candidates.find((candidate) => existsSync(candidate));
  if (!found) {
    throw new Error(
      "Google Chrome not found. Install Chrome or set PUPPETEER_EXECUTABLE_PATH to the browser binary."
    );
  }
  return found;
}

// Serves the static build output under BASE_PATH, mirroring the production
// URL layout so absolute asset URLs resolve correctly.
function startStaticServer() {
  const missing = new Set();
  const server = createServer(async (req, res) => {
    let pathname;
    try {
      pathname = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
    } catch {
      res.writeHead(400);
      res.end("bad request");
      return;
    }
    if (!pathname.startsWith(BASE_PATH)) {
      res.writeHead(404);
      res.end("not found");
      missing.add(pathname);
      return;
    }
    const rel = pathname.slice(BASE_PATH.length);
    let filePath = normalize(join(BUILD_DIR, rel));
    if (!filePath.startsWith(BUILD_DIR)) {
      res.writeHead(403);
      res.end("forbidden");
      return;
    }
    // Directory-style URLs (trailingSlash: true) map to <dir>/index.html.
    const isDirectory = (path) => {
      try {
        return statSync(path).isDirectory();
      } catch {
        return false;
      }
    };
    if (isDirectory(filePath)) {
      filePath = join(filePath, "index.html");
    }
    if (!existsSync(filePath)) {
      res.writeHead(404);
      res.end("not found");
      missing.add(pathname);
      return;
    }
    try {
      const data = await readFile(filePath);
      res.writeHead(200, {
        "content-type": MIME_TYPES[extname(filePath).toLowerCase()] || "application/octet-stream",
      });
      res.end(data);
    } catch (error) {
      console.error(`Failed to serve ${pathname}:`, error.message);
      res.writeHead(500);
      res.end("server error");
    }
  });
  return new Promise((resolveServer) => {
    server.listen(0, "127.0.0.1", () => {
      resolveServer({ server, missing, port: server.address().port });
    });
  });
}

// Scrolls through the page so lazily loaded content and fonts are fetched.
async function autoScroll(page) {
  await page.evaluate(async () => {
    await new Promise((resolveScroll) => {
      let position = 0;
      const step = () => {
        position += 800;
        window.scrollTo(0, position);
        if (position >= document.body.scrollHeight) {
          window.scrollTo(0, 0);
          resolveScroll();
          return;
        }
        setTimeout(step, 40);
      };
      step();
    });
  });
}

async function renderCover(browser, entries, commitSha) {
  const page = await browser.newPage();
  const generatedAt = new Date().toISOString().slice(0, 10);
  const tocItems = entries
    .map(
      (entry, index) =>
        `<li><span class="num">${index + 1}</span> ${entry.title}</li>`
    )
    .join("\n");
  // The cover repeats the notice that every guide starts with.
  const notice =
    spl.environment === "test"
      ? `<p class="notice"><strong>For testing and evaluation only.</strong> This documentation and its endpoints are intended for testing and evaluation purposes only, not for production integration.</p>`
      : "";
  const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      /* Clip overflow so the cover always stays a single PDF page. */
      html, body { overflow: hidden; }
      body {
        font-family: -apple-system, "Segoe UI", Helvetica, Arial, sans-serif;
        color: #1c1e21;
      }
      .band { height: 14mm; background: #003566; }
      .cover {
        height: calc(100vh - 14mm);
        padding: 0 24mm;
        display: flex;
        flex-direction: column;
        justify-content: center;
      }
      .band { height: 14mm; background: #003566; }
      h1 { color: #003566; font-size: 44pt; margin-bottom: 6mm; }
      .tagline { font-size: 15pt; color: #444; margin-bottom: 18mm; }
      .toc { font-size: 12pt; line-height: 2; list-style: none; margin-bottom: 18mm; }
      .toc .num {
        display: inline-block;
        width: 10mm;
        color: #003566;
        font-weight: 600;
      }
      .notice { font-size: 11pt; line-height: 1.5; color: #7a4b00; background: #fdf3d8; border-left: 4px solid #e0a800; padding: 3mm 4mm; margin-bottom: 8mm; }
      .meta { font-size: 10pt; color: #666; line-height: 1.7; }
    </style>
  </head>
  <body>
    <div class="band"></div>
    <div class="cover">      <h1>SPL Documentation</h1>
      <p class="tagline">Location Services &amp; Mapping Platform - Offline PDF Backup</p>
      ${notice}
      <ul class="toc">${tocItems}</ul>
      <p class="meta">
        Generated: ${generatedAt}<br />
        Source: https://na-maps.vng-solutions.com/docs/<br />
        Revision: ${commitSha}<br />
        Regenerate with: <code>npm run pdf</code>
      </p>
    </div>
  </body>
</html>`;
  await page.setContent(html, { waitUntil: "load" });
  const bytes = await page.pdf({
    format: "A4",
    printBackground: true,
    margin: { top: "0", bottom: "0", left: "0", right: "0" },
  });
  await page.close();
  return bytes;
}

// Removes every element that mentions the B2B gateway or its domain, so the
// shared PDF contains no internal B2B content.
//
// Tab groups are handled first: the B2B tab button and its panel are dropped,
// and a tab bar left with a single option is removed entirely (one remaining
// option needs no tab UI). Everything else is stripped at block level: a
// matching paragraph, list item, code block, table row or heading is removed,
// including the enclosing block when only an inline element (e.g. a code
// sample) matches, so no dangling labels are left behind.
async function stripB2BContent(page) {
  const removed = await page.evaluate((pattern) => {
    const re = new RegExp(pattern);
    const counts = { tabs: 0, panels: 0, blocks: 0 };

    document.querySelectorAll('[role="tablist"]').forEach((list) => {
      const buttons = Array.from(list.querySelectorAll('[role="tab"]'));
      const b2bIndexes = buttons
        .map((button, index) => ({ button, index }))
        .filter(({ button }) => re.test(button.textContent || ""))
        .map(({ index }) => index);
      if (b2bIndexes.length === 0) return;

      const container = list.closest(".tabs-container") || list.parentElement;
      const panels = Array.from(container.querySelectorAll('[role="tabpanel"]'));
      b2bIndexes
        .slice()
        .sort((a, b) => b - a)
        .forEach((index) => {
          buttons[index]?.remove();
          panels[index]?.remove();
          counts.tabs += 1;
          counts.panels += 1;
        });

      if (list.querySelectorAll('[role="tab"]').length <= 1) {
        list.remove();
      }
    });

    const BLOCK_TAGS = new Set([
      "P", "LI", "PRE", "BLOCKQUOTE", "TD", "TH", "DT", "DD", "TR", "TABLE",
      "H1", "H2", "H3", "H4", "H5", "H6", "FIGCAPTION", "SUMMARY",
    ]);
    const enclosingBlock = (element) => {
      let node = element;
      while (node && node !== document.body) {
        if (BLOCK_TAGS.has(node.tagName)) return node;
        node = node.parentElement;
      }
      return null;
    };

    // Only the deepest matching element is considered, so a container with a
    // matching descendant is kept and the offending block inside it is
    // removed instead.
    const targets = new Set();
    document.querySelectorAll("body *").forEach((element) => {
      if (element.closest("script, style, noscript, [role='tablist']")) return;
      if (!re.test(element.textContent || "")) return;
      const hasMatchingChild = Array.from(element.children).some((child) =>
        re.test(child.textContent || "")
      );
      if (hasMatchingChild) return;
      const block = enclosingBlock(element);
      if (block) targets.add(block);
    });
    targets.forEach((element) => element.remove());
    counts.blocks = targets.size;
    return counts;
  }, EXCLUDED_TEXT_PATTERN);

  console.log(
    `  stripped B2B content: ${removed.tabs} tab(s), ${removed.panels} panel(s), ${removed.blocks} block(s)`
  );
}

// Waits for the interactive map to finish loading. The map component reports
// its state in a data attribute (see src/components/MapComponent).
async function waitForMap(page) {
  const deadline = Date.now() + 120000;
  let last = { state: "none", message: "" };
  while (Date.now() < deadline) {
    last = await page.evaluate(() => {
      const element = document.querySelector("[data-map-state]");
      return element
        ? { state: element.dataset.mapState, message: element.dataset.mapMessage || "" }
        : { state: "none", message: "The map is missing from the page." };
    });
    if (last.state === "ready" || last.state === "error") break;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  if (last.state !== "ready") {
    // A PDF with an error message or a blank map must not reach clients.
    throw new Error(
      `The map on the Maps page did not load (state: ${last.state}). ${last.message}` +
        " Fix the map access first, then run the PDF generation again."
    );
  }
  // Let the last tiles, labels and icons paint.
  await new Promise((resolve) => setTimeout(resolve, 3000));
}

// Samples a captured picture and reports how much of it is actually drawn,
// so a blank or empty picture can never reach the PDF.
async function pictureStats(page, base64) {
  return page.evaluate(async (data) => {
    const image = new Image();
    image.src = `data:image/png;base64,${data}`;
    await image.decode();
    const probe = document.createElement("canvas");
    probe.width = image.width;
    probe.height = image.height;
    const context = probe.getContext("2d");
    context.drawImage(image, 0, 0);
    const pixels = context.getImageData(0, 0, probe.width, probe.height).data;
    let sampled = 0;
    let drawn = 0;
    for (let i = 0; i < pixels.length; i += 4 * 61) {
      sampled += 1;
      if (pixels[i + 3] > 0 && (pixels[i] < 235 || pixels[i + 1] < 235 || pixels[i + 2] < 235)) drawn += 1;
    }
    return { width: image.width, height: image.height, sampled, drawn };
  }, base64);
}

// Clicks through every style card on the Maps page, zooms each view in far
// enough for POIs to appear, and appends a labelled picture of every style
// as a gallery the print step captures. Call it while the map is still
// interactive, before captureMap replaces the canvas with a picture.
async function captureStyleGallery(page) {
  const cards = await page.$$('[class*="styleOption"]');
  if (cards.length <= 1) return;

  const pictureDir = join(ROOT, "node_modules", ".cache", "spl-docs", "style-pictures");
  mkdirSync(pictureDir, { recursive: true });

  const waitReady = () =>
    page.waitForFunction(
      () => {
        const state = document.querySelector("[data-map-state]")?.getAttribute("data-map-state");
        return state === "ready" || state === "error";
      },
      { timeout: 90000, polling: 200 }
    );
  const waitState = (state, timeout) =>
    page.waitForFunction(
      (expected) => document.querySelector("[data-map-state]")?.getAttribute("data-map-state") === expected,
      { timeout, polling: 150 },
      state
    ).catch(() => false);

  // Selects a style card and waits until its map is drawn. Returns false when
  // the display-only server does not carry the style (HTTP 404), so the caller
  // can skip it; throws for every other failure.
  const switchStyle = async (card, title) => {
    await card.click();
    // "loading" can be too quick to observe, so only "ready" is awaited.
    await waitState("loading", 5000);
    try {
      await waitReady();
    } catch {
      const state = await page.evaluate(() => ({
        state: document.querySelector("[data-map-state]")?.getAttribute("data-map-state"),
        message: document.querySelector("[data-map-state]")?.getAttribute("data-map-message") || "",
      }));
      throw new Error(
        `The style "${title}" did not load (state: ${state.state}). ${state.message} ` +
          "Fix the map access first, then run the PDF generation again."
      );
    }
    const state = await page.evaluate(() => ({
      state: document.querySelector("[data-map-state]")?.getAttribute("data-map-state"),
      message: document.querySelector("[data-map-state]")?.getAttribute("data-map-message") || "",
    }));
    if (state.state === "error") {
      if (state.message.includes("HTTP 404")) return false;
      throw new Error(
        `The style "${title}" failed to load. ${state.message} Fix the map access first, then run the PDF generation again.`
      );
    }
    return true;
  };

  const items = [];
  for (const card of cards) {
    const title = await card.$eval("h3", (el) => el.textContent.trim());
    const loaded = await switchStyle(card, title);
    if (!loaded) {
      console.log(`  style skipped: ${title} (not on the display-only map server)`);
      continue;
    }
    // Zoom in so POIs are visible: the map handle exposed by the component
    // drives the view to a fixed downtown-Riyadh location at street zoom.
    const zoomed = await page.evaluate(() => {
      const map = window.__splDemoMap;
      if (!map) return false;
      map.jumpTo({ center: [46.6853, 24.7009], zoom: 15.2 });
      return true;
    });
    if (!zoomed) {
      throw new Error("The map handle is missing from the page, so the style views cannot be zoomed in.");
    }
    await page.waitForNetworkIdle({ idleTime: 600, timeout: 30000 }).catch(() => {});
    await new Promise((resolve) => setTimeout(resolve, 2500));
    const canvas = await page.$("canvas.maplibregl-canvas");
    if (!canvas) {
      throw new Error(`The map canvas is missing from the page after loading "${title}".`);
    }
    const state = await page.evaluate(
      () => document.querySelector("[data-map-state]")?.getAttribute("data-map-state")
    );
    if (state === "error") {
      const message = await page.evaluate(
        () => document.querySelector("[data-map-state]")?.getAttribute("data-map-message") || ""
      );
      throw new Error(
        `The style "${title}" failed while drawing. ${message} Fix the map access first, then run the PDF generation again.`
      );
    }
    const picture = await canvas.screenshot({ type: "png" });
    const stats = await pictureStats(page, picture.toString("base64"));
    if (stats.width < 200 || stats.height < 200 || stats.sampled === 0 || stats.drawn < stats.sampled * 0.02) {
      throw new Error(
        `The picture of "${title}" is blank (${stats.drawn} of ${stats.sampled} sampled pixels drawn), so the PDF was not created.`
      );
    }
    await writeFile(
      join(pictureDir, `${title.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.png`),
      picture
    );
    items.push({ title, base64: picture.toString("base64") });
    console.log(
      `  style captured: ${title} (${stats.width}x${stats.height}, ${Math.round((stats.drawn / stats.sampled) * 100)}% drawn)`
    );
  }

  // Back to the first style so the main map picture matches the page default.
  await switchStyle(cards[0], "default");
  await page.waitForNetworkIdle({ idleTime: 500, timeout: 30000 }).catch(() => {});
  await new Promise((resolve) => setTimeout(resolve, 1500));

  await page.evaluate((styleItems) => {
    const gallery = document.createElement("div");
    gallery.className = "pdf-style-gallery";
    const heading = document.createElement("h2");
    heading.textContent = "All map styles";
    gallery.append(heading);
    for (const item of styleItems) {
      const figure = document.createElement("figure");
      figure.className = "pdf-style-item";
      const image = document.createElement("img");
      image.src = `data:image/png;base64,${item.base64}`;
      image.alt = `${item.title} map preview, zoomed in`;
      const caption = document.createElement("figcaption");
      caption.textContent = item.title;
      figure.append(image, caption);
      gallery.append(figure);
    }
    document.querySelector(".container")?.append(gallery);
  }, items);
}

// Fails when a value that must stay out of the shared PDF is visible on a page.
async function assertNoSecrets(page) {
  const text = await page.evaluate(() => document.body.innerText);
  for (const [label, value] of Object.entries(SECRETS)) {
    if (value && text.includes(value)) {
      throw new Error(
        `The ${label} appears in the visible text of ${page.url()}. It must not be part of the shared PDF.`
      );
    }
  }
}

// The map is drawn with WebGL, which the print step does not capture reliably.
// This takes a real picture of the drawn map and puts it in place of the canvas,
// then proves that the picture actually shows a map. Call it after the print
// styles are applied, so the picture has the size the page is printed at.
async function captureMap(page) {
  const canvases = await page.$$("canvas.maplibregl-canvas");
  if (canvases.length === 0) {
    throw new Error("The map is missing from the Maps page, so it cannot be printed.");
  }
  for (const canvas of canvases) {
    // Lay the page out at the size it is printed at, then give the map time
    // to redraw, so the picture has the proportions of its frame on paper.
    // A canvas resized while WebGL redraws can come back cleared, so the
    // capture is retried with an explicit repaint until it shows the map.
    await page.setViewport({ width: PRINT_WIDTH_PX, height: PRINT_HEIGHT_PX, deviceScaleFactor: 1 });
    let base64 = null;
    let stats = { width: 0, height: 0, sampled: 0, drawn: 0 };
    for (let attempt = 0; attempt < 5; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      await page.evaluate(() => {
        const map = window.__splDemoMap;
        if (map) {
          map.resize();
          map.triggerRepaint();
        }
      });
      await new Promise((resolve) => setTimeout(resolve, 1200));
      const picture = await canvas.screenshot({ type: "png" });
      base64 = picture.toString("base64");
      stats = await pictureStats(page, base64);
      if (stats.width >= 200 && stats.height >= 200 && stats.sampled > 0 && stats.drawn >= stats.sampled * 0.02) break;
    }
    // A blank or empty picture must never reach the PDF.
    if (stats.width < 200 || stats.height < 200 || stats.sampled === 0 || stats.drawn < stats.sampled * 0.02) {
      throw new Error(
        `The map picture is blank (${stats.width}x${stats.height}, ${stats.drawn} of ${stats.sampled} sampled pixels drawn), so the PDF was not created.`
      );
    }
    await page.evaluate((data) => {
      const target = document.querySelector("canvas.maplibregl-canvas");
      if (!target) return;
      const image = document.createElement("img");
      image.src = `data:image/png;base64,${data}`;
      image.alt = "SPL map";
      image.style.cssText = `${target.style.cssText};width:${target.clientWidth}px;height:${target.clientHeight}px;`;
      target.replaceWith(image);
    }, base64);
    console.log(
      `  map captured: ${stats.width}x${stats.height}, ${Math.round((stats.drawn / stats.sampled) * 100)}% of the picture is map`
    );
  }
}

async function renderSection(browser, port, section) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
  const url = `http://127.0.0.1:${port}${BASE_PATH}${section.path}`;
  console.log(`  ${url}`);
  await page.goto(url, {
    waitUntil: section.waitUntil || "networkidle0",
    timeout: 90000,
  });
  await page.emulateMediaType("screen");
  await page.evaluate(() => document.fonts.ready);
  // Expand collapsible elements so their content is captured: <details>
  // blocks and Redoc's collapsed response sections (e.g. "200 Successful
  // Response"). Only the innermost clickable element is toggled so nested
  // matches do not expand and immediately re-collapse.
  await page.evaluate(() => {
    document.querySelectorAll("details").forEach((element) => {
      element.open = true;
    });
    document.querySelectorAll("div, h3, h4, button").forEach((element) => {
      const text = (element.textContent || "").trim();
      if (
        text.length > 0 &&
        text.length <= 40 &&
        /(\bSuccessful Response|\bValidation Error|\bError Response|\bInformation Response|\bRedirect Response)$/.test(
          text
        ) &&
        getComputedStyle(element).cursor === "pointer" &&
        !element.closest("a") &&
        !Array.from(element.children).some(
          (child) =>
            getComputedStyle(child).cursor === "pointer" &&
            (child.textContent || "").trim() === text
        )
      ) {
        element.click();
      }
    });
  });
  // Give Redoc a moment to render the expanded schemas.
  await new Promise((resolve) => setTimeout(resolve, 800));
  await stripB2BContent(page);
  // Remove fixed-position widgets (skip links, Redoc/scroll floating
  // buttons): they are screen-only controls and print as stray artifacts.
  await page.evaluate(() => {
    document.querySelectorAll("body *").forEach((element) => {
      if (getComputedStyle(element).position === "fixed") {
        element.style.display = "none";
      }
    });
  });
  await autoScroll(page);
  await page.addStyleTag({ content: PRINT_CSS });
  if (section.map) {
    await waitForMap(page);
    await captureStyleGallery(page);
    await captureMap(page);
  }
  // Give hydration and late layout a moment to settle before printing.
  await new Promise((resolveSettle) => setTimeout(resolveSettle, section.settleMs || 500));
  await assertNoSecrets(page);
  const heading = await page.evaluate(
    () => document.querySelector("h1")?.textContent?.trim() || ""
  );
  const bytes = await page.pdf({
    format: "A4",
    printBackground: true,
    margin: { top: "16mm", bottom: "18mm", left: "12mm", right: "12mm" },
  });
  await page.close();
  return { title: heading || section.fallbackTitle, bytes };
}

// Adds clickable outline bookmarks (entries: [{ title, pageIndex }]).
// pdf-lib has no outline API, so this works on the low-level object graph.
function addOutline(doc, entries) {
  if (entries.length === 0) return;
  const ctx = doc.context;
  const pages = doc.getPages();
  const outlineRef = ctx.nextRef();
  const items = entries.map((entry) => ({ ...entry, ref: ctx.nextRef() }));
  items.forEach((item, index) => {
    const page = pages[item.pageIndex];
    const dict = ctx.obj({
      Title: PDFHexString.fromText(item.title),
      Parent: outlineRef,
      Dest: ctx.obj([page.ref, "XYZ", 0, page.getHeight(), 0]),
    });
    if (index > 0) dict.set(PDFName.of("Prev"), items[index - 1].ref);
    if (index < items.length - 1) dict.set(PDFName.of("Next"), items[index + 1].ref);
    ctx.assign(item.ref, dict);
  });
  ctx.assign(
    outlineRef,
    ctx.obj({
      Type: "Outlines",
      First: items[0].ref,
      Last: items[items.length - 1].ref,
      Count: items.length,
    })
  );
  doc.catalog.set(PDFName.of("Outlines"), outlineRef);
}

async function main() {
  if (!existsSync(join(BUILD_DIR, "index.html"))) {
    throw new Error(`No build output at ${BUILD_DIR}. Run "npm run build" first (or use "npm run pdf").`);
  }

  let commitSha = "unknown";
  try {
    commitSha = execSync("git rev-parse --short HEAD", { cwd: ROOT })
      .toString()
      .trim();
  } catch {
    // Not a git checkout; the cover just shows "unknown".
  }

  console.log("Starting static server for build output...");
  const { server, missing, port } = await startStaticServer();

  const browser = await puppeteer.launch({
    executablePath: findChrome(),
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-dev-shm-usage",
      // Allows software WebGL so any embedded maps render headless.
      "--enable-unsafe-swiftshader",
    ],
  });

  try {
    const segments = [];
    for (const [index, section] of SECTIONS.entries()) {
      console.log(
        `Rendering ${index + 1}/${SECTIONS.length}: ${section.path || "(home)"}`
      );
      segments.push(await renderSection(browser, port, section));
    }

    console.log("Rendering cover page...");
    const coverBytes = await renderCover(
      browser,
      SECTIONS.map((section, index) => ({
        title: segments[index].title,
        path: section.path,
      })),
      commitSha
    );

    console.log("Merging into a single PDF...");
    const merged = await PDFDocument.create();
    merged.setTitle("SPL Documentation - Offline PDF Backup");
    merged.setAuthor("Saudi Post Limited");
    merged.setSubject("Location Services & Mapping Platform documentation");
    merged.setCreationDate(new Date());

    const coverDoc = await PDFDocument.load(coverBytes);
    const coverPages = await merged.copyPages(
      coverDoc,
      coverDoc.getPageIndices()
    );
    coverPages.forEach((page) => merged.addPage(page));

    const outlineEntries = [{ title: "Cover", pageIndex: 0 }];
    for (const segment of segments) {
      outlineEntries.push({
        title: segment.title,
        pageIndex: merged.getPageCount(),
      });
      const segmentDoc = await PDFDocument.load(segment.bytes);
      const segmentPages = await merged.copyPages(
        segmentDoc,
        segmentDoc.getPageIndices()
      );
      segmentPages.forEach((page) => merged.addPage(page));
    }

    // Stamp global page numbers (cover stays unstamped but is counted).
    const pages = merged.getPages();
    const font = await merged.embedFont(StandardFonts.Helvetica);
    pages.forEach((page, index) => {
      if (index === 0) return;
      const label = `${index + 1} / ${pages.length}`;
      const size = 9;
      page.drawText(label, {
        x: page.getWidth() / 2 - font.widthOfTextAtSize(label, size) / 2,
        y: 22,
        size,
        font,
        color: rgb(0.45, 0.45, 0.45),
      });
    });

    addOutline(merged, outlineEntries);

    const pdfBytes = await merged.save();
    await writeFile(OUTPUT, pdfBytes);

    console.log(
      `\nDone: ${OUTPUT}\n  pages: ${pages.length}, size: ${(
        pdfBytes.length /
        (1024 * 1024)
      ).toFixed(1)} MB`
    );
    if (missing.size > 0) {
      console.warn(
        `\nWarning: ${missing.size} asset path(s) returned 404 during rendering:`
      );
      for (const path of Array.from(missing).slice(0, 10)) {
        console.warn(`  ${path}`);
      }
    }
  } finally {
    await browser.close();
    server.close();
  }
}

main().catch((error) => {
  console.error("PDF generation failed:", error.message);
  process.exit(1);
});
