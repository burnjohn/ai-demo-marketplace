/**
 * Typed accessor for the central message catalogue.
 *
 * Usage:
 *   import { t } from "../i18n";
 *   t("shell.brand");                              // static message
 *   t("search.resultCount", { count: 12 });         // parameterised message
 *
 * Referencing a key that doesn't exist in the catalogue is a TypeScript compile
 * error (`MessageKey` is a closed union derived from `messages`). Passing the wrong
 * parameter shape — or omitting required parameters — is also a compile error,
 * because each parameterised message's own function signature is used to type its
 * argument.
 */

import { messages, type MessageCatalogue, type MessageKey } from "./messages";

export type { MessageKey, MessageCatalogue };
export { setLocale, getLocale, formatDate, formatNumber, formatCount } from "./format";

/** Extracts the parameter tuple a given key requires (empty tuple for static copy). */
type MessageArgs<K extends MessageKey> = MessageCatalogue[K] extends (
  params: infer P,
) => string
  ? [params: P]
  : [];

/**
 * Resolves a message by key. Static messages take no second argument; parameterised
 * messages require their exact parameter object as the second argument.
 */
export function t<K extends MessageKey>(
  key: K,
  ...args: MessageArgs<K>
): string {
  const entry = messages[key] as string | ((params: unknown) => string);
  if (typeof entry === "function") {
    return entry(args[0]);
  }
  return entry;
}

/**
 * Swappable reference to the active catalogue, used by tests to prove that
 * replacing the catalogue wholesale changes every rendered string — the
 * localisation contract this module is built around. Product code should
 * not use this — it exists for test injection only.
 */
export function resolveFrom<C extends Record<string, string | ((params: any) => string)>>(
  catalogue: C,
  key: keyof C,
  params?: unknown,
): string {
  const entry = catalogue[key];
  if (typeof entry === "function") {
    return (entry as (params: any) => string)(params);
  }
  return entry as string;
}
