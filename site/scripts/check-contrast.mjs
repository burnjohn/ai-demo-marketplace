#!/usr/bin/env node
/**
 * Contrast gate.
 *
 * Parses `src/styles/tokens.css` (never a hand-copied snapshot of it), builds
 * the resolved token set for all 8 theme x accent combinations, converts
 * every colour value through `culori` (oklch() and hex both parse fine
 * through culori's generic `parse`/`converter` API — no hand-rolled sRGB
 * math), and asserts the WCAG 2.x contrast ratios that the app's tokens
 * must satisfy:
 *
 *  - body text (`--text`, `--text-dim`) on its background (`--bg`,
 *    `--bg-elev`, `--bg-elev2`) >= 4.5:1
 *  - large text / UI component boundaries (`--border`, `--border-strong`)
 *    on background >= 3:1
 *  - the focus ring (`--accent`, per `base.css`'s `outline: 2px solid
 *    var(--accent)`) against the background it sits on >= 3:1
 *
 * Run: `node scripts/check-contrast.mjs` from `site/`.
 * Exits non-zero and lists every violation (token pair, combination, actual
 * ratio) when any check fails.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { parse, converter, wcagContrast } from "culori";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TOKENS_PATH = path.resolve(__dirname, "../src/styles/tokens.css");

const THEMES = ["dark", "light"];
const ACCENTS = ["default", "green", "violet", "amber"];

const toRgb = converter("rgb");

/**
 * Very small CSS custom-property block parser — good enough for this file's
 * shape (`.app { --x: value; }`, `.app[data-theme="light"] { ... }`, etc.).
 * Returns an array of { selector, declarations: Map<string, string> }.
 */
function stripComments(css) {
  return css.replace(/\/\*[\s\S]*?\*\//g, "");
}

function parseBlocks(css) {
  const blocks = [];
  const blockRe = /([^{}]+)\{([^{}]*)\}/g;
  let match;
  while ((match = blockRe.exec(css))) {
    const selector = match[1].trim();
    const body = match[2];
    const decls = new Map();
    for (const declMatch of body.matchAll(/--([a-zA-Z0-9-]+)\s*:\s*([^;]+);/g)) {
      decls.set(`--${declMatch[1]}`, declMatch[2].trim());
    }
    blocks.push({ selector, declarations: decls });
  }
  return blocks;
}

function selectorMatches(selector, theme, accent) {
  const hasTheme = selector.includes("data-theme");
  const hasAccent = selector.includes("data-accent");

  if (!hasTheme && !hasAccent) return true; // base `.app` block always applies
  if (hasTheme && !selector.includes(`data-theme="${theme}"`)) return false;
  if (hasAccent && !selector.includes(`data-accent="${accent}"`)) return false;
  return true;
}

/** Resolves the full token set for one theme x accent combination. */
function resolveTokens(css, theme, accent) {
  const blocks = parseBlocks(stripComments(css));
  const tokens = new Map();
  // Later blocks win (later == more specific in this file's declaration
  // order: base -> theme -> accent -> accent+theme), mirroring normal CSS
  // cascade for same-specificity rules appearing later in the source.
  for (const block of blocks) {
    if (!selectorMatches(block.selector, theme, accent)) continue;
    for (const [name, value] of block.declarations) {
      tokens.set(name, value);
    }
  }
  return tokens;
}

function toRgbColor(value) {
  const parsed = parse(value);
  if (!parsed) return null;
  return toRgb(parsed);
}

function contrastRatio(fgValue, bgValue) {
  const fg = toRgbColor(fgValue);
  const bg = toRgbColor(bgValue);
  if (!fg || !bg) return null;
  return wcagContrast(fg, bg);
}

const TEXT_ON_BG_PAIRS = [
  ["--text", "--bg"],
  ["--text", "--bg-elev"],
  ["--text", "--bg-elev2"],
  ["--text-dim", "--bg"],
  ["--text-dim", "--bg-elev"],
  ["--text-dim", "--bg-elev2"],
  // `--text-faint` renders normal-size text (e.g. the shell build stamp,
  // `Shell.css:95`), not large text — held to the same 4.5:1 bar.
  ["--text-faint", "--bg"],
  ["--text-faint", "--bg-elev"],
];

const LARGE_TEXT_OR_BOUNDARY_PAIRS = [
  ["--border", "--bg"],
  ["--border", "--bg-elev"],
  ["--border-strong", "--bg"],
  ["--border-strong", "--bg-elev"],
];

// The focus ring is `outline: 2px solid var(--accent)` (base.css, components.css,
// CommandPalette.css) — always checked against the page background it visually
// sits on top of.
const FOCUS_RING_PAIRS = [
  ["--accent", "--bg"],
  ["--accent", "--bg-elev"],
  ["--accent", "--bg-elev2"],
];

function main() {
  const css = readFileSync(TOKENS_PATH, "utf8");
  const violations = [];

  for (const theme of THEMES) {
    for (const accent of ACCENTS) {
      const tokens = resolveTokens(css, theme, accent);
      const combo = `data-theme="${theme}" data-accent="${accent}"`;

      const check = (pairs, minRatio, label) => {
        for (const [fgName, bgName] of pairs) {
          const fgValue = tokens.get(fgName);
          const bgValue = tokens.get(bgName);
          if (!fgValue || !bgValue) {
            violations.push(
              `[${combo}] ${label}: ${fgName} on ${bgName} — missing token value(s) (${fgName}=${fgValue}, ${bgName}=${bgValue})`,
            );
            continue;
          }
          const ratio = contrastRatio(fgValue, bgValue);
          if (ratio === null) {
            violations.push(
              `[${combo}] ${label}: ${fgName} (${fgValue}) on ${bgName} (${bgValue}) — could not parse colour`,
            );
            continue;
          }
          if (ratio < minRatio) {
            violations.push(
              `[${combo}] ${label}: ${fgName} on ${bgName} — ratio ${ratio.toFixed(2)}:1 < required ${minRatio}:1`,
            );
          }
        }
      };

      check(TEXT_ON_BG_PAIRS, 4.5, "text-on-background");
      check(LARGE_TEXT_OR_BOUNDARY_PAIRS, 3, "large-text-or-boundary");
      check(FOCUS_RING_PAIRS, 3, "focus-ring");
    }
  }

  if (violations.length > 0) {
    console.error(`Contrast gate FAILED — ${violations.length} violation(s):\n`);
    for (const violation of violations) console.error(`  - ${violation}`);
    process.exitCode = 1;
    return;
  }

  console.log("Contrast gate passed — all 8 theme x accent combinations meet their minimum ratios.");
}

main();
