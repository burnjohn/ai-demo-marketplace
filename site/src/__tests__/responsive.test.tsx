/**
 * Responsive contract gate.
 *
 * jsdom performs no layout — there is no real viewport, no computed
 * geometry, no box model. This file therefore does NOT assert pixel
 * measurements or claim to reproduce a >= 320px viewport; it asserts the
 * *declared* CSS contract (parsed from the stylesheet source, the same way
 * `scripts/check-contrast.mjs` parses tokens.css) and the DOM structure that
 * contract depends on: a single-column base layout, no horizontal
 * overflow, and a native `<details>` disclosure for the facet sidebar
 * rather than an always-visible sidebar. None of this is a substitute for a
 * real viewport/visual-regression test (e.g. Playwright) — it only proves
 * the CSS/DOM contract described in `SearchView.css`'s own comment holds.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { App } from "../App";
import { fullFixture } from "../catalog/fixtures/full";

function jsonResponse(body: unknown): Response {
  return { ok: true, status: 200, json: () => Promise.resolve(body) } as unknown as Response;
}

function resetDom() {
  window.location.hash = "";
  document.documentElement.removeAttribute("data-theme");
  document.documentElement.removeAttribute("data-accent");
}

const SEARCH_VIEW_CSS_PATH = path.resolve(__dirname, "../views/search/SearchView.css");

describe("Responsive contract", () => {
  beforeEach(() => {
    resetDom();
    vi.stubGlobal("fetch", vi.fn());
    window.scrollTo = vi.fn();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    resetDom();
  });

  it("declares a single-column base layout for .search-view__body with no horizontal overflow, promoted to two columns only above a min-width breakpoint", () => {
    const css = readFileSync(SEARCH_VIEW_CSS_PATH, "utf8");

    // Base (mobile-first, unconditional) rule: single column.
    const bodyRuleMatch = css.match(/\.search-view__body\s*\{([^}]*)\}/);
    expect(bodyRuleMatch, ".search-view__body base rule must exist").not.toBeNull();
    const baseBodyRule = bodyRuleMatch![1];
    expect(baseBodyRule).toMatch(/grid-template-columns:\s*1fr\s*;/);

    // The root view forbids horizontal scrolling outright.
    const rootRuleMatch = css.match(/\.search-view\s*\{([^}]*)\}/);
    expect(rootRuleMatch, ".search-view root rule must exist").not.toBeNull();
    expect(rootRuleMatch![1]).toMatch(/overflow-x:\s*hidden\s*;/);

    // The two-column promotion is gated behind a min-width media query —
    // never present in the unconditional base rule.
    const mediaMatch = css.match(/@media\s*\(min-width:\s*(\d+)px\)\s*\{([^]*?)\n\}/);
    expect(mediaMatch, "a min-width media query must gate the wider layout").not.toBeNull();
    const minWidth = Number(mediaMatch![1]);
    expect(minWidth).toBeGreaterThanOrEqual(320);
    expect(mediaMatch![2]).toMatch(/grid-template-columns:\s*230px 1fr\s*;/);
  });

  it("renders the facet sidebar as a native <details> disclosure rather than an always-visible sidebar", async () => {
    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(jsonResponse(fullFixture));
    window.location.hash = "#/search";

    render(<App />);
    await screen.findByRole("heading", { level: 1 });

    const disclosure = document.querySelector(".search-view__facets");
    expect(disclosure?.tagName).toBe("DETAILS");
    expect(disclosure).toHaveAttribute("open");
    expect(disclosure?.querySelector("summary")).not.toBeNull();
  });
});
