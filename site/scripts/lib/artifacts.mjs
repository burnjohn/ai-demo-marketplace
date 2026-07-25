import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { humanize } from "./humanize.mjs";
import { bound, buildSearchText, MAX_DOCUMENTATION_EXCERPT_LENGTH } from "./bound.mjs";

/** Today's catalog ships only skills and agents, but commands and hooks are
 * handled too so a future plugin adding either doesn't require generator
 * changes. MCP servers are out of scope for this generator (no plugin in
 * this repository declares one, and the task's source list omits them). */

function readFileIfExists(filePath) {
  try {
    return fs.readFileSync(filePath, "utf8");
  } catch (err) {
    if (err.code === "ENOENT") return undefined;
    throw err;
  }
}

function listDirIfExists(dirPath) {
  try {
    return fs.readdirSync(dirPath, { withFileTypes: true });
  } catch (err) {
    if (err.code === "ENOENT") return [];
    throw err;
  }
}

function splitToolsList(tools) {
  if (Array.isArray(tools)) return tools.map((t) => String(t).trim()).filter(Boolean);
  if (typeof tools === "string") {
    return tools
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
  }
  return undefined;
}

function makeArtifactId(pluginId, kind, name) {
  return `${pluginId}--${kind}--${name}`;
}

function buildFromMarkdown({
  pluginId,
  kind,
  name,
  content,
  sourceUrl,
}) {
  const parsed = matter(content);
  const frontmatter = parsed.data ?? {};
  const artifactName = frontmatter.name ? String(frontmatter.name) : name;
  const displayName = frontmatter.displayName
    ? String(frontmatter.displayName)
    : humanize(artifactName);
  const description = frontmatter.description
    ? String(frontmatter.description)
    : undefined;
  const tools = splitToolsList(frontmatter.tools);
  const model = frontmatter.model ? String(frontmatter.model) : undefined;
  const invocationToken =
    kind === "agent"
      ? `@${artifactName}`
      : kind === "command"
        ? `/${artifactName}`
        : undefined;
  const documentationExcerpt = bound(
    parsed.content.trim(),
    MAX_DOCUMENTATION_EXCERPT_LENGTH,
  );

  return {
    id: makeArtifactId(pluginId, kind, artifactName),
    kind,
    name: artifactName,
    displayName,
    ...(description ? { description } : {}),
    owningPluginId: pluginId,
    ...(invocationToken ? { invocationToken } : {}),
    ...(tools && tools.length > 0 ? { tools } : {}),
    ...(kind === "agent" && model ? { model } : {}),
    ...(documentationExcerpt ? { documentationExcerpt } : {}),
    sourceUrl,
    searchText: buildSearchText([
      artifactName,
      displayName,
      description,
      kind,
      ...(tools ?? []),
    ]),
  };
}

/** Skills: one artifact per `skills/<dir>/SKILL.md`. */
export function collectSkillArtifacts({ pluginDir, pluginId, sourceUrlBase }) {
  const skillsDir = path.join(pluginDir, "skills");
  const entries = listDirIfExists(skillsDir).filter((e) => e.isDirectory());
  const artifacts = [];
  for (const entry of entries) {
    const skillMdPath = path.join(skillsDir, entry.name, "SKILL.md");
    const content = readFileIfExists(skillMdPath);
    if (content === undefined) continue;
    artifacts.push(
      buildFromMarkdown({
        pluginId,
        kind: "skill",
        name: entry.name,
        content,
        sourceUrl: `${sourceUrlBase}/skills/${entry.name}`,
      }),
    );
  }
  return artifacts;
}

/** Agents: one artifact per `agents/*.md` file. */
export function collectAgentArtifacts({ pluginDir, pluginId, sourceUrlBase }) {
  const agentsDir = path.join(pluginDir, "agents");
  const entries = listDirIfExists(agentsDir).filter(
    (e) => e.isFile() && e.name.endsWith(".md"),
  );
  const artifacts = [];
  for (const entry of entries) {
    const content = readFileIfExists(path.join(agentsDir, entry.name));
    if (content === undefined) continue;
    const fileName = entry.name.replace(/\.md$/, "");
    artifacts.push(
      buildFromMarkdown({
        pluginId,
        kind: "agent",
        name: fileName,
        content,
        sourceUrl: `${sourceUrlBase}/agents/${entry.name}`,
      }),
    );
  }
  return artifacts;
}

/** Commands: one artifact per `commands/**\/*.md` file (recursive walk). */
export function collectCommandArtifacts({ pluginDir, pluginId, sourceUrlBase }) {
  const commandsDir = path.join(pluginDir, "commands");
  const artifacts = [];

  function walk(dir, relDir) {
    const entries = listDirIfExists(dir);
    for (const entry of entries) {
      const entryRel = relDir ? `${relDir}/${entry.name}` : entry.name;
      const entryPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(entryPath, entryRel);
      } else if (entry.isFile() && entry.name.endsWith(".md")) {
        const content = readFileIfExists(entryPath);
        if (content === undefined) continue;
        const fileName = entryRel.replace(/\.md$/, "").replace(/\//g, "-");
        artifacts.push(
          buildFromMarkdown({
            pluginId,
            kind: "command",
            name: fileName,
            content,
            sourceUrl: `${sourceUrlBase}/commands/${entryRel}`,
          }),
        );
      }
    }
  }

  walk(commandsDir, "");
  return artifacts;
}

/**
 * Hooks: `hooks/hooks.json` — one artifact per top-level event key (e.g.
 * `PreToolUse`), the shape Claude Code plugin hooks manifests use. There is
 * no example of this in the current catalog, so this is a best-effort,
 * schema-tolerant reading rather than one anchored to a real fixture.
 */
export function collectHookArtifacts({ pluginDir, pluginId, sourceUrlBase }) {
  const hooksJsonPath = path.join(pluginDir, "hooks", "hooks.json");
  const content = readFileIfExists(hooksJsonPath);
  if (content === undefined) return [];

  let parsed;
  try {
    parsed = JSON.parse(content);
  } catch {
    // A malformed hooks.json is tolerated (not fatal) — the plugin simply
    // ships no hook artifacts rather than failing the whole build.
    return [];
  }

  const hooksObject = isPlainObject(parsed.hooks) ? parsed.hooks : parsed;
  if (!isPlainObject(hooksObject)) return [];

  const artifacts = [];
  for (const [key, value] of Object.entries(hooksObject)) {
    if (key.startsWith("$")) continue;
    const excerpt = bound(
      JSON.stringify(value, null, 2),
      MAX_DOCUMENTATION_EXCERPT_LENGTH,
    );
    artifacts.push({
      id: makeArtifactId(pluginId, "hook", key),
      kind: "hook",
      name: key,
      displayName: key,
      owningPluginId: pluginId,
      ...(excerpt ? { documentationExcerpt: excerpt } : {}),
      sourceUrl: `${sourceUrlBase}/hooks/hooks.json`,
      searchText: buildSearchText([key, "hook"]),
    });
  }
  return artifacts;
}

function isPlainObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function collectArtifacts({ pluginDir, pluginId, sourceUrlBase }) {
  return [
    ...collectSkillArtifacts({ pluginDir, pluginId, sourceUrlBase }),
    ...collectAgentArtifacts({ pluginDir, pluginId, sourceUrlBase }),
    ...collectCommandArtifacts({ pluginDir, pluginId, sourceUrlBase }),
    ...collectHookArtifacts({ pluginDir, pluginId, sourceUrlBase }),
  ];
}
