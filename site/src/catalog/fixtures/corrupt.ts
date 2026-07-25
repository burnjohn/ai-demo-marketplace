/**
 * Synthetic "corrupt" fixture(s) — structurally invalid / truncated payloads
 * for the validator's reject path. Intentionally untyped (`unknown`): these
 * represent what a corrupt JSON asset would deserialize to at runtime, which
 * is exactly what `validateCatalogIndex` must reject without throwing.
 */

/** Root is not an object at all. */
export const corruptNotAnObject: unknown = "this is not a catalog index";

/** Root is an object but missing every required field. */
export const corruptEmptyObject: unknown = {};

/** Truncated mid-plugin: `plugins` is present but one entry is missing required fields. */
export const corruptTruncatedPlugin: unknown = {
  marketplaceName: "ai-demo-marketplace",
  repositoryUrl: "https://github.com/burnjohn/ai-demo-marketplace",
  buildTimestamp: "2026-07-25T09:00:00.000Z",
  sourceCommitRef: "abc123",
  plugins: [
    {
      id: "broken-plugin",
      // name, displayName, description, installCommand, sourceUrl, artifacts,
      // searchText are all missing — this is what a truncated JSON write
      // (e.g. a process killed mid-stream) would look like.
    },
  ],
};

/** `plugins` is not an array. */
export const corruptPluginsNotArray: unknown = {
  marketplaceName: "ai-demo-marketplace",
  repositoryUrl: "https://github.com/burnjohn/ai-demo-marketplace",
  buildTimestamp: "2026-07-25T09:00:00.000Z",
  sourceCommitRef: "abc123",
  plugins: "not-an-array",
};

/** An artifact inside an otherwise-valid plugin has an unknown `kind`. */
export const corruptBadArtifactKind: unknown = {
  marketplaceName: "ai-demo-marketplace",
  repositoryUrl: "https://github.com/burnjohn/ai-demo-marketplace",
  buildTimestamp: "2026-07-25T09:00:00.000Z",
  sourceCommitRef: "abc123",
  plugins: [
    {
      id: "plugin-with-bad-artifact",
      name: "plugin-with-bad-artifact",
      displayName: "Plugin With Bad Artifact",
      description: "",
      installCommand: {
        text: "/plugin install plugin-with-bad-artifact@ai-demo-marketplace",
        scope: "plugin-installation",
      },
      sourceUrl: "https://github.com/burnjohn/ai-demo-marketplace/tree/main/plugins/plugin-with-bad-artifact",
      artifacts: [
        {
          id: "plugin-with-bad-artifact--widget--thing",
          kind: "widget", // not a valid ArtifactKind
          name: "thing",
          displayName: "Thing",
          owningPluginId: "plugin-with-bad-artifact",
          sourceUrl: "https://github.com/burnjohn/ai-demo-marketplace",
          searchText: "thing",
        },
      ],
      searchText: "plugin with bad artifact",
    },
  ],
};
