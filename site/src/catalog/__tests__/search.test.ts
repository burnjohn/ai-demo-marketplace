import { describe, expect, it } from "vitest";
import { fullFixture } from "../fixtures/full";
import { largeFixture, largeFixtureEntityCount } from "../fixtures/large";
import {
  flattenEntities,
  searchEntities,
  type SearchEntity,
} from "../search";

describe("searchEntities", () => {
  it("returns only entities matching every token in a two-token query", () => {
    const results = searchEntities(fullFixture, { query: "react testing" });
    expect(results.length).toBeGreaterThan(0);
    for (const { entity } of results) {
      const haystacks = [
        entity.plugin.displayName,
        entity.plugin.name,
        entity.plugin.description,
        ...(entity.plugin.keywords ?? []),
        entity.entityType === "artifact" ? entity.artifact.displayName : "",
        entity.entityType === "artifact" ? entity.artifact.name : "",
        entity.entityType === "artifact" ? entity.artifact.description ?? "" : "",
        entity.entityType === "artifact" ? entity.artifact.documentationExcerpt ?? "" : "",
      ]
        .join(" ")
        .toLowerCase();
      expect(haystacks).toContain("react");
      expect(haystacks).toContain("testing");
    }

    // Sanity: a query token that appears nowhere excludes everything.
    const none = searchEntities(fullFixture, { query: "react zzzznonexistent" });
    expect(none).toHaveLength(0);
  });

  it("ranks a name match above a body-only (description/documentation) match", () => {
    const entities: SearchEntity[] = [
      {
        entityType: "plugin",
        plugin: {
          id: "body-match",
          name: "body-match",
          displayName: "Something Else",
          description: "This plugin is about widgets, totally unrelated word.",
          installCommand: { text: "x", scope: "plugin-installation" },
          sourceUrl: "https://example.com/body-match",
          artifacts: [],
          searchText: "",
        },
      },
      {
        entityType: "plugin",
        plugin: {
          id: "widgets-toolkit",
          name: "widgets-toolkit",
          displayName: "Widgets Toolkit",
          description: "Unrelated description text.",
          installCommand: { text: "x", scope: "plugin-installation" },
          sourceUrl: "https://example.com/widgets-toolkit",
          artifacts: [],
          searchText: "",
        },
      },
    ];

    const results = searchEntities(entities, { query: "widgets" });
    expect(results).toHaveLength(2);
    expect(results[0].entity.plugin.id).toBe("widgets-toolkit");
    expect(results[1].entity.plugin.id).toBe("body-match");
  });

  it("returns the same result count across relevance, name, and recently-updated sorts", () => {
    const filters = { query: "react", kinds: ["skill" as const] };
    const relevance = searchEntities(fullFixture, { ...filters, sort: "relevance" });
    const name = searchEntities(fullFixture, { ...filters, sort: "name" });
    const recent = searchEntities(fullFixture, { ...filters, sort: "recently-updated" });

    expect(relevance).toHaveLength(name.length);
    expect(name).toHaveLength(recent.length);
  });

  it("falls back to deterministic name order for relevance when the query is empty", () => {
    const first = searchEntities(fullFixture, { sort: "relevance" });
    const second = searchEntities(fullFixture, { sort: "relevance" });
    const names = first.map((r) => r.entity.plugin.displayName + JSON.stringify(r.entity));

    expect(first.map((r) => r.entity)).toEqual(second.map((r) => r.entity));

    const byName = searchEntities(fullFixture, { sort: "name" });
    expect(first.map((r) => r.entity)).toEqual(byName.map((r) => r.entity));
    expect(names.length).toBeGreaterThan(0);
  });

  it("places undated plugins/artifacts last under recently-updated sort", () => {
    const results = searchEntities(fullFixture, { sort: "recently-updated" });
    const dated = results.filter((r) => r.entity.plugin.lastUpdated);
    const undated = results.filter((r) => !r.entity.plugin.lastUpdated);
    if (undated.length > 0 && dated.length > 0) {
      const lastDatedIndex = results.lastIndexOf(dated[dated.length - 1]);
      const firstUndatedIndex = results.indexOf(undated[0]);
      expect(firstUndatedIndex).toBeGreaterThan(lastDatedIndex - 1);
    }
    // All undated entries must come after all dated ones.
    let seenUndated = false;
    for (const result of results) {
      const isDated = Boolean(result.entity.plugin.lastUpdated);
      if (!isDated) {
        seenUndated = true;
      } else if (seenUndated) {
        throw new Error("dated entry found after an undated one");
      }
    }
  });

  it("completes a query + facet toggle over the 2 000-entity large fixture in under 100ms", () => {
    expect(largeFixtureEntityCount).toBe(2000);
    const entities = flattenEntities(largeFixture);

    const start = performance.now();
    searchEntities(entities, { query: "synthetic", kinds: ["skill"] });
    searchEntities(entities, { query: "synthetic", kinds: ["skill", "agent"] });
    const elapsed = performance.now() - start;

    expect(elapsed).toBeLessThan(100);
  });
});
