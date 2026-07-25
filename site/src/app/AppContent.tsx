/**
 * Composes the shell, the palette overlay and the routed content around the
 * loaded catalog index. Renders the loading / loaded / failed triad: a
 * layout-reserving skeleton while loading, the routed view once loaded, and
 * a distinguishable error surface with a working retry on failure — never
 * conflated with a genuinely empty catalog
 * (an empty, *loaded* index renders `HomeView`/`SearchView`'s own empty
 * states, not this component's error branch).
 */
import { useRef } from "react";
import { CommandPalette, type CommandPaletteHandle } from "../palette";
import { Shell } from "../shell";
import { Skeleton } from "../components/Skeleton";
import { ErrorState } from "../components/ErrorState";
import { useCatalogIndexState } from "./CatalogIndexContext";
import { AppErrorBoundary } from "./AppErrorBoundary";
import { RouteView } from "./RouteView";
import { FALLBACK_REPOSITORY_URL } from "./constants";
import "./app.css";

/** Reserves roughly the shape of the loaded home view so nothing shifts on load. */
function AppLoadingSkeleton() {
  return (
    <div className="page app-loading" role="status" aria-hidden="false">
      <Skeleton variant="block" />
      <div className="app-loading__grid">
        <Skeleton variant="card" count={6} />
      </div>
    </div>
  );
}

export function AppContent() {
  const state = useCatalogIndexState();
  const paletteRef = useRef<CommandPaletteHandle | null>(null);

  const isLoaded = state.status === "loaded";
  const buildTimestamp = isLoaded ? state.data.buildTimestamp : undefined;
  const sourceCommitRef = isLoaded ? state.data.sourceCommitRef : undefined;
  const repositoryUrl = isLoaded ? state.data.repositoryUrl : FALLBACK_REPOSITORY_URL;
  const paletteIndex = isLoaded ? state.data : null;

  return (
    <Shell
      buildTimestamp={buildTimestamp}
      sourceCommitRef={sourceCommitRef}
      onOpenPalette={() => paletteRef.current?.open()}
    >
      <AppErrorBoundary repositoryUrl={repositoryUrl}>
        {state.status === "loading" && <AppLoadingSkeleton />}
        {state.status === "failed" && (
          <ErrorState message={state.reason} onRetry={state.retry} repositoryUrl={repositoryUrl} />
        )}
        {isLoaded && <RouteView index={state.data} />}
      </AppErrorBoundary>
      <CommandPalette ref={paletteRef} index={paletteIndex} />
    </Shell>
  );
}
