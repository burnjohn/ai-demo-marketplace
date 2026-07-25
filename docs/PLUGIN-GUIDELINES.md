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

### Two mechanisms, not one

| Where | When it applies | What it does |
| --- | --- | --- |
| `dependencies` in `plugin.json` | install time | Declares plugins that must be **enabled** for this one to function |
| `skills:` in an agent's frontmatter | runtime | Declares which skills are **injected** into that subagent at startup |

Both are usually needed: `dependencies` guarantees the plugin is present, `skills:` guarantees the agent
can see the skill. Neither replaces the other.

**Use the string form for `dependencies`.** The object form accepts only `name` and `marketplace` — it
has no `version` field, so a range written there is silently ignored:

```jsonc
"dependencies": [
  "research-tools",                              // bare name → resolved in this same marketplace
  "typescript-skills@ai-demo-marketplace",       // explicit marketplace
  "frontend-skills@ai-demo-marketplace@^2.0.0"   // + semver range  ← preferred
]
```

**Hard vs optional.** Declare a dependency only when the plugin genuinely cannot function without it —
each hard dependency narrows the audience. For a skill that only some projects need, leave it out of both
the manifest and the frontmatter, and have the agent reach for it via the `Skill` tool when available,
reporting the gap when not. `code-agents` does this: `typescript-skills` is hard, while `frontend-skills`
and `testing-skills` are optional, so backend-only projects can use it without React guidance.

## Before a PR

```bash
claude plugin validate ./plugins/<name>   # manifest + frontmatter shape
claude --plugin-dir ./plugins/<name>       # plugin actually loads, no missing-skill warnings
```

Schema validation checks **shape**; evals check **behavior**. Keep both.
