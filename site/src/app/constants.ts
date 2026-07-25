/**
 * Fallback repository URL used before the catalog index has loaded (or when
 * it failed to load) — the real `repositoryUrl` normally comes from
 * `CatalogIndex.repositoryUrl` once loaded. Kept in sync with the literal
 * used in `../shell/Shell.tsx` and `../views/plugin/PluginView.tsx`.
 */
export const FALLBACK_REPOSITORY_URL = "https://github.com/burnjohn/ai-demo-marketplace";
