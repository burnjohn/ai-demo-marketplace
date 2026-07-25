# frontend-skills

A skill pack for **React 19 + Next.js 15 (App Router)** frontend work. Reusable on its own, and a declared dependency of `sdd-workflow` (its agents lean on these skills).

## What it provides

| Skill | Covers |
| --- | --- |
| `frontend-architecture` | Where code lives — folder structure, feature organization, component splitting, state placement, Server/Client boundary |
| `react-best-practices` | Modern React conventions and anti-pattern catalog |
| `react-testing-library` | Component/hook testing with RTL + Vitest (project-agnostic) |
| `next-best-practices` | Next.js file conventions, RSC boundaries, data/async patterns, metadata, bundling |
| `typescript-expert` | Type-level programming, strictness, tooling |

## Install

```
/plugin marketplace add burnjohn/ai-demo-marketplace
/plugin install frontend-skills@ai-demo-marketplace
```

Once installed, skills are addressable as `frontend-skills:<skill>` (e.g. `frontend-skills:react-best-practices`).
