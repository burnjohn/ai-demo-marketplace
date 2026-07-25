/**
 * Synthetic "empty" fixture — zero plugins. Exercises the empty-catalog
 * state as distinct from a load/parse failure.
 */
import type { CatalogIndex } from "../types";

export const emptyFixture: CatalogIndex = {
  marketplaceName: "ai-demo-marketplace",
  repositoryUrl: "https://github.com/burnjohn/ai-demo-marketplace",
  buildTimestamp: "2026-07-25T09:00:00.000Z",
  sourceCommitRef: "0000000000",
  plugins: [],
};
