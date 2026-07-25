/**
 * Route dispatch — maps `route.view` to one of the six views (imported
 * statically, never lazily: the router modules wrap `history.pushState`/
 * `replaceState` at module-import time to record back-target and last-search
 * provenance, and a lazy `import()` would leave earlier same-session
 * navigations unobserved), or to the router-level not-found state.
 *
 * Also owns the three navigation side-effects every internal navigation
 * must produce:
 *   - a document title unique to the view + entity;
 *   - assistive-tech announcement of the view change;
 *   - keyboard focus moved to the new view's main heading.
 *
 * Scroll restoration on Back/Forward is the router's own mechanism
 * (`../routing/router.tsx`) — nothing here re-implements it.
 */
import { useEffect, useRef } from "react";
import type { CatalogIndex } from "../catalog/types";
import { useRouter } from "../routing/router";
import type { RouteState } from "../routing/types";
import { HomeView } from "../views/home";
import { SearchView } from "../views/search";
import { PluginView } from "../views/plugin";
import { ArtifactView } from "../views/artifact";
import { WhatsNewView } from "../views/whats-new";
import { GettingStartedView } from "../views/getting-started";
import { NotFoundView } from "./NotFoundView";
import { useAnnouncer } from "./Announcer";
import { t } from "../i18n";

export interface RouteViewProps {
  index: CatalogIndex;
}

function findPluginDisplayName(index: CatalogIndex, pluginId: string): string | undefined {
  return index.plugins.find((plugin) => plugin.id === pluginId)?.displayName;
}

function findArtifactDisplayName(index: CatalogIndex, artifactId: string): string | undefined {
  for (const plugin of index.plugins) {
    const artifact = plugin.artifacts.find((candidate) => candidate.id === artifactId);
    if (artifact) return artifact.displayName;
  }
  return undefined;
}

/**
 * Resolves the document title for the current route. Falls back to the
 * relevant not-found copy when a `plugin`/`artifact` id does not resolve in
 * the loaded index — this mirrors what `PluginView`/`ArtifactView` render
 * inline, so the title stays truthful even though this function never
 * throws or redirects.
 */
function resolveTitle(route: RouteState, index: CatalogIndex): string {
  switch (route.view) {
    case "home":
      return t("title.home");
    case "search":
      return t("title.search", { query: route.search.query ?? "" });
    case "plugin": {
      const name = findPluginDisplayName(index, route.pluginId);
      return name ? t("title.plugin", { name }) : t("state.notFound.plugin");
    }
    case "artifact": {
      const name = findArtifactDisplayName(index, route.artifactId);
      return name ? t("title.artifact", { name }) : t("state.notFound.artifact");
    }
    case "whats-new":
      return t("title.whatsNew");
    case "getting-started":
      return t("title.gettingStarted");
    case "not-found":
      if (route.reason === "unknown-plugin") return t("state.notFound.plugin");
      if (route.reason === "unknown-artifact") return t("state.notFound.artifact");
      return t("state.notFound.view");
    default: {
      const exhaustive: never = route;
      return exhaustive;
    }
  }
}

/**
 * A stable key identifying "which screen the user is looking at" for focus
 * and announcement purposes. Deliberately coarser than the full route: a
 * facet/query edit on the search view (a `replace` navigation to the same
 * view) must not re-steal focus out of the search input the user is typing
 * in, so it is excluded here — only a change of view, or of which plugin/
 * artifact is open, counts as a navigation worth announcing.
 */
function resolveNavigationKey(route: RouteState): string {
  switch (route.view) {
    case "plugin":
      return `plugin:${route.pluginId}`;
    case "artifact":
      return `artifact:${route.artifactId}`;
    case "not-found":
      return `not-found:${route.reason}:${route.attempted}`;
    default:
      return route.view;
  }
}

function renderView(route: RouteState, index: CatalogIndex) {
  switch (route.view) {
    case "home":
      return <HomeView index={index} />;
    case "search":
      return <SearchView index={index} />;
    case "plugin":
      return <PluginView index={index} />;
    case "artifact":
      return <ArtifactView index={index} />;
    case "whats-new":
      return <WhatsNewView index={index} />;
    case "getting-started":
      return <GettingStartedView index={index} />;
    case "not-found":
      return <NotFoundView reason={route.reason} />;
    default: {
      const exhaustive: never = route;
      return exhaustive;
    }
  }
}

export function RouteView({ index }: RouteViewProps) {
  const { route } = useRouter();
  const { announce } = useAnnouncer();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const hasNavigatedRef = useRef(false);

  const title = resolveTitle(route, index);
  const navigationKey = resolveNavigationKey(route);

  // Document title tracks every route change, including the initial one:
  // each of the six views, and every distinct entity within plugin/artifact,
  // gets its own title.
  useEffect(() => {
    document.title = title;
  }, [title]);

  // Focus + announcement track only genuine navigations (see
  // `resolveNavigationKey`), and are skipped on first mount so loading the
  // app does not steal focus away from the address bar for no reason.
  useEffect(() => {
    if (!hasNavigatedRef.current) {
      hasNavigatedRef.current = true;
      return;
    }

    const heading = containerRef.current?.querySelector<HTMLElement>("h1");
    if (heading) {
      const hadTabIndex = heading.hasAttribute("tabindex");
      if (!hadTabIndex) {
        heading.setAttribute("tabindex", "-1");
      }
      heading.focus();
      const restoreTabIndex = () => {
        if (!hadTabIndex) heading.removeAttribute("tabindex");
        heading.removeEventListener("blur", restoreTabIndex);
      };
      heading.addEventListener("blur", restoreTabIndex);
    }

    announce(title);
    // `title` intentionally omitted: it is read at the moment the effect
    // runs (via closure), but the effect must fire on navigation, not on
    // every title recomputation (e.g. a search view's title changes while
    // typing, which must not repeatedly steal focus).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigationKey]);

  return (
    <div ref={containerRef} className="app-route">
      {renderView(route, index)}
    </div>
  );
}
