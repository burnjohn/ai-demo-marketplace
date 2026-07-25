# typescript-skills

Language-level **TypeScript** guidance, split out of `frontend-skills` so it can be installed on its
own. Nothing here assumes React, Next.js, or a browser — it is equally useful in a Node backend, a CLI,
or a published library.

## What it provides

| Skill | Covers |
| --- | --- |
| `typescript-expert` | Type-level programming, strictness settings, utility types, and a diagnostic script for narrowing down compiler errors |

Bundled references: a strict `tsconfig` baseline, a cheatsheet, a utility-types file, and
`scripts/ts_diagnostic.py`.

## Install

```
/plugin marketplace add burnjohn/ai-demo-marketplace
/plugin install typescript-skills@ai-demo-marketplace
```

Once installed, the skill is addressable as `typescript-skills:typescript-expert`.

## Who depends on it

`code-agents` declares it as a hard dependency — `implementer` and `test-writer` load it at startup.
`sdd-workflow` gets it transitively.

> **Moved in 2.0.0 of `frontend-skills`:** this skill used to ship there as
> `frontend-skills:typescript-expert`. Update any agent frontmatter or prompt that still uses the old
> namespaced name.
