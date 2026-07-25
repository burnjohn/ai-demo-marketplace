/**
 * What's New view — every changelog entry from every plugin in the
 * catalog, newest first. The catalog index is provided via props (the
 * loader lives elsewhere), matching the `{ index: CatalogIndex }` prop
 * shape used by `HomeView`.
 */

import { useMemo } from "react";
import type {
  MouseEvent as ReactMouseEvent,
  KeyboardEvent as ReactKeyboardEvent,
} from "react";
import type { CatalogIndex, ChangelogEntry } from "../../catalog/types";
import { buildRouteHref } from "../../routing/paths";
import { useRouter } from "../../routing/router";
import type { NavigateTarget } from "../../routing/types";
import { EmptyState } from "../../components/EmptyState";
import { t, formatDate } from "../../i18n";
import "./WhatsNewView.css";

export interface WhatsNewViewProps {
  index: CatalogIndex;
}

interface ReleaseFeedEntry extends ChangelogEntry {
  pluginDisplayName: string;
}

/**
 * Every changelog entry across every plugin, newest first. Dated entries
 * sort by date descending; undated entries (the common case in this
 * repository — CHANGELOG headings here carry no date) always sort after
 * every dated entry and never render an invalid date string.
 */
function allReleases(index: CatalogIndex): ReleaseFeedEntry[] {
  const dated: ReleaseFeedEntry[] = [];
  const undated: ReleaseFeedEntry[] = [];
  for (const plugin of index.plugins) {
    for (const entry of plugin.changelogEntries ?? []) {
      const feedEntry: ReleaseFeedEntry = { ...entry, pluginDisplayName: plugin.displayName };
      if (feedEntry.date) {
        dated.push(feedEntry);
      } else {
        undated.push(feedEntry);
      }
    }
  }
  dated.sort((a, b) => (b.date as string).localeCompare(a.date as string));
  return [...dated, ...undated];
}

interface ReleaseRowProps {
  entry: ReleaseFeedEntry;
}

/**
 * One feed row. Version + date sit in a narrow right-aligned left column,
 * plugin name + summary fill the right column. The whole row is a single
 * real `<a>` — its only focusable, activatable element — so click, Enter
 * (native anchor behaviour) and Space (handled explicitly below, since
 * anchors do not natively activate on Space) all reach the same plugin
 * detail view.
 */
function ReleaseRow({ entry }: ReleaseRowProps) {
  const { navigate } = useRouter();
  const target: NavigateTarget = { view: "plugin", pluginId: entry.owningPluginId };
  const href = buildRouteHref(target);

  const handleClick = (event: ReactMouseEvent<HTMLAnchorElement>) => {
    if (event.defaultPrevented || event.button !== 0) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    navigate(target);
  };

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLAnchorElement>) => {
    if (event.key === " ") {
      event.preventDefault();
      navigate(target);
    }
  };

  return (
    <li className="whats-new__entry">
      <a
        className="whats-new__entry-link"
        href={href}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
      >
        <span className="whats-new__entry-meta">
          <span className="whats-new__entry-version">v{entry.version}</span>
          {entry.date ? (
            <span className="whats-new__entry-date">{formatDate(entry.date)}</span>
          ) : null}
        </span>
        <span className="whats-new__entry-body">
          <span className="whats-new__entry-plugin">{entry.pluginDisplayName}</span>
          <span className="whats-new__entry-summary">{entry.summary}</span>
        </span>
      </a>
    </li>
  );
}

export function WhatsNewView({ index }: WhatsNewViewProps) {
  const { navigate } = useRouter();
  const releases = useMemo(() => allReleases(index), [index]);
  const isEmpty = releases.length === 0;

  const handleBackToHome = (event: ReactMouseEvent<HTMLAnchorElement>) => {
    if (event.defaultPrevented || event.button !== 0) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    navigate({ view: "home" });
  };

  /**
   * The router (`site/src/routing/router.tsx`) synchronises state via
   * `pushState`/`popstate` only — it has no `hashchange` listener, and real
   * browsers do not fire `popstate` for a plain fragment navigation. A bare
   * `<a href="#/...">` with no click handler would therefore change
   * `location.hash` while leaving the rendered view (and focus/announcement
   * effects) exactly as-is. Every internal link in this view must go
   * through `navigate()` instead, keeping the real `href` so browser
   * affordances (open in new tab, copy link, middle-click) keep working —
   * the same pattern `ResultCard.tsx` and `PluginView`'s `RouterLink` use.
   */
  const handleGettingStartedClick = (event: ReactMouseEvent<HTMLAnchorElement>) => {
    if (event.defaultPrevented || event.button !== 0) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    navigate({ view: "getting-started" });
  };

  return (
    <main className="page page--whats-new whats-new-view">
      <a
        className="whats-new-view__back"
        href={buildRouteHref({ view: "home" })}
        onClick={handleBackToHome}
      >
        {t("whatsNew.backToHome")}
      </a>
      <div className="whats-new-view__header">
        <h1 id="whats-new-heading" className="whats-new-view__heading">
          {t("whatsNew.heading")}
        </h1>
        {/*
          Opens the repository's releases page in an isolated new browsing
          context (`rel="noopener noreferrer"` prevents the new tab from
          accessing `window.opener`). This app does not publish an RSS/Atom
          feed — the link points at a real repository page, and the
          accessible label states so, so the affordance is honest.
        */}
        <a
          className="whats-new-view__subscribe"
          href={`${index.repositoryUrl}/releases`}
          target="_blank"
          rel="noopener noreferrer"
        >
          {t("whatsNew.subscribe")}
        </a>
      </div>

      {isEmpty ? (
        <EmptyState
          heading={t("whatsNew.empty.heading")}
          description={t("whatsNew.empty.description")}
          action={
            <a
              href={buildRouteHref({ view: "getting-started" })}
              onClick={handleGettingStartedClick}
            >
              {t("home.emptyCatalog.gettingStartedLink")}
            </a>
          }
        />
      ) : (
        <ul className="whats-new__list">
          {releases.map((entry, index_) => (
            <ReleaseRow key={`${entry.owningPluginId}--${entry.version}--${index_}`} entry={entry} />
          ))}
        </ul>
      )}
    </main>
  );
}
