import fs from "node:fs";
import path from "node:path";
import { BuildIndexError } from "./errors.mjs";
import { humanize } from "./humanize.mjs";
import { collectArtifacts } from "./artifacts.mjs";
import {
  bound,
  buildSearchText,
  MAX_README_LENGTH,
  MAX_CHANGELOG_SUMMARY_LENGTH,
} from "./bound.mjs";
import {
  getHeadCommitRef,
  getLastCommitIsoDate,
  getIntroducingCommitIsoDate,
  getRepositoryUrl,
} from "./git.mjs";

const DEFAULT_BRANCH = "main";

function readJsonFile(filePath, describeError) {
  let raw;
  try {
    raw = fs.readFileSync(filePath, "utf8");
  } catch (err) {
    throw new BuildIndexError(`${describeError}: cannot read "${filePath}" (${err.message})`);
  }
  try {
    return JSON.parse(raw);
  } catch (err) {
    throw new BuildIndexError(`${describeError}: cannot parse "${filePath}" as JSON (${err.message})`);
  }
}

function readOptionalTextFile(filePath) {
  try {
    return fs.readFileSync(filePath, "utf8");
  } catch (err) {
    if (err.code === "ENOENT") return undefined;
    throw err;
  }
}

/**
 * Reduces a raw CHANGELOG section body (everything between one `## <version>`
 * heading and the next) to a single-line, plain-text summary suitable for the
 * release feed rows in the What's New view and the home preview.
 *
 * The rows in the design are one line tall; passing raw Markdown through
 * would render literal `###` headings, backticks, and bullet dashes. We
 * therefore drop sub-section headings (`### Added` etc.), collapse the
 * remaining bullets/prose into flowing text, strip common inline Markdown
 * syntax, and cut at the first sentence boundary. Returns an empty string
 * when nothing usable remains — the caller is responsible for rendering an
 * honest fallback rather than inventing text.
 */
function summariseChangelogBody(body) {
  const lines = body.split(/\r?\n/);
  const parts = [];
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;
    // Sub-section labels like "### Added", "### Fixed" are structural, not
    // content — the reader already knows they're looking at release notes.
    if (/^#{1,6}\s+/.test(line)) continue;
    // Bullets and numbered items lose their marker so we can join them
    // together into a single flowing sentence.
    const stripped = line.replace(/^\s*(?:[-*+]|\d+\.)\s+/, "");
    parts.push(stripped);
  }
  let text = parts.join(" ");
  // Inline Markdown → plain text: unwrap `code`, **bold**, *italic*,
  // [label](url), and drop stray emphasis markers.
  text = text
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/_([^_]+)_/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
  if (!text) return "";
  // Prefer the first sentence when the entry runs on. A sentence boundary
  // is `.` / `!` / `?` followed by whitespace or end-of-string. Keep the
  // punctuation so the row reads as a real sentence.
  const sentenceMatch = text.match(/^(.+?[.!?])(?:\s|$)/);
  if (sentenceMatch) {
    text = sentenceMatch[1];
  }
  return text;
}

/** Parses `## <version>` headings out of a CHANGELOG.md body. */
function parseChangelogEntries(content, { pluginId, repoRoot, changelogRelPath }) {
  const headingPattern = /^##\s+(.+?)\s*$/gm;
  const matches = [...content.matchAll(headingPattern)];
  const entries = [];
  for (let i = 0; i < matches.length; i += 1) {
    const version = matches[i][1].trim();
    const start = matches[i].index + matches[i][0].length;
    const end = i + 1 < matches.length ? matches[i + 1].index : content.length;
    const rawBody = content.slice(start, end).trim();
    const summary = bound(summariseChangelogBody(rawBody), MAX_CHANGELOG_SUMMARY_LENGTH);
    const date = getIntroducingCommitIsoDate(
      repoRoot,
      changelogRelPath,
      matches[i][0].trim(),
    );
    entries.push({
      version,
      ...(date ? { date } : {}),
      summary,
      owningPluginId: pluginId,
    });
  }
  return entries;
}

function buildInstallCommand(pluginId, marketplaceName) {
  return {
    text: `/plugin install ${pluginId}@${marketplaceName}`,
    scope: "plugin-installation",
  };
}

