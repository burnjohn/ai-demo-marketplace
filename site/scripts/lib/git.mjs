import { execFileSync } from "node:child_process";

/**
 * Thin wrappers around `git log`/`git rev-parse`/`git config`, used to derive
 * freshness stamps. Every function fails soft: when git
 * is unavailable, the path isn't a repo, or history for the path is missing,
 * they return `undefined` rather than throwing or fabricating a value.
 */

function runGit(args, cwd) {
  try {
    return execFileSync("git", args, { cwd, stdio: ["ignore", "pipe", "ignore"] })
      .toString("utf8")
      .trim();
  } catch {
    return "";
  }
}

/** ISO timestamp of the current HEAD commit, or `undefined` if unavailable. */
export function getHeadCommitRef(repoRoot) {
  const out = runGit(["rev-parse", "HEAD"], repoRoot);
  return out || undefined;
}

/**
 * ISO commit-date of the last commit that touched `relPath` (relative to
 * `repoRoot`), or `undefined` when there is no history for it.
 */
export function getLastCommitIsoDate(repoRoot, relPath) {
  const out = runGit(["log", "-1", "--format=%cI", "--", relPath], repoRoot);
  return out || undefined;
}

/**
 * ISO commit-date of the commit that introduced `needle` (a literal string,
 * e.g. a changelog heading) into `relPath`. Uses the pickaxe (`-S`) search
 * and takes the oldest matching commit, since that is the one that first
 * added the string. Returns `undefined` when git has no matching history.
 */
export function getIntroducingCommitIsoDate(repoRoot, relPath, needle) {
  const out = runGit(
    ["log", "--format=%cI", "-S", needle, "--", relPath],
    repoRoot,
  );
  if (!out) return undefined;
  const dates = out.split("\n").filter(Boolean);
  return dates.length > 0 ? dates[dates.length - 1] : undefined;
}

/**
 * The repository's canonical `https://github.com/<owner>/<repo>` URL, derived
 * from the `origin` remote. Falls back to `fallback` when git is unavailable
 * or the remote isn't a recognizable GitHub URL.
 */
export function getRepositoryUrl(repoRoot, fallback) {
  const remote = runGit(["config", "--get", "remote.origin.url"], repoRoot);
  const match = remote.match(/github\.com[:/]([^/]+)\/(.+?)(?:\.git)?$/);
  if (match) {
    return `https://github.com/${match[1]}/${match[2]}`;
  }
  return fallback;
}
