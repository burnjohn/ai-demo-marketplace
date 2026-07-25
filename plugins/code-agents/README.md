# code-agents

Two **execution agents** — the ones that actually change the codebase. Extracted from `sdd-workflow`
so you can delegate work without adopting Spec-Driven Development at all.

## What it provides

| Component | Type | Role |
| --- | --- | --- |
| `implementer` | agent | Build **one** scoped task and self-verify against the project's existing tests + typecheck |
| `test-writer` | agent | Add or extend tests; never changes production behaviour |

Both agents are **stack-agnostic**: they discover the project's package manager, test/typecheck
commands, layering rules and test-split conventions from the repo itself (`CLAUDE.md`, contributor
docs, script manifests, neighbouring test files) before writing anything. Neither invents a command it
has not seen in the project.

## Dependencies

- **Hard:** `typescript-skills ^1.0.0` — loaded in both agents' frontmatter.
- **Optional (degradable):** `frontend-skills`, `testing-skills`. The agents invoke these through the
  `Skill` tool when they are installed and skip them otherwise, noting the gap in their report. This is
  why a backend-only project can install `code-agents` without pulling in React guidance.

## Install

```
/plugin marketplace add burnjohn/ai-demo-marketplace
/plugin install code-agents@ai-demo-marketplace
```

Components are addressable as `code-agents:<name>` (e.g. `code-agents:implementer`).

## Use

**Standalone** — hand `implementer` one clearly scoped task, or ask `test-writer` to cover an existing
module. Each returns a report with changed files and pasted verification output; neither claims green
without evidence.

**Parallel** — several `implementer` instances can run on the same branch with no worktree isolation.
Safety comes entirely from non-overlapping owned paths, so give each instance its own paths **and** the
paths owned by its siblings.

**Inside SDD** — `sdd-workflow`'s `/run-plan` dispatches these agents per plan task.
