# SECURITY — permissions, secrets, script checks

Plugins are installed by people who trust them with a repository, and sometimes a shell, credentials, and external services. So we treat changes like production code.

## Permissions (least privilege)

- Give agents and hooks **only the tools/permissions they actually need**. A read-only reviewer must not have write access.
- On update, the installer shows a **permissions diff**. Scope expansion (e.g. from read-only to network access) must not be accepted automatically — it is a deliberate reviewer decision.
- Document new permissions in the plugin's `CHANGELOG.md`.

## Secrets policy

- **No credentials in the repository** — not in `plugin.json`, not in `marketplace.json`, not in components.
- A manifest may *name* a secret slot (e.g. an expected env variable), but must **not** contain a value.
- Secrets are provided by the environment / a secret manager on the user's side, not through the plugin.

## Absolute paths

- Absolute paths (`/Users/...`, `/home/...`, `C:\...`) are forbidden — they are tied to the author's machine.
- Address scripts and resources through `${CLAUDE_PLUGIN_ROOT}` (the plugin's directory in the cache); state through `${CLAUDE_PLUGIN_DATA}`.
- Do not reach outside the plugin directory with `../`.

## Enforcement

Right now these rules are enforced by **review**. Every change to a plugin or the catalog should be checked for:

- secret patterns: `-----BEGIN ... PRIVATE KEY-----`, `AKIA…` (AWS), GitHub tokens, `token=`/`secret=`/`password=` with a non-empty value;
- absolute paths: `/Users/`, `/home/`, `C:\`;
- reaching outside the directory: `..` in a plugin `source`.

> **Workshop note:** a later stage adds `scripts/validate-marketplace.mjs` (a structural linter that fails on the patterns above) wired into GitHub Actions CI, alongside `claude plugin validate . --strict`, as a required gate on every PR. Both checks are offline and require no API key, so fork PRs (run via `pull_request`, not `pull_request_target`) get no access to repository secrets.
