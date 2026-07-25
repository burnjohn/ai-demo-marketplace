# sdd-workflow

A **Spec-Driven Development** workflow: the authoring and verification agents, a retrospective skill,
and the slash commands that drive the chain end to end.

```
/spec  →  spec (WHAT/WHY)
/plan  →  plan (HOW)
/run-plan  →  code + tests        (dispatches code-agents:implementer / :test-writer)
/verify  →  traceability verdict
/sdd-retro  →  what the run cost and what to change   (always invoked by hand)
```

## What it provides

| Component | Type | Role |
| --- | --- | --- |
| `/spec` | command | Step 1 — delegate to `spec-creator` |
| `/plan` | command | Step 2 — delegate to `implementation-planner` |
| `/run-plan` | command | Step 3 — execute a plan, respecting its DAG and owned paths |
| `/verify` | command | Step 4 — delegate to `plan-verifier` |
| `/sdd-retro` | command | Step 5 — run the retrospective on the finished run |
| `spec-creator` | agent | Author a spec (WHAT/WHY) — never the HOW |
| `implementation-planner` | agent | Turn requirements into a phased, file-specific plan (HOW) |
| `plan-verifier` | agent | Read-only completeness/traceability check |
| `workflow-retro` | skill | Post-mortem for a multi-agent run |

Execution agents are **not** here — they live in `code-agents`, so they can be used without SDD.

## Dependencies

Declared in `plugin.json` as strings with semver ranges — the installer shows them before confirmation:

- `research-tools ^1.0.0` — `researcher`, fanned out by `spec-creator` and `implementation-planner` for discovery.
- `code-agents ^1.0.0` — `implementer` and `test-writer`, dispatched by `/run-plan`. Brings `typescript-skills` transitively.
- `frontend-skills ^2.0.0` — the planning agents reference its skills (namespaced, e.g. `frontend-skills:frontend-architecture`).

Optionally add `testing-skills` for React projects; `test-writer` picks it up when present and falls back
to the project's own test conventions when not.

## Install

```
/plugin marketplace add burnjohn/ai-demo-marketplace
/plugin install sdd-workflow@ai-demo-marketplace
```

> Components are addressable as `sdd-workflow:<name>` (e.g. `sdd-workflow:implementation-planner`).

## The retro is a step, not a trigger

`workflow-retro` is part of this workflow, but it stays **manual on purpose**: it is reachable as
`/sdd-retro` and is never wired to a `Stop`/`SubagentStop` hook, nor chained onto the end of
`/run-plan`. Running it on every prompt would cost tokens and add noise on trivial changes — you decide
when a run is worth reviewing. The command also sets `disable-model-invocation`, so the model cannot
self-trigger it.

## Stack-agnostic

These agents were extracted from a specific project, but no longer assume its stack. They map the
repository first — its units, layering rules, contracts, and real test/typecheck commands — and plan
against what they find. Acceptance criteria only ever use commands that exist in the project.
