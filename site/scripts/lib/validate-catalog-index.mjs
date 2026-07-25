/**
 * Plain-JS mirror of `site/src/catalog/validate.ts`'s `validateCatalogIndex`.
 *
 * The generator runs as a `.mjs` script under plain Node (no TypeScript
 * loader — the site's toolchain has none, and CI runs Node 20, which lacks
 * `--experimental-strip-types`), so it cannot import the `.ts` contract
 * module directly. This file re-implements the same structural checks so the
 * generator can self-check its own output before writing it (per the task).
 *
 * Keep this in sync with `site/src/catalog/validate.ts` if that contract
 * changes.
 */

const ARTIFACT_KINDS = ["skill", "agent", "command", "hook", "mcp"];
const INSTALL_SCOPES = [
  "marketplace-registration",
  "plugin-installation",
  "update",
];

function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isString(value) {
  return typeof value === "string";
}

function isStringArray(value) {
  return Array.isArray(value) && value.every(isString);
}

function fail(problems, path, message) {
  problems.push(`${path}: ${message}`);
}

function validateInstallCommand(value, path, problems) {
  if (!isRecord(value)) {
    fail(problems, path, "must be an object");
    return false;
  }
  let ok = true;
  if (!isString(value.text) || value.text.length === 0) {
    fail(problems, `${path}.text`, "must be a non-empty string");
    ok = false;
  }
  if (!isString(value.scope) || !INSTALL_SCOPES.includes(value.scope)) {
    fail(problems, `${path}.scope`, `must be one of ${INSTALL_SCOPES.join(", ")}`);
    ok = false;
  }
  return ok;
}

function validateDependency(value, path, problems) {
  if (!isRecord(value)) {
    fail(problems, path, "must be an object");
    return false;
  }
  let ok = true;
  if (!isString(value.name) || value.name.length === 0) {
    fail(problems, `${path}.name`, "must be a non-empty string");
    ok = false;
  }
  if (value.versionRange !== undefined && !isString(value.versionRange)) {
    fail(problems, `${path}.versionRange`, "must be a string when present");
    ok = false;
  }
  if (typeof value.resolvesWithinCatalog !== "boolean") {
    fail(problems, `${path}.resolvesWithinCatalog`, "must be a boolean");
    ok = false;
  }
  return ok;
}

function validateChangelogEntry(value, path, problems) {
  if (!isRecord(value)) {
    fail(problems, path, "must be an object");
    return false;
  }
  let ok = true;
  if (!isString(value.version) || value.version.length === 0) {
    fail(problems, `${path}.version`, "must be a non-empty string");
    ok = false;
  }
  if (value.date !== undefined && !isString(value.date)) {
    fail(problems, `${path}.date`, "must be a string when present");
    ok = false;
  }
  if (!isString(value.summary)) {
    fail(problems, `${path}.summary`, "must be a string");
    ok = false;
  }
  if (!isString(value.owningPluginId) || value.owningPluginId.length === 0) {
    fail(problems, `${path}.owningPluginId`, "must be a non-empty string");
    ok = false;
  }
  return ok;
}

function validateArtifact(value, path, problems) {
  if (!isRecord(value)) {
    fail(problems, path, "must be an object");
    return false;
  }
  let ok = true;
  if (!isString(value.id) || value.id.length === 0) {
    fail(problems, `${path}.id`, "must be a non-empty string");
    ok = false;
  }
  if (!isString(value.kind) || !ARTIFACT_KINDS.includes(value.kind)) {
    fail(problems, `${path}.kind`, `must be one of ${ARTIFACT_KINDS.join(", ")}`);
    ok = false;
  }
  if (!isString(value.name) || value.name.length === 0) {
    fail(problems, `${path}.name`, "must be a non-empty string");
    ok = false;
  }
  if (!isString(value.displayName) || value.displayName.length === 0) {
    fail(problems, `${path}.displayName`, "must be a non-empty string");
    ok = false;
  }
  if (value.description !== undefined && !isString(value.description)) {
    fail(problems, `${path}.description`, "must be a string when present");
    ok = false;
  }
  if (!isString(value.owningPluginId) || value.owningPluginId.length === 0) {
    fail(problems, `${path}.owningPluginId`, "must be a non-empty string");
    ok = false;
  }
  if (value.invocationToken !== undefined && !isString(value.invocationToken)) {
    fail(problems, `${path}.invocationToken`, "must be a string when present");
    ok = false;
  }
  if (value.tools !== undefined && !isStringArray(value.tools)) {
    fail(problems, `${path}.tools`, "must be a string array when present");
    ok = false;
  }
  if (value.model !== undefined && !isString(value.model)) {
    fail(problems, `${path}.model`, "must be a string when present");
    ok = false;
  }
  if (value.documentationExcerpt !== undefined && !isString(value.documentationExcerpt)) {
    fail(problems, `${path}.documentationExcerpt`, "must be a string when present");
    ok = false;
  }
  if (!isString(value.sourceUrl) || value.sourceUrl.length === 0) {
    fail(problems, `${path}.sourceUrl`, "must be a non-empty string");
    ok = false;
  }
  if (!isString(value.searchText)) {
    fail(problems, `${path}.searchText`, "must be a string");
    ok = false;
  }
  return ok;
}

