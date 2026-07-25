import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { buildCatalogIndex } from "../lib/build.mjs";
import { validateCatalogIndex } from "../lib/validate-catalog-index.mjs";
import { BuildIndexError } from "../lib/errors.mjs";
import { humanize } from "../lib/humanize.mjs";
import { bound, buildSearchText } from "../lib/bound.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CLI_PATH = path.resolve(__dirname, "..", "build-index.mjs");

let tmpRoot;

beforeEach(() => {
  tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "build-index-test-"));
});

afterEach(() => {
  fs.rmSync(tmpRoot, { recursive: true, force: true });
});

/** Writes a minimal marketplace.json into the fixture tree. */
function writeManifest(root, plugins) {
  fs.mkdirSync(path.join(root, ".claude-plugin"), { recursive: true });
  fs.writeFileSync(
    path.join(root, ".claude-plugin", "marketplace.json"),
    JSON.stringify(
      {
        name: "fixture-marketplace",
        owner: { name: "fixture-owner" },
        metadata: { description: "Fixture marketplace." },
        plugins,
      },
      null,
      2,
    ),
  );
}

/** Writes a plugin.json (and optional README/CHANGELOG/skills/agents) for one plugin. */
function writePlugin(root, name, { pluginJson, readme, changelog, skills = [], agents = [] } = {}) {
  const pluginDir = path.join(root, "plugins", name);
  fs.mkdirSync(path.join(pluginDir, ".claude-plugin"), { recursive: true });
  fs.writeFileSync(
    path.join(pluginDir, ".claude-plugin", "plugin.json"),
    JSON.stringify({ name, ...pluginJson }, null, 2),
  );
  if (readme !== undefined) {
    fs.writeFileSync(path.join(pluginDir, "README.md"), readme);
  }
  if (changelog !== undefined) {
    fs.writeFileSync(path.join(pluginDir, "CHANGELOG.md"), changelog);
  }
  for (const skill of skills) {
    const skillDir = path.join(pluginDir, "skills", skill.name);
    fs.mkdirSync(skillDir, { recursive: true });
    fs.writeFileSync(
      path.join(skillDir, "SKILL.md"),
      `---\nname: ${skill.name}\ndescription: "${skill.description ?? "A skill."}"\n---\n\n# ${skill.name}\n\nBody.\n`,
    );
  }
  for (const agent of agents) {
    fs.mkdirSync(path.join(pluginDir, "agents"), { recursive: true });
    fs.writeFileSync(
      path.join(pluginDir, "agents", `${agent.name}.md`),
      `---\nname: ${agent.name}\ndescription: ${agent.description ?? "An agent."}\ntools: Read, Grep\n---\n\n# ${agent.name}\n`,
    );
  }
  return pluginDir;
}

