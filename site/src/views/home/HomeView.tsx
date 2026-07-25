/**
 * Home view — hero, hero search, keyword chips, per-kind stat tiles,
 * "What's new" preview and browse-by-kind row.
 *
 * Layout and copy mirror `design-ref/02-home.html`.
 *
 * The hero search input intentionally duplicates the header search input's
 * debounce/clear behaviour (`site/src/shell/Shell.tsx`) rather than importing
 * it: `Shell.tsx` does not export a reusable hook or component for that
 * logic — the debounce timer, the "Enter commits immediately" handling and
 * the clear button are all private to the `Shell` component body. If a
 * future task extracts that into a shared hook, this view should switch to
 * importing it instead of keeping its own copy.
 */

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
} from "react";
import type { CatalogIndex, ChangelogEntry } from "../../catalog/types";
import type { KindFilter, NavigateTarget, SearchState } from "../../routing/types";
import { buildRouteHref } from "../../routing/paths";
import { useRouter } from "../../routing/router";
import { EmptyState } from "../../components/EmptyState";
import { formatDate, formatNumber, t } from "../../i18n";
import "./HomeView.css";

const SEARCH_DEBOUNCE_MS = 250;
const MAX_KEYWORD_CHIPS = 7;
const MAX_RELEASES = 4;

/**
 * Kinds surfaced on the home tiles/browse row. `plugin` is the top-level
 * catalog entity, not an ArtifactKind — the search view models it as a
 * separate entity type. Activating the plugin tile lands on the unfiltered
 * search view where plugin cards appear alongside artifacts.
 */
type HomeKind = KindFilter | "plugin";
// Stat row is five columns and mirrors the mockup — hooks is intentionally
// omitted here and appears only in the browse row below.
const STAT_KINDS: readonly HomeKind[] = ["plugin", "skill", "agent", "command", "mcp"];
const BROWSE_KINDS: readonly HomeKind[] = ["plugin", "skill", "agent", "command", "hook", "mcp"];

const STAT_LABEL_KEY = {
  plugin: "home.stat.plugin",
  skill: "home.stat.skill",
  agent: "home.stat.agent",
  command: "home.stat.command",
  hook: "home.stat.hook",
  mcp: "home.stat.mcp",
} as const satisfies Record<HomeKind, Parameters<typeof t>[0]>;

const KIND_COUNTER_KEY = {
  plugin: "home.kindCounter.plugin",
  skill: "home.kindCounter.skill",
  agent: "home.kindCounter.agent",
  command: "home.kindCounter.command",
  hook: "home.kindCounter.hook",
  mcp: "home.kindCounter.mcp",
} as const satisfies Record<HomeKind, Parameters<typeof t>[0]>;

const BROWSE_LABEL_KEY = {
  plugin: "home.browse.plugin",
  skill: "kind.label.skill",
  agent: "kind.label.agent",
  command: "kind.label.command",
  hook: "kind.label.hook",
  mcp: "kind.label.mcp",
} as const satisfies Record<HomeKind, Parameters<typeof t>[0]>;

export interface HomeViewProps {
  index: CatalogIndex;
}

interface ReleaseFeedEntry extends ChangelogEntry {
  pluginDisplayName: string;
}

/** Counts, across every plugin, how many artifacts each kind has, plus the plugin total. */
function countByKind(index: CatalogIndex): Record<HomeKind, number> {
  const counts: Record<HomeKind, number> = {
    plugin: index.plugins.length,
    skill: 0,
    agent: 0,
    command: 0,
    hook: 0,
    mcp: 0,
  };
  for (const plugin of index.plugins) {
    for (const artifact of plugin.artifacts) {
      counts[artifact.kind] += 1;
    }
  }
  return counts;
}

/** Most frequent keywords across every plugin, capped at `MAX_KEYWORD_CHIPS`. */
function topKeywords(index: CatalogIndex): string[] {
  const frequency = new Map<string, number>();
  for (const plugin of index.plugins) {
    for (const keyword of plugin.keywords ?? []) {
      frequency.set(keyword, (frequency.get(keyword) ?? 0) + 1);
    }
  }
  return Array.from(frequency.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, MAX_KEYWORD_CHIPS)
    .map(([keyword]) => keyword);
}