function validatePlugin(value, path, problems) {
  if (!isRecord(value)) {
    fail(problems, path, "must be an object");
    return false;
  }
  let ok = true;
  if (!isString(value.id) || value.id.length === 0) {
    fail(problems, `${path}.id`, "must be a non-empty string");
    ok = false;
  }
  if (!isString(value.name) || value.name.length === 0) {
    fail(problems, `${path}.name`, "must be a non-empty string");
    ok = false;
  }
  if (!isString(value.displayName) || value.displayName.length === 0) {
    fail(problems, `${path}.displayName`, "must be a non-empty string");
    ok = false;
  }
  if (!isString(value.description)) {
    fail(problems, `${path}.description`, "must be a string");
    ok = false;
  }
  if (value.version !== undefined && !isString(value.version)) {
    fail(problems, `${path}.version`, "must be a string when present");
    ok = false;
  }
  if (value.authorName !== undefined && !isString(value.authorName)) {
    fail(problems, `${path}.authorName`, "must be a string when present");
    ok = false;
  }
  if (value.keywords !== undefined && !isStringArray(value.keywords)) {
    fail(problems, `${path}.keywords`, "must be a string array when present");
    ok = false;
  }
  if (value.category !== undefined && !isString(value.category)) {
    fail(problems, `${path}.category`, "must be a string when present");
    ok = false;
  }
  if (value.compatibility !== undefined && !isString(value.compatibility)) {
    fail(problems, `${path}.compatibility`, "must be a string when present");
    ok = false;
  }
  if (value.lastUpdated !== undefined && !isString(value.lastUpdated)) {
    fail(problems, `${path}.lastUpdated`, "must be a string when present");
    ok = false;
  }
  if (!validateInstallCommand(value.installCommand, `${path}.installCommand`, problems)) {
    ok = false;
  }
  if (!isString(value.sourceUrl) || value.sourceUrl.length === 0) {
    fail(problems, `${path}.sourceUrl`, "must be a non-empty string");
    ok = false;
  }
  if (value.readme !== undefined && !isString(value.readme)) {
    fail(problems, `${path}.readme`, "must be a string when present");
    ok = false;
  }
  if (value.changelogEntries !== undefined) {
    if (!Array.isArray(value.changelogEntries)) {
      fail(problems, `${path}.changelogEntries`, "must be an array when present");
      ok = false;
    } else {
      value.changelogEntries.forEach((entry, index) => {
        if (!validateChangelogEntry(entry, `${path}.changelogEntries[${index}]`, problems)) {
          ok = false;
        }
      });
    }
  }
  if (value.dependencies !== undefined) {
    if (!Array.isArray(value.dependencies)) {
      fail(problems, `${path}.dependencies`, "must be an array when present");
      ok = false;
    } else {
      value.dependencies.forEach((dep, index) => {
        if (!validateDependency(dep, `${path}.dependencies[${index}]`, problems)) {
          ok = false;
        }
      });
    }
  }
  if (!Array.isArray(value.artifacts)) {
    fail(problems, `${path}.artifacts`, "must be an array");
    ok = false;
  } else {
    value.artifacts.forEach((artifact, index) => {
      if (!validateArtifact(artifact, `${path}.artifacts[${index}]`, problems)) {
        ok = false;
      }
    });
  }
  if (!isString(value.searchText)) {
    fail(problems, `${path}.searchText`, "must be a string");
    ok = false;
  }
  return ok;
}

/**
 * @param {unknown} value
 * @returns {{ valid: true } | { valid: false, problems: string[] }}
 */
export function validateCatalogIndex(value) {
  const problems = [];

  if (!isRecord(value)) {
    return { valid: false, problems: ["root: must be an object"] };
  }

  if (!isString(value.marketplaceName) || value.marketplaceName.length === 0) {
    fail(problems, "marketplaceName", "must be a non-empty string");
  }
  if (value.marketplaceDescription !== undefined && !isString(value.marketplaceDescription)) {
    fail(problems, "marketplaceDescription", "must be a string when present");
  }
  if (!isString(value.repositoryUrl) || value.repositoryUrl.length === 0) {
    fail(problems, "repositoryUrl", "must be a non-empty string");
  }
  if (!isString(value.buildTimestamp) || value.buildTimestamp.length === 0) {
    fail(problems, "buildTimestamp", "must be a non-empty string");
  }
  if (!isString(value.sourceCommitRef) || value.sourceCommitRef.length === 0) {
    fail(problems, "sourceCommitRef", "must be a non-empty string");
  }
  if (!Array.isArray(value.plugins)) {
    fail(problems, "plugins", "must be an array");
  } else {
    value.plugins.forEach((plugin, index) => {
      validatePlugin(plugin, `plugins[${index}]`, problems);
    });
  }

  if (problems.length > 0) {
    return { valid: false, problems };
  }

  return { valid: true };
}
