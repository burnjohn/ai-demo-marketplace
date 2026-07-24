# Contributing to the marketplace

This document explains not only *how to install* a plugin, but **how to change the catalog safely**.

## General rules

- **Naming:** all `name` fields (marketplace and plugins) are `kebab-case`, no spaces. A plugin's `name` is public and **effectively immutable** after publication (renaming breaks users' installs). Use `displayName` for the UI label; use the `renames` map in the catalog to rename/remove.
- **No secrets and no absolute paths** in manifests or components. A manifest may *name* a secret slot, but must not contain a credential. Absolute paths (`/Users/...`, `/home/...`) are forbidden — use `${CLAUDE_PLUGIN_ROOT}`.
- **Do not reach outside the plugin directory** with `../` — on install the plugin is copied into a cache, and such files won't be copied.

## Required plugin structure

Details are in [`docs/PLUGIN-GUIDELINES.md`](./docs/PLUGIN-GUIDELINES.md). Minimum:

```
plugins/<name>/
└── .claude-plugin/plugin.json      # name, version, description (+ author, repository)
```

Required `plugin.json` fields: `name`, `version` (SemVer), `description`. `repository`, if present, is a **string URL**, not an object.

## Dependencies

- Shared skills/agents have a single canonical source; pin dependency versions with constraints.
- Reference components from dependency plugins with a **namespace** (e.g. `research-tools:researcher`, not bare `researcher`).

## Contribution steps

1. **Create the plugin directory** following the structure in `docs/PLUGIN-GUIDELINES.md`.
2. **Add an entry** to `.claude-plugin/marketplace.json`: `{ "name": "...", "source": "./plugins/..." }`.
   - ⚠️ Touch the catalog **only when adding a new** plugin. Bumping an existing plugin's version/description happens in its `plugin.json` and does **not** require editing `marketplace.json`.
3. **Add an owner** in [`CODEOWNERS`](./CODEOWNERS): a line `/plugins/<name>/ @owner`.
4. **Add the plugin's `CHANGELOG.md`** (see [`docs/RELEASES.md`](./docs/RELEASES.md)).
5. **Local checks** before the PR:
   ```bash
   claude plugin validate ./plugins/<name>   # manifest + frontmatter shape
   claude plugin validate .                  # whole catalog
   ```

> Automated enforcement (a structural linter + GitHub Actions CI) is added in a later workshop stage. Until then, run the checks above locally.

## Review and release

- A plugin's owner (from `CODEOWNERS`) reviews changes to that plugin; adding a new plugin to the catalog is approved by the repo maintainer.
- Release flow (SemVer, tags, rollback): [`docs/RELEASES.md`](./docs/RELEASES.md).
- Permissions/secrets policy: [`docs/SECURITY.md`](./docs/SECURITY.md).
