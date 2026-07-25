# AGENTS.md

Guidance for AI coding agents (Claude Code and compatible) working in this repository.

## What this repo is

`ai-demo-marketplace` — a Claude Code **plugin catalog** for the AI Agentic Engineering workshop.

| Path | Contents |
| --- | --- |
| `.claude-plugin/marketplace.json` | catalog manifest — every plugin must be registered here |
| `plugins/<name>/` | one plugin: `.claude-plugin/plugin.json`, `skills/`, `agents/`, `hooks/` |
| `site/` | Vite + React catalog site (published to GitHub Pages) |
| `docs/` | contribution and release guidelines |
| `.claude/skills/` | skills used while working *on this repo* |

Prerequisites: Node ≥22, npm. Site: `cd site && npm install && npm run dev`.

## Engineering insights — required

This project uses the **`engineering-insights`** skill (`.claude/skills/engineering-insights/SKILL.md`)
to record non-obvious discoveries into `site/src/insights/INSIGHTS.md`.

**Read before you start:** open `site/src/insights/INSIGHTS.md` first — it holds dead ends and quirks
that are not visible in the code.

**Write when you finish:** invoke `/engineering-insights` at the end of any substantive session — one
that hit unexpected behavior, a library quirk, a dead end, an architectural decision with tradeoffs,
or ran 30+ minutes on a concrete problem. Do not skip it: if capture depends on a human remembering,
it does not happen often enough to compound.

Skip it for trivial changes — a typo, a rename, formatting, a comment edit.

Rules the skill enforces, worth knowing up front:

- **Append-only.** Never rewrite, reword, or delete existing entries.
- **Cold-read test.** An entry must be specific enough to act on months later; anything obvious from
  5 minutes of reading the code gets discarded.
- **`ref: file:line` anchor** is mandatory for What Works / What Doesn't Work / Codebase Patterns /
  Recurring Errors entries.

## Conventions

- A new plugin needs a `plugin.json`, a `README.md`, a `CHANGELOG.md`, and an entry in
  `.claude-plugin/marketplace.json` — see `docs/PLUGIN-GUIDELINES.md`.
- Skills live at `plugins/<plugin>/skills/<skill-name>/SKILL.md` — the directory name must match the
  `name:` in the frontmatter.
- Plugin hooks live at `plugins/<plugin>/hooks/hooks.json` and use `${CLAUDE_PLUGIN_ROOT}` for paths.
- Keep `site/` build output (`site/dist/`) out of manual edits — it is generated.
