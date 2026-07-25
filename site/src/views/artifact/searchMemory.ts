/**
 * Session memory of the last search/browse state, used by the artifact
 * detail view's breadcrumb: activating the "catalog" segment must restore
 * the last query and filters used in this session, or fall back to the
 * unfiltered browse state if the session never searched.
 *
 * The router (`site/src/routing/router.tsx`) keeps no memory of past route
 * states once the user navigates away from `#/search` — `route` only ever
 * reflects the *current* URL. Rather than editing that owned module, this
 * file observes every navigation from *outside* by wrapping
 * `history.pushState`/`replaceState` once at import time. The router's
 * `navigate()` always goes through one of those two calls, so this capture
 * fires for every SPA navigation regardless of push vs replace — including
 * the ones performed while `SearchView` is mounted, long before any
 * artifact view exists.
 *
 * Caveat: this only captures navigations that happen *after* this module
 * has first been imported somewhere in the running app. In practice that
 * happens at app startup as long as the artifact view (or this module) is
 * statically imported by the app shell. If the artifact view is ever
 * code-split behind a dynamic `import()` that only resolves once the user
 * is already on `#/artifact/<id>`, searches made before that first load
 * would not be remembered.
 */

import { parseRoute } from "../../routing";
import type { SearchState } from "../../routing";

const STORAGE_KEY = "artifact-detail.lastSearch";

let patched = false;

function persist(search: SearchState): void {
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(search));
  } catch {
    // sessionStorage unavailable (private mode, quota, etc.) — memory simply
    // won't persist across this navigation; the catalog breadcrumb falls
    // back to the unfiltered browse state.
  }
}

function captureIfSearch(): void {
  const route = parseRoute(window.location.hash);
  if (route.view === "search") {
    persist(route.search);
  }
}

/** Idempotently wraps history navigation so every SPA route change is observed. */
export function ensureSearchMemoryTracking(): void {
  if (patched || typeof window === "undefined" || !window.history) return;
  patched = true;

  const originalPushState = window.history.pushState.bind(window.history);
  const originalReplaceState = window.history.replaceState.bind(window.history);

  window.history.pushState = function trackedPushState(
    ...args: Parameters<History["pushState"]>
  ) {
    originalPushState(...args);
    captureIfSearch();
  };
  window.history.replaceState = function trackedReplaceState(
    ...args: Parameters<History["replaceState"]>
  ) {
    originalReplaceState(...args);
    captureIfSearch();
  };
}

/** Reads the last remembered search/filter state for this session, if any. */
export function getRememberedSearchState(): SearchState | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as SearchState;
    if (!Array.isArray(parsed.kinds) || !Array.isArray(parsed.keywords)) return undefined;
    return parsed;
  } catch {
    return undefined;
  }
}

/** Test-only reset so specs don't leak session state between cases. */
export function __resetSearchMemoryForTests(): void {
  try {
    window.sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

ensureSearchMemoryTracking();
