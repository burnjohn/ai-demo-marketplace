/**
 * URL-state contract — the shape of the parsed URL that the site exposes to
 * views, and the shape views hand back when they navigate.
 *
 * The scheme is hash-based: `#/<view>[/<id>][?<query>]`, with the hash living
 * after Vite's configured `base` (see `paths.ts`). GitHub Pages cannot rewrite
 * unknown paths to the app shell, so every route must resolve client-side from
 * a single `index.html`.
 */

/** The six named views plus the sort values and article kinds they can encode. */
export type ViewName =
  | "home"
  | "search"
  | "plugin"
  | "artifact"
  | "whats-new"
  | "getting-started";

export type SortOrder = "relevance" | "name" | "recently-updated";

/**
 * Sentinel kinds the search facets can filter on. "plugin" is the
 * plugin-level entity itself; the rest mirror `ArtifactKind`.
 */
export type KindFilter = "plugin" | "skill" | "agent" | "command" | "hook" | "mcp";

/** What kind of thing a not-found route failed to resolve — lets the UI name it. */
export type NotFoundReason = "unknown-view" | "unknown-plugin" | "unknown-artifact";

/** Search-only filter/sort state, always optional in the URL. */
export interface SearchState {
  /** Free-text query. Absent/empty means "no query" — search then falls back to name order. */
  query?: string;
  /** Multi-valued kind facet. */
  kinds: KindFilter[];
  /** Multi-valued keyword facet. */
  keywords: string[];
  /** Single-valued author facet. */
  author?: string;
  /** Defaults are resolved by consumers; absent here means "not specified". */
  sort?: SortOrder;
}

/** The parsed, validated result of reading the current URL. */
export type RouteState =
  | { view: "home" }
  | { view: "search"; search: SearchState }
  | { view: "plugin"; pluginId: string }
  | { view: "artifact"; artifactId: string }
  | { view: "whats-new" }
  | { view: "getting-started" }
  | { view: "not-found"; reason: NotFoundReason; attempted: string };

/** How a navigation should be recorded in browser history. */
export type HistoryMode = "push" | "replace";

/** A navigation request — the shape views hand to the router's `navigate`. */
export type NavigateTarget =
  | { view: "home" }
  | { view: "search"; search?: SearchState }
  | { view: "plugin"; pluginId: string }
  | { view: "artifact"; artifactId: string }
  | { view: "whats-new" }
  | { view: "getting-started" };
