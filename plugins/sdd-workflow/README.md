# sdd-workflow

A **Spec-Driven Development** workflow for frontend features, as a set of specialized agents plus a retrospective skill:

```
spec-creator → spec → implementation-planner → plan → implementer → code → test-writer → tests → plan-verifier → verdict
```

## What it provides

| Component | Type | Role |
| --- | --- | --- |
| `spec-creator` | agent | Author a spec (WHAT/WHY) — never the HOW |
| `implementation-planner` | agent | Turn a spec into a phased, file-specific plan (HOW) |
| `implementer` | agent | Implement one task/slice and self-verify |
| `test-writer` | agent | Add/extend tests; never changes production behavior |
| `plan-verifier` | agent | Read-only completeness/traceability check |
| `workflow-retro` | skill | Post-mortem for a multi-agent run |

## Dependencies

Declared in `plugin.json` — the installer shows them before confirmation:

- `research-tools ^1.0.0` — `researcher` used for discovery.
- `frontend-skills ^1.0.0` — the agents reference its skills (namespaced, e.g. `frontend-skills:frontend-architecture`).

## Install

```
/plugin marketplace add burnjohn/ai-demo-marketplace
/plugin install sdd-workflow@ai-demo-marketplace
```

> Components are addressable as `sdd-workflow:<name>` (e.g. `sdd-workflow:implementation-planner`).

> **Note:** these agents were extracted from the DevDigest project and still carry some project-specific prose (module names, commands). Generalization is a follow-up step.
