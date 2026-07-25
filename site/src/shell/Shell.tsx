/**
 * Application shell: sticky header present on every view.
 *
 * The header, per `design-ref/01-shell-and-tokens.html`, contains only the
 * brand cluster (accent glyph + wordmark + mono chip), the global search
 * input, a command-palette trigger, a theme toggle, and an external
 * repository link.
 *
 * Theme/accent persistence lives in `useThemeAccent` and `./storage.ts`. The
 * accent value is still applied to the document root by the pre-paint script
 * and the hook, so a previously stored accent continues to render — the
 * in-header switcher for choosing it has been removed because the design does
 * not include it.
 */

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { t } from "../i18n";
import { buildRouteHref } from "../routing/paths";
import { useRouter } from "../routing/router";
import type { SearchState } from "../routing/types";
import { useThemeAccent } from "./useThemeAccent";
import "./Shell.css";

const SEARCH_DEBOUNCE_MS = 250;

export interface ShellProps {
  /**
   * Accepted for compatibility with the app shell wiring, but no longer
   * rendered — the design does not include a build stamp in the header.
   */
  buildTimestamp?: string;
  /** See `buildTimestamp` — accepted but not rendered. */
  sourceCommitRef?: string;
  /** The palette overlay is owned elsewhere; the shell only triggers it. */
  onOpenPalette: () => void;
  children?: ReactNode;
}

export function Shell({ onOpenPalette, children }: ShellProps) {
  const { route, navigate } = useRouter();
  const { theme, setTheme } = useThemeAccent();

  const currentQuery = route.view === "search" ? route.search.query ?? "" : "";
  const [text, setText] = useState(currentQuery);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const topFocusRef = useRef<HTMLSpanElement | null>(null);

  // Keep the input's displayed text in sync with the URL when the query
  // changes for a reason other than typing here (e.g. a facet reset, or a
  // navigation away from search). The URL remains the single source of truth
  // for the *committed* query; this is only the input's own transient buffer.
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

  const handleSearchChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const value = event.target.value;
      setText(value);
      scheduleCommit(value);
    },
    [scheduleCommit],
  );

  const handleSearchKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key !== "Enter") return;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      // Read the live DOM value rather than the `text` state to avoid acting
      // on a stale closure when a change event and the Enter keydown land in
      // the same tick.
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

  const handleBrandClick = useCallback(
    (event: React.MouseEvent<HTMLAnchorElement>) => {
      event.preventDefault();
      navigate({ view: "home" });
      window.scrollTo(0, 0);
      topFocusRef.current?.focus();
    },
    [navigate],
  );

  return (
    <>
      <span ref={topFocusRef} tabIndex={-1} className="shell-visually-hidden" />
      <header className="shell-header">
        <div className="shell-brand-cluster">
          <a
            className="shell-brand"
            href={buildRouteHref({ view: "home" })}
            onClick={handleBrandClick}
          >
            <span className="shell-brand-glyph" aria-hidden="true">◆</span>
            <span className="shell-brand-text">{t("shell.brand")}</span>
          </a>
          <span className="shell-brand-chip" aria-hidden="true">{t("shell.brandChip")}</span>
        </div>

        <div className="shell-search">
          <span className="shell-search-glyph" aria-hidden="true">⌕</span>
          <input
            ref={inputRef}
            type="text"
            role="searchbox"
            aria-label={t("shell.searchPlaceholder")}
            placeholder={t("shell.searchPlaceholder")}
            value={text}
            onChange={handleSearchChange}
            onKeyDown={handleSearchKeyDown}
          />
          {text.length > 0 && (
            <button
              type="button"
              className="shell-search-clear"
              onClick={handleClear}
              aria-label={t("shell.searchClear")}
            >
              ×
            </button>
          )}
        </div>

        <div className="shell-actions">
          <button
            type="button"
            className="shell-icon-button shell-icon-button--mono"
            onClick={onOpenPalette}
            aria-label={t("shell.paletteTrigger")}
          >
            ⌘K
          </button>

          <button
            type="button"
            className="shell-icon-button shell-icon-button--square"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            aria-label={theme === "dark" ? t("shell.themeToggle.toLight") : t("shell.themeToggle.toDark")}
            aria-pressed={theme === "dark"}
          >
            {theme === "dark" ? "🌙" : "☀️"}
          </button>

          <a
            className="shell-repo-link"
            href="https://github.com/burnjohn/ai-demo-marketplace"
            target="_blank"
            rel="noopener noreferrer"
            aria-label={t("shell.repoLink.label")}
          >
            GitHub ↗
          </a>
        </div>
      </header>

      {children}
    </>
  );
}
