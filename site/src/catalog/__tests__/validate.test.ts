import { describe, expect, it } from "vitest";

import { validateCatalogIndex } from "../validate";
import { emptyFixture } from "../fixtures/empty";
import { fullFixture } from "../fixtures/full";
import { incompleteFixture } from "../fixtures/incomplete";
import { largeFixture, largeFixtureEntityCount } from "../fixtures/large";
import {
  corruptBadArtifactKind,
  corruptEmptyObject,
  corruptNotAnObject,
  corruptPluginsNotArray,
  corruptTruncatedPlugin,
} from "../fixtures/corrupt";

describe("validateCatalogIndex", () => {
  it("accepts the full fixture and returns its typed data unchanged", () => {
    const result = validateCatalogIndex(fullFixture);

    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.data.plugins).toHaveLength(3);
      expect(result.data.marketplaceName).toBe("ai-demo-marketplace");
    }
  });

  it("accepts the incomplete fixture (no README/CHANGELOG/version/deps/keywords/artifacts)", () => {
    const result = validateCatalogIndex(incompleteFixture);

    expect(result.valid).toBe(true);
    if (result.valid) {
      const [plugin] = result.data.plugins;
      expect(plugin.readme).toBeUndefined();
      expect(plugin.changelogEntries).toBeUndefined();
      expect(plugin.version).toBeUndefined();
      expect(plugin.dependencies).toBeUndefined();
      expect(plugin.keywords).toBeUndefined();
      expect(plugin.artifacts).toEqual([]);
    }
  });

  it("accepts the empty fixture (zero plugins)", () => {
    const result = validateCatalogIndex(emptyFixture);

    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.data.plugins).toEqual([]);
    }
  });

  it("rejects a non-object root with a useful message, and never throws", () => {
    const result = validateCatalogIndex(corruptNotAnObject);

    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.problems.length).toBeGreaterThan(0);
      expect(result.problems[0]).toMatch(/must be an object/);
    }
  });

  it("rejects an empty object naming every missing required field", () => {
    const result = validateCatalogIndex(corruptEmptyObject);

    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.problems.some((problem) => problem.startsWith("marketplaceName"))).toBe(true);
      expect(result.problems.some((problem) => problem.startsWith("repositoryUrl"))).toBe(true);
      expect(result.problems.some((problem) => problem.startsWith("plugins"))).toBe(true);
    }
  });

  it("rejects a truncated plugin entry naming the missing plugin fields", () => {
    const result = validateCatalogIndex(corruptTruncatedPlugin);

    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.problems.some((problem) => problem.includes("plugins[0].name"))).toBe(true);
      expect(result.problems.some((problem) => problem.includes("plugins[0].installCommand"))).toBe(
        true,
      );
    }
  });

  it("rejects plugins that is not an array", () => {
    const result = validateCatalogIndex(corruptPluginsNotArray);

    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.problems.some((problem) => problem.startsWith("plugins:"))).toBe(true);
    }
  });

  it("rejects an artifact with an unknown kind, naming its path", () => {
    const result = validateCatalogIndex(corruptBadArtifactKind);

    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(
        result.problems.some((problem) => problem.includes("artifacts[0].kind")),
      ).toBe(true);
    }
  });

  it("does not throw on any corrupt input", () => {
    for (const input of [
      corruptNotAnObject,
      corruptEmptyObject,
      corruptTruncatedPlugin,
      corruptPluginsNotArray,
      corruptBadArtifactKind,
      null,
      undefined,
      42,
      [],
    ]) {
      expect(() => validateCatalogIndex(input)).not.toThrow();
    }
  });

  it("yields exactly 2000 entities (plugins + artifacts) for the large fixture and validates", () => {
    expect(largeFixtureEntityCount).toBe(2000);

    const result = validateCatalogIndex(largeFixture);
    expect(result.valid).toBe(true);
    if (result.valid) {
      const artifactCount = result.data.plugins.reduce(
        (sum, plugin) => sum + plugin.artifacts.length,
        0,
      );
      expect(result.data.plugins.length + artifactCount).toBe(2000);
    }
  });
});
