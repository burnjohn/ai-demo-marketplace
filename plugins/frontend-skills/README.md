# frontend-skills

A skill pack for **React 19 + Next.js 15 (App Router)** frontend work. Reusable on its own, and a
declared dependency of `sdd-workflow` (its agents lean on these skills).

## What it provides

| Skill | Covers |
| --- | --- |
| `frontend-architecture` | Where code lives — folder structure, feature organization, component splitting, state placement, Server/Client boundary |
| `react-best-practices` | Modern React conventions and anti-pattern catalog |
| `next-best-practices` | Next.js file conventions, RSC boundaries, data/async patterns, metadata, bundling |

## Install

```
/plugin marketplace add burnjohn/ai-demo-marketplace
/plugin install frontend-skills@ai-demo-marketplace
```

Once installed, skills are addressable as `frontend-skills:<skill>` (e.g. `frontend-skills:react-best-practices`).

## Moved out in 2.0.0

Two skills left this plugin so they could be installed without the React/Next.js pack:

| Skill | Now lives in | New address |
| --- | --- | --- |
| `typescript-expert` | [`typescript-skills`](../typescript-skills/) | `typescript-skills:typescript-expert` |
| `react-testing-library` | [`testing-skills`](../testing-skills/) | `testing-skills:react-testing-library` |

If you referenced either by its old `frontend-skills:` name, install the new plugin and update the
reference — see the [CHANGELOG](./CHANGELOG.md).
