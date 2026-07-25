import { describe, expect, it } from "vitest";
import { fullFixture } from "../fixtures/full";
import { largeFixture } from "../fixtures/large";
import { computeFacetSummary, computeFacetSummaryWithKnownValues } from "../facets";
import { applyTextQuery, flattenEntities } from "../search";

describe("computeFacetSummary", () => {
  it("counts matches after the text query but independent of any facet selection", () => {
    const entities = flattenEntities(fullFixture);
    const scored = applyTextQuery(entities, "react");
    const afterQuery = scored.map((s) => s.entity);

    const summary = computeFacetSummary(afterQuery);

    // Every reported count must be <= the number of entities that matched the query.
    for (const option of summary.kinds) {
      expect(option.count).toBeLessThanOrEqual(afterQuery.length);
      expect(option.count).toBeGreaterThan(0);
      expect(option.available).toBe(true);
    }
  });

  it("marks a facet unavailable (count 0) rather than removing it, when known but zero-matching under the query", () => {
    const entities = flattenEntities(fullFixture);
    const scored = applyTextQuery(entities, "react");
    const afterQuery = scored.map((s) => s.entity);

    const summary = computeFacetSummaryWithKnownValues(afterQuery, {
      kinds: ["mcp"], // present in the ArtifactKind universe, unlikely to match "react"
    });

    const mcpOption = summary.kinds.find((option) => option.value === "mcp");
    expect(mcpOption).toBeDefined();
    if (mcpOption && mcpOption.count === 0) {
      expect(mcpOption.available).toBe(false);
    }
  });

  it("computes kind/keyword facets as unions and author as single-valued in the underlying entity data", () => {
    const entities = flattenEntities(fullFixture);
    const summary = computeFacetSummary(entities);

    // Sanity: multiple kinds and keywords can each independently have counts > 0.
    const kindsWithMatches = summary.kinds.filter((option) => option.available);
    expect(kindsWithMatches.length).toBeGreaterThan(0);

    const authorsWithMatches = summary.authors.filter((option) => option.available);
    expect(authorsWithMatches.length).toBeGreaterThan(0);
    for (const author of authorsWithMatches) {
      expect(typeof author.value).toBe("string");
    }
  });

  it("computes facet counts over the 2 000-entity large fixture quickly", () => {
    const entities = flattenEntities(largeFixture);
    const scored = applyTextQuery(entities, "synthetic");

    const start = performance.now();
    computeFacetSummary(scored.map((s) => s.entity));
    const elapsed = performance.now() - start;

    expect(elapsed).toBeLessThan(100);
  });
});
