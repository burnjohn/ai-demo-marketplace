/**
 * Index acquisition — fetches the build-time catalog index asset, validates
 * its shape via `validateCatalogIndex`, and models the result as a triad of
 * distinguishable states: loading, loaded, failed.
 *
 * A `failed` result is never conflated with an empty catalog: a valid index
 * with zero plugins is `loaded` with `data.plugins = []`; anything that could
 * not be fetched, parsed, or validated is `failed`, carrying a human-readable
 * `reason` and a `retry()` affordance.
 */

import { validateCatalogIndex } from "./validate";
import type { CatalogIndex } from "./types";

/**
 * Path to the build-time index asset, relative to the configured base path.
 * Never hardcode a leading `/catalog-index.json` — the site is served under
 * a sub-path (e.g. `/ai-demo-marketplace/`) on GitHub Pages, so this must be
 * composed from `import.meta.env.BASE_URL` at call time.
 */
export const CATALOG_INDEX_ASSET_PATH = "catalog-index.json";

/** Resolves the full fetch URL for the index asset under the current base. */
export function resolveCatalogIndexUrl(): string {
  const base = import.meta.env.BASE_URL ?? "/";
  const normalizedBase = base.endsWith("/") ? base : `${base}/`;
  return `${normalizedBase}${CATALOG_INDEX_ASSET_PATH}`;
}

export type CatalogIndexState =
  | { status: "loading" }
  | { status: "loaded"; data: CatalogIndex }
  | { status: "failed"; reason: string; retry: () => void };

type Listener = (state: CatalogIndexState) => void;

/**
 * Fetches and validates the catalog index once, notifying `onChange` with
 * each state transition (loading -> loaded | failed). Returns a `retry()`
 * function that re-runs the fetch, exposed both directly and embedded in the
 * `failed` state for convenience.
 *
 * Never throws for expected failure modes (network error, non-OK response,
 * unparseable JSON body, shape validation rejection) — every one of those
 * surfaces as a `failed` state with a descriptive `reason`.
 */
export function loadCatalogIndex(onChange: Listener): { retry: () => void } {
  let cancelled = false;

  async function run(): Promise<void> {
    onChange({ status: "loading" });

    let response: Response;
    try {
      response = await fetch(resolveCatalogIndexUrl());
    } catch (error) {
      if (cancelled) return;
      onChange({
        status: "failed",
        reason: `Network error while fetching the catalog index: ${describeError(error)}`,
        retry,
      });
      return;
    }

    if (!response.ok) {
      if (cancelled) return;
      onChange({
        status: "failed",
        reason: `Catalog index request failed with status ${response.status}.`,
        retry,
      });
      return;
    }

    let body: unknown;
    try {
      body = await response.json();
    } catch (error) {
      if (cancelled) return;
      onChange({
        status: "failed",
        reason: `Catalog index response body could not be parsed as JSON: ${describeError(error)}`,
        retry,
      });
      return;
    }

    const result = validateCatalogIndex(body);
    if (cancelled) return;

    if (!result.valid) {
      onChange({
        status: "failed",
        reason: `Catalog index failed shape validation: ${result.problems.join("; ")}`,
        retry,
      });
      return;
    }

    onChange({ status: "loaded", data: result.data });
  }

  function retry(): void {
    void run();
  }

  void run();

  return { retry };
}

function describeError(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}
