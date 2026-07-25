/**
 * The URL-state codec: `location.hash` (or any hash-shaped string) <-> `RouteState`.
 *
 * Route shapes (after the app's base path, i.e. what appears in `location.hash`):
 *   - `#/`                         -> home
 *   - `#/search[?q=&kind=&keyword=&author=&sort=]` -> search (see `paths.ts` for params)
 *   - `#/plugin/<id>`              -> plugin detail
 *   - `#/artifact/<id>`            -> artifact detail
 *   - `#/whats-new`                -> what's new
 *   - `#/getting-started`          -> getting started
 *   - anything else                -> not-found, reason "unknown-view"
 *
 * Query parameter names (search view only): `q`, `kind` (repeatable), `keyword`
 * (repeatable), `author`, `sort`. These names are load-bearing for consumers.
 *
 * Validation: unknown views, unknown sort values and unknown kind values
 * are discarded rather than surfaced as errors. A raw query value that
 * happens to contain markup (e.g. `<img src=x>`) is never parsed as HTML here —
 * it is carried through as a plain JS string end to end.
 */

import { parseSearchParams } from "./paths";
import type { RouteState } from "./types";

/** Strips a leading `#` and splits `path?query` into its two halves. */
function splitHash(hash: string): { path: string; queryString: string } {
  const withoutHash = hash.startsWith("#") ? hash.slice(1) : hash;
  const questionIndex = withoutHash.indexOf("?");
  const path = questionIndex === -1 ? withoutHash : withoutHash.slice(0, questionIndex);
  const queryString = questionIndex === -1 ? "" : withoutHash.slice(questionIndex + 1);
  return { path, queryString };
}

/** Parses a raw `location.hash` value into validated route state. */
export function parseRoute(hash: string): RouteState {
  const { path, queryString } = splitHash(hash);
  const segments = path.split("/").filter((segment) => segment.length > 0);

  if (segments.length === 0) {
    return { view: "home" };
  }

  const [first, second] = segments;

  switch (first) {
    case "search":
      return { view: "search", search: parseSearchParams(queryString) };
    case "whats-new":
      return { view: "whats-new" };
    case "getting-started":
      return { view: "getting-started" };
    case "plugin":
      return second
        ? { view: "plugin", pluginId: decodeURIComponent(second) }
        : { view: "not-found", reason: "unknown-plugin", attempted: path };
    case "artifact":
      return second
        ? { view: "artifact", artifactId: decodeURIComponent(second) }
        : { view: "not-found", reason: "unknown-artifact", attempted: path };
    default:
      return { view: "not-found", reason: "unknown-view", attempted: path };
  }
}
