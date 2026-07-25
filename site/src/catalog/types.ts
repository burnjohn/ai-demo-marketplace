/**
 * Catalog index contract — the shape emitted at build time by the (future) index
 * generator and consumed at runtime by the loader.
 *
 * Optionality below means the field is genuinely absent from the JSON (no key),
 * never present with an empty string / null / other sentinel value.
 *
 * The real catalog today (see `plugins/*` and `.claude-plugin/marketplace.json`)
 * declares no `displayName`, no `compatibility`, no dated CHANGELOG headings, and
 * ships only skills and agents — so all of those must stay optional here rather
 * than assuming the mockup's richer data.
 */

/** One of the artifact kinds a plugin may ship. */
export type ArtifactKind = "skill" | "agent" | "command" | "hook" | "mcp";

/** Distinguishes which getting-started step an install command belongs to. */
export type InstallCommandScope =
  | "marketplace-registration"
  | "plugin-installation"
  | "update";

/** The literal, copyable install command text plus which step it belongs to. */
export interface InstallCommand {
  /** The literal string displayed and copied verbatim. */
  text: string;
  scope: InstallCommandScope;
}

/** A declared dependency of a plugin, resolved (or not) against this same catalog. */
export interface Dependency {
  /** Declared dependency name. */
  name: string;
  /** As declared upstream (e.g. a semver range). Absent when not declared. */
  versionRange?: string;
  /** True when this name resolves to another plugin in this same catalog. */
  resolvesWithinCatalog: boolean;
}

/** One entry parsed out of a plugin's CHANGELOG. */
export interface ChangelogEntry {
  /** As written in the source heading. */
  version: string;
  /** Absent when the source heading carries no date. */
  date?: string;
  /** Short, plain-text-safe summary of the entry. */
  summary: string;
  /** Id of the plugin this entry belongs to; used by the release feed to navigate. */
  owningPluginId: string;
}

/**
 * One shipped artifact — a single shape covering skill, agent, command, hook and
 * MCP server. Fields specific to only some kinds (e.g. `model` for agents) stay
 * optional rather than splitting into per-kind types.
 */
export interface Artifact {
  /** Stable, unique across the catalog; used in URLs. */
  id: string;
  kind: ArtifactKind;
  /** Identifier as declared in the source. */
  name: string;
  /** Falls back to a humanised `name` when not declared upstream. */
  displayName: string;
  /** Absent → the card shows no description line, layout preserved. */
  description?: string;
  /** Drives breadcrumb, meta line, and install command resolution. */
  owningPluginId: string;
  /** Absent → no invocation token is shown for this artifact. */
  invocationToken?: string;
  /** List of permitted tool/permission names. Absent → the tools row is omitted. */
  tools?: string[];
  /** Agents only. Absent for every other kind and for agents without one declared. */
  model?: string;
  /** Bounded body used for the detail view and for search. Absent → no body is rendered. */
  documentationExcerpt?: string;
  /** The artifact's file or directory in the repository. */
  sourceUrl: string;
  /** Bounded concatenation of the fields search may match. */
  searchText: string;
}

/** One plugin entity, one per plugin listed in the marketplace manifest. */
export interface Plugin {
  /** Stable, unique across the catalog; used in URLs. */
  id: string;
  /** Kebab-case package name. */
  name: string;
  /** Falls back to a humanised `name` when not declared upstream. */
  displayName: string;
  /** May be an empty string only if genuinely absent upstream; never omitted. */
  description: string;
  /** Absent → a placeholder is shown in place of a version string. */
  version?: string;
  /** Absent → grouped as unattributed in the author facet. */
  authorName?: string;
  /** Absent → no chips, no keyword facets for this plugin. */
  keywords?: string[];
  /** From the marketplace manifest. */
  category?: string;
  /** Absent → compatibility badge omitted. */
  compatibility?: string;
  /** Absent → no freshness stamp shown for this plugin. */
  lastUpdated?: string;
  /** Literal text presented and copied verbatim. */
  installCommand: InstallCommand;
  /** The plugin's directory in the repository. */
  sourceUrl: string;
  /** Markdown content. Absent → a placeholder is shown in place of the README. */
  readme?: string;
  /** Absent or empty → placeholder. */
  changelogEntries?: ChangelogEntry[];
  dependencies?: Dependency[];
  /** May be empty (a plugin with no shipped artifacts is still valid). */
  artifacts: Artifact[];
  /** Bounded concatenation of the fields search may match. */
  searchText: string;
}

/** The catalog index root — the single build-time artifact the site loads. */
export interface CatalogIndex {
  /** The registered marketplace identifier used to compose install commands. */
  marketplaceName: string;
  /** Shown in the hero when present. */
  marketplaceDescription?: string;
  /** Base for all source and contribution links. */
  repositoryUrl: string;
  /** ISO instant; drives the visible freshness stamp. */
  buildTimestamp: string;
  /** Identifies the exact repository state indexed. */
  sourceCommitRef: string;
  /** May be empty (empty-catalog state). */
  plugins: Plugin[];
}
