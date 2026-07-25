# Insights

Non-obvious discoveries from real sessions. Specific and actionable — pass the cold-read test.
Written by the `engineering-insights` skill (`.claude/skills/engineering-insights/SKILL.md`). Append-only.

---

## What Works

## What Doesn't Work

## Codebase Patterns

- **`ResultCard`'s two-Tab-stop budget (AC-46) allows only the Open link + Copy button.**
  The designer mockup (`site/design-ref/03-search.html`) draws both a clickable title AND an
  accent-filled "Open" button in the card footer. Adding both makes three focusables per card
  and blows up the AC-46 `2N` Tab-press ceiling (`site/src/components/__tests__/ResultCard.test.tsx`
  asserts 12 stops across 6 cards). Resolution: the title is a plain `<h3>` (clickable via the
  card-level `onClick`/`onKeyDown` delegation that already routes non-anchor clicks to
  `router.navigate()`), and the Open control is the sole real `<a>` — its accessible name is
  `"Open ‹displayName›"` via `aria-label`, so screen readers still hear the target.
  ref: site/src/components/ResultCard.tsx:110

- **Hash-route shapes are fixed by T4 — consume verbatim.** Routes: `#/` (home), `#/search[?q=&kind=&keyword=&author=&sort=]`,
  `#/plugin/<id>`, `#/artifact/<id>`, `#/whats-new`, `#/getting-started`. Query params: `q` (single), `kind` (repeatable),
  `keyword` (repeatable), `author` (single), `sort` (one of `relevance`|`name`|`recently-updated`). Build hrefs via
  `buildRouteHref()`/`encodeRouteHash()` from `site/src/routing/paths.ts` — never string-concatenate `import.meta.env.BASE_URL`.
  ref: site/src/routing/paths.ts:35

## Tool & Library Notes

- `parseRoute()` (`site/src/routing/codec.ts`) puts the **leading slash** back on `attempted` for not-found results
  (e.g. `"/plugin"`, not `"plugin"`) — it echoes the split `path`, not the bare segment. Match on that shape in any
  code that renders `NotFoundReason`/`attempted`. ref: site/src/routing/codec.ts:29
- **jsdom fires `popstate` for any new fragment entry, not just Back/Forward.** `node_modules/jsdom/lib/jsdom/living/window/SessionHistory.js:144`
  (jsdom's own caveat at line 87: "Not spec compliant, just minimal.") — a plain `location.hash = '...'` assignment
  in a jsdom test can trigger `popstate` even though real browsers only fire `hashchange` for that case. A test that
  asserts `hashchange`-only behaviour must dispatch `hashchange` itself and must not lean on jsdom's `popstate` to
  "prove" it — 149 tests passed once over a router that had no `hashchange` listener at all because jsdom's
  non-compliant `popstate` silently covered for it. ref: site/src/routing/router.tsx:119
- **`RouterProvider`'s history-entry key must be repaired via `replaceState`, never re-minted, on a state-less entry.**
  A plain `<a href="#/...">` click, an address-bar edit, or an external deep link produces a fresh history entry with
  `history.state === null`. Minting a fresh random key for it (rather than writing one back with `replaceState`)
  silently orphans that entry's scroll offset on the next Back/Forward into it. ref: site/src/routing/router.tsx:97

## Tool & Library Notes

## Recurring Errors & Fixes

## Session Notes

## Open Questions
