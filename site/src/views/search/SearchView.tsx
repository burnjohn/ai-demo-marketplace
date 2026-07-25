/**
 * The search/browse view — heading, result count, sort control, facet
 * sidebar and result grid, all driven by the URL search state owned by the
 * router and the pure search/facet logic in `catalog/search.ts` and
 * `catalog/facets.ts`.
 *
 * Filter state is never mirrored into local component state: every read
 * comes from `useRouter().route.search` and every write goes back through
 * `navigate(..., "replace")`, so Back/Forward always agree with what is
 * rendered.
 *
 * Every user-facing string goes through `t()` — including the sort
 * control's accessible label (`search.sort.label`) and the facet
 * disclosure's heading (`search.filters.heading`).
 *
 * Layout follows `design-ref/03-search.html`: a two-column desktop grid with
 * a sticky, un-bordered facet column on the left and a results column on
 * the right. On narrow viewports the facet column collapses into a native
 * `<details>` disclosure (verified by `src/__tests__/responsive.test.tsx`).
 */

import { useMemo } from "react";
import { EmptyState } from "../../components/EmptyState";
import { ResultCard } from "../../components/ResultCard";
import type { KindFilter } from "../../routing/types";
import {
  applyFacetFilters,
  applyTextQuery,
  flattenEntities,
  sortResults,
  type SearchEntity,
} from "../../catalog/search";
import { computeFacetSummary, computeFacetSummaryWithKnownValues } from "../../catalog/facets";
import { useRouter } from "../../routing";
import type { CatalogIndex } from "../../catalog/types";
import type { SearchState, SortOrder } from "../../routing";
import { CopyControl } from "../../ui/copy";
import { formatNumber, t } from "../../i18n";
import "./SearchView.css";

export interface SearchViewProps {
  /** The loaded catalog index. Received via props — this view never loads it itself. */
  index: CatalogIndex;
}

const EMPTY_SEARCH: SearchState = { kinds: [], keywords: [] };

const SORT_ORDER_LABEL_KEYS: Record<SortOrder, "search.sort.relevance" | "search.sort.name" | "search.sort.recentlyUpdated"> = {
  relevance: "search.sort.relevance",
  name: "search.sort.name",
  "recently-updated": "search.sort.recentlyUpdated",
};

const SORT_OPTIONS: SortOrder[] = ["relevance", "name", "recently-updated"];

/**
 * The fixed order in which artifact kinds appear in the facet sidebar.
 * Rendered in full every render — a kind with no matches in the current
 * result set stays visible with a count of 0 and is not activatable — so the
 * sidebar keeps a stable shape as the query changes (matches
 * `design-ref/03-search.html`).
 */
const KIND_ORDER: KindFilter[] = ["plugin", "skill", "agent", "command", "hook", "mcp"];

function currentSearch(route: ReturnType<typeof useRouter>["route"]): SearchState {
  return route.view === "search" ? route.search : EMPTY_SEARCH;
}

function activeFilterCount(search: SearchState): number {
  return (
    search.kinds.length +
    search.keywords.length +
    (search.author ? 1 : 0) +
    (search.query && search.query.trim() ? 1 : 0)
  );
}

