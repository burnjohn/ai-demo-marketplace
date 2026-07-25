# site — AI Demo Marketplace catalog site

A static Vite + React + TypeScript single-page app that catalogs every plugin, skill, agent, command,
hook and MCP server in this repository, and deploys to GitHub Pages. It is the implementation of
[`specs/2026-07-25-catalog-site-mvp.md`](./specs/2026-07-25-catalog-site-mvp.md) — see that spec for the
full requirements and acceptance criteria, and [`docs/plans/catalog-site-mvp.md`](../docs/plans/catalog-site-mvp.md)
for how the work was broken into tasks. This README covers only how to run, test and build it.

## Local development

```bash
cd site
npm ci                # install with the locked versions (use this over `npm install` in CI/clean clones)
npm run dev            # http://localhost:5173, hot reload
npm run typecheck       # tsc --noEmit
npm run test:run        # vitest, single run (use `npm test` for watch mode)
npm run prebuild        # regenerates site/public/catalog-index.json from the repo (see below); runs automatically before `npm run build`
npm run build           # tsc --noEmit && vite build → site/dist (runs prebuild first via the `prebuild` npm lifecycle hook)
npm run preview         # serve the production build from site/dist
```

### Budget gates

Two standalone scripts enforce the non-functional budgets from the spec (AC-96, AC-103):

```bash
node scripts/check-contrast.mjs
# Parses src/styles/tokens.css, converts every oklch() value via `culori`, and asserts 4.5:1 for
# text-on-background and 3:1 for borders and the focus ring, across all 8 theme × accent combinations.
# Currently exits 0.

npm run build && node scripts/check-bundle-size.mjs
# Run after a build: gzips dist/assets/*.js (excluding the lazily-loaded markdown-* chunk) against the
# 180 KB entry budget, and dist/catalog-index.json against the 512 KB index budget.
# Currently passes: entry chunk ≈61.8 KB gzipped, catalog index ≈10.7 KB gzipped.
```

The remaining two budgets from the spec are exercised inside the regular test suite (`npm run
test:run`), not as standalone scripts:

- **Search interaction ≤ 100 ms at 2 000 entities** (AC-104) and the reduced-motion contract (AC-98) are
  covered by `src/__tests__/budgets.test.ts`.
- **Cold-load LCP/CLS** (AC-102) is measured with Lighthouse against the deployed site, not locally.

Two further gates also run inside `npm run test:run`:

- `src/__tests__/a11y.test.tsx` — runs `axe` over every view state (AC-96, AC-97, AC-99, AC-100).
- `src/__tests__/responsive.test.tsx` — asserts the ≥320 px single-column CSS contract (AC-101).

With these, `npm run test:run` currently reports **149 tests across 24 files**.

## Deploy (GitHub Pages)

`.github/workflows/pages.yml` builds and deploys on push to `main` (and via manual `workflow_dispatch`).
The workflow checks out with `fetch-depth: 0` — the catalog index generator (below) derives release
dates from git history, and a shallow clone would leave most plugins dateless.

One-time repo setup: **Settings → Pages → Build and deployment → Source: GitHub Actions**.

The published URL is `https://burnjohn.github.io/ai-demo-marketplace/` — hence `base:
'/ai-demo-marketplace/'` in `vite.config.ts`.

## Routing scheme

The app uses **hash-based routing** (`#/...`), not the History API:

- `#/` — home
- `#/search?q=&kind=&keyword=&author=&sort=` — search/browse, with filters and sort in the query string
- `#/plugin/<id>` — plugin detail
- `#/artifact/<id>` — artifact detail
- `#/whats-new` — reverse-chronological release feed
- `#/getting-started` — onboarding page with copyable commands

Why hash routing: this is a static site on GitHub Pages, which serves files directly from the repo and
has no server-side rewrite rule to send an unknown path (e.g. `/plugin/foo`) to `index.html`. With
History-API routing, a hard refresh or a shared deep link to anything but `/` would hit GitHub's own
404 page. Because the part after `#` is never sent to the server, every route — including deep links —
always resolves to `index.html` and lets the app's own router take over from there. See
`src/routing/` (`router.tsx`, `codec.ts`, `paths.ts`, `types.ts`) for the implementation, and AC-92/AC-93
in the spec for the corresponding acceptance criteria.

