/**
 * Single centralised message catalogue.
 *
 * Every user-facing string the site renders is keyed by a stable,
 * dot-namespaced identifier and defined here — in English, the only locale
 * shipped today. Adding a second locale must require a new catalogue file
 * and nothing else, so no user-facing string may be embedded directly in
 * behavioural logic or view code; consume messages only through the typed
 * accessor in `./index.ts`.
 *
 * Two kinds of entries:
 *  - a plain `string` for copy with no dynamic value.
 *  - a function `(params) => string` for copy that must include a dynamic value.
 *    Functions are the ONLY mechanism for inserting a value into a message — never
 *    concatenate a literal fragment around a value in view code.
 *
 * Contributor-authored content (README, CHANGELOG, plugin/artifact descriptions) is
 * exempt from this catalogue by design — it renders verbatim in whatever language
 * its author wrote, sanitised but not translated.
 */

import { formatCount } from "./format";

export const messages = {
  // ---------------------------------------------------------------------
  // Shell / header
  // ---------------------------------------------------------------------
  "shell.brand": "AI Demo Marketplace",
  "shell.brandChip": "ai-demo-marketplace",
  "shell.searchPlaceholder": "Search plugins, skills, agents…",
  "shell.searchClear": "Clear search",
  "shell.paletteTrigger": "Open command palette",
  "shell.themeToggle.toDark": "Switch to dark theme",
  "shell.themeToggle.toLight": "Switch to light theme",
  "shell.repoLink.label": "View repository on GitHub (opens in a new tab)",

  // ---------------------------------------------------------------------
  // Home
  // ---------------------------------------------------------------------
  "home.hero.heading": "Discover plugins for your AI workflow",
  "home.hero.eyebrow": "Marketplace · plugins · skills · agents",
  "home.hero.headingLine1": "Discover plugins",
  "home.hero.headingLine2": "for your AI workflow",
  "home.hero.description":
    "Client-side fuzzy search over descriptions, frontmatter and markdown body. No backend — every asset is built into the static bundle in CI.",
  "home.keywords.heading": "Popular keywords",
  "home.kindCounter.skill": (params: { count: number }) =>
    `${formatCount(params.count, "skill", "skills")}`,
  "home.kindCounter.agent": (params: { count: number }) =>
    `${formatCount(params.count, "agent", "agents")}`,
  "home.kindCounter.command": (params: { count: number }) =>
    `${formatCount(params.count, "command", "commands")}`,
  "home.kindCounter.hook": (params: { count: number }) =>
    `${formatCount(params.count, "hook", "hooks")}`,
  "home.kindCounter.mcp": (params: { count: number }) =>
    `${formatCount(params.count, "MCP server", "MCP servers")}`,
  "home.kindCounter.plugin": (params: { count: number }) =>
    `${formatCount(params.count, "plugin", "plugins")}`,
  "home.browseByKind.heading": "Browse by kind",
  "kind.label.skill": "Skill",
  "kind.label.agent": "Agent",
  "kind.label.command": "Command",
  "kind.label.hook": "Hook",
  "kind.label.mcp": "MCP Server",
  "kind.label.plugin": "Plugin",
  "version.placeholder": "No version",
  "card.open": (params: { name: string }) => `Open ${params.name}`,
  "card.openLabel": "Open",
  "home.releases.heading": "What's new",
  "home.releases.fullFeedLink": "Full feed →",
  "home.stat.plugin": "plugins",
  "home.stat.skill": "skills",
  "home.stat.agent": "agents",
  "home.stat.command": "commands",
  "home.stat.hook": "hooks",
  "home.stat.mcp": "MCP",
  "home.browse.plugin": "Plugins",
  "home.emptyCatalog.heading": "The catalogue is empty",
  "home.emptyCatalog.description":
    "No plugins have been published to this marketplace yet.",
  "home.emptyCatalog.gettingStartedLink": "Get started",
  "home.emptyCatalog.contributionLink": "Read the contribution guidelines",

  // ---------------------------------------------------------------------
  // Search
  // ---------------------------------------------------------------------
  "search.heading.browse": "Browse the catalogue",
  "search.heading.query": (params: { query: string }) =>
    `Results for “${params.query}”`,
  "search.resultCount": (params: { count: number }) =>
    formatCount(params.count, "result", "results"),
  "search.sort.label": "Sort results by",
  "search.sort.trigger": "Sort",
  "search.facets.buttonLabel": (params: { label: string; count: number }) =>
    `${params.label} ${formatCount(params.count, "match", "matches")}`,
  "search.sort.relevance": "Relevance",
  "search.sort.name": "Name",
  "search.sort.recentlyUpdated": "Recently updated",
  "search.filters.heading": "Filters",
  "search.facets.kind": "Kind",
  "search.facets.keyword": "Keyword",
  "search.facets.author": "Author",
  "search.facets.unavailable": "No matches with the current filters",
  "search.reset": "Reset filters",
  "search.activeFilterCount": (params: { count: number }) =>
    formatCount(params.count, "active filter", "active filters"),
  "search.zeroResults.heading": "No results",
  "search.zeroResults.description":
    "Nothing matches the current search and filters.",

  // ---------------------------------------------------------------------
  // Plugin detail
  // ---------------------------------------------------------------------
  "plugin.section.artifacts": "Plugin contents",
  "plugin.section.dependencies": "Dependencies",
  "plugin.section.readme": "README",
  "plugin.section.changelog": "Changelog",
  "plugin.dependency.external": "External",
  "plugin.readme.placeholder":
    "This plugin has not published a README yet.",
  "plugin.changelog.placeholder":
    "This plugin has not published a changelog yet.",
  "plugin.back": "← Back",
  "plugin.updated": (params: { date: string }) => `updated ${params.date}`,
  "plugin.authorAndUpdated": (params: { author: string; date: string }) =>
    `${params.author} · updated ${params.date}`,
  "plugin.installPrompt": "$",
  "plugin.sourceLink.label": "View on GitHub ↗",
  "plugin.compatibility.prefix": "✓",
  "plugin.artifactGroup.count": (params: { count: number }) => `${params.count}`,

  // ---------------------------------------------------------------------
  // Artifact detail
  // ---------------------------------------------------------------------
  "artifact.breadcrumb.catalog": "Catalogue",
  "artifact.breadcrumb.plugin": (params: { pluginName: string }) =>
    params.pluginName,
  "artifact.invocation.heading": "Invocation",
  "artifact.tools.heading": "Tools & permissions",
  "artifact.installExplanation":
    "Installing the plugin makes this artifact available.",
  "artifact.documentation.placeholder":
    "This artifact has no additional documentation.",
  "artifact.documentation.heading": "Documentation",
  "artifact.installPrompt": "$",

  // ---------------------------------------------------------------------
  // What's new
  // ---------------------------------------------------------------------
  "whatsNew.heading": "What's new",
  "whatsNew.subscribe": "Releases · Repository",
  "whatsNew.empty.heading": "Nothing published yet",
  "whatsNew.empty.description":
    "No plugin has published a changelog entry yet.",
  "whatsNew.backToHome": "← Back to home",

  // ---------------------------------------------------------------------
  // Getting started
  // ---------------------------------------------------------------------
  "gettingStarted.intro":
    "Three steps. Add the marketplace as a source first, then install the plugins you want.",
  "gettingStarted.updateNote.lead":
    "Marketplace update vs plugin update.",
  "gettingStarted.step1.title": "Add the marketplace",
  "gettingStarted.step1.explanation":
    "Register this marketplace so its plugins become installable.",
  "gettingStarted.step2.title": "Install a plugin",
  "gettingStarted.step2.explanation":
    "Install any plugin published in this marketplace.",
  "gettingStarted.step3.title": "Keep things up to date",
  "gettingStarted.step3.explanation":
    "Update the marketplace source to see new and updated plugins, then update an installed plugin separately to pull in its latest version.",
  "gettingStarted.updateNote":
    "Updating the marketplace source refreshes the catalogue of available plugins; it does not update plugins you have already installed — update each installed plugin separately.",

  // ---------------------------------------------------------------------
  // Copy / toast
  // ---------------------------------------------------------------------
  "copy.label": "Copy",
  "copy.installLabel": "Copy install",
  "copy.success": "Copied",
  "copy.failure": "Couldn't copy — select the text to copy it manually.",
  "toast.copySuccess": "Copied to clipboard",

  // ---------------------------------------------------------------------
  // Command palette
  // ---------------------------------------------------------------------
  "palette.placeholder": "Search the catalogue…",
  "palette.noResults": "No matches",
  "palette.nothingToSearch": "Nothing to search yet",
  "palette.escHint": "ESC",
  "palette.metaLabel.plugin": "Plugin",

  // ---------------------------------------------------------------------
  // Loading / error / not-found
  // ---------------------------------------------------------------------
  "state.loading": "Loading…",
  "state.error.heading": "Something went wrong",
  "state.error.retry": "Retry",
  "state.notFound.view": "This page doesn't exist.",
  "state.notFound.plugin": "This plugin doesn't exist.",
  "state.notFound.artifact": "This artifact doesn't exist.",

  // ---------------------------------------------------------------------
  // Document titles
  // ---------------------------------------------------------------------
  "title.home": "AI Demo Marketplace",
  "title.search": (params: { query: string }) =>
    params.query
      ? `Search: ${params.query} — AI Demo Marketplace`
      : "Search — AI Demo Marketplace",
  "title.plugin": (params: { name: string }) =>
    `${params.name} — AI Demo Marketplace`,
  "title.artifact": (params: { name: string }) =>
    `${params.name} — AI Demo Marketplace`,
  "title.whatsNew": "What's new — AI Demo Marketplace",
  "title.gettingStarted": "Getting started — AI Demo Marketplace",
} satisfies Record<string, string | ((params: any) => string)>;

export type MessageCatalogue = typeof messages;
export type MessageKey = keyof MessageCatalogue;
