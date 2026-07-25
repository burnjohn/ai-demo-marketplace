/**
 * Synthetic "incomplete" fixture — a single plugin with no README, no
 * CHANGELOG, no version, no dependencies, no keywords and no artifacts.
 * Exercises the tolerated-gap paths where each missing field is shown as
 * a placeholder rather than treated as a validation failure.
 */
import type { CatalogIndex } from "../types";

export const incompleteFixture: CatalogIndex = {
  marketplaceName: "ai-demo-marketplace",
  repositoryUrl: "https://github.com/burnjohn/ai-demo-marketplace",
  buildTimestamp: "2026-07-25T09:00:00.000Z",
  sourceCommitRef: "def456abc123",
  plugins: [
    {
      id: "bare-plugin",
      name: "bare-plugin",
      displayName: "Bare Plugin",
      description: "",
      installCommand: {
        text: "/plugin install bare-plugin@ai-demo-marketplace",
        scope: "plugin-installation",
      },
      sourceUrl:
        "https://github.com/burnjohn/ai-demo-marketplace/tree/main/plugins/bare-plugin",
      artifacts: [],
      searchText: "bare plugin",
    },
  ],
};
