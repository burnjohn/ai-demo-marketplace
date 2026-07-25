/**
 * Facet counting. Counts are computed after applying the text query
 * but BEFORE applying the facet filters themselves, so toggling a facet never
 * reflows the sidebar counts for the other facets while the query is being
 * typed. A facet matching zero entities is reported with `count: 0` and
 * `available: false` — it stays visible, just non-activatable.
 *
 * Kind and keyword facets are unions (selecting more widens the result set);
 * the author facet is single-valued.
 */

import type { SearchEntity } from "./search";
import type { KindFilter } from "../routing/types";

export interface FacetOption<T> {
  value: T;
  count: number;
  available: boolean;
}

export interface FacetSummary {
  kinds: FacetOption<KindFilter>[];
  keywords: FacetOption<string>[];
  authors: FacetOption<string>[];
}

function entityKind(entity: SearchEntity): KindFilter {
  return entity.entityType === "artifact" ? entity.artifact.kind : "plugin";
}

function entityKeywords(entity: SearchEntity): string[] {
  return entity.plugin.keywords ?? [];
}

function entityAuthor(entity: SearchEntity): string | undefined {
  return entity.plugin.authorName;
}

/**
 * Computes per-facet match counts over the entities remaining after the text
 * query has been applied (i.e. `applyTextQuery(...)` results, unfiltered by
 * any facet selection).
 */
export function computeFacetSummary(
  entitiesAfterQuery: SearchEntity[],
): FacetSummary {
  const kindCounts = new Map<KindFilter, number>();
  const keywordCounts = new Map<string, number>();
  const authorCounts = new Map<string, number>();

  for (const entity of entitiesAfterQuery) {
    const kind = entityKind(entity);
    kindCounts.set(kind, (kindCounts.get(kind) ?? 0) + 1);
    for (const keyword of entityKeywords(entity)) {
      keywordCounts.set(keyword, (keywordCounts.get(keyword) ?? 0) + 1);
    }
    const author = entityAuthor(entity);
    if (author) {
      authorCounts.set(author, (authorCounts.get(author) ?? 0) + 1);
    }
  }

  return {
    kinds: toFacetOptions(kindCounts),
    keywords: toFacetOptions(keywordCounts),
    authors: toFacetOptions(authorCounts),
  };
}

/**
 * Same as `computeFacetSummary`, but also reports zero-count options for
 * every value present in `knownValues` that did not appear in the (already
 * text-query-filtered) entity list — so a facet that matches nothing under
 * the current query is still shown, marked unavailable, not removed.
 */
export function computeFacetSummaryWithKnownValues(
  entitiesAfterQuery: SearchEntity[],
  knownValues: { kinds?: KindFilter[]; keywords?: string[]; authors?: string[] },
): FacetSummary {
  const summary = computeFacetSummary(entitiesAfterQuery);
  return {
    kinds: mergeKnownValues(summary.kinds, knownValues.kinds ?? []),
    keywords: mergeKnownValues(summary.keywords, knownValues.keywords ?? []),
    authors: mergeKnownValues(summary.authors, knownValues.authors ?? []),
  };
}

function mergeKnownValues<T>(options: FacetOption<T>[], knownValues: T[]): FacetOption<T>[] {
  const seen = new Set(options.map((option) => option.value));
  const merged = [...options];
  for (const value of knownValues) {
    if (!seen.has(value)) {
      merged.push({ value, count: 0, available: false });
      seen.add(value);
    }
  }
  return merged;
}

function toFacetOptions<T>(counts: Map<T, number>): FacetOption<T>[] {
  return Array.from(counts.entries()).map(([value, count]) => ({
    value,
    count,
    available: count > 0,
  }));
}
