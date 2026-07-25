# Changelog

All notable changes to `code-agents` are documented here. Versioning follows [SemVer](https://semver.org/).

## 1.0.0

### Added
- Initial release. The `implementer` and `test-writer` agents, extracted from `sdd-workflow` 1.0.0 so
  they can be used without the spec-driven chain.
- Declares a hard dependency on `typescript-skills ^1.0.0`.

### Changed
- Both agents are now **stack-agnostic**. Hardcoded knowledge of one project's modules, frameworks and
  commands (Fastify/Drizzle onion backend, a Next.js client, an LLM engine, fixed `pnpm`/`npm`
  invocations) is replaced by a discovery step: read the repo's context files, script manifests and
  neighbouring tests, then use the project's own commands and conventions.
- Optional skills are no longer hardcoded in frontmatter. Only `typescript-skills:typescript-expert` is
  preloaded; framework and testing-library skills are invoked through the `Skill` tool when installed,
  and their absence is reported rather than fatal.

### Removed
- References to an `engineering-insights` skill, which is not published in this marketplace. The agents
  now report non-obvious findings in their output and append to the project's own notes file if one exists.

### Migration
- Agent addresses changed from `sdd-workflow:implementer` / `sdd-workflow:test-writer` to
  `code-agents:implementer` / `code-agents:test-writer`.