function buildPlugin({ entry, entryIndex, repoRoot, repositoryUrl, marketplaceName, allPluginIds }) {
  const pluginId = entry.name;
  if (typeof pluginId !== "string" || pluginId.length === 0) {
    throw new BuildIndexError(
      `Plugin manifest entry at plugins[${entryIndex}]: missing or invalid "name"`,
    );
  }
  if (typeof entry.source !== "string" || entry.source.length === 0) {
    throw new BuildIndexError(`Plugin "${pluginId}": manifest entry is missing "source"`);
  }

  const pluginDir = path.resolve(repoRoot, entry.source);
  const pluginJsonPath = path.join(pluginDir, ".claude-plugin", "plugin.json");
  const pluginJson = readJsonFile(pluginJsonPath, `Plugin "${pluginId}"`);

  if (pluginJson.name !== pluginId) {
    throw new BuildIndexError(
      `Plugin "${pluginId}": plugin.json declares name "${pluginJson.name}", which does not match the marketplace manifest entry`,
    );
  }

  const pluginRelDir = path.relative(repoRoot, pluginDir).split(path.sep).join("/");
  const sourceUrlBase = `${repositoryUrl}/tree/${DEFAULT_BRANCH}/${pluginRelDir}`;

  const displayName = pluginJson.displayName
    ? String(pluginJson.displayName)
    : humanize(pluginId);

  const description =
    typeof pluginJson.description === "string"
      ? pluginJson.description
      : typeof entry.description === "string"
        ? entry.description
        : "";

  const readmeRaw = readOptionalTextFile(path.join(pluginDir, "README.md"));
  const readme = readmeRaw !== undefined ? bound(readmeRaw, MAX_README_LENGTH) : undefined;

  const changelogRaw = readOptionalTextFile(path.join(pluginDir, "CHANGELOG.md"));
  const changelogRelPath = `${pluginRelDir}/CHANGELOG.md`;
  const changelogEntries =
    changelogRaw !== undefined
      ? parseChangelogEntries(changelogRaw, { pluginId, repoRoot, changelogRelPath })
      : undefined;

  const dependencies = Array.isArray(pluginJson.dependencies)
    ? pluginJson.dependencies.map((dep) => ({
        name: dep.name,
        ...(dep.version ? { versionRange: dep.version } : {}),
        resolvesWithinCatalog: allPluginIds.has(dep.name),
      }))
    : undefined;

  const artifacts = collectArtifacts({ pluginDir, pluginId, sourceUrlBase });

  const seenArtifactIds = new Map();
  for (const artifact of artifacts) {
    if (seenArtifactIds.has(artifact.id)) {
      throw new BuildIndexError(
        `Duplicate artifact id "${artifact.id}": colliding sources "${seenArtifactIds.get(artifact.id)}" and "${artifact.sourceUrl}"`,
      );
    }
    seenArtifactIds.set(artifact.id, artifact.sourceUrl);
  }

  const lastUpdated = getLastCommitIsoDate(repoRoot, pluginRelDir);

  const keywords = Array.isArray(pluginJson.keywords)
    ? pluginJson.keywords.map(String)
    : undefined;

  return {
    id: pluginId,
    name: pluginId,
    displayName,
    description,
    ...(pluginJson.version ? { version: String(pluginJson.version) } : {}),
    ...(pluginJson.author?.name ? { authorName: String(pluginJson.author.name) } : {}),
    ...(keywords && keywords.length > 0 ? { keywords } : {}),
    ...(entry.category ? { category: String(entry.category) } : {}),
    ...(pluginJson.compatibility ? { compatibility: String(pluginJson.compatibility) } : {}),
    ...(lastUpdated ? { lastUpdated } : {}),
    installCommand: buildInstallCommand(pluginId, marketplaceName),
    sourceUrl: sourceUrlBase,
    ...(readme ? { readme } : {}),
    ...(changelogEntries && changelogEntries.length > 0 ? { changelogEntries } : {}),
    ...(dependencies && dependencies.length > 0 ? { dependencies } : {}),
    artifacts,
    searchText: buildSearchText([
      pluginId,
      displayName,
      description,
      ...(keywords ?? []),
      entry.category,
    ]),
  };
}

/**
 * Builds the full `CatalogIndex` object for the repository rooted at
 * `repoRoot`. Pure with respect to the filesystem/git state passed in — no
 * global mutable state — so tests can point it at a temporary fixture tree.
 *
 * Throws `BuildIndexError` (never a bare `Error`) for every fatal condition,
 * with a message naming the offending plugin/id/source.
 */
export function buildCatalogIndex(repoRoot) {
  const manifestPath = path.join(repoRoot, ".claude-plugin", "marketplace.json");
  const manifest = readJsonFile(manifestPath, "Marketplace manifest");

  if (typeof manifest.name !== "string" || manifest.name.length === 0) {
    throw new BuildIndexError('Marketplace manifest: missing or invalid "name"');
  }
  if (!Array.isArray(manifest.plugins)) {
    throw new BuildIndexError('Marketplace manifest: "plugins" must be an array');
  }

  const seenPluginIds = new Map();
  manifest.plugins.forEach((entry, index) => {
    const id = entry?.name;
    if (typeof id !== "string" || id.length === 0) return; // reported later, per-plugin
    if (seenPluginIds.has(id)) {
      throw new BuildIndexError(
        `Duplicate plugin id "${id}": colliding sources "${seenPluginIds.get(id)}" and "plugins[${index}] (${entry.source})"`,
      );
    }
    seenPluginIds.set(id, `plugins[${index}] (${entry.source})`);
  });

  const allPluginIds = new Set(seenPluginIds.keys());
  const fallbackRepoUrl = `https://github.com/${manifest.owner?.name ?? "unknown"}/${manifest.name}`;
  const repositoryUrl = getRepositoryUrl(repoRoot, fallbackRepoUrl);

  const plugins = manifest.plugins.map((entry, index) =>
    buildPlugin({
      entry,
      entryIndex: index,
      repoRoot,
      repositoryUrl,
      marketplaceName: manifest.name,
      allPluginIds,
    }),
  );

  return {
    marketplaceName: manifest.name,
    ...(manifest.metadata?.description
      ? { marketplaceDescription: String(manifest.metadata.description) }
      : {}),
    repositoryUrl,
    buildTimestamp: new Date().toISOString(),
    sourceCommitRef: getHeadCommitRef(repoRoot) ?? process.env.GITHUB_SHA ?? "unknown",
    plugins,
  };
}
