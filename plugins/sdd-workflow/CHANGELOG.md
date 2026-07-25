# Changelog

All notable changes to `sdd-workflow` are documented here. Versioning follows [SemVer](https://semver.org/).

## 2.0.0

### Removed (breaking)
- `implementer` and `test-writer` moved to the new `code-agents` plugin, so they can be used without the
  spec-driven chain. Their addresses are now `code-agents:implementer` and `code-agents:test-writer`.

### Added
- Slash commands that drive the chain: `/spec`, `/plan`, `/run-plan`, `/verify`, `/sdd-retro`. Previously
  the agents had to be invoked by hand with nothing sequencing them.
- `/sdd-retro` makes `workflow-retro` a first-class fifth step of the workflow while keeping it manual:
  the command sets `disable-model-invocation` so the model cannot self-trigger it, and the skill's ban on
  hooks and on chaining onto `/run-plan` is restated in the command body.

### Changed
- **Agents are stack-agnostic.** `implementation-planner` no longer carries a hardcoded project map;
  it now maps the repository first (units, layering rules, contracts, real test/typecheck commands) and
  plans against what it finds. `spec-creator` and `plan-verifier` lost their references to one project's
  modules, frameworks, and invariants. Plan `Acceptance` entries must use commands that exist in the
  target project.
- **Dependencies rewritten in the schema's string form** — the previous object form
  (`{ "name": ..., "version": ... }`) has no `version` field in the manifest schema, so the intended
  semver range was silently ignored. Now: `research-tools@ai-demo-marketplace@^1.0.0`,
  `code-agents@ai-demo-marketplace@^1.0.0`, `frontend-skills@ai-demo-marketplace@^2.0.0`.
- `typescript-expert` references updated to its new home: `typescript-skills:typescript-expert`.

### Migration
- If you dispatched `sdd-workflow:implementer` or `sdd-workflow:test-writer` directly, install
  `code-agents` and update the prefix. `/run-plan` does this for you.
- `frontend-skills` must be on `^2.0.0`; on 1.x the namespaced skill references no longer line up.

## 1.0.0

### Added
- Initial release. Agents: `spec-creator`, `implementation-planner`, `implementer`, `test-writer`, `plan-verifier`; skill: `workflow-retro`.
- Declares dependencies on `research-tools ^1.0.0` and `frontend-skills ^1.0.0`.
- Agent `skills:` frontmatter trimmed to shipped, namespaced `frontend-skills:*` references; removed references to skills/agents not shipped in this marketplace.
