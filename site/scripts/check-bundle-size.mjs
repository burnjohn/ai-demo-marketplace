#!/usr/bin/env node
/**
 * Bundle-size gate.
 *
 * Must run after a production build (`npm run build`), against the real
 * `dist/` output. Measures actual gzip sizes (via Node's `zlib`, not an
 * estimate) and asserts two budgets:
 *
 *  - the entry chunk (the JS the initial page load needs — i.e. every
 *    top-level `dist/assets/*.js` file EXCEPT the lazily-split
 *    `markdown-*.js` chunk, per `vite.config.ts`'s `manualChunks`) is
 *    <= 180 KB gzipped, and
 *  - `dist/catalog-index.json` (the generated catalog data — never
 *    counted as part of the entry budget) is
 *    <= 512 KB gzipped.
 *
 * Run: `npm run build && node scripts/check-bundle-size.mjs` from `site/`.
 * Exits non-zero naming what exceeded its budget by how much.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST_DIR = path.resolve(__dirname, "../dist");
const ASSETS_DIR = path.join(DIST_DIR, "assets");
const CATALOG_INDEX_PATH = path.join(DIST_DIR, "catalog-index.json");

const ENTRY_BUDGET_BYTES = 180 * 1024;
const CATALOG_INDEX_BUDGET_BYTES = 512 * 1024;

// Chunks split out of the entry on purpose (see `vite.config.ts`
// `manualChunks`) — not part of what the initial page load needs.
const NON_ENTRY_CHUNK_PREFIXES = ["markdown-"];

function gzipSize(filePath) {
  const contents = readFileSync(filePath);
  return gzipSync(contents, { level: 9 }).length;
}

function formatKb(bytes) {
  return `${(bytes / 1024).toFixed(2)} KB`;
}

function main() {
  if (!statSync(DIST_DIR, { throwIfNoEntry: false })) {
    console.error(`Bundle-size gate FAILED — no ${DIST_DIR} directory. Run \`npm run build\` first.`);
    process.exitCode = 1;
    return;
  }

  const violations = [];

  // --- Entry chunk budget ---
  const assetFiles = readdirSync(ASSETS_DIR).filter((name) => name.endsWith(".js"));
  const entryFiles = assetFiles.filter(
    (name) => !NON_ENTRY_CHUNK_PREFIXES.some((prefix) => name.startsWith(prefix)),
  );

  if (entryFiles.length === 0) {
    violations.push("no entry JS chunk found under dist/assets — build output shape may have changed");
  }

  let entryGzipTotal = 0;
  const entryBreakdown = [];
  for (const file of entryFiles) {
    const size = gzipSize(path.join(ASSETS_DIR, file));
    entryGzipTotal += size;
    entryBreakdown.push(`${file}: ${formatKb(size)} gzipped`);
  }

  console.log("Entry chunk breakdown (gzipped):");
  for (const line of entryBreakdown) console.log(`  - ${line}`);
  console.log(`Entry chunk total: ${formatKb(entryGzipTotal)} gzipped (budget: ${formatKb(ENTRY_BUDGET_BYTES)})`);

  if (entryGzipTotal > ENTRY_BUDGET_BYTES) {
    violations.push(
      `entry chunk is ${formatKb(entryGzipTotal)} gzipped, exceeding the ${formatKb(ENTRY_BUDGET_BYTES)} budget by ${formatKb(entryGzipTotal - ENTRY_BUDGET_BYTES)}`,
    );
  }

  // --- Catalog index budget ---
  if (!statSync(CATALOG_INDEX_PATH, { throwIfNoEntry: false })) {
    violations.push(`${CATALOG_INDEX_PATH} not found — expected the catalog-index generator to have emitted it into dist/`);
  } else {
    const catalogGzipSize = gzipSize(CATALOG_INDEX_PATH);
    console.log(`catalog-index.json: ${formatKb(catalogGzipSize)} gzipped (budget: ${formatKb(CATALOG_INDEX_BUDGET_BYTES)})`);
    if (catalogGzipSize > CATALOG_INDEX_BUDGET_BYTES) {
      violations.push(
        `catalog-index.json is ${formatKb(catalogGzipSize)} gzipped, exceeding the ${formatKb(CATALOG_INDEX_BUDGET_BYTES)} budget by ${formatKb(catalogGzipSize - CATALOG_INDEX_BUDGET_BYTES)}`,
      );
    }
  }

  if (violations.length > 0) {
    console.error(`\nBundle-size gate FAILED — ${violations.length} violation(s):\n`);
    for (const violation of violations) console.error(`  - ${violation}`);
    process.exitCode = 1;
    return;
  }

  console.log("\nBundle-size gate passed.");
}

main();
