# Changelog

All notable changes to `frontend-skills` are documented here. Versioning follows [SemVer](https://semver.org/).

## 2.0.0

### Removed (breaking)
- `typescript-expert` moved to the new `typescript-skills` plugin. It is language-level, not
  frontend-specific — backend and library projects want it without React.
- `react-testing-library` moved to the new `testing-skills` plugin, so testing guidance can be adopted
  independently.

This plugin now ships three skills: `frontend-architecture`, `react-best-practices`,
`next-best-practices`.

### Migration
Install the plugin that now owns the skill and update the namespaced reference:

| Old address | New address | Install |
| --- | --- | --- |
| `frontend-skills:typescript-expert` | `typescript-skills:typescript-expert` | `/plugin install typescript-skills@ai-demo-marketplace` |
| `frontend-skills:react-testing-library` | `testing-skills:react-testing-library` | `/plugin install testing-skills@ai-demo-marketplace` |

An agent whose `skills:` frontmatter still names an old address will not resolve it.

### Changed
- `frontend-architecture` — replaced a project-specific import example (`@devdigest/shared`) with a
  neutral path so the rule reads the same in any repo.

## 1.0.0

### Added
- Initial release. Five skills: `frontend-architecture`, `react-best-practices`, `react-testing-library`, `next-best-practices`, `typescript-expert`.
