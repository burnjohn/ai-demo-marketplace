/**
 * Owns the theme (dark/light) and accent (default/green/violet/amber) that the
 * pre-paint script in `index.html` already applied to `document.documentElement`
 * before this hook ever runs. This hook:
 *  - reads its *initial* state from the DOM attributes the pre-paint script set,
 *    so React and the pre-paint script never disagree.
 *  - follows the OS colour-scheme preference, and keeps tracking subsequent
 *    changes to it, for as long as no explicit theme choice is stored.
 *  - persists an explicit choice to `localStorage` under the same keys the
 *    pre-paint script reads, so a stored choice survives a remount and a future
 *    OS change.
 */

import { useCallback, useEffect, useState } from "react";
import {
  type Accent,
  type Theme,
  prefersLightScheme,
  readStoredAccent,
  readStoredTheme,
  writeStoredAccent,
  writeStoredTheme,
} from "./storage";

function applyTheme(theme: Theme): void {
  document.documentElement.setAttribute("data-theme", theme);
}

function applyAccent(accent: Accent): void {
  document.documentElement.setAttribute("data-accent", accent);
}

function initialTheme(): Theme {
  const attr = document.documentElement.getAttribute("data-theme");
  return attr === "light" ? "light" : "dark";
}

function initialAccent(): Accent {
  const attr = document.documentElement.getAttribute("data-accent");
  return attr === "green" || attr === "violet" || attr === "amber" ? attr : "default";
}

export interface ThemeAccentApi {
  theme: Theme;
  accent: Accent;
  setTheme: (theme: Theme) => void;
  setAccent: (accent: Accent) => void;
}

export function useThemeAccent(): ThemeAccentApi {
  const [theme, setThemeState] = useState<Theme>(initialTheme);
  const [accent, setAccentState] = useState<Accent>(initialAccent);

  // Track the OS preference only while no explicit choice is stored.
  useEffect(() => {
    if (readStoredTheme() !== null) return;
    if (typeof window.matchMedia !== "function") return;

    const mediaQuery = window.matchMedia("(prefers-color-scheme: light)");
    const onChange = () => {
      if (readStoredTheme() !== null) return;
      const next: Theme = mediaQuery.matches ? "light" : "dark";
      setThemeState(next);
      applyTheme(next);
    };

    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", onChange);
      return () => mediaQuery.removeEventListener("change", onChange);
    }
    // Older API shape (still used by some jsdom/test stubs).
    mediaQuery.addListener?.(onChange);
    return () => mediaQuery.removeListener?.(onChange);
  }, []);

  const setTheme = useCallback((next: Theme) => {
    writeStoredTheme(next);
    setThemeState(next);
    applyTheme(next);
  }, []);

  const setAccent = useCallback((next: Accent) => {
    writeStoredAccent(next);
    setAccentState(next);
    applyAccent(next);
  }, []);

  return { theme, accent, setTheme, setAccent };
}

/** Convenience export for tests/consumers that need the "is explicit" question directly. */
export function hasExplicitTheme(): boolean {
  return readStoredTheme() !== null;
}

export function hasExplicitAccent(): boolean {
  return readStoredAccent() !== null;
}

export { prefersLightScheme };
