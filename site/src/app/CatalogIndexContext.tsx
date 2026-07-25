/**
 * Provides the catalog index loading/loaded/failed triad through a single
 * read-only context. The index is loaded exactly once, at the app root, via
 * `loadCatalogIndex` (`../catalog/loadIndex.ts`) — nothing else in the tree
 * fetches it or mutates it.
 */
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { loadCatalogIndex, type CatalogIndexState } from "../catalog/loadIndex";

const CatalogIndexStateContext = createContext<CatalogIndexState | null>(null);

export function CatalogIndexProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<CatalogIndexState>({ status: "loading" });

  useEffect(() => {
    loadCatalogIndex(setState);
    // `loadCatalogIndex` is fire-and-forget with no external cancellation
    // token; the loader itself guards against acting after a stale request
    // via its own internal `cancelled` flag scoped to each call. Mounting
    // exactly once here (StrictMode double-invoke aside) matches its "once
    // per app" contract.
  }, []);

  return (
    <CatalogIndexStateContext.Provider value={state}>{children}</CatalogIndexStateContext.Provider>
  );
}

/** Reads the current loading/loaded/failed state. Must be used under `CatalogIndexProvider`. */
export function useCatalogIndexState(): CatalogIndexState {
  const context = useContext(CatalogIndexStateContext);
  if (!context) {
    throw new Error("useCatalogIndexState must be used within a CatalogIndexProvider");
  }
  return context;
}
