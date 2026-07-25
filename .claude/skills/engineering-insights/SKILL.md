---
name: engineering-insights
description: "Recording non-obvious discoveries, dead ends, and working patterns found during development into site/src/insights/INSIGHTS.md. Use when you encounter unexpected behavior, work around a library quirk, discover why something failed, make an architectural decision with tradeoffs, or wrap up a substantive session (30+ min with a concrete problem and outcome). Trigger phrases: learned, discovered, realized, unexpected, gotcha, workaround, turns out, figured out, session wrap-up, engineering notes, non-obvious."
---

# Engineering Insights Recorder

Capture non-obvious discoveries and append them to `site/src/insights/INSIGHTS.md` so future sessions
benefit. Read existing entries first to avoid duplicates. **Append-only — never rewrite existing content.**

---

## When to Run

Run when any of the following apply:

- You encounter behavior not obvious from reading the code for 5 minutes
- You find a dead end — something that does not work and the exact reason
- A library or tool behaves differently than documented
- An architectural decision was made with a concrete reason ("we chose X because Y")
- A recurring error pattern becomes clear with its root cause
- A session ran 30+ minutes with a concrete problem and resolution
- The user invokes `/engineering-insights` directly

Skip trivial sessions: config typo, rename, formatting change, comment edit, or no meaningful discovery.

---

## Algorithm

### 1. Pick the target file

| Path prefix | Area | INSIGHTS.md |
|-------------|------|-------------|
| `site/` | catalog site (Vite + React) | `site/src/insights/INSIGHTS.md` |
| `plugins/` | plugin definitions (skills, agents, hooks) | `site/src/insights/INSIGHTS.md` |
| `docs/`, `.claude/`, root config | repo-level | `site/src/insights/INSIGHTS.md` |

This repo keeps a single insights file. If the repo later grows separate modules, mirror the layout:
`{module}/src/insights/INSIGHTS.md`, one file per module meaningfully touched.

### 2. Rank candidate insights by signal strength

Collect candidates in priority order (cap at 5 per file):

1. **User corrections** — user said "no, not like that" or corrected a mistake
2. **Failed approaches** — paths tried that didn't work, with the exact reason
3. **Repeated patterns** — same issue appeared 2+ times in the session
4. **Non-obvious solutions** — worked, but required investigation to discover
5. **Workflow discoveries** — process or tool behavior learned by doing

### 3. Apply the quality filter

For each candidate: **"Would this be obvious to anyone reading the relevant code for 5 minutes?"**

If yes → discard. Also discard:
- Vague statements without a specific fact
- General programming advice not specific to this codebase
- Content already present in the existing INSIGHTS.md
- Pure process notes ("I ran the tests")

| BAD — discard | GOOD — keep |
|--------------|------------|
| "Promises can be tricky" | "`vite build` in site/ fails on `.nojekyll` unless it lives in site/public/ — dist/ is wiped on every build" |
| "Be careful with plugin configs" | "A plugin's skills are only picked up from `skills/<name>/SKILL.md`; a bare `<name>.md` loads silently as nothing" |
| "The site uses Vite" | "marketplace.json `source` must be a path relative to the marketplace root — an absolute path installs but breaks on clone" |

### 4. Classify each insight into one of 7 sections

| Section | Use for |
|---------|---------|
| **What Works** | Effective patterns confirmed in this codebase |
| **What Doesn't Work** | Dead ends with exact reason — *most skipped, most valuable* |
| **Codebase Patterns** | Project conventions, architectural decisions with reason ("chose X because Y"), wiring |
| **Tool & Library Notes** | Dependency quirks, CLI behavior, test infra specifics |
| **Recurring Errors & Fixes** | Common errors with root cause and exact fix |
| **Session Notes** | One datestamped summary per substantive session |
| **Open Questions** | Unresolved items with context to resume later |

When ambiguous, prefer **What Doesn't Work** over What Works.
Architectural decisions with rationale → **Codebase Patterns**.

### 5. Read existing INSIGHTS.md (if present)

Read the file in full before writing. Discard any candidate that is already captured — exact duplicate
or substantively the same fact.

**Capacity check:** If the file has 180+ entries, include a warning in the output and suggest splitting
into domain files (e.g., `INSIGHTS-site.md`, `INSIGHTS-plugins.md`).

### 6. Create INSIGHTS.md if it doesn't exist

Use this template:

```markdown
# Insights

Non-obvious discoveries from real sessions. Specific and actionable — pass the cold-read test.

---

## What Works

## What Doesn't Work

## Codebase Patterns

## Tool & Library Notes

## Recurring Errors & Fixes

## Session Notes

## Open Questions
```

### 7. Entry format

Every entry must be specific and locatable.

**Most sections:**
```
YYYY-MM-DD — Actionable fact specific to this codebase. ref: path/to/file.ts:line
```

**Session Notes:**
```
YYYY-MM-DD — [problem tackled] → [outcome/resolution]. Files: path1, path2.
```

**Open Questions:**
```
YYYY-MM-DD — [question with context to resume]. Investigated in: path/file.ts:line.
```

The `ref: file:line` anchor is mandatory for What Works / What Doesn't Work / Codebase Patterns /
Recurring Errors entries.

### 8. Append — never overwrite

- Append each entry under its section header with a blank line between entries
- Never delete, reword, or replace existing entries
- If a section header is missing, add it at the end before appending
- Open question resolved later → add resolution entry in Recurring Errors or What Works; do not edit
  the original Open Questions entry

---

## Output Report

After writing, report:

1. Which file received entries
2. Number of entries written, by section
3. Entries discarded by quality filter and why (one line each)
4. Any capacity warnings (approaching 180+ entries)
5. Open questions recorded

Do not print the full INSIGHTS.md content unless asked.