/** Every changelog entry across every plugin, newest first, capped at `MAX_RELEASES`. */
function recentReleases(index: CatalogIndex): ReleaseFeedEntry[] {
  const entries: ReleaseFeedEntry[] = [];
  for (const plugin of index.plugins) {
    for (const entry of plugin.changelogEntries ?? []) {
      entries.push({ ...entry, pluginDisplayName: plugin.displayName });
    }
  }
  entries.sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));
  return entries.slice(0, MAX_RELEASES);
}

/** Formats a changelog date for display, or omits it if unparseable. */
function formatReleaseDate(date: string | undefined): string | null {
  if (!date) return null;
  const parsed = new Date(date);
  return Number.isNaN(parsed.getTime()) ? null : formatDate(parsed);
}

/** Hero search input — mirrors the header search input's behaviour exactly. */
function HeroSearch() {
  const { route, navigate } = useRouter();
  const currentQuery = route.view === "search" ? route.search.query ?? "" : "";
  const [text, setText] = useState(currentQuery);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setText(currentQuery);
  }, [currentQuery]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const commitQuery = useCallback(
    (value: string) => {
      const base: SearchState =
        route.view === "search" ? { ...route.search } : { kinds: [], keywords: [] };
      const search: SearchState = { ...base, query: value || undefined };
      navigate({ view: "search", search });
    },
    [route, navigate],
  );

  const scheduleCommit = useCallback(
    (value: string) => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        timeoutRef.current = null;
        commitQuery(value);
      }, SEARCH_DEBOUNCE_MS);
    },
    [commitQuery],
  );

  const handleChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const value = event.target.value;
      setText(value);
      scheduleCommit(value);
    },
    [scheduleCommit],
  );

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key !== "Enter") return;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      commitQuery(event.currentTarget.value);
    },
    [commitQuery],
  );

  const handleClear = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setText("");
    commitQuery("");
    inputRef.current?.focus();
  }, [commitQuery]);

  return (
    <div className="home-hero-search">
      <span className="home-hero-search__icon" aria-hidden="true">
        ⌕
      </span>
      <input
        ref={inputRef}
        type="text"
        role="searchbox"
        aria-label={t("shell.searchPlaceholder")}
        placeholder={t("shell.searchPlaceholder")}
        value={text}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
      />
      {text.length > 0 && (
        <button type="button" onClick={handleClear} aria-label={t("shell.searchClear")}>
          ×
        </button>
      )}
    </div>
  );
}

interface RouteLinkProps {
  target: NavigateTarget;
  className?: string;
  children: React.ReactNode;
}

/**
 * A plain `<a>` whose `href` keeps native browser affordances (middle-click,
 * Ctrl/Cmd-click "open in new tab", copy-link) but whose plain left-click is
 * routed through `router.navigate()` instead of the browser's own hash
 * navigation. `site/src/routing/router.tsx` only listens for `popstate`, not
 * `hashchange` — a bare `<a href>` click changes `location.hash` and fires
 * only `hashchange` in real browsers (jsdom's `popstate` emulation on hash
 * changes is non-spec-compliant and would hide this bug in tests). Mirrors
 * `ResultCard`'s `handleTitleClick` (`site/src/components/ResultCard.tsx`).
 */
function RouteLink({ target, className, children }: RouteLinkProps) {
  const { navigate } = useRouter();

  const handleClick = useCallback(
    (event: ReactMouseEvent<HTMLAnchorElement>) => {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      navigate(target);
    },
    [navigate, target],
  );

  return (
    <a href={buildRouteHref(target)} className={className} onClick={handleClick}>
      {children}
    </a>
  );
}

