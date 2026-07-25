# PLUGIN-GUIDELINES — how our plugins are built

The reference every plugin in this catalog follows. Defines structure, manifest fields, and dependency rules.

## Directory structure

```
plugins/<name>/
├── .claude-plugin/
│   └── plugin.json                 # REQUIRED
├── skills/
│   └── <skill>/SKILL.md            # optional
├── agents/*.md                     # optional
├── commands/*.md                   # optional
├── hooks/hooks.json                # optional
├── .mcp.json                       # optional (MCP servers)
├── README.md
├── CHANGELOG.md
└── COMPATIBILITY.md
```

The directory `name` = `name` in `plugin.json` = `name` of the entry in `marketplace.json`. All `kebab-case`.

## `plugin.json` — the manifest

Required fields:

| Field | Type | Note |
| --- | --- | --- |
| `name` | string | kebab-case, public, **effectively immutable** after publication |
| `version` | string | SemVer; controls updates (see `RELEASES.md`) |
| `description` | string | short purpose statement |
| `author` | object | `{ "name": "...", "email": "..." }` (`name` required). Effectively required: `claude plugin validate --strict` fails on a missing-author warning |

Recommended:

| Field | Type | Note |
| --- | --- | --- |
| `repository` | **string** | URL string, **NOT** an object `{type,url}` (object → validation error) |
| `displayName` | string | UI label; may contain spaces/casing |
| `keywords` | array | array of strings (not a string!) |
| `homepage`, `license` | string | optional |

Example:

```json
{
  "$schema": "https://json.schemastore.org/claude-code-plugin-manifest.json",
  "name": "research-tools",
  "version": "1.0.0",
  "description": "Read-only research agent for the workshop.",
  "author": { "name": "burnjohn" },
  "repository": "https://github.com/burnjohn/ai-demo-marketplace"
}
```

## Component rules

- **Paths to scripts/files** in hooks and MCP configs go through `${CLAUDE_PLUGIN_ROOT}` (a plugin is copied into the cache `~/.claude/plugins/cache` on install). For state that must survive updates, use `${CLAUDE_PLUGIN_DATA}`.
- **Do not reference paths outside the plugin directory** (`../`) — those files are not copied. For shared files, use a symlink inside the directory.
- `strict` defaults to `true` — `plugin.json` is the source of truth for components.

## Cross-plugin dependencies

- Extract shared skills/agents into a single canonical source rather than duplicating them.
- Reference dependency components **namespaced**: `research-tools:researcher`, not bare `researcher`. Replace bare names with namespaced ones during extraction.
- Pin dependency versions with constraints (e.g. `^1.0.0`) so the installer can show the full dependency graph before confirmation.

## Before a PR

```bash
claude plugin validate ./plugins/<name>   # manifest + frontmatter shape
claude --plugin-dir ./plugins/<name>       # plugin actually loads, no missing-skill warnings
```

Schema validation checks **shape**; evals check **behavior**. Keep both.

## Appearing well-formed in the catalog site

The catalog site (`site/`, see `site/README.md`) generates its entire index from this repository at
build time. What each plugin provides determines what renders for it — see
`site/specs/2026-07-25-catalog-site-mvp.md` for the full acceptance criteria; this section only
summarizes the practical consequence of providing (or omitting) each file/field.

**Required — a missing one fails the catalog build, not just this plugin's page:**

- A parseable `.claude-plugin/plugin.json`. An unparseable manifest fails the whole site build, naming
  the offending plugin.
- A unique plugin `name`, and unique identifiers for every artifact it declares. A duplicate plugin
  name or duplicate artifact identifier also fails the whole site build, naming both sources of the
  collision.

**Optional — the plugin still builds and appears, but degrades in a specific, visible way:**

| Missing | Consequence in the catalog |
| --- | --- |
| `README.md` | A contribution placeholder renders instead of documentation |
| `CHANGELOG.md` | A placeholder renders on the plugin/artifact page, **and** the plugin never appears in the `#/whats-new` release feed |
| `version` in `plugin.json` | A neutral placeholder badge instead of a version badge |
| `keywords` in `plugin.json` | No keyword chips render for the plugin, and it is absent from keyword facets in search |
| `description`, `author` | Rendered as absent/omitted rather than blank or "undefined" |
| Declared dependencies | Omitted from the dependency list; nothing to jump to |
| `compatibility` statement | The compatibility badge is omitted entirely |

**Dates come from CHANGELOG headings, not from the manifest.** The release feed and detail pages derive
a plugin's release dates from **dated CHANGELOG headings** found in git history — not from any field in
`plugin.json`. A CHANGELOG with undated headings (e.g. a heading added today with no date in it) renders
that entry dateless rather than with today's date, and dateless entries sort after every dated one. If
you want a plugin's changes to show a date in `#/whats-new`, give the CHANGELOG heading an explicit date.