## Catalog index contract

The site has no backend: everything it renders comes from one generated JSON asset.

- **Generator:** `scripts/build-index.mjs` (plus its helpers in `scripts/lib/`) reads
  `.claude-plugin/marketplace.json` and every `plugins/<name>/` tree from the repository root.
- **Output:** `public/catalog-index.json`, matching the `CatalogIndex` shape in `src/catalog/types.ts`.
- **When it runs:** at build time only, via the `prebuild` npm script (wired into `npm run build`
  through npm's lifecycle hooks). It is never regenerated at runtime.
- **How the app consumes it:** fetched once at startup over HTTP (`src/catalog/loadIndex.ts`), relative
  to `import.meta.env.BASE_URL`, and held in `src/app/CatalogIndexContext.tsx` for the lifetime of the
  session.
- **Failure contract:**
  - An **unparseable plugin manifest** or a **duplicate plugin/artifact identifier** fails the build
    (non-zero exit, error naming the offending plugin) — the site must never publish with silently
    dropped or colliding entries.
  - A **missing README, CHANGELOG, or version** does **not** fail the build — each renders a defined
    placeholder state at runtime instead (a contribution placeholder, an absent release-feed entry, and
    a neutral version badge, respectively).
- **Dates:** release dates shown in `#/whats-new` and on plugin/artifact detail pages are derived from
  git history (`scripts/lib/git.mjs`), not from manifest fields. This is why CI must check out with
  `fetch-depth: 0` (see Deploy, above) — a shallow clone has no history to derive dates from, and an
  entry with no derivable date renders dateless rather than failing.

## Theming model

Two independent axes are applied as attributes on `document.documentElement`:

- `data-theme` ∈ `{dark, light}`
- `data-accent` ∈ `{default, green, violet, amber}`

Both are persisted in `localStorage` under `ai-demo-marketplace:theme` and `ai-demo-marketplace:accent`
(see `src/shell/storage.ts` for the read/write helpers and the exact allowed values).

Because React only sets DOM attributes after it mounts, applying the theme from a React effect would
cause a visible flash of the wrong theme/accent on every load. To avoid that, `index.html` inlines a
small pre-paint `<script>` that reads the same two `localStorage` keys and sets the same two attributes
on `<html>` **before** the stylesheet paints anything. `src/shell/storage.ts` and that inline script
must stay in exact agreement on keys and values — a comment in both files calls this out — otherwise
the "no flash of wrong theme" guarantee (AC-18) breaks silently.

## Source layout (`site/src/`)

| Directory | Contents |
| --- | --- |
| `catalog/` | Types, loading, search and faceting over the generated catalog index (`loadIndex.ts`, `search.ts`, `facets.ts`, `types.ts`, `validate.ts`) |
| `routing/` | Hash router: route table, path builders, query-string codec (`router.tsx`, `paths.ts`, `codec.ts`, `types.ts`) |
| `styles/` | Global CSS: design tokens, reset, base styles, fonts, motion (`tokens.css`, `reset.css`, `base.css`, `fonts.css`, `motion.css`) |
| `i18n/` | Message catalog and formatting helpers (`messages.ts`, `format.ts`) |
| `shell/` | App chrome: header/layout shell, theme/accent persistence and the `useThemeAccent` hook |
| `components/` | Shared presentational components (`ResultCard`, `KindBadge`, `VersionBadge`, `MarkdownContent`, `EmptyState`, `ErrorState`, `Skeleton`) |
| `ui/` | Smaller shared UI primitives (`ui/toast`, `ui/copy`) |
| `palette/` | The keyboard command palette (`CommandPalette.tsx`) |
| `views/` | One folder per route surface: `home`, `search`, `plugin`, `artifact`, `whats-new`, `getting-started` |
| `app/` | App shell wiring: catalog index context, top-level route view, error boundary, not-found view, announcer for live regions |

For the full requirements behind any of the above, read the spec
(`site/specs/2026-07-25-catalog-site-mvp.md`) rather than this README — this file documents how to run
things, not what they must do.
