/**
 * The router's React surface: a provider that owns `location.hash`
 * synchronisation, history policy (push vs replace on same-view state
 * changes), and scroll restoration, plus a `useRouter()` hook views consume
 * to read the current route and navigate. No view markup lives here — this
 * module is the routing primitive only; the app shell composes it in.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { parseRoute } from "./codec";
import { encodeRouteHash } from "./paths";
import type { NavigateTarget, RouteState } from "./types";

interface HistoryEntryState {
  key: string;
}

interface RouterContextValue {
  route: RouteState;
  /**
   * Navigates to a target. History mode is automatic: a view change pushes
   * a new entry; staying on the same view (e.g. changing a search query or
   * facet) replaces the current entry so rapid successive changes collapse
   * into one Back step. Pass `mode` to override.
   */
  navigate: (target: NavigateTarget, mode?: "push" | "replace") => void;
}

const RouterContext = createContext<RouterContextValue | null>(null);

function currentHash(): string {
  return typeof window === "undefined" ? "" : window.location.hash;
}

function createKey(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `k${Date.now()}${Math.random().toString(36).slice(2)}`;
}

/** Provides route state and navigation to the whole app. Mount once, near the root. */
export function RouterProvider({ children }: { children: ReactNode }) {
  const [route, setRoute] = useState<RouteState>(() => parseRoute(currentHash()));
  const currentKeyRef = useRef<string>(createKey());
  const scrollPositionsRef = useRef<Map<string, number>>(new Map());

  // Ensure the initial history entry carries a key so Back/Forward into it
  // (from a later push) can still restore scroll.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const existing = window.history.state as HistoryEntryState | null;
    if (!existing?.key) {
      window.history.replaceState({ key: currentKeyRef.current }, "", window.location.href);
    } else {
      currentKeyRef.current = existing.key;
    }
  }, []);

  // Continuously track scroll offset against the active history key so a
  // later Back/Forward into this entry can restore it. Hash-only
  // navigation does not get free scroll restoration from the browser.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const save = () => {
      scrollPositionsRef.current.set(currentKeyRef.current, window.scrollY);
    };
    window.addEventListener("scroll", save, { passive: true });
    return () => window.removeEventListener("scroll", save);
  }, []);

  // Tracks the hash we last reacted to, regardless of which path drove the
  // change (navigate(), popstate, or hashchange). `popstate` and `hashchange`
  // can both fire for the same browser-driven traversal in real browsers (a
  // Back/Forward across a hash change fires both), and `navigate()` already
  // updates state synchronously — this guard makes every path a no-op once
  // one of them has already processed the current hash.
  const lastHandledHashRef = useRef<string>(currentHash());

  // Repairs (or adopts) a key for the entry the browser has just landed on.
  // A history entry can carry `state === null` in two real-world cases this
  // router must tolerate: (1) a plain `<a href="#/...">` click or an address
  // bar edit, which pushes a *new* entry with no state at all, and (2) an
  // entry created before this key scheme existed. Minting a throwaway random
  // key for such an entry (as opposed to writing it back via `replaceState`)
  // would silently orphan any scroll offset saved against it — the very next
  // Back into this entry would miss the lookup. `replaceState` here rewrites
  // the *current* entry in place; it does not create a new one.
  const ensureKeyForCurrentEntry = useCallback((): string => {
    if (typeof window === "undefined") return currentKeyRef.current;
    const existing = window.history.state as HistoryEntryState | null;
    if (existing?.key) return existing.key;
    const key = createKey();
    window.history.replaceState({ key }, "", window.location.href);
    return key;
  }, []);

  const syncFromBrowser = useCallback(() => {
    const hash = currentHash();
    if (hash === lastHandledHashRef.current) return; // already handled by navigate() or the other listener
    lastHandledHashRef.current = hash;
    const key = ensureKeyForCurrentEntry();
    currentKeyRef.current = key;
    setRoute(parseRoute(hash));
    const savedOffset = scrollPositionsRef.current.get(key) ?? 0;
    requestAnimationFrame(() => window.scrollTo(0, savedOffset));
  }, [ensureKeyForCurrentEntry]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    // `popstate`: browser-driven Back/Forward across history entries.
    // `hashchange`: a safety net for any hash mutation that does *not* go
    // through `navigate()` — a plain `<a href="#/...">`, the address bar, or
    // an external deep link arriving into an already-loaded page. Real
    // browsers never fire `hashchange` for `navigate()`'s own
    // pushState/replaceState calls (only for actual navigations), so the
    // dedup guard above exists for the case where both fire for one browser
    // traversal, not for navigate()'s own writes.
    //
    // Test-writing note: jsdom is NOT spec-compliant here. Its SessionHistory
    // implementation (node_modules/jsdom/lib/jsdom/living/window/SessionHistory.js:144,
    // with its own caveat at line 87 — "Not spec compliant, just minimal. Lots
    // of missing steps.") fires `popstate` for *any* new fragment entry,
    // including plain hash mutations that only fire `hashchange` in real
    // browsers. Never use jsdom's `popstate` behaviour to prove `hashchange`
    // handling works — assert the `hashchange` listener's effect directly
    // (e.g. by dispatching a `HashChangeEvent`/`Event("hashchange")` yourself).
    window.addEventListener("popstate", syncFromBrowser);
    window.addEventListener("hashchange", syncFromBrowser);
    return () => {
      window.removeEventListener("popstate", syncFromBrowser);
      window.removeEventListener("hashchange", syncFromBrowser);
    };
  }, [syncFromBrowser]);

  const navigate = useCallback((target: NavigateTarget, mode?: "push" | "replace") => {
    if (typeof window === "undefined") return;
    const hash = encodeRouteHash(target);
    const nextRoute = parseRoute(hash);
    const resolvedMode: "push" | "replace" =
      mode ?? (nextRoute.view === route.view ? "replace" : "push");
    const href = `${window.location.pathname}${window.location.search}${hash}`;

    lastHandledHashRef.current = hash;

    if (resolvedMode === "push") {
      const key = createKey();
      currentKeyRef.current = key;
      window.history.pushState({ key }, "", href);
      setRoute(nextRoute);
      requestAnimationFrame(() => window.scrollTo(0, 0));
    } else {
      window.history.replaceState({ key: currentKeyRef.current }, "", href);
      setRoute(nextRoute);
    }
    // route.view is read for the auto-mode decision above; the callback is
    // intentionally recreated whenever it changes so that decision stays
    // correct across renders.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route.view]);

  const value = useMemo<RouterContextValue>(() => ({ route, navigate }), [route, navigate]);

  return <RouterContext.Provider value={value}>{children}</RouterContext.Provider>;
}

/** Reads current route state and the `navigate` function. Must be used under `RouterProvider`. */
export function useRouter(): RouterContextValue {
  const context = useContext(RouterContext);
  if (!context) {
    throw new Error("useRouter must be used within a RouterProvider");
  }
  return context;
}
