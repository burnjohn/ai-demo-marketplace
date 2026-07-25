#!/usr/bin/env node
/**
 * Build-time catalog index generator.
 *
 * Reads the marketplace manifest and every plugin it lists from the
 * repository root, and emits a single `CatalogIndex` JSON asset (see
 * `site/src/catalog/types.ts`) under `site/public/`, so Vite serves it as
 * a static asset that the runtime loader fetches via
 * `import.meta.env.BASE_URL`. Wired up as `npm run prebuild` (see
 * `site/package.json`), which runs this file automatically before
 * `vite build`.
 *
 * Test-only overrides (never used by the real `prebuild` script):
 *   BUILD_INDEX_REPO_ROOT   — points the generator at a fixture tree instead
 *                             of the real repository root.
 *   BUILD_INDEX_OUTPUT_PATH — redirects the emitted asset elsewhere so tests
 *                             never touch the real `site/public/` output.
 * These exist purely so the CLI's exit-code/stderr behaviour can be
 * exercised end-to-end without mutating real repository state.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildCatalogIndex } from "./lib/build.mjs";
import { validateCatalogIndex } from "./lib/validate-catalog-index.mjs";
import { BuildIndexError } from "./lib/errors.mjs";
import { MAX_INDEX_BYTES } from "./lib/bound.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// site/scripts/build-index.mjs -> site/ -> repository root.
const REAL_REPO_ROOT = path.resolve(__dirname, "..", "..");
const REAL_OUTPUT_PATH = path.resolve(__dirname, "..", "public", "catalog-index.json");

function main() {
  const repoRoot = process.env.BUILD_INDEX_REPO_ROOT
    ? path.resolve(process.env.BUILD_INDEX_REPO_ROOT)
    : REAL_REPO_ROOT;
  const outputPath = process.env.BUILD_INDEX_OUTPUT_PATH
    ? path.resolve(process.env.BUILD_INDEX_OUTPUT_PATH)
    : REAL_OUTPUT_PATH;

  let index;
  try {
    index = buildCatalogIndex(repoRoot);
  } catch (err) {
    if (err instanceof BuildIndexError) {
      console.error(`build-index: ${err.message}`);
      process.exit(1);
    }
    throw err;
  }

  const selfCheck = validateCatalogIndex(index);
  if (!selfCheck.valid) {
    console.error("build-index: generated catalog index failed self-validation:");
    for (const problem of selfCheck.problems) {
      console.error(`  - ${problem}`);
    }
    process.exit(1);
  }

  const serialized = JSON.stringify(index);
  const byteSize = Buffer.byteLength(serialized, "utf8");
  if (byteSize > MAX_INDEX_BYTES) {
    console.error(
      `build-index: generated catalog index is ${byteSize} bytes, exceeding the ${MAX_INDEX_BYTES}-byte budget`,
    );
    process.exit(1);
  }

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, serialized);

  const artifactCount = index.plugins.reduce((sum, p) => sum + p.artifacts.length, 0);
  console.log(
    `build-index: wrote ${outputPath} (${index.plugins.length} plugins, ${artifactCount} artifacts, ${byteSize} bytes)`,
  );
}

main();