describe("buildCatalogIndex", () => {
  it("builds a full catalog with correct plugin/artifact counts and passes self-validation", () => {
    writeManifest(tmpRoot, [
      { name: "alpha", source: "./plugins/alpha", description: "Alpha plugin.", category: "dev" },
      { name: "beta", source: "./plugins/beta", description: "Beta plugin.", category: "dev" },
    ]);
    writePlugin(tmpRoot, "alpha", {
      pluginJson: { version: "1.0.0", description: "Alpha plugin.", keywords: ["a"] },
      readme: "# Alpha\n\nReadme body.",
      changelog: "# Changelog\n\n## 1.0.0\n\n### Added\n- Initial release.\n",
      skills: [{ name: "skill-one" }],
      agents: [{ name: "agent-one" }],
    });
    writePlugin(tmpRoot, "beta", {
      pluginJson: { version: "2.0.0", description: "Beta plugin." },
      agents: [{ name: "agent-two" }],
    });

    const index = buildCatalogIndex(tmpRoot);

    expect(index.plugins).toHaveLength(2);
    const totalArtifacts = index.plugins.reduce((sum, p) => sum + p.artifacts.length, 0);
    expect(totalArtifacts).toBe(3);

    const alpha = index.plugins.find((p) => p.id === "alpha");
    expect(alpha.artifacts.map((a) => a.id).sort()).toEqual([
      "alpha--agent--agent-one",
      "alpha--skill--skill-one",
    ]);

    const result = validateCatalogIndex(index);
    expect(result.valid).toBe(true);
  });

  it("humanises the sdd-workflow acronym case and plain names normally", () => {
    expect(humanize("sdd-workflow")).toBe("SDD Workflow");
    expect(humanize("frontend-skills")).toBe("Frontend Skills");
    expect(humanize("research-tools")).toBe("Research Tools");
  });

  it("fails naming the plugin when its manifest is missing", () => {
    writeManifest(tmpRoot, [{ name: "ghost", source: "./plugins/ghost", description: "Missing." }]);
    // No plugins/ghost directory created at all.

    expect(() => buildCatalogIndex(tmpRoot)).toThrow(BuildIndexError);
    try {
      buildCatalogIndex(tmpRoot);
    } catch (err) {
      expect(err.message).toContain("ghost");
    }
  });

  it("fails naming the plugin when its manifest is unparseable JSON", () => {
    writeManifest(tmpRoot, [{ name: "broken", source: "./plugins/broken", description: "Broken." }]);
    const pluginDir = path.join(tmpRoot, "plugins", "broken", ".claude-plugin");
    fs.mkdirSync(pluginDir, { recursive: true });
    fs.writeFileSync(path.join(pluginDir, "plugin.json"), "{ this is not json");

    let thrown;
    try {
      buildCatalogIndex(tmpRoot);
    } catch (err) {
      thrown = err;
    }
    expect(thrown).toBeInstanceOf(BuildIndexError);
    expect(thrown.message).toContain("broken");
  });

  it("fails naming both colliding sources on a duplicate plugin id", () => {
    writeManifest(tmpRoot, [
      { name: "dup", source: "./plugins/dup-a", description: "First." },
      { name: "dup", source: "./plugins/dup-b", description: "Second." },
    ]);
    writePlugin(tmpRoot, "dup-a", { pluginJson: { description: "First." } });
    writePlugin(tmpRoot, "dup-b", { pluginJson: { description: "Second." } });
    // plugin.json name must equal manifest id "dup" for both, matching the
    // manifest entry names (not the directory names).
    fs.writeFileSync(
      path.join(tmpRoot, "plugins", "dup-a", ".claude-plugin", "plugin.json"),
      JSON.stringify({ name: "dup", description: "First." }),
    );
    fs.writeFileSync(
      path.join(tmpRoot, "plugins", "dup-b", ".claude-plugin", "plugin.json"),
      JSON.stringify({ name: "dup", description: "Second." }),
    );

    let thrown;
    try {
      buildCatalogIndex(tmpRoot);
    } catch (err) {
      thrown = err;
    }
    expect(thrown).toBeInstanceOf(BuildIndexError);
    expect(thrown.message).toContain("dup");
    expect(thrown.message).toContain("plugins/dup-a");
    expect(thrown.message).toContain("plugins/dup-b");
  });

  it("fails naming both colliding sources on a duplicate artifact id", () => {
    writeManifest(tmpRoot, [{ name: "gamma", source: "./plugins/gamma", description: "Gamma." }]);
    const pluginDir = writePlugin(tmpRoot, "gamma", { pluginJson: { description: "Gamma." } });
    // A skill and an agent that both resolve to the same artifact name
    // collide: gamma--skill--same vs an agent named "same" won't collide
    // (different kind segment), so force a real collision: two skill dirs
    // whose SKILL.md frontmatter both declare name "same".
    for (const dir of ["skill-a", "skill-b"]) {
      const skillDir = path.join(pluginDir, "skills", dir);
      fs.mkdirSync(skillDir, { recursive: true });
      fs.writeFileSync(
        path.join(skillDir, "SKILL.md"),
        `---\nname: same\ndescription: "Collides."\n---\n\nBody.\n`,
      );
    }

    let thrown;
    try {
      buildCatalogIndex(tmpRoot);
    } catch (err) {
      thrown = err;
    }
    expect(thrown).toBeInstanceOf(BuildIndexError);
    expect(thrown.message).toContain("gamma--skill--same");
    expect(thrown.message).toContain("skill-a");
    expect(thrown.message).toContain("skill-b");
  });

  it("stays green and omits absent fields for a plugin with no README/CHANGELOG/version/keywords/dependencies/artifacts", () => {
    writeManifest(tmpRoot, [{ name: "bare", source: "./plugins/bare", description: "Bare plugin." }]);
    writePlugin(tmpRoot, "bare", { pluginJson: { description: "Bare plugin." } });

    const index = buildCatalogIndex(tmpRoot);
    const bare = index.plugins[0];

    expect(bare.id).toBe("bare");
    expect(bare.artifacts).toEqual([]);
    expect(bare).not.toHaveProperty("readme");
    expect(bare).not.toHaveProperty("changelogEntries");
    expect(bare).not.toHaveProperty("version");
    expect(bare).not.toHaveProperty("keywords");
    expect(bare).not.toHaveProperty("dependencies");
    expect(bare).not.toHaveProperty("lastUpdated");

    const result = validateCatalogIndex(index);
    expect(result.valid).toBe(true);
  });

  it("omits changelog entry dates when git history is unavailable (non-git fixture tree)", () => {
    writeManifest(tmpRoot, [{ name: "delta", source: "./plugins/delta", description: "Delta." }]);
    writePlugin(tmpRoot, "delta", {
      pluginJson: { description: "Delta." },
      changelog: "# Changelog\n\n## 1.0.0\n\n### Added\n- First.\n",
    });

    const index = buildCatalogIndex(tmpRoot);
    const delta = index.plugins[0];
    expect(delta.changelogEntries).toHaveLength(1);
    expect(delta.changelogEntries[0]).not.toHaveProperty("date");
    expect(delta.changelogEntries[0].version).toBe("1.0.0");
  });

  it("resolves dependencies against the catalog and marks external ones unresolved", () => {
    writeManifest(tmpRoot, [
      { name: "core", source: "./plugins/core", description: "Core." },
      { name: "extended", source: "./plugins/extended", description: "Extended." },
    ]);
    writePlugin(tmpRoot, "core", { pluginJson: { description: "Core." } });
    writePlugin(tmpRoot, "extended", {
      pluginJson: {
        description: "Extended.",
        dependencies: [
          { name: "core", version: "^1.0.0" },
          { name: "some-external-toolkit", version: "^2.0.0" },
        ],
      },
    });

    const index = buildCatalogIndex(tmpRoot);
    const extended = index.plugins.find((p) => p.id === "extended");
    expect(extended.dependencies).toEqual([
      { name: "core", versionRange: "^1.0.0", resolvesWithinCatalog: true },
      { name: "some-external-toolkit", versionRange: "^2.0.0", resolvesWithinCatalog: false },
    ]);
  });
});

