import { describe, expect, it } from "vitest";
import { parseRoute } from "./codec";
import { buildRouteHref, encodeRouteHash } from "./paths";
import type { NavigateTarget, SearchState } from "./types";

describe("routing codec", () => {
  it("round-trips every non-search view", () => {
    const targets: NavigateTarget[] = [
      { view: "home" },
      { view: "whats-new" },
      { view: "getting-started" },
      { view: "plugin", pluginId: "frontend-skills" },
      { view: "artifact", artifactId: "frontend-architecture" },
    ];

    for (const target of targets) {
      const hash = encodeRouteHash(target);
      const parsed = parseRoute(hash);
      expect(parsed.view).toBe(target.view);
      if (target.view === "plugin" && parsed.view === "plugin") {
        expect(parsed.pluginId).toBe(target.pluginId);
      }
      if (target.view === "artifact" && parsed.view === "artifact") {
        expect(parsed.artifactId).toBe(target.artifactId);
      }
    }
  });

  it("round-trips search state across every filter combination", () => {
    const cases: SearchState[] = [
      { kinds: [], keywords: [] },
      { query: "workshop", kinds: [], keywords: [] },
      { kinds: ["skill", "agent"], keywords: [] },
      { kinds: [], keywords: ["testing", "routing"] },
      { kinds: [], keywords: [], author: "ivan" },
      { kinds: [], keywords: [], sort: "name" },
      {
        query: "catalog",
        kinds: ["hook", "mcp"],
        keywords: ["catalog", "site"],
        author: "team",
        sort: "recently-updated",
      },
    ];

    for (const search of cases) {
      const hash = encodeRouteHash({ view: "search", search });
      const parsed = parseRoute(hash);
      expect(parsed).toEqual({
        view: "search",
        search: {
          kinds: search.kinds,
          keywords: search.keywords,
          ...(search.query ? { query: search.query } : {}),
          ...(search.author ? { author: search.author } : {}),
          ...(search.sort ? { sort: search.sort } : {}),
        },
      });
    }
  });

  it("builds an href derived from BASE_URL, never a string-concatenated literal", () => {
    const href = buildRouteHref({ view: "plugin", pluginId: "frontend-skills" });
    expect(href).toBe(`${import.meta.env.BASE_URL}#/plugin/frontend-skills`);
  });

  it("resolves an empty hash to the home view", () => {
    expect(parseRoute("")).toEqual({ view: "home" });
    expect(parseRoute("#/")).toEqual({ view: "home" });
  });

  it("resolves an unrecognised view segment to not-found with reason unknown-view", () => {
    const parsed = parseRoute("#/definitely-not-a-view");
    expect(parsed).toEqual({
      view: "not-found",
      reason: "unknown-view",
      attempted: "/definitely-not-a-view",
    });
  });

  it("resolves a plugin/artifact route missing its id segment to a named not-found", () => {
    expect(parseRoute("#/plugin")).toEqual({
      view: "not-found",
      reason: "unknown-plugin",
      attempted: "/plugin",
    });
    expect(parseRoute("#/artifact")).toEqual({
      view: "not-found",
      reason: "unknown-artifact",
      attempted: "/artifact",
    });
  });

  it("discards unknown kind and sort values while keeping the recognised ones", () => {
    const parsed = parseRoute("#/search?kind=skill&kind=not-a-kind&sort=oldest");
    expect(parsed).toEqual({
      view: "search",
      search: { kinds: ["skill"], keywords: [] },
    });
  });

  it("discards an unrecognised query parameter entirely", () => {
    const parsed = parseRoute("#/search?q=hooks&trackingId=abc123");
    expect(parsed).toEqual({
      view: "search",
      search: { query: "hooks", kinds: [], keywords: [] },
    });
  });

  it("carries a markup payload in the query through as literal text, never parsed as markup", () => {
    const payload = "<img src=x onerror=alert(1)>";
    const hash = encodeRouteHash({ view: "search", search: { query: payload, kinds: [], keywords: [] } });
    const parsed = parseRoute(hash);
    expect(parsed).toEqual({
      view: "search",
      search: { query: payload, kinds: [], keywords: [] },
    });
    // The hash itself is percent-encoded, so the raw string never appears as
    // literal markup characters in the URL/history entry either.
    expect(hash).not.toContain("<img");
  });

  it("carries a markup payload in a keyword filter through as literal text", () => {
    const payload = "<script>alert(1)</script>";
    const hash = encodeRouteHash({
      view: "search",
      search: { kinds: [], keywords: [payload] },
    });
    const parsed = parseRoute(hash);
    expect(parsed).toEqual({
      view: "search",
      search: { kinds: [], keywords: [payload] },
    });
  });
});
