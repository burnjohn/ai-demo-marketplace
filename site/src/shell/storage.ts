/**
 * localStorage keys and values for theme/accent persistence.
 *
 * These MUST match the pre-paint script in `site/index.html` exactly — that
 * script reads the same keys and applies the same attribute values to
 * `document.documentElement` before first paint. If this file and the
 * pre-paint script ever disagree, the "no flash on load" guarantee breaks.
 */

export const THEME_STORAGE_KEY = "ai-demo-marketplace:theme";
export const ACCENT_STORAGE_KEY = "ai-demo-marketplace:accent";

export type Theme = "dark" | "light";
export type Accent = "default" | "green" | "violet" | "amber";

export const ACCENTS: readonly Accent[] = ["default", "green", "violet", "amber"];

export function readStoredTheme(): Theme | null {
  try {
    const value = window.localStorage.getItem(THEME_STORAGE_KEY);
    return value === "dark" || value === "light" ? value : null;
  } catch {
    return null;
  }
}

export function writeStoredTheme(theme: Theme): void {
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Storage may be unavailable (private mode, quota) — theme still applies
    // for this session via the DOM attribute.
  }
}

export function readStoredAccent(): Accent | null {
  try {
    const value = window.localStorage.getItem(ACCENT_STORAGE_KEY);
    return (ACCENTS as readonly string[]).includes(value ?? "") ? (value as Accent) : null;
  } catch {
    return null;
  }
}

export function writeStoredAccent(accent: Accent): void {
  try {
    window.localStorage.setItem(ACCENT_STORAGE_KEY, accent);
  } catch {
    // See readStoredTheme — non-fatal.
  }
}

export function prefersLightScheme(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
  return window.matchMedia("(prefers-color-scheme: light)").matches;
}
