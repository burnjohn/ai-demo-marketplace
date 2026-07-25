/**
 * Tracks which "catalog" view (home, search, what's-new) was last visited so
 * the plugin detail's back control can return there, while still falling
 * back to home for a view reached by deep link.
 *
 * The router (`site/src/routing/router.tsx`) exposes no "previous route"
 * signal and `history.length` is not a reliable proxy (a deep link can land
 * on a tab with pre-existing browser history, "open in new tab" duplicates
 * entries, etc.). Router internals are outside this view's owned paths, so
 * rather than editing `router.tsx` this module observes the same History
 * API the router itself drives, by wrapping `pushState`/`replaceState` once
 * from the outside.
 *
 * Because this only observes navigations that happen *after* this module is
 * first evaluated, a cold load (deep link) correctly has no recorded
 * "previous catalog view" the first time `resolveBackTarget` is asked — the
 * page's own initial history entry was already in place before this code
 * ran, so there is nothing to have observed. That is exactly the desired
 * fallback-to-home behaviour.
 *
 * Known limitation: this only sees history transitions from the moment this
 * module is imported. If a future change code-splits this view behind a
 * route-level lazy import that only loads once the user first opens a
 * plugin, a same-session Home -> Search -> Plugin chain would forget the
 * Search step. If that matters, the app shell should import this module
 * (or this view) eagerly rather than lazily.
 */

import type { NavigateTarget, ViewName } from "../../routing/types";
import { parseRoute } from "../../routing/codec";

const CATALOG_VIEWS: ReadonlySet<ViewName> = new Set(["home", "search", "whats-new"]);

function isCatalogHash(hash: string): boolean {
  return CATALOG_VIEWS.has(parseRoute(hash).view as ViewName);
}

function targetFromHash(hash: string): NavigateTarget {
  const route = parseRoute(hash);
  switch (route.view) {
    case "home":
      return { view: "home" };
    case "whats-new":
      return { view: "whats-new" };
    case "search":
      return { view: "search", search: route.search };
    default:
      return { view: "home" };
  }
}

let lastCatalogHash: string | null = null;
let observedHash = typeof window === "undefined" ? "" : window.location.hash;
let patched = false;

function noteTransitionTo(nextHash: string): void {
  if (isCatalogHash(observedHash)) {
    lastCatalogHash = observedHash;
  }
  observedHash = nextHash;
}

/** Resolves the hash fragment a `pushState`/`replaceState` call is targeting, if any. */
function extractHash(url: string | URL | null | undefined): string | null {
  if (typeof window === "undefined") return null;
  if (url == null) return window.location.hash;
  try {
    return new URL(String(url), window.location.href).hash;
  } catch {
    return null;
  }
}

function patchHistoryOnce(): void {
  if (patched || typeof window === "undefined" || !window.history) return;
  patched = true;

  const originalPushState = window.history.pushState.bind(window.history);
  const originalReplaceState = window.history.replaceState.bind(window.history);

  window.history.pushState = function patchedPushState(
    this: History,
    data: unknown,
    unused: string,
    url?: string | URL | null,
  ) {
    const nextHash = extractHash(url);
    if (nextHash !== null) noteTransitionTo(nextHash);
    return originalPushState(data, unused, url as string);
  } as History["pushState"];

  window.history.replaceState = function patchedReplaceState(
    this: History,
    data: unknown,
    unused: string,
    url?: string | URL | null,
  ) {
    const nextHash = extractHash(url);
    if (nextHash !== null) noteTransitionTo(nextHash);
    return originalReplaceState(data, unused, url as string);
  } as History["replaceState"];

  window.addEventListener("popstate", () => {
    observedHash = window.location.hash;
  });
}

patchHistoryOnce();

/** Resolves where the plugin detail's back control should navigate to. */
export function resolveBackTarget(): NavigateTarget {
  return lastCatalogHash ? targetFromHash(lastCatalogHash) : { view: "home" };
}

/** Test-only reset so each test starts from a clean provenance state. */
export function __resetBackProvenanceForTests(): void {
  lastCatalogHash = null;
  observedHash = typeof window === "undefined" ? "" : window.location.hash;
}
