# plugins/

Each plugin lives in its own subdirectory here: `plugins/<name>/`.

## Current catalog

The catalog is layered so nothing forces you to adopt a whole workflow. Knowledge packs stand alone;
agents depend on knowledge; the workflow depends on both.

| Plugin | Ships | Depends on |
| --- | --- | --- |
| `frontend-skills` | skills: `frontend-architecture`, `react-best-practices`, `next-best-practices` | — |
| `typescript-skills` | skill: `typescript-expert` | — |
| `testing-skills` | skill: `react-testing-library` | — |
| `research-tools` | agent: `researcher` | — |
| `code-agents` | agents: `implementer`, `test-writer` | `typescript-skills` |
| `sdd-workflow` | commands `/spec` `/plan` `/run-plan` `/verify` `/sdd-retro`; agents `spec-creator`, `implementation-planner`, `plan-verifier`; skill `workflow-retro` | `research-tools`, `code-agents`, `frontend-skills` |

Four independent entry points: install a knowledge pack alone, take `code-agents` to delegate work
without any ceremony, or install `sdd-workflow` and let its `dependencies` pull the rest.

### Hard vs optional dependencies

`dependencies` in `plugin.json` declares what must be **enabled** for a plugin to function, and is
resolved at install time. Agent `skills:` frontmatter is a separate, runtime concern — which skills get
injected into a subagent at startup. Both are needed; one does not replace the other.

Optional skills are deliberately kept out of frontmatter: `code-agents` hard-depends only on
`typescript-skills`, and reaches for framework or testing skills through the `Skill` tool when they
happen to be installed. That is what lets a backend-only project use `implementer` without pulling in
React guidance.

## Adding a plugin

1. Create `plugins/<name>/` following the anatomy in [`../docs/PLUGIN-GUIDELINES.md`](../docs/PLUGIN-GUIDELINES.md).
2. Register it in [`../.claude-plugin/marketplace.json`](../.claude-plugin/marketplace.json).
3. Add an owner line in [`../CODEOWNERS`](../CODEOWNERS).

Minimum a plugin needs:

```
plugins/<name>/
└── .claude-plugin/plugin.json      # name, version, description (+ author, repository)
```

See [`../CONTRIBUTING.md`](../CONTRIBUTING.md) for the full checklist.
