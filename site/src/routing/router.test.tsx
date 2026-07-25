/**
 * Behavioural tests for `RouterProvider`'s `hashchange` safety net and its
 * scroll-key repair on state-less history entries.
 *
 * IMPORTANT: jsdom is not spec-compliant for history/hash navigation. Its
 * `SessionHistory` implementation (node_modules/jsdom/lib/jsdom/living/window/SessionHistory.js:144,
 * with jsdom's own caveat at line 87: "Not spec compliant, just minimal. Lots
 * of missing steps.") fires `popstate` for *any* new fragment entry — real
 * browsers only do that for session-history traversal (Back/Forward), not
 * for a plain hash mutation, which fires `hashchange` instead. So these
 * tests never rely on jsdom's `popstate` firing to prove `hashchange`
 * handling works: every assertion here dispatches `hashchange` itself and
 * checks the listener's own effect directly.
 */

import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RouterProvider, useRouter } from "./router";

function renderRouter() {
  return renderHook(() => useRouter(), {
    wrapper: ({ children }) => <RouterProvider>{children}</RouterProvider>,
  });
}

/** Sets `location.hash` without going through `navigate()`, mimicking a plain
 * `<a href="#/...">` click, an address-bar edit, or an external deep link. */
function setHashDirectly(hash: string) {
  window.location.hash = hash;
}

describe("RouterProvider hashchange safety net", () => {
  beforeEach(() => {
    window.history.replaceState(null, "", "#/");
  });

  afterEach(() => {
    window.history.replaceState(null, "", "#/");
  });

  it("re-parses the route when the hash changes without going through navigate()", () => {
    const { result } = renderRouter();
    expect(result.current.route).toEqual({ view: "home" });

    act(() => {
      setHashDirectly("#/whats-new");
      window.dispatchEvent(new Event("hashchange"));
    });

    expect(result.current.route).toEqual({ view: "whats-new" });
  });

  it("adopts a key onto a state-less entry instead of losing its scroll offset", () => {
    renderRouter();

    act(() => {
      setHashDirectly("#/getting-started");
      // A plain anchor click / address-bar edit produces a fresh entry with
      // no history state at all — that is the exact case that used to mint
      // a throwaway key and orphan the entry's scroll offset.
      expect((window.history.state as { key?: string } | null)?.key).toBeUndefined();
      window.dispatchEvent(new Event("hashchange"));
    });

    const state = window.history.state as { key?: string } | null;
    expect(state).not.toBeNull();
    expect(typeof state?.key).toBe("string");
    expect(state?.key).not.toHaveLength(0);
  });

  it("is a no-op when navigate() already synced the current hash (idempotent with popstate/hashchange)", () => {
    const { result } = renderRouter();
    const rafSpy = vi.spyOn(window, "requestAnimationFrame");

    act(() => {
      result.current.navigate({ view: "plugin", pluginId: "frontend-skills" });
    });
    expect(result.current.route).toEqual({ view: "plugin", pluginId: "frontend-skills" });
    rafSpy.mockClear();

    // Simulate the browser also firing hashchange (and/or popstate) for the
    // very navigation navigate() already performed — the hash did not
    // change again, so the safety net must recognise it has already handled
    // this hash and do nothing (no re-parse, no scroll restore work).
    act(() => {
      window.dispatchEvent(new Event("hashchange"));
    });

    expect(rafSpy).not.toHaveBeenCalled();
    expect(result.current.route).toEqual({ view: "plugin", pluginId: "frontend-skills" });

    rafSpy.mockRestore();
  });
});
