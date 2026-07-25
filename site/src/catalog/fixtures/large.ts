/**
 * Synthetic "large" fixture — exactly 2 000 entities (plugins + artifacts)
 * for the performance-budget test (search/facet interaction under 100 ms).
 * Generated deterministically — no `Math.random` — so the fixture is
 * identical across every run and every machine.
 *
 * Layout: 500 plugins, each shipping exactly 3 artifacts, for
 * 500 + 500*3 = 2000 entities total.
 */
import type { Artifact, ArtifactKind, CatalogIndex, Plugin } from "../types";

const PLUGIN_COUNT = 500;
const ARTIFACT_KINDS: ArtifactKind[] = ["skill", "agent", "command"];
const KEYWORD_POOL = [
  "search",
  "testing",
  "workflow",
  "architecture",
  "automation",
  "security",
  "performance",
  "data",
];

function buildArtifact(pluginId: string, pluginIndex: number, kindIndex: number): Artifact {
  const kind = ARTIFACT_KINDS[kindIndex % ARTIFACT_KINDS.length];
  const name = `${kind}-${pluginIndex}`;
  return {
    id: `${pluginId}--${kind}--${name}`,
    kind,
    name,
    displayName: `${kind[0].toUpperCase()}${kind.slice(1)} ${pluginIndex}`,
    description: `Synthetic ${kind} number ${pluginIndex} for load testing.`,
    owningPluginId: pluginId,
    documentationExcerpt: `Synthetic documentation body for ${kind} ${pluginIndex}.`,
    sourceUrl: `https://github.com/burnjohn/ai-demo-marketplace/tree/main/plugins/${pluginId}/${kind}s/${name}`,
    searchText: `${kind} ${name} synthetic load test ${pluginIndex}`,
  };
}

function buildPlugin(index: number): Plugin {
  const id = `synthetic-plugin-${index}`;
  const keyword = KEYWORD_POOL[index % KEYWORD_POOL.length];
  const artifacts = ARTIFACT_KINDS.map((_, kindIndex) => buildArtifact(id, index, kindIndex));
  return {
    id,
    name: id,
    displayName: `Synthetic Plugin ${index}`,
    description: `Synthetic plugin number ${index}, generated deterministically for the performance budget test.`,
    version: `1.0.${index % 10}`,
    authorName: `Synthetic Author ${index % 20}`,
    keywords: [keyword],
    lastUpdated: new Date(Date.UTC(2026, 0, 1 + (index % 200))).toISOString(),
    installCommand: {
      text: `/plugin install ${id}@ai-demo-marketplace`,
      scope: "plugin-installation",
    },
    sourceUrl: `https://github.com/burnjohn/ai-demo-marketplace/tree/main/plugins/${id}`,
    artifacts,
    searchText: `synthetic plugin ${index} ${keyword} load test`,
  };
}

export const largeFixture: CatalogIndex = {
  marketplaceName: "ai-demo-marketplace",
  marketplaceDescription: "Synthetic large catalog for performance testing.",
  repositoryUrl: "https://github.com/burnjohn/ai-demo-marketplace",
  buildTimestamp: "2026-07-25T09:00:00.000Z",
  sourceCommitRef: "large0000fixture",
  plugins: Array.from({ length: PLUGIN_COUNT }, (_, index) => buildPlugin(index)),
};

/** Total entity count (plugins + artifacts) this fixture yields — must equal 2000. */
export const largeFixtureEntityCount =
  largeFixture.plugins.length +
  largeFixture.plugins.reduce((sum, plugin) => sum + plugin.artifacts.length, 0);
