/**
 * Locale-aware `Intl` formatters. Every date and count that reaches the UI
 * must flow through these helpers, so a locale switch takes effect without
 * touching any calling code.
 *
 * Dates and counts are formatted through these helpers exclusively — never with a
 * hand-rolled pattern (`toLocaleDateString()` with a fixed format string, manual
 * `+ " " + plural`, etc.). Switching `getLocale()` changes rendering with no other
 * code change, because every formatter reads the active locale on each call rather
 * than caching an `Intl` instance keyed to a locale chosen at import time.
 */

let activeLocale = "en";

/** Returns the locale currently used by every formatter in this module. */
export function getLocale(): string {
  return activeLocale;
}

/** Sets the locale used by every formatter in this module from this call onward. */
export function setLocale(locale: string): void {
  activeLocale = locale;
}

/** Formats an ISO-8601 date string (or Date) using the active locale. */
export function formatDate(value: string | Date): string {
  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat(activeLocale, {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

/** Formats a plain number using the active locale (grouping, digits, etc.). */
export function formatNumber(value: number): string {
  return new Intl.NumberFormat(activeLocale).format(value);
}

/**
 * Formats a count together with its unit noun, pluralised via `Intl.PluralRules`
 * for the active locale. `singular`/`plural` cover English's two categories; a
 * locale with more categories (e.g. "few", "many") can be added by passing `forms`
 * instead.
 */
export function formatCount(
  count: number,
  singular: string,
  plural: string,
  forms?: Partial<Record<Intl.LDMLPluralRule, string>>,
): string {
  const rules = new Intl.PluralRules(activeLocale);
  const category = rules.select(count);
  const noun =
    forms?.[category] ?? (category === "one" ? singular : plural);
  return `${formatNumber(count)} ${noun}`;
}
