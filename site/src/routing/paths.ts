/**
 * Route-URL construction. GitHub Pages serves this app under
 * `import.meta.env.BASE_URL` (configured in `vite.config.ts` as
 * `/ai-demo-marketplace/`, and `/` under `vite dev`) — the hash always lives
 * *after* that base path. Never string-concatenate the base literal; always
 * read it from `import.meta.env.BASE_URL` so dev and prod stay consistent.
 */

import type { KindFilter, NavigateTarget, SearchState, SortOrder } from "./types";

const KNOWN_SORTS: readonly SortOrder[] = ["relevance", "name", "recently-updated"];
const KNOWN_KINDS: readonly KindFilter[] = [
  "plugin",
  "skill",
  "agent",
  "command",
  "hook",
  "mcp",
];

function isKnownSort(value: string): value is SortOrder {
  return (KNOWN_SORTS as readonly string[]).includes(value);
}

function isKnownKind(value: string): value is KindFilter {
  return (KNOWN_KINDS as readonly string[]).includes(value);
}

/** Builds the `#/...` fragment (including the leading `#`) for a navigation target. */
export function encodeRouteHash(target: NavigateTarget): string {
  switch (target.view) {
    case "home":
      return "#/";
    case "whats-new":
      return "#/whats-new";
    case "getting-started":
      return "#/getting-started";
    case "plugin":
      return `#/plugin/${encodeURIComponent(target.pluginId)}`;
    case "artifact":
      return `#/artifact/${encodeURIComponent(target.artifactId)}`;
    case "search": {
      const params = encodeSearchParams(target.search);
      const qs = params.toString();
      return qs ? `#/search?${qs}` : "#/search";
    }
    default: {
      const exhaustive: never = target;
      return exhaustive;
    }
  }
}

/** Builds a full, shareable `href` (base + hash) for a navigation target. */
export function buildRouteHref(target: NavigateTarget): string {
  return `${import.meta.env.BASE_URL}${encodeRouteHash(target)}`;
}

export function encodeSearchParams(search: SearchState | undefined): URLSearchParams {
  const params = new URLSearchParams();
  if (!search) return params;
  if (search.query) params.set("q", search.query);
  for (const kind of search.kinds) params.append("kind", kind);
  for (const keyword of search.keywords) params.append("keyword", keyword);
  if (search.author) params.set("author", search.author);
  if (search.sort) params.set("sort", search.sort);
  return params;
}

/**
 * Parses `location.search`-shaped query text into validated search state.
 * Anything unrecognised is silently discarded — never thrown, never treated
 * as markup: values are kept as literal strings throughout.
 */
export function parseSearchParams(queryString: string): SearchState {
  const params = new URLSearchParams(queryString);
  const kinds = params.getAll("kind").filter(isKnownKind);
  const keywords = params.getAll("keyword").filter((value) => value.length > 0);
  const query = params.get("q") ?? undefined;
  const author = params.get("author") ?? undefined;
  const sortRaw = params.get("sort");
  const sort = sortRaw && isKnownSort(sortRaw) ? sortRaw : undefined;

  const state: SearchState = { kinds, keywords };
  if (query) state.query = query;
  if (author) state.author = author;
  if (sort) state.sort = sort;
  return state;
}
