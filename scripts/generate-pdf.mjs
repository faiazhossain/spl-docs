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
import { existsSync, statSync } from "node:fs";
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

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const BUILD_DIR = join(ROOT, "build");
const OUTPUT = join(ROOT, "spl-docs.pdf");
// The site is deployed under /docs/ (see baseUrl in docusaurus.config.js),
// so every URL on the static build carries that prefix.
const BASE_PATH = "/docs/";

// Reading order of the PDF. Paths are relative to the baseUrl, so
// "docs/maps/api-keys/" is served at /docs/docs/maps/api-keys/.
// The interactive Maps landing page is included first because it carries the
// gateway integration section; its map loads slowly, so it gets a looser
// network-idle condition and extra settle time for the tiles to paint.
const SECTIONS = [
  {
    path: "maps/",
    fallbackTitle: "SPL Map Styles Explorer",
    waitUntil: "networkidle2",
    settleMs: 20000,
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

  /* Wrap long lines instead of clipping code samples at the page edge. */
  pre, code { white-space: pre-wrap !important; word-break: break-word !important; }
  td, th { word-break: break-word; }

  *, *::before, *::after {
    animation: none !important;
    transition: none !important;
  }
  img { max-width: 100% !important; height: auto !important; }

  /* Keep headings with the content that follows them. */
  h1, h2, h3, h4 { break-after: avoid-page; }
  img, tr, blockquote { break-inside: avoid-page; }

  /* Reveal every tab panel: a print capture must not lose the content of
     inactive tabs (e.g. the Azure gateway docs under the B2B/Azure tabs). */
  [role="tabpanel"] { display: block !important; }
  [role="tabpanel"] ~ [role="tabpanel"] {
    margin-top: 1.5rem;
    padding-top: 1rem;
    border-top: 1px dashed #bbb;
  }
`;

function findChrome() {
  if (process.env.PUPPETEER_EXECUTABLE_PATH) {
    return process.env.PUPPETEER_EXECUTABLE_PATH;
  }
  const candidates = [
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
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
      .meta { font-size: 10pt; color: #666; line-height: 1.7; }
    </style>
  </head>
  <body>
    <div class="band"></div>
    <div class="cover">      <h1>SPL Documentation</h1>
      <p class="tagline">Location Services &amp; Mapping Platform - Offline PDF Backup</p>
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

async function renderSection(browser, port, section) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
  const url = `http://127.0.0.1:${port}${BASE_PATH}${section.path}`;
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
  // Give hydration and late layout a moment to settle before printing.
  await new Promise((resolveSettle) => setTimeout(resolveSettle, section.settleMs || 500));
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