/** The search/browse view. */
export function SearchView({ index }: SearchViewProps) {
  const { route, navigate } = useRouter();
  const search = currentSearch(route);

  const allEntities = useMemo(() => flattenEntities(index), [index]);

  // Facet universe: computed once from the whole catalog (no text query, no
  // facet filters) so a facet that matches zero entities under the current
  // query still renders, just disabled. The kind universe is pinned to
  // `KIND_ORDER` so a kind that is not currently in the catalog still
  // renders (with count 0) — the sidebar keeps a stable shape.
  const knownValues = useMemo(() => {
    const summary = computeFacetSummary(allEntities);
    return {
      kinds: KIND_ORDER,
      keywords: summary.keywords.map((option) => option.value),
      authors: summary.authors.map((option) => option.value),
    };
  }, [allEntities]);

  const afterQuery = useMemo(
    () => applyTextQuery(allEntities, search.query),
    [allEntities, search.query],
  );

  const facetSummary = useMemo(
    () =>
      computeFacetSummaryWithKnownValues(
        afterQuery.map((result) => result.entity),
        knownValues,
      ),
    [afterQuery, knownValues],
  );

  const kindsByValue = useMemo(
    () => new Map(facetSummary.kinds.map((option) => [option.value, option])),
    [facetSummary.kinds],
  );

  const filtered = useMemo(
    () =>
      applyFacetFilters(afterQuery, {
        kinds: search.kinds,
        keywords: search.keywords,
        author: search.author,
      }),
    [afterQuery, search.kinds, search.keywords, search.author],
  );

  const sort = search.sort ?? "relevance";
  const hasQuery = Boolean(search.query && search.query.trim());
  const sorted = useMemo(
    () => sortResults(filtered, sort, hasQuery),
    [filtered, sort, hasQuery],
  );

  const filterCount = activeFilterCount(search);

  function updateSearch(patch: Partial<SearchState>) {
    const next: SearchState = {
      kinds: patch.kinds ?? search.kinds,
      keywords: patch.keywords ?? search.keywords,
      author: "author" in patch ? patch.author : search.author,
      query: "query" in patch ? patch.query : search.query,
      sort: "sort" in patch ? patch.sort : search.sort,
    };
    navigate({ view: "search", search: next }, "replace");
  }

  function toggleKind(kind: KindFilter) {
    const active = search.kinds.includes(kind);
    updateSearch({
      kinds: active ? search.kinds.filter((value) => value !== kind) : [...search.kinds, kind],
    });
  }

  function toggleKeyword(keyword: string) {
    const active = search.keywords.includes(keyword);
    updateSearch({
      keywords: active
        ? search.keywords.filter((value) => value !== keyword)
        : [...search.keywords, keyword],
    });
  }

  function toggleAuthor(author: string) {
    updateSearch({ author: search.author === author ? undefined : author });
  }

  function handleSortChange(event: React.ChangeEvent<HTMLSelectElement>) {
    updateSearch({ sort: event.target.value as SortOrder });
  }

  function handleReset() {
    navigate({ view: "search", search: { kinds: [], keywords: [] } }, "replace");
  }

  const heading =
    search.query && search.query.trim()
      ? t("search.heading.query", { query: search.query })
      : t("search.heading.browse");

  const resetAction = (
    <button type="button" onClick={handleReset}>
      {t("search.reset")}
    </button>
  );

  return (
    <main className="page page--search search-view">
      <div className="search-view__body">
      <aside className="search-view__aside">
        {/*
         * `<details>` is required by the responsive contract (verified by
         * `src/__tests__/responsive.test.tsx`): on narrow viewports the
         * `<summary>` acts as the disclosure trigger. On desktop the
         * summary is visually hidden and the sidebar always shows its
         * contents, matching the design mockup's plain-column look.
         */}
        <details className="search-view__facets" open>
          <summary className="search-view__facets-summary">
            {t("search.filters.heading")}
          </summary>

          <div className="search-view__facets-head">
            <span className="search-view__facets-heading">
              {t("search.filters.heading")}
            </span>
            <button
              type="button"
              className="search-view__facets-reset"
              onClick={handleReset}
              disabled={filterCount === 0}
            >
              {t("search.reset")}
            </button>
          </div>

          <fieldset className="search-view__facet-group">
            <legend className="search-view__facet-legend">
              {t("search.facets.kind")}
            </legend>
            <div className="search-view__facet-list">
              {KIND_ORDER.map((kind) => {
                const option = kindsByValue.get(kind) ?? {
                  value: kind,
                  count: 0,
                  available: false,
                };
                const active = search.kinds.includes(kind);
                return (
                  <button
                    key={kind}
                    type="button"
                    className="search-view__facet-row search-view__facet-row--kind"
                    data-kind={kind}
                    aria-pressed={active}
                    aria-label={t("search.facets.buttonLabel", {
                      label: t(`kind.label.${kind}` as const),
                      count: option.count,
                    })}
                    disabled={!option.available && !active}
                    onClick={() => toggleKind(kind)}
                  >
                    <span className="search-view__kind-dot" aria-hidden="true" />
                    <span className="search-view__facet-label">
                      {t(`kind.label.${kind}` as const)}
                    </span>
                    <span className="search-view__facet-count" aria-hidden="true">
                      {formatNumber(option.count)}
                    </span>
                  </button>
                );
              })}
            </div>
          </fieldset>

          <fieldset className="search-view__facet-group">
            <legend className="search-view__facet-legend">
              {t("search.facets.keyword")}
            </legend>
            <div className="search-view__facet-pills">
              {facetSummary.keywords.map((option) => {
                const active = search.keywords.includes(option.value);
                return (
                  <button
                    key={option.value}
                    type="button"
                    className="search-view__facet-pill"
                    aria-pressed={active}
                    aria-label={t("search.facets.buttonLabel", {
                      label: option.value,
                      count: option.count,
                    })}
                    disabled={!option.available && !active}
                    onClick={() => toggleKeyword(option.value)}
                  >
                    {option.value}
                  </button>
                );
              })}
            </div>
          </fieldset>

          <fieldset className="search-view__facet-group">
            <legend className="search-view__facet-legend">
              {t("search.facets.author")}
            </legend>
            <div className="search-view__facet-list">
              {facetSummary.authors.map((option) => {
                const active = search.author === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    className="search-view__facet-row"
                    aria-pressed={active}
                    aria-label={t("search.facets.buttonLabel", {
                      label: option.value,
                      count: option.count,
                    })}
                    disabled={!option.available && !active}
                    onClick={() => toggleAuthor(option.value)}
                  >
                    <span className="search-view__facet-label">
                      {option.value}
                    </span>
                    <span className="search-view__facet-count" aria-hidden="true">
                      {formatNumber(option.count)}
                    </span>
                  </button>
                );
              })}
            </div>
          </fieldset>
        </details>
      </aside>

      <section className="search-view__results">
        <header className="search-view__header">
          <div className="search-view__heading-group">
            <h1 className="search-view__heading">{heading}</h1>
            <p
              className="search-view__count"
              aria-live="polite"
              role="status"
            >
              {t("search.resultCount", { count: sorted.length })}
            </p>
          </div>
          <label className="search-view__sort">
            <span className="search-view__sort-text" aria-hidden="true">
              {t("search.sort.trigger")}
            </span>
            <select
              className="search-view__sort-select"
              value={sort}
              onChange={handleSortChange}
              aria-label={t("search.sort.label")}
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {t(SORT_ORDER_LABEL_KEYS[option])}
                </option>
              ))}
            </select>
          </label>
        </header>

        {/*
          A visually-hidden section heading bridges the h1 above and the
          per-card h3 headings the ResultCard renders — without it axe's
          `heading-order` rule flags the h1→h3 jump.
        */}
        <h2 className="search-view__visually-hidden">
          {t("search.resultCount", { count: sorted.length })}
        </h2>
        {sorted.length === 0 ? (
          <EmptyState
            heading={t("search.zeroResults.heading")}
            description={t("search.zeroResults.description")}
            action={resetAction}
            className="search-view__empty"
          />
        ) : (
          <div className="search-view__grid">
            {sorted.map(({ entity }) => (
              <ResultCard
                key={entityKey(entity)}
                entity={entity}
                renderCopyControl={(installText) => (
                  <CopyControl text={installText} variant="compact" />
                )}
              />
            ))}
          </div>
        )}
      </section>
      </div>
    </main>
  );
}

function entityKey(entity: SearchEntity): string {
  return entity.entityType === "plugin" ? entity.plugin.id : entity.artifact.id;
}
