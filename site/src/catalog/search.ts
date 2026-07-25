/**
 * Pure search/sort logic over a `CatalogIndex`. No React, no routing coupling
 * — callers pass plain arguments and get plain data back.
 *
 * Every plugin and every artifact it ships is a searchable "entity" — both
 * count toward the performance budget. `flattenEntities` produces one flat
 * list; `searchEntities` filters/ranks/sorts it.
 */

import type {
  Artifact,
  CatalogIndex,
  Plugin,
} from "./types";
import type { KindFilter } from "../routing/types";

/** A searchable entity — either a plugin or one of its artifacts. */
export type SearchEntity =
  | { entityType: "plugin"; plugin: Plugin }
  | { entityType: "artifact"; plugin: Plugin; artifact: Artifact };

export type SortOrder = "relevance" | "name" | "recently-updated";

export interface SearchFilters {
  query?: string;
  kinds?: KindFilter[];
  keywords?: string[];
  author?: string;
  sort?: SortOrder;
}

/** Field a query token matched in, used to rank results. */
type MatchTier = "name" | "keyword" | "description" | "documentation" | "none";

/** Higher score outranks lower. */
const TIER_SCORE: Record<MatchTier, number> = {
  name: 4,
  keyword: 3,
  description: 2,
  documentation: 1,
  none: 0,
};

/** Flattens a catalog index into one list of plugin + artifact entities. */
export function flattenEntities(index: CatalogIndex): SearchEntity[] {
  const entities: SearchEntity[] = [];
  for (const plugin of index.plugins) {
    entities.push({ entityType: "plugin", plugin });
    for (const artifact of plugin.artifacts) {
      entities.push({ entityType: "artifact", plugin, artifact });
    }
  }
  return entities;
}

/** Display/sort name for an entity. */
function entityName(entity: SearchEntity): string {
  return entity.entityType === "plugin"
    ? entity.plugin.displayName || entity.plugin.name
    : entity.artifact.displayName || entity.artifact.name;
}

/** ISO date string driving recently-updated sort, or undefined if none. */
function entityLastUpdated(entity: SearchEntity): string | undefined {
  return entity.plugin.lastUpdated;
}

function entityKeywords(entity: SearchEntity): string[] {
  return entity.plugin.keywords ?? [];
}

function entityDescription(entity: SearchEntity): string | undefined {
  return entity.entityType === "plugin"
    ? entity.plugin.description
    : entity.artifact.description;
}

function entityDocumentationExcerpt(entity: SearchEntity): string | undefined {
  return entity.entityType === "artifact"
    ? entity.artifact.documentationExcerpt
    : undefined;
}

function entityKind(entity: SearchEntity): KindFilter {
  return entity.entityType === "artifact" ? entity.artifact.kind : "plugin";
}

function entityAuthor(entity: SearchEntity): string | undefined {
  return entity.plugin.authorName;
}

/** Splits a query into lowercase, whitespace-separated, non-empty tokens. */
function tokenize(query: string): string[] {
  return query
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter((token) => token.length > 0);
}

/**
 * Finds the best (highest-ranked) tier a single token matches within an
 * entity, or "none" if it matches nowhere.
 */
function bestTierForToken(entity: SearchEntity, token: string): MatchTier {
  const name = entityName(entity).toLowerCase();
  const rawName =
    entity.entityType === "plugin" ? entity.plugin.name : entity.artifact.name;

  if (name.includes(token) || rawName.toLowerCase().includes(token)) {
    return "name";
  }

  const keywords = entityKeywords(entity);
  if (keywords.some((keyword) => keyword.toLowerCase().includes(token))) {
    return "keyword";
  }

  const description = entityDescription(entity);
  if (description && description.toLowerCase().includes(token)) {
    return "description";
  }

  const documentation = entityDocumentationExcerpt(entity);
  if (documentation && documentation.toLowerCase().includes(token)) {
    return "documentation";
  }

  return "none";
}

/**
 * Token-AND matching: every token must match somewhere (name, keywords,
 * description, or documentation excerpt). Returns the aggregate relevance
 * score (sum of each token's best tier score) or `undefined` if any token
 * fails to match — the entity is excluded from results in that case.
 */