describe("bound / buildSearchText", () => {
  it("truncates text that exceeds the max length and leaves shorter text untouched", () => {
    expect(bound("short", 100)).toBe("short");
    const long = "a".repeat(2000);
    const truncated = bound(long, 100);
    expect(truncated.length).toBeLessThanOrEqual(100);
    expect(truncated.endsWith("…")).toBe(true);
  });

  it("builds a bounded, whitespace-normalised search text blob", () => {
    const text = buildSearchText(["  Alpha  ", undefined, "beta\ngamma", ""], 20);
    expect(text.length).toBeLessThanOrEqual(20);
    expect(text).not.toMatch(/\n/);
  });
});

describe("build-index CLI", () => {
  function runCli(repoRoot, outputPath) {
    return spawnSync(process.execPath, [CLI_PATH], {
      env: {
        ...process.env,
        BUILD_INDEX_REPO_ROOT: repoRoot,
        BUILD_INDEX_OUTPUT_PATH: outputPath,
      },
      encoding: "utf8",
    });
  }

  it("exits non-zero and names the offender for a corrupted plugin manifest", () => {
    writeManifest(tmpRoot, [{ name: "broken", source: "./plugins/broken", description: "Broken." }]);
    fs.mkdirSync(path.join(tmpRoot, "plugins", "broken", ".claude-plugin"), { recursive: true });
    fs.writeFileSync(
      path.join(tmpRoot, "plugins", "broken", ".claude-plugin", "plugin.json"),
      "{ not json",
    );
    const outputPath = path.join(tmpRoot, "out.json");

    const result = runCli(tmpRoot, outputPath);

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("broken");
    expect(fs.existsSync(outputPath)).toBe(false);
  });

  it("exits non-zero and names both colliding sources for a duplicated plugin id", () => {
    writeManifest(tmpRoot, [
      { name: "dup", source: "./plugins/dup-a", description: "First." },
      { name: "dup", source: "./plugins/dup-b", description: "Second." },
    ]);
    fs.mkdirSync(path.join(tmpRoot, "plugins", "dup-a", ".claude-plugin"), { recursive: true });
    fs.writeFileSync(
      path.join(tmpRoot, "plugins", "dup-a", ".claude-plugin", "plugin.json"),
      JSON.stringify({ name: "dup", description: "First." }),
    );
    fs.mkdirSync(path.join(tmpRoot, "plugins", "dup-b", ".claude-plugin"), { recursive: true });
    fs.writeFileSync(
      path.join(tmpRoot, "plugins", "dup-b", ".claude-plugin", "plugin.json"),
      JSON.stringify({ name: "dup", description: "Second." }),
    );
    const outputPath = path.join(tmpRoot, "out.json");

    const result = runCli(tmpRoot, outputPath);

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("dup-a");
    expect(result.stderr).toContain("dup-b");
    expect(fs.existsSync(outputPath)).toBe(false);
  });

  it("stays green (exit 0) and writes a valid index for a README-less plugin", () => {
    writeManifest(tmpRoot, [{ name: "bare", source: "./plugins/bare", description: "Bare plugin." }]);
    fs.mkdirSync(path.join(tmpRoot, "plugins", "bare", ".claude-plugin"), { recursive: true });
    fs.writeFileSync(
      path.join(tmpRoot, "plugins", "bare", ".claude-plugin", "plugin.json"),
      JSON.stringify({ name: "bare", description: "Bare plugin." }),
    );
    const outputPath = path.join(tmpRoot, "out.json");

    const result = runCli(tmpRoot, outputPath);

    expect(result.status).toBe(0);
    expect(fs.existsSync(outputPath)).toBe(true);
    const written = JSON.parse(fs.readFileSync(outputPath, "utf8"));
    expect(written.plugins).toHaveLength(1);
    expect(written.plugins[0]).not.toHaveProperty("readme");
  });
});
