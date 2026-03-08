#!/usr/bin/env node
/**
 * Copy zxing_reader.wasm from node_modules/zxing-wasm to public/zxing-wasm
 * so the barcode scanner loads it locally (no CDN, no CSP connect-src needed).
 * Run automatically on npm install via postinstall.
 */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const src = path.join(root, "node_modules", "zxing-wasm", "dist", "reader", "zxing_reader.wasm");
const destDir = path.join(root, "public", "cdn");
const dest = path.join(destDir, "zxing_reader.wasm");

if (!fs.existsSync(src)) {
  console.warn("[copy-zxing-wasm] Source not found (zxing-wasm may not be installed):", src);
  process.exit(0);
}

try {
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }
  fs.copyFileSync(src, dest);
  console.log("[copy-zxing-wasm] Copied zxing_reader.wasm to public/cdn/");
} catch (err) {
  console.error("[copy-zxing-wasm] Failed:", err.message);
  process.exit(1);
}
