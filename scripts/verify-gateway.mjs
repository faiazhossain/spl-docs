#!/usr/bin/env node
// Checks everything the documentation promises about the gateway, with the key
// from the environment (.env.local). Run it before sharing documentation:
//
//   npm run verify
//
// It prints one line per check and saves the full responses, so real request
// and response examples can be taken from them. Exit code 1 when a check fails.
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { getSplSettings, SITE_DIR } from "./lib/env.mjs";

const spl = getSplSettings();
const { base, key, keyHeader } = spl.gateway;
const PACE_MS = 400;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
let last = 0;

async function call(path, { header = true, keyOverride } = {}) {
  const wait = last + PACE_MS - Date.now();
  if (wait > 0) await sleep(wait);
  last = Date.now();
  const value = keyOverride ?? key;
  const headers = header && value ? { [keyHeader]: value } : {};
  try {
    const response = await fetch(base + path, { headers, redirect: "manual" });
    const bytes = Buffer.from(await response.arrayBuffer());
    return { status: response.status, type: response.headers.get("content-type") || "", bytes, text: bytes.toString("utf8") };
  } catch (error) {
    return { status: 0, type: "", bytes: Buffer.alloc(0), text: String(error.message) };
  }
}
const gatewayMessage = (r) => { try { return JSON.parse(r.text).message || ""; } catch { return ""; } };

const rows = [];
const report = { gateway: base, checkedAt: new Date().toISOString(), styles: [], api: [], wmts: [] };
const record = (ok, name, detail) => { rows.push({ ok, name, detail }); console.log(`${ok ? "ok  " : "FAIL"} ${name.padEnd(44)} ${detail}`); };

console.log(`Gateway: ${base}`);
console.log(`Key: ${key ? `present (${key.length} characters)` : "NOT SET - only checks that need no key are run"}\n`);

// --- 1. Requests that must be refused or not served -------------------------
let r = await call("/styles/spl_bgmaps/style.json", { header: false });
record(r.status === 401, "style without key is refused", `${r.status} ${gatewayMessage(r).slice(0, 60)}`);
r = await call("/styles/spl_bgmaps/style.json", { keyOverride: "0".repeat(32) });
record(r.status === 401, "style with a wrong key is refused", `${r.status} ${gatewayMessage(r).slice(0, 60)}`);
r = await call("/styles/spl_bgmaps/style.json?subscription-key=" + (key || "0".repeat(32)), { header: false });
record(r.status === 401 || !key, "key as URL parameter is not accepted", `${r.status} ${key ? "" : "(skipped: no key)"}`);
for (const path of ["/api/v2.0/search/autocomplete", "/health"]) {
  r = await call(path);
  record(r.status === 404, `${path} is not served`, `${r.status} ${gatewayMessage(r)}`);
}
// Browser use: a web page may only call the gateway when its website is
// permitted. Set SPL_TEST_ORIGIN to the address a reader will test from.
const testOrigin = process.env.SPL_TEST_ORIGIN || "http://localhost:3000";
await sleep(PACE_MS);
const preflight = await fetch(`${base}/styles/spl_bgmaps/style.json`, {
  method: "OPTIONS",
  headers: { Origin: testOrigin, "Access-Control-Request-Method": "GET", "Access-Control-Request-Headers": keyHeader.toLowerCase() },
});
const allowed = preflight.headers.get("access-control-allow-origin");
const allowHeaders = preflight.headers.get("access-control-allow-headers") || "";
const browserOk = (allowed === "*" || allowed === testOrigin) && allowHeaders.toLowerCase().split(/\s*,\s*/).includes(keyHeader.toLowerCase());
record(browserOk, `web pages on ${testOrigin} may call the gateway`, browserOk ? "permitted" : `NOT permitted (allow-origin: ${allowed || "none"}) - the browser blocks these requests`);
if (!key) {
  console.log("\nNo key: add SPL_GATEWAY_KEY to .env.local to check styles, WMTS and the APIs.");
  process.exit(rows.some((row) => !row.ok) ? 1 : 0);
}

// --- 2. Map styles, and the tiles, fonts and icons they refer to -------------
const STYLES = ["spl_bgmaps", "spl_bgmaps_en", "spl_bgmaps_ar", "spl_dark", "spl_dark_en", "spl_dark_ar", "spl_satellite", "spl_satellite_en", "spl_satellite_ar"];
const origin = new URL(base).origin;
let first = null;
for (const id of STYLES) {
  r = await call(`/styles/${id}/style.json`);
  let style;
  try { style = JSON.parse(r.text); } catch { style = null; }
  const ok = r.status === 200 && style && style.version === 8 && Array.isArray(style.layers);
  record(ok, `style ${id}`, ok ? `"${style.name}", ${style.layers.length} layers` : `${r.status} ${gatewayMessage(r)}`);
  report.styles.push({ id, status: r.status, name: style?.name, layers: style?.layers?.length });
  if (ok && !first) first = { id, style };
}

