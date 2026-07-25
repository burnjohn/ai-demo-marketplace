# testing-skills

Testing conventions, split out of `frontend-skills` so a project can adopt the testing guidance without
the architecture and framework packs.

## What it provides

| Skill | Covers |
| --- | --- |
| `react-testing-library` | Component and hook tests with RTL + Vitest: accessible queries over test-ids, `userEvent` interaction, awaiting async findings, which seams to mock and which never to |

Project-agnostic — no assumptions beyond React being present.

## Install

```
/plugin marketplace add burnjohn/ai-demo-marketplace
/plugin install testing-skills@ai-demo-marketplace
```

Once installed, the skill is addressable as `testing-skills:react-testing-library`.

## Who depends on it

Nobody hard-depends on it — deliberately. `test-writer` (in `code-agents`) invokes it through the
`Skill` tool **when it is installed**, and falls back to the project's own observed test conventions
when it is not. Install it alongside `code-agents` for React projects; skip it for anything else.

> **Moved in 2.0.0 of `frontend-skills`:** this skill used to ship there as
> `frontend-skills:react-testing-library`. Update any agent frontmatter or prompt that still uses the
> old namespaced name.
