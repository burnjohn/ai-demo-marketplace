/**
 * Humanises a kebab-case package/skill/agent `name` into a display name,
 * e.g. `frontend-skills` -> "Frontend Skills", `sdd-workflow` -> "SDD Workflow".
 *
 * A small known-acronym list keeps short initialisms (sdd, ui, api, ...)
 * fully uppercased instead of merely capitalised — the only special case
 * this catalog currently needs is `sdd-workflow` -> "SDD Workflow".
 */
const ACRONYMS = new Set([
  "sdd",
  "ui",
  "ux",
  "ai",
  "ml",
  "api",
  "url",
  "id",
  "css",
  "html",
  "http",
  "https",
  "json",
  "xml",
  "sql",
  "ci",
  "cd",
  "qa",
  "mcp",
]);

export function humanize(name) {
  return name
    .split(/[-_]+/)
    .filter(Boolean)
    .map((word) =>
      ACRONYMS.has(word.toLowerCase())
        ? word.toUpperCase()
        : word.charAt(0).toUpperCase() + word.slice(1),
    )
    .join(" ");
}