if (first) {
  const referenced = [first.style.glyphs, ...[first.style.sprite].flat().map((s) => (typeof s === "string" ? s : s && s.url)), ...Object.values(first.style.sources).flatMap((s) => [s.url, ...(s.tiles || [])])].filter((u) => typeof u === "string" && /^https?:\/\//.test(u));
  const internal = [...new Set(referenced.map((u) => new URL(u).origin))].filter((o) => o !== origin);
  record(true, "hosts the style refers to", internal.length ? `${internal.join(", ")} (rewriting needed)` : "only the gateway (self-contained: no rewriting needed)");
  const rewrite = (url) => { for (const o of internal) if (url.startsWith(`${o}/`)) return base + url.slice(o.length); return url; };
  const viaGateway = async (url) => {
    const target = rewrite(url);
    return target.startsWith(base) ? call(target.slice(base.length)) : { status: 0, text: `not on the gateway: ${target}`, bytes: Buffer.alloc(0) };
  };
  r = await viaGateway(first.style.glyphs.replace("{fontstack}", encodeURIComponent("Noto Sans Regular")).replace("{range}", "0-255"));
  record(r.status === 200, "label fonts (glyphs)", `${r.status} ${r.bytes.length} bytes`);
  const sprite = [first.style.sprite].flat()[0];
  const spriteUrl = typeof sprite === "string" ? sprite : sprite?.url;
  // MapLibre adds the extension before the query string of the sprite address.
  const withExtension = (url, ext) => (url.includes("?") ? url.replace("?", `${ext}?`) : url + ext);
  const rj = await viaGateway(withExtension(spriteUrl, ".json"));
  const rp = await viaGateway(withExtension(spriteUrl, ".png"));
  record(rj.status === 200 && rp.status === 200, "icons (sprite)", `json ${rj.status}, png ${rp.status} ${rp.bytes.length} bytes`);
  const source = Object.values(first.style.sources).find((s) => s.url);
  if (source) {
    const tj = await viaGateway(source.url);
    let tiles = null;
    try { tiles = JSON.parse(tj.text).tiles; } catch { tiles = null; }
    record(tj.status === 200 && Array.isArray(tiles), "map data (TileJSON)", `${tj.status} ${tj.type}`);
    if (tiles) {
      const z = 10, n = 2 ** z, lat = (24.7136 * Math.PI) / 180;
      const tileUrl = tiles[0].replace("{z}", z).replace("{x}", Math.floor(((46.6753 + 180) / 360) * n)).replace("{y}", Math.floor(((1 - Math.log(Math.tan(lat) + 1 / Math.cos(lat)) / Math.PI) / 2) * n));
      r = await viaGateway(tileUrl);
      record(r.status === 200 && r.bytes.length > 0, "map tile", `${r.status} ${r.bytes.length} bytes`);
    }
  }
  r = await call(`/styles/${first.id}/wmts.xml`);
  const advertisesGateway = r.status === 200 && /<ResourceURL/.test(r.text) && r.text.includes(origin);
  record(r.status === 200, "WMTS capabilities", `${r.status} ${r.type}`);
  record(advertisesGateway, "WMTS points tiles at the gateway", advertisesGateway ? "yes" : "NO - QGIS and ArcGIS cannot load tiles from it");
  report.wmts.push({ status: r.status, type: r.type, advertisesGateway });
}

// --- 3. The APIs in the reference --------------------------------------------
const coords = "46.6753,24.7136;46.7386,24.7743";
const APIS = [
  ["Autocomplete Search", `/api/v1/search/autocomplete?q=Riyadh&latitude=24.7136&longitude=46.6753&limit=10`],
  ["Get Place Types", "/api/v1/search/place_types"],
  ["Reverse Geocode", "/api/v1/reverse/geocode?latitude=24.7136&longitude=46.6753&na=true&radius_m=200"],
  ["Route", `/api/v1/route/v1/driving/${coords}?steps=false&overview=simplified`],
  ["Trip", `/api/v1/trip/v1/driving/${coords}?source=first&roundtrip=false`],
];
let placeId = null;
for (const [name, path] of APIS) {
  r = await call(path);
  let body = null;
  try { body = JSON.parse(r.text); } catch { body = null; }
  record(r.status === 200, name, r.status === 200 ? body?.results ? `${body.results.length} results` : "200" : `${r.status} ${gatewayMessage(r)}`);
  report.api.push({ name, path, status: r.status, body });
  if (name === "Autocomplete Search" && body?.results?.[0]?.id) placeId = body.results[0].id;
}
if (placeId) {
  r = await call(`/api/v1/search/place/${encodeURIComponent(placeId)}`);
  record(r.status === 200, "Get Place by ID", `${r.status}`);
  report.api.push({ name: "Get Place by ID", path: `/api/v1/search/place/{place_id}`, status: r.status, body: (() => { try { return JSON.parse(r.text); } catch { return null; } })() });
} else {
  record(false, "Get Place by ID", "no id available: autocomplete returned no result");
}

const outDir = join(SITE_DIR, "node_modules", ".cache", "spl-docs");
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, "gateway-report.json"), JSON.stringify(report, null, 2));
const failed = rows.filter((row) => !row.ok).length;
console.log(`\n${rows.length - failed} of ${rows.length} checks passed. Responses saved to node_modules/.cache/spl-docs/gateway-report.json`);
process.exit(failed ? 1 : 0);
