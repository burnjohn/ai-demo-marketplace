/**
 * Interaction/performance and reduced-motion budgets.
 *
 * The 100 ms budget below is measured with `performance.now()` around the
 * pure search/facet logic replayed directly against the 2 000-entity
 * `large` fixture (`catalog/fixtures/large.ts`) — no rendering involved, so
 * this measures the same cost the UI pays on every keystroke/facet click
 * regardless of React's own render cost.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { largeFixture } from "../catalog/fixtures/large";
import { applyFacetFilters, applyTextQuery, flattenEntities, sortResults } from "../catalog/search";
import { computeFacetSummary } from "../catalog/facets";

const BUDGET_MS = 100;

describe("Interaction performance budget", () => {
  it("replays a text query over the 2 000-entity fixture in under 100ms", () => {
    const allEntities = flattenEntities(largeFixture);
    expect(allEntities.length).toBe(2000);

    const start = performance.now();
    const afterQuery = applyTextQuery(allEntities, "workflow");
    const sorted = sortResults(afterQuery, "relevance", true);
    const elapsed = performance.now() - start;

    expect(sorted.length).toBeGreaterThan(0);
    expect(elapsed).toBeLessThan(BUDGET_MS);
  });

  it("replays a facet toggle (kind filter) over the 2 000-entity fixture in under 100ms", () => {
    const allEntities = flattenEntities(largeFixture);
    const afterQuery = applyTextQuery(allEntities, "");

    const start = performance.now();
    const filtered = applyFacetFilters(afterQuery, { kinds: ["skill"], keywords: [] });
    const summary = computeFacetSummary(filtered.map((result) => result.entity));
    const elapsed = performance.now() - start;

    expect(filtered.length).toBeGreaterThan(0);
    expect(summary.kinds.length).toBeGreaterThan(0);
    expect(elapsed).toBeLessThan(BUDGET_MS);
  });
});

describe("Reduced-motion contract", () => {
  it("suppresses every transition, animation and backdrop-filter under prefers-reduced-motion, app-wide", () => {
    const motionCssPath = path.resolve(__dirname, "../styles/motion.css");
    const css = readFileSync(motionCssPath, "utf8");

    const mediaMatch = css.match(/@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{([^]*)\}\s*$/);
    expect(mediaMatch, "a prefers-reduced-motion: reduce media block must exist").not.toBeNull();

    const body = mediaMatch![1];
    // The guard must apply universally (`*, *::before, *::after`), not to a
    // hand-picked subset of selectors — new animated components added later
    // are covered automatically.
    expect(body).toMatch(/\*\s*,\s*\*::before\s*,\s*\*::after/);
    expect(body).toMatch(/animation-duration:\s*0\.001ms\s*!important/);
    expect(body).toMatch(/transition-duration:\s*0\.001ms\s*!important/);
    expect(body).toMatch(/backdrop-filter:\s*none\s*!important/);
  });

  it("does not re-declare (and thus does not accidentally weaken) the reduced-motion guard in the header's own stylesheet", () => {
    // Shell.css intentionally relies on the single, app-wide guard in
    // motion.css rather than re-implementing it locally (its own header
    // comment says so) — it may *reference* that fact in a comment, but
    // must not declare its own `@media (prefers-reduced-motion: ...)` block.
    const shellCssPath = path.resolve(__dirname, "../shell/Shell.css");
    const css = readFileSync(shellCssPath, "utf8");
    expect(css).not.toMatch(/@media\s*\(prefers-reduced-motion/);
  });
});
