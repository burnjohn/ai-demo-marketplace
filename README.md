# ai-demo-marketplace

**AI Demo Marketplace** — a public **Claude Code plugin marketplace** built for the *AI Agentic Engineering* workshop. It's a catalog you add once, then install shared plugins from: skills, agents, hooks, and MCP servers.

The catalog lives separately from any product — its own owner, its own release cadence. A product release must not force a plugin release, and vice versa.

> **This first commit is the baseline.** It ships the marketplace structure and docs with an **empty plugin catalog**. Real plugins, a validation script, CI, and a catalog website are added stage by stage during the workshop — each on its own branch.

## Add the marketplace (once)

```
/plugin marketplace add burnjohn/ai-demo-marketplace
```

## Install a plugin

```
/plugin install <plugin-name>@ai-demo-marketplace
```

`<plugin-name>` is the `name` of an entry in `.claude-plugin/marketplace.json`; `ai-demo-marketplace` is the catalog name. The baseline ships with no plugins yet — the catalog fills up as the workshop progresses.

## Updating (two different things)

| Command | What it does |
| --- | --- |
| `/plugin marketplace update` | Refreshes the **catalog** — pulls the current list of available plugins/versions |
| `/plugin update <plugin>@ai-demo-marketplace` | Updates an already **installed plugin** to a new version |

Refreshing the catalog does not update installed plugins by itself.

## Repository layout

```
.claude-plugin/marketplace.json   # the catalog (plugin registry) — empty in the baseline
plugins/                          # each plugin in its own subdirectory (added during the workshop)
docs/PLUGIN-GUIDELINES.md         # plugin anatomy (manifest, dependencies)
docs/SECURITY.md                  # permissions, secrets policy
docs/RELEASES.md                  # SemVer, tags, update, rollback
CODEOWNERS · CONTRIBUTING.md
```

## Workshop stages

The baseline is deliberately minimal so we can build it up live. Later branches add, roughly in order:

1. The first real plugins (a skill, a read-only agent).
2. A structural linter (`scripts/validate-marketplace.mjs`) — secrets / absolute-path / escape checks.
3. GitHub Actions CI (`.github/workflows/validate.yml`) running the linter + `claude plugin validate`.
4. Release/rollback helpers and a catalog website (GitHub Pages).

## Contributing

Before adding a plugin, read [`CONTRIBUTING.md`](./CONTRIBUTING.md) and [`docs/PLUGIN-GUIDELINES.md`](./docs/PLUGIN-GUIDELINES.md).

## Principles

- **Explore first, standardise later** — don't over-engineer governance before 2–3 real plugins exist.
- **Pin versions, don't auto-update** external dependencies; update deliberately.
- **Portability:** keep `SKILL.md` compatible (Markdown + YAML frontmatter) with other agents.
