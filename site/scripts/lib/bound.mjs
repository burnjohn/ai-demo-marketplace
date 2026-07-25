/**
 * Bounding helpers — keep documentation excerpts and search text small
 * enough that the whole catalog-index asset stays under 512 KB even as the
 * catalog grows.
 */
export const MAX_README_LENGTH = 20_000;
export const MAX_DOCUMENTATION_EXCERPT_LENGTH = 1_200;
export const MAX_CHANGELOG_SUMMARY_LENGTH = 400;
export const MAX_SEARCH_TEXT_LENGTH = 600;

/** The hard ceiling on the emitted asset's serialized byte size. */
export const MAX_INDEX_BYTES = 512 * 1024;

const ELLIPSIS = "…";

/** Truncates `text` to at most `maxLength` characters, trimming whitespace. */
export function bound(text, maxLength) {
  if (typeof text !== "string") return text;
  const trimmed = text.trim();
  if (trimmed.length <= maxLength) return trimmed;
  return `${trimmed.slice(0, Math.max(0, maxLength - 1)).trimEnd()}${ELLIPSIS}`;
}

/** Builds a bounded, whitespace-normalised search-text blob from parts. */
export function buildSearchText(parts, maxLength = MAX_SEARCH_TEXT_LENGTH) {
  const joined = parts
    .filter((part) => typeof part === "string" && part.trim().length > 0)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
  return bound(joined, maxLength);
}