export function HomeView({ index }: HomeViewProps) {
  const { navigate } = useRouter();
  const keywords = useMemo(() => topKeywords(index), [index]);
  const kindCounts = useMemo(() => countByKind(index), [index]);
  const releases = useMemo(() => recentReleases(index), [index]);
  const isEmptyCatalog = index.plugins.length === 0;

  const handleKeywordClick = useCallback(
    (keyword: string) => {
      navigate({ view: "search", search: { kinds: [], keywords: [keyword] } });
    },
    [navigate],
  );

  const handleHomeKindClick = useCallback(
    (kind: HomeKind) => {
      if (kindCounts[kind] === 0) return;
      navigate({ view: "search", search: { kinds: [kind], keywords: [] } });
    },
    [navigate, kindCounts],
  );

  return (
    <main className="page page--home home-view">
      <section className="home-hero" aria-labelledby="home-hero-heading">
        <div className="home-hero__eyebrow">{t("home.hero.eyebrow")}</div>
        <h1 id="home-hero-heading" className="home-hero__heading">
          <span>{t("home.hero.headingLine1")}</span>
          <span>{t("home.hero.headingLine2")}</span>
        </h1>
        <p className="home-hero__description">{t("home.hero.description")}</p>
        <HeroSearch />
        {keywords.length > 0 && (
          <div className="home-keywords" aria-labelledby="home-keywords-heading">
            <h2 id="home-keywords-heading" className="home-keywords__heading">
              {t("home.keywords.heading")}
            </h2>
            <ul className="home-keywords__list">
              {keywords.map((keyword) => (
                <li key={keyword}>
                  <button type="button" onClick={() => handleKeywordClick(keyword)}>
                    {keyword}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      {isEmptyCatalog ? (
        <EmptyState
          heading={t("home.emptyCatalog.heading")}
          description={t("home.emptyCatalog.description")}
          action={
            <>
              <RouteLink target={{ view: "getting-started" }}>
                {t("home.emptyCatalog.gettingStartedLink")}
              </RouteLink>
              <a
                href="https://github.com/burnjohn/ai-demo-marketplace/blob/main/docs/PLUGIN-GUIDELINES.md"
                target="_blank"
                rel="noopener noreferrer"
              >
                {t("home.emptyCatalog.contributionLink")}
              </a>
            </>
          }
        />
      ) : (
        <>
          <section className="home-stats">
            <ul className="home-stats__list">
              {STAT_KINDS.map((kind) => {
                const count = kindCounts[kind];
                const disabled = count === 0;
                return (
                  <li key={kind}>
                    <button
                      type="button"
                      className="home-stats__button"
                      onClick={() => handleHomeKindClick(kind)}
                      disabled={disabled}
                      aria-disabled={disabled}
                      aria-label={t(KIND_COUNTER_KEY[kind], { count })}
                    >
                      <span className="home-stats__count">{formatNumber(count)}</span>
                      <span className="home-stats__label">{t(STAT_LABEL_KEY[kind])}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>

          {releases.length > 0 && (
            <section className="home-releases" aria-labelledby="home-releases-heading">
              <div className="home-releases__header">
                <h2 id="home-releases-heading">{t("home.releases.heading")}</h2>
                <RouteLink target={{ view: "whats-new" }} className="home-releases__feed-link">
                  {t("home.releases.fullFeedLink")}
                </RouteLink>
              </div>
              <ul className="home-releases__list">
                {releases.map((entry, index) => (
                  <li key={`${entry.owningPluginId}-${entry.version}-${index}`}>
                    <RouteLink target={{ view: "plugin", pluginId: entry.owningPluginId }}>
                      <span className="home-releases__version" data-kind="plugin">
                        v{entry.version}
                      </span>
                      <span className="home-releases__body">
                        <span className="home-releases__name">{entry.pluginDisplayName}</span>
                        <span className="home-releases__summary">{entry.summary}</span>
                      </span>
                      {formatReleaseDate(entry.date) ? (
                        <span className="home-releases__date">{formatReleaseDate(entry.date)}</span>
                      ) : null}
                    </RouteLink>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="home-browse" aria-labelledby="home-browse-heading">
            <h2 id="home-browse-heading" className="home-browse__heading">
              {t("home.browseByKind.heading")}
            </h2>
            <ul className="home-browse__list">
              {BROWSE_KINDS.map((kind) => {
                const count = kindCounts[kind];
                const disabled = count === 0;
                return (
                  <li key={kind}>
                    <button
                      type="button"
                      className="home-browse__button"
                      onClick={() => handleHomeKindClick(kind)}
                      disabled={disabled}
                      aria-disabled={disabled}
                      aria-label={t(KIND_COUNTER_KEY[kind], { count })}
                    >
                      <span className="home-browse__dot" data-kind={kind} aria-hidden="true" />
                      <span className="home-browse__label">{t(BROWSE_LABEL_KEY[kind])}</span>
                      <span className="home-browse__count">{formatNumber(count)}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        </>
      )}
    </main>
  );
}