function scoreEntity(entity: SearchEntity, tokens: string[]): number | undefined {
  if (tokens.length === 0) return 0;

  let total = 0;
  for (const token of tokens) {
    const tier = bestTierForToken(entity, token);
    if (tier === "none") return undefined;
    total += TIER_SCORE[tier];
  }
  return total;
}

function matchesKindFilter(entity: SearchEntity, kinds: KindFilter[] | undefined): boolean {
  if (!kinds || kinds.length === 0) return true;
  return kinds.includes(entityKind(entity));
}

function matchesKeywordFilter(entity: SearchEntity, keywords: string[] | undefined): boolean {
  if (!keywords || keywords.length === 0) return true;
  const entityKws = entityKeywords(entity);
  return keywords.some((keyword) => entityKws.includes(keyword));
}

function matchesAuthorFilter(entity: SearchEntity, author: string | undefined): boolean {
  if (!author) return true;
  return entityAuthor(entity) === author;
}

/** Applies only the text query, returning entities that match plus their score. */
export function applyTextQuery(
  entities: SearchEntity[],
  query: string | undefined,
): { entity: SearchEntity; score: number }[] {
  const tokens = tokenize(query ?? "");
  const results: { entity: SearchEntity; score: number }[] = [];
  for (const entity of entities) {
    const score = scoreEntity(entity, tokens);
    if (score !== undefined) {
      results.push({ entity, score });
    }
  }
  return results;
}

/** Applies the kind/keyword/author facet filters on top of a scored result set. */
export function applyFacetFilters(
  scored: { entity: SearchEntity; score: number }[],
  filters: Pick<SearchFilters, "kinds" | "keywords" | "author">,
): { entity: SearchEntity; score: number }[] {
  return scored.filter(
    ({ entity }) =>
      matchesKindFilter(entity, filters.kinds) &&
      matchesKeywordFilter(entity, filters.keywords) &&
      matchesAuthorFilter(entity, filters.author),
  );
}

/**
 * Sorts a scored result set in place-safe fashion (returns a new array) using
 * a stable sort, per the requested order:
 *   - "relevance": highest score first; falls back to name order when the
 *     query is empty, since every score is then 0 and would otherwise be
 *     arbitrary across reloads.
 *   - "name": case-insensitive name ascending.
 *   - "recently-updated": most recent `lastUpdated` first, undated last.
 */
export function sortResults(
  scored: { entity: SearchEntity; score: number }[],
  sort: SortOrder,
  hasQuery: boolean,
): { entity: SearchEntity; score: number }[] {
  const byName = (a: SearchEntity, b: SearchEntity) =>
    entityName(a).localeCompare(entityName(b), undefined, { sensitivity: "base" });

  const copy = [...scored];

  if (sort === "name") {
    return copy.sort((a, b) => byName(a.entity, b.entity));
  }

  if (sort === "recently-updated") {
    return copy.sort((a, b) => {
      const aDate = entityLastUpdated(a.entity);
      const bDate = entityLastUpdated(b.entity);
      if (!aDate && !bDate) return byName(a.entity, b.entity);
      if (!aDate) return 1;
      if (!bDate) return -1;
      const diff = new Date(bDate).getTime() - new Date(aDate).getTime();
      return diff !== 0 ? diff : byName(a.entity, b.entity);
    });
  }

  // relevance
  if (!hasQuery) {
    return copy.sort((a, b) => byName(a.entity, b.entity));
  }
  return copy.sort((a, b) => {
    const diff = b.score - a.score;
    return diff !== 0 ? diff : byName(a.entity, b.entity);
  });
}

export interface SearchResultEntry {
  entity: SearchEntity;
  score: number;
}

/**
 * End-to-end search: flatten (if given a raw index), apply the text query,
 * apply facet filters, then sort. Accepts either a `CatalogIndex` or an
 * already-flattened entity list (the latter lets callers reuse one flatten
 * pass across repeated searches, e.g. in the perf test).
 */
export function searchEntities(
  source: CatalogIndex | SearchEntity[],
  filters: SearchFilters = {},
): SearchResultEntry[] {
  const entities = Array.isArray(source) ? source : flattenEntities(source);
  const scored = applyTextQuery(entities, filters.query);
  const filtered = applyFacetFilters(scored, filters);
  const sort = filters.sort ?? "relevance";
  const hasQuery = tokenize(filters.query ?? "").length > 0;
  return sortResults(filtered, sort, hasQuery);
}
