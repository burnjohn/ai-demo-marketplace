# Implementation Plan: AI Demo Marketplace catalog site — full MVP

## Overview

Replace the Hello-World placeholder in `site/` with the complete catalog experience specified in
`site/specs/2026-07-25-catalog-site-mvp.md`: seven surfaces (home, search, plugin detail, artifact detail, what's new,
getting started, command palette) over a catalog index generated at build time from this repository's own manifest and
`plugins/<name>/` trees. The site stays a fully static Vite + React 18 SPA published to GitHub Pages, with no backend
and no runtime third-party requests.

## Execution mode

**multi-agent (parallel) — hard cap of 3 concurrent implementers.** Chosen by the user. Every phase below dispatches
**at most three tasks at a time**, and each concurrent trio has strictly non-overlapping `Owned paths` because all
implementers work the same branch with no worktree isolation. Contracts (types, tokens, routing) are front-loaded so
the wide phases can run without cross-task coupling. The task list is fixed and enumerated — no dynamic fan-out.

## Requirements (verified)

The requirements are the 116 EARS criteria `AC-1 … AC-116` of `SPEC-2026-07-25-catalog-site-mvp`, grouped as:

| Group | Criteria | Substance |
|---|---|---|
| A | AC-1 – AC-12 | build-time catalog index: generation, validation failures, tolerated gaps, stamp, payload budget, load/error/loading states |
| B | AC-13 – AC-22 | app shell and sticky header: brand, search input, palette trigger, theme toggle, accent switcher, repo link |
| C | AC-23 – AC-32 | home view: hero, keyword chips, per-kind counters, releases preview, browse-by-kind, empty-catalog state |
| D | AC-33 – AC-49 | search view: ranking, sort, kind/keyword/author facets with counts, reset, zero-results, result cards |
| E | AC-50 – AC-61 | plugin detail: metadata, back behaviour, artifact composition, dependencies, README, changelog |
| F | AC-62 – AC-67 | artifact detail: breadcrumb, invocation, tools, owning-plugin install command, documentation body |
| G | AC-68 – AC-72 | what's-new release feed |
| H | AC-73 – AC-75 | getting-started steps generated from catalog identity |
| I | AC-76 – AC-79 | copy-to-clipboard, label transition, toast, live-region announcement, failure path |
| J | AC-80 – AC-87 | command palette: shortcut, focus trap, ranking, arrow/Enter/Escape, empty states |
| K | AC-88 – AC-95 | routing, deep links, history, not-found, focus and title on navigation |
| NF | AC-96 – AC-110 | a11y (WCAG 2.1 AA), responsive ≥320 px, LCP ≤ 2.5 s / CLS ≤ 0.1, entry JS ≤ 180 KB gz, ≤ 100 ms interaction at 2 000 entities, no-JS degradation, privacy, testability, freshness |
| L | AC-111 – AC-116 | untrusted contributor markdown/metadata and URL state; English-only shipped copy |

Full traceability is in *AC coverage map* at the end of this plan. Requirements marked
**"assumed default — confirm"** below rest on unconfirmed answers to the spec's own open questions.

## Open questions & recommendations

All seven are planned with a default so no task blocks. Each is **assumed default — confirm**.

- Q: Compatibility badge, when no plugin declares one → **default: omit the badge entirely** (AC-60 already allows
  this). Do not invent `COMPATIBILITY.md`.
- Q: Plugin "updated" and release-feed dates, when CHANGELOG headings carry no dates → **default: derive from git
  history at build time** — last commit touching `plugins/<name>/` for the plugin stamp, and for a changelog entry the
  commit that introduced its heading; fall back to absent (AC-58, AC-59) when git data is unavailable (e.g. a shallow
  clone).
- Q: `displayName`, which no plugin declares → **default: humanise the kebab-case `name`** (`sdd-workflow` →
  "SDD Workflow"), honouring an explicit `displayName` if one ever appears.
- Q: Public brand identity → **default: "AI Demo Marketplace", repository `burnjohn/ai-demo-marketplace`**, taken from
  the manifest at build time (AC-74). The mockup's `dev-digest` label is ignored.
- Q: Accent switcher → **default: ships as a user-facing control in the header** (AC-20 assumes it), even though the
  mockup exposes no visible control for it.
- Q: Webfont → **default: self-host IBM Plex Sans and IBM Plex Mono** via `@fontsource/*`, subset to latin, so AC-106's
  zero-third-party-request rule holds. The mockup's Google Fonts CDN link is dropped.
- Q: URL shape → **default: hash-based routes** (`/ai-demo-marketplace/#/plugin/<id>`), see *Rec* below.

**Recommendations**

- Rec: **Hash routing, not history routing.** AC-93 requires arbitrary deep links to resolve on hosting that cannot
  rewrite unknown paths. GitHub Pages has no rewrite rule; the usual workaround (a `404.html` copy of the shell) costs
  a real 404 status, breaks caching semantics, and loses the original path on some crawlers. A hash route always
  resolves `index.html` with zero configuration. Cost: less pretty URLs. This is a Phase-1 contract task (T4) so it is
  decided once and consumed everywhere.
- Rec: **Hand-rolled router and search, no libraries.** Six views and one ranking function do not justify
  `react-router` (~13 KB gz) or a search library. AC-103's 180 KB gz entry budget is easier to hold, and AC-34's exact
  ranking order is easier to satisfy directly than to coerce out of a generic scorer.
- Rec: **Code-split the markdown renderer.** `marked` + `dompurify` are needed only on the two detail views. Lazy-load
  them so they never enter the home view's entry chunk (AC-103).
- Rec: **Extend the Pages workflow trigger.** `.github/workflows/pages.yml` currently fires only on `site/**`, so a
  plugin change would never redeploy — AC-110 would fail on day one. Add `.claude-plugin/**` and `plugins/**` to the
  `paths` filter, and drop the temporary `02-demo-website-start` branch trigger (commit `868d668` labels it a trial).
- Rec: **Defer nothing from the spec, but land T19/T20 last.** Documentation and the measured-budget verification pass
  are cheap and are what makes the MVP defensible in the workshop demo.
- Rec: Consider adding `prettier` + `eslint` in a follow-up. Not planned here — it is out of the spec's scope and
  would touch every owned path, breaking parallelism.

## Affected modules & contracts

- **`site/`** — the only module with product code. Everything below lands here except the CI workflow.
- **`.github/workflows/`** — Pages workflow gains a test/typecheck gate and a wider `paths` trigger (AC-110).
- **Repository content** (`.claude-plugin/marketplace.json`, `plugins/**`) — **read-only input**. No task edits a
  plugin, a manifest, or the spec.
- **Contracts introduced** (all new files, no existing contract is edited):
  - `site/src/catalog/types.ts` — the catalog index contract of the spec's *Contracts* section (index root, Plugin,
    Artifact, ChangelogEntry, Dependency, InstallCommand).
  - `site/src/routing/types.ts` — the URL-state contract (view, entity id, query, kind/keyword/author filters, sort).
  - `site/src/styles/tokens.css` — the design-token layer (theme × accent CSS custom properties).
  - `site/src/i18n/messages.ts` — the single message catalogue (AC-107).

## Architecture changes

Target structure under `site/src/` — feature-first, with the four contracts at the root of their domains:

```
site/
  scripts/
    build-index.mjs            # T5  catalog index generator (prebuild)
    lib/                       # T5  generator internals (parse, validate, git dates, excerpts)
    check-contrast.mjs         # T18 theme × accent contrast matrix (AC-96)
    check-bundle-size.mjs      # T18 entry-chunk + index payload budgets (AC-103, AC-10)
  src/
    catalog/
      types.ts                 # T2  index contract
      fixtures/                # T2  synthetic indexes (empty, corrupt, incomplete, 2 000-entity)
      loadIndex.ts             # T7  fetch + parse + loading/error state
      search.ts                # T7  ranking (AC-34), sort (AC-35, AC-36)
      facets.ts                # T7  facet counts and availability (AC-40)
    routing/                   # T4  hash router, URL-state codec, history policy, not-found
    styles/                    # T3  tokens, reset, theme/accent, reduced motion, fonts
    i18n/                      # T6  message catalogue + Intl formatters
    shell/                     # T8  header, theme/accent persistence, build stamp
    components/                # T10 KindBadge, ResultCard, EmptyState, ErrorState, Skeleton, Markdown
    ui/
      copy/                    # T9  copy control
      toast/                   # T9  toast + polite live region
    palette/                   # T13 command palette overlay
    views/
      home/                    # T11
      search/                  # T12
      plugin/                  # T14
      artifact/                # T15
      whats-new/               # T16
      getting-started/         # T16
    app/                       # T17 route table, focus/title/scroll on navigation, error boundary
    App.tsx  main.tsx          # T17
```

State ownership: **the URL is the single source of truth for view state** (view, entity id, query, facets, sort) per
AC-88 – AC-95. Nothing duplicates it in React state. Device-persisted preferences (theme, accent) live in
`localStorage` and are applied before first paint (AC-18). The parsed catalog index is loaded once and passed down
through a single read-only context — no mutation, no server state library.

## Dependencies to add (T1 installs all of them, once)

Runtime: `marked` (markdown → HTML, lazy-loaded), `dompurify` (sanitisation for AC-111 – AC-113),
`@fontsource/ibm-plex-sans`, `@fontsource/ibm-plex-mono` (self-hosted fonts for AC-106).

Dev: `vitest`, `@vitest/coverage-v8`, `jsdom`, `@testing-library/react`, `@testing-library/user-event`,
`@testing-library/jest-dom`, `axe-core`, `vitest-axe` (AC-97, AC-99, AC-100), `culori` (oklch → sRGB for the AC-96
contrast script), `gray-matter` (skill/agent frontmatter in the generator), `rollup-plugin-visualizer` (AC-103
reporting), `@types/dompurify`.

Pin every version to what is current and compatible with **Vite 5 / React 18 / TypeScript 5.5**. Do not upgrade React
to 19 and do not introduce Next.js. T1 resolves the exact versions at install time and records them.

## Phased tasks

### Phase 0 — Toolchain foundation

*Single task; everything else depends on it.*

- **T1**
  - **Action:** Install every dependency listed above in one pass. Add `vitest.config.ts` (jsdom environment, globals
    off, setup file), `site/src/test/setup.ts` (`@testing-library/jest-dom`, `vitest-axe` matchers, `matchMedia` and
    `navigator.clipboard` stubs). Add npm scripts: `test`, `test:run`, `typecheck`, `prebuild` (runs the index
    generator), and keep `build` as `tsc --noEmit && vite build`. Extend `vite.config.ts` with the visualizer plugin
    behind an env flag and a manual chunk boundary for the markdown renderer. Update
    `.github/workflows/pages.yml`: add `.claude-plugin/**` and `plugins/**` to the `paths` filter, remove the
    `02-demo-website-start` branch trigger, and add a step running `npm run typecheck && npm run test:run` before the
    build. Do **not** write product code.
  - **Module:** site + CI
  - **Type:** core
  - **Skills to use:** `typescript-expert`, `frontend-architecture`
  - **Owned paths:** `site/package.json`, `site/package-lock.json`, `site/tsconfig.json`, `site/vite.config.ts`,
    `site/vitest.config.ts`, `site/src/test/setup.ts`, `.github/workflows/pages.yml`
  - **Depends-on:** none
  - **Risk:** low
  - **Known gotchas:** `site/src/insights/INSIGHTS.md` has no entries yet — nothing to fold in. `vite.config.ts`
    already sets `base: '/ai-demo-marketplace/'`; **do not remove it** or every asset URL breaks on Pages. The
    workflow caches on `site/package-lock.json`, so the lockfile must be committed.
  - **Acceptance:** satisfies AC-110 (trigger half). `cd site && npm ci && npm run typecheck && npm run test:run &&
    npm run build` all exit 0 on the untouched placeholder app; `git diff .github/workflows/pages.yml` shows the
    widened `paths` and the new gate step.

### Phase 1 — Contracts

*runs concurrently: **T2, T3, T4***

- **T2**
  - **Action:** Encode the spec's *Contracts* section as TypeScript types: index root, `Plugin`, `Artifact` (one shape
    for skill/agent/command/hook/mcp), `ChangelogEntry`, `Dependency`, `InstallCommand` with its `scope`. Optionality
    must mirror the spec exactly — optional means genuinely absent, never an empty string sentinel. Add a runtime
    shape validator used by the loader (T7) and by the generator's self-check (T5). Author synthetic fixtures:
    `full.ts` (every field populated), `incomplete.ts` (no README, no CHANGELOG, no version, no deps, no keywords),
    `empty.ts` (zero plugins), `corrupt.ts` (truncated/invalid), and `large.ts` (2 000 entities, generated
    deterministically) for the AC-104 budget test.
  - **Module:** site
  - **Type:** core
  - **Skills to use:** `typescript-expert`
  - **Owned paths:** `site/src/catalog/types.ts`, `site/src/catalog/validate.ts`,
    `site/src/catalog/fixtures/**`, `site/src/catalog/__tests__/validate.test.ts`
  - **Depends-on:** T1
  - **Risk:** low
  - **Known gotchas:** the current catalog declares no `displayName`, no `compatibility`, no dates and ships only
    skills and agents — the types must make all four optional rather than assuming the mockup's richer data.
  - **Acceptance:** satisfies AC-2, AC-6, AC-7, AC-8, AC-9, AC-10 (shape half). `npm run typecheck` passes;
    `npm run test:run -- validate` proves the validator accepts `full`/`incomplete`/`empty` and rejects `corrupt`;
    `large.ts` yields exactly 2 000 entities.

- **T3**
  - **Action:** Build the token and global-style layer from the mockup's CSS custom properties: `--bg`, `--bg-elev`,
    `--bg-elev2`, `--bg-hover`, `--border`, `--border-strong`, `--text`, `--text-dim`, `--text-faint`, `--accent`,
    `--accent-fg`, plus the six `--kind-*` colours, for `data-theme` ∈ {dark, light} × `data-accent` ∈ {default,
    green, violet, amber}. Add the reset, base typography, focus-visible ring (≥3:1), a `prefers-reduced-motion`
    block that disables every transition/animation/backdrop-filter, and the self-hosted font imports. Update
    `site/index.html`: `lang="en"`, a `<noscript>` block with a readable English message and a repository link, and an
    inline pre-paint script that reads the persisted theme/accent and sets the attributes before first paint (no
    flash). No React components in this task.
  - **Module:** site
  - **Type:** ui
  - **Skills to use:** `frontend-architecture`
  - **Owned paths:** `site/src/styles/**`, `site/index.html`, `site/src/styles.css` (fold the placeholder styles in or
    delete the file)
  - **Depends-on:** T1
  - **Risk:** medium
  - **Known gotchas:** the mockup's colours are `oklch()`; keep them as `oklch()` (baseline-supported) but the AC-96
    script in T18 must convert them — expose every token as a plain custom property, never computed inline. The
    mockup's Google Fonts `<link>` must **not** be copied (AC-106). `backdrop-filter: blur(12px)` on the header must
    sit behind the reduced-motion guard (AC-98).
  - **Acceptance:** satisfies AC-96 (token half), AC-98, AC-100 (colour tokens), AC-101 (base), AC-105, AC-106
    (fonts), AC-13 (sticky styling). A static probe page toggling `data-theme`/`data-accent` shows all eight
    combinations; with scripting disabled the served document shows the noscript message; a network trace of a cold
    load shows requests only to the site's own origin.

- **T4**
  - **Action:** Define and implement the URL-state contract and the router: hash routes for the six views plus
    not-found; a codec that serialises/parses the text query, multi-valued kind and keyword filters, the
    single-valued author filter and the sort order; a history policy that **replaces** on rapid query/facet changes
    and **pushes** on view changes (AC-90); Back/Forward restoration including scroll offset (AC-91); strict
    validation that discards unknown views, ids, kinds, keywords, authors and sort values (AC-92, AC-115); and a
    not-found result type carrying what was not found. Ship the URL codec's unit tests. No view components — this
    task delivers the routing primitive and its types only.
  - **Module:** site
  - **Type:** core
  - **Skills to use:** `typescript-expert`, `react-best-practices`
  - **Owned paths:** `site/src/routing/**`
  - **Depends-on:** T1
  - **Risk:** medium
  - **Known gotchas:** with `base: '/ai-demo-marketplace/'` the hash lives after the base path — never build a route
    URL by string-concatenating `base`; derive it from `import.meta.env.BASE_URL`. Scroll restoration must be
    explicit: browsers do not restore scroll for hash-only changes.
  - **Acceptance:** satisfies AC-88, AC-89, AC-90, AC-91, AC-92, AC-93, AC-115 (validation half).
    `npm run test:run -- routing` proves round-trip encode/decode for every view and filter combination, that unknown
    values are discarded, and that a markup payload in the query survives as literal text.

### Phase 2 — Data pipeline and pure logic

*runs concurrently: **T5, T6, T7***

- **T5**
  - **Action:** Implement the build-time catalog index generator run as `prebuild`. It reads
    `.claude-plugin/marketplace.json` and each `plugins/<name>/` tree — `.claude-plugin/plugin.json`, `README.md`,
    `CHANGELOG.md`, `skills/<name>/SKILL.md` frontmatter, `agents/*.md` frontmatter, `commands/**`, `hooks/hooks.json`
    — and emits one index asset conforming to T2's contract. It must: fail non-zero naming the plugin on a missing or
    unparseable plugin manifest (AC-3); fail naming both sources on a duplicate plugin or artifact identifier (AC-5);
    stay green and omit fields for a plugin with no README/CHANGELOG/version/keywords/dependencies/artifacts (AC-4);
    record per-dependency name, range and whether it resolves to a catalog-internal plugin (AC-7); compose a canonical
    install command and source URL for every entity (AC-8); derive the plugin stamp and changelog dates from git
    history, omitting them when unavailable (AC-58, AC-59); bound every documentation excerpt and search text so the
    compressed asset stays under 512 KB (AC-10, AC-114); and stamp the build instant plus the source commit (AC-6).
    Humanise `name` into a display name (AC-74's identity rules). Ship unit tests over temporary fixture trees for
    every failure and tolerated-gap path.
  - **Module:** site (build tooling)
  - **Type:** core
  - **Skills to use:** `typescript-expert`
  - **Owned paths:** `site/scripts/build-index.mjs`, `site/scripts/lib/**`, `site/scripts/__tests__/**`
  - **Depends-on:** T1, T2
  - **Risk:** high
  - **Known gotchas:** the generator runs from `site/` but reads the **repository root** — resolve paths upward, never
    from `process.cwd()`. `actions/checkout@v4` defaults to `fetch-depth: 1`, so `git log` returns nothing useful:
    either set `fetch-depth: 0` in the workflow or treat missing git data as an absent date (AC-59) — do both, prefer
    the former. A CHANGELOG heading in this repo carries **no date**, so the dateless path is the common case, not the
    exception. `plugins/README.md` is not a plugin; only walk names listed in the manifest.
  - **Acceptance:** satisfies AC-1, AC-2, AC-3, AC-4, AC-5, AC-6, AC-7, AC-8, AC-9, AC-10, AC-58, AC-59, AC-74,
    AC-114 (bounding half). `npm run prebuild` on the real repository emits an index whose plugin count equals the
    manifest's and whose artifact count equals a manual walk; `npm run test:run -- build-index` proves a corrupted
    manifest and a duplicated identifier both exit non-zero naming the offender, and that a README-less plugin keeps
    the build green.

- **T6**
  - **Action:** Create the single message catalogue: every user-facing string keyed by identifier, in English, with no
    string embedded in behavioural logic and no sentence assembled by concatenation around a value (parameterised
    messages only, including the pluralised result count). Add locale-aware `Intl` formatters for dates and counts.
    Export a typed accessor so a missing key is a compile error.
  - **Module:** site
  - **Type:** core
  - **Skills to use:** `typescript-expert`, `frontend-architecture`
  - **Owned paths:** `site/src/i18n/**`
  - **Depends-on:** T1
  - **Risk:** low
  - **Known gotchas:** the mockup's copy is Ukrainian — it is a wording/tone reference only; shipped copy is English
    (AC-116). Contributor-authored content (README, CHANGELOG, descriptions) is exempt and must not pass through the
    catalogue.
  - **Acceptance:** satisfies AC-107, AC-108, AC-116. `npm run test:run -- i18n` proves every key resolves, that a
    count message pluralises through one parameterised entry, and that swapping the catalogue changes every string;
    a repository grep finds no user-facing literal in `views/`, `shell/`, `components/` once those land.

- **T7**
  - **Action:** Implement index acquisition and all pure query logic. Loader: one fetch of the index asset, shape
    validation via T2, and three distinguishable outcomes — loading, loaded, failed (AC-11, AC-12), where failure is
    explicitly *not* an empty catalog and carries a retry. Search: token-AND matching across name, keywords,
    description and documentation excerpt, ranked name > keywords > description > excerpt (AC-34); sorts for
    relevance, name and recently-updated with recently-updated placing undated plugins last (AC-35, AC-59); an
    empty-query fallback to deterministic name order (AC-36). Facets: per-facet match counts and an availability flag
    under the current text query (AC-40). All pure functions, no React.
  - **Module:** site
  - **Type:** core
  - **Skills to use:** `typescript-expert`, `react-best-practices`
  - **Owned paths:** `site/src/catalog/loadIndex.ts`, `site/src/catalog/search.ts`, `site/src/catalog/facets.ts`,
    `site/src/catalog/__tests__/search.test.ts`, `site/src/catalog/__tests__/facets.test.ts`,
    `site/src/catalog/__tests__/loadIndex.test.ts`
  - **Depends-on:** T1, T2
  - **Risk:** medium
  - **Known gotchas:** the index URL must respect `import.meta.env.BASE_URL`. Ranking must be a stable sort or equal
    scores reorder between renders and AC-36's "deterministic across reloads" fails. Facets are counted **before**
    the facet filter is applied but **after** the text query (AC-40), or the sidebar reflows while typing.
  - **Acceptance:** satisfies AC-11, AC-12 (state model), AC-34, AC-35, AC-36, AC-40 (counts), AC-104.
    `npm run test:run -- catalog` proves: a two-token query returns only entities matching both; a name match outranks
    a body-only match; the result count is identical across all three sorts for the same query; a truncated index
    yields the failed state, distinct from the empty-catalog state; and a query plus a facet toggle over `large.ts`
    (2 000 entities) completes in under 100 ms.

### Phase 3 — Shell and shared UI

*runs concurrently: **T8, T9, T10***

- **T8**
  - **Action:** Build the application shell and sticky header: brand (click and keyboard → home, focus to the top of
    the document), the global search input (navigate to search on typing, preserve text, ≤250 ms debounce, Enter
    commits immediately, a clear control that appears only with text and returns focus to the input), the
    command-palette trigger, the theme toggle (dark/light, persisted, OS preference when unset and tracked
    thereafter), the accent switcher (four accents, persisted), the repository link (new isolated browsing context,
    accessible name states it opens externally), and the persistent build stamp reachable from every view. Every
    icon-only control carries an accessible name and its current state.
  - **Module:** site
  - **Type:** ui
  - **Skills to use:** `react-best-practices`, `frontend-architecture`, `react-testing-library`
  - **Owned paths:** `site/src/shell/**`
  - **Depends-on:** T1, T3, T4, T6
  - **Risk:** medium
  - **Known gotchas:** the pre-paint script in T3 already sets `data-theme`/`data-accent`; the toggle must read the
    same storage keys and write the same attribute values or the two disagree and AC-18's "no flash" breaks. Follow
    the OS preference only while no explicit choice is stored (AC-19) — an explicit choice must survive an OS change.
    Debounce must not swallow the Enter key (AC-16).
  - **Acceptance:** satisfies AC-6 (stamp display), AC-13 – AC-22. `npm run test:run -- shell` proves each control by
    role and accessible name, that typing debounces to one update per pause, that Enter bypasses the debounce, that
    toggling then remounting preserves the theme, and that the repo link carries `rel` isolating the opener.

- **T9**
  - **Action:** Build the copy control and the toast system. Copy: writes the exact displayed command text, swaps the
    control's label to a success label for ~2 s then restores it, and only one control may be in the success state at
    a time — starting a new copy resets the previous one. Failure: when the clipboard write is denied or unavailable,
    show a failure message, leave the command text selectable for manual copying, and never show the success label.
    Toast: transient, auto-dismissing, announced through a **polite** live region without moving focus.
  - **Module:** site
  - **Type:** ui
  - **Skills to use:** `react-best-practices`, `react-testing-library`
  - **Owned paths:** `site/src/ui/copy/**`, `site/src/ui/toast/**`
  - **Depends-on:** T1, T3, T6
  - **Risk:** medium
  - **Known gotchas:** `navigator.clipboard` is undefined in jsdom and absent on insecure origins — the failure path
    is the default, not an edge case. AC-79's single-success rule needs one shared owner of "which control
    succeeded", not per-control state. The toast animation must respect `prefers-reduced-motion` (AC-98).
  - **Acceptance:** satisfies AC-76, AC-77, AC-78, AC-79, AC-99 (live region). `npm run test:run -- copy` proves the
    clipboard receives the displayed text verbatim, the label reverts, focus stays on the control, a denied write
    shows the failure message with selectable text, and copying B resets A.

- **T10**
  - **Action:** Build the shared presentational primitives: `KindBadge` (kind conveyed by text label in addition to
    colour), version badge with the AC-9 neutral placeholder, `ResultCard` (kind, version, display name clamped to
    one line, description clamped to two, up to three keywords, owning-plugin/author meta line, a copy control and an
    open control — exactly two Tab stops per card, whole-card activation by click/Enter/Space, a perceptible
    non-colour-only hover and focus emphasis), `EmptyState`, `ErrorState` (message + retry + repository link),
    layout-reserving `Skeleton`, and `MarkdownContent` — a lazy-loaded sanitised markdown renderer that strips raw
    HTML, script, style, event-handler attributes and frames, allows only `http`/`https`/`mailto` links (external
    ones in an isolated new context), permits images only from the repository origin, and length-bounds text before
    layout.
  - **Module:** site
  - **Type:** ui
  - **Skills to use:** `react-best-practices`, `frontend-architecture`, `react-testing-library`
  - **Owned paths:** `site/src/components/**`
  - **Depends-on:** T1, T3, T4, T6
  - **Risk:** high
  - **Known gotchas:** a card that is itself activatable **and** contains two buttons is the classic nested-interactive
    a11y trap — make the title the single focusable link and delegate whole-card clicks to it, rather than adding
    `tabindex` to the card (AC-46). Sanitise **after** markdown conversion, not before, or `marked` re-introduces
    markup. `marked` and `dompurify` must be dynamically imported so they stay out of the entry chunk (AC-103).
  - **Acceptance:** satisfies AC-9 (placeholder), AC-12 (skeletons), AC-44, AC-46, AC-47, AC-48, AC-49, AC-100,
    AC-111, AC-112, AC-113, AC-114. `npm run test:run -- components` proves a README containing a script tag, an
    inline handler, an iframe and a `javascript:` link renders inert with nothing executed; a 50 000-character
    description renders truncated; a six-card grid takes twelve Tab stops; and an artificially long name leaves the
    grid geometry unchanged.

### Phase 4 — Discovery views

*runs concurrently: **T11, T12, T13***

- **T11**
  - **Action:** Build the home view: hero heading, description and search input (behaviourally identical to the header
    input), keyword shortcut chips derived from the catalog's most frequent keywords capped at seven and omitted
    entirely when the catalog declares none, per-kind counters showing exact counts (zero-count kinds stay visible,
    show 0, are non-activatable and announced unavailable), the browse-by-kind list, and the recent-releases preview
    (at most four entries, newest first, each navigating to its plugin; a "full feed" link to what's-new; the whole
    section omitted when no plugin has any changelog entry). When the catalog has zero plugins, replace the
    statistics, releases and browse sections with an empty-catalog state offering a route to getting-started and a
    link to the contribution guidelines, while keeping the hero and search visible.
  - **Module:** site
  - **Type:** ui
  - **Skills to use:** `react-best-practices`, `frontend-architecture`, `react-testing-library`
  - **Owned paths:** `site/src/views/home/**`
  - **Depends-on:** T1, T3, T4, T6, T7, T10
  - **Risk:** medium
  - **Known gotchas:** "omitted entirely" for the chip row and the releases section means no heading and **no empty
    gap** (AC-26, AC-32) — conditionally render the container, not just its children. A zero-count kind must be
    disabled, not hidden (AC-28), while a keyword-less catalog hides the chips completely — the two rules differ
    deliberately.
  - **Acceptance:** satisfies AC-23 – AC-32. `npm run test:run -- home` renders against `full`, `incomplete` and
    `empty` fixtures and proves: all six sections present on a populated catalog; a chip navigates to a search URL
    with exactly one keyword facet; a kind counter navigates to a kind-filtered search URL; a zero-count kind is
    disabled; the preview never exceeds four rows; the empty fixture renders the empty-catalog state with hero and
    search still visible.

- **T12**
  - **Action:** Build the search view: a heading reflecting the query (a neutral browse heading when empty), the
    match count, the sort control (relevance / name / recently-updated, with relevance disabled or name-ordered when
    the query is empty), the facet sidebar (kind facets toggle and union, keyword facets toggle and widen, a
    single-valued author facet that clears on re-activation, per-facet counts, impossible facets disabled rather than
    removed), a reset control that clears every filter and the query in one action and is disabled when nothing is
    active, an active-filter count, the result grid of `ResultCard`s, and a zero-results state with a working reset.
    At ≥320 px the layout is single-column with the facets in a collapsible disclosure and no horizontal scrolling.
  - **Module:** site
  - **Type:** ui
  - **Skills to use:** `react-best-practices`, `frontend-architecture`, `react-testing-library`
  - **Owned paths:** `site/src/views/search/**`
  - **Depends-on:** T1, T3, T4, T6, T7, T10
  - **Risk:** high
  - **Known gotchas:** all filter state comes from and goes to the URL (T4) — do not mirror it in local state or Back
    desynchronises (AC-91). Kind and keyword facets are **unions** (widen) while the author facet is
    **single-valued** (replaces) — three different semantics in one sidebar (AC-37, AC-38, AC-39). Facet toggles must
    use `replace`, not `push`, per AC-90.
  - **Acceptance:** satisfies AC-33, AC-37, AC-38, AC-39, AC-41, AC-42, AC-43, AC-45, AC-101 (disclosure).
    `npm run test:run -- search` proves: the count matches the card count; two kinds show the union; two keywords
    widen the set; the same author twice clears itself; an impossible facet is programmatically disabled and present;
    one reset empties everything and strips the URL parameters; a nonsense query shows the zero-results state; and
    keyboard activation of a card reaches the same view as a click.

- **T13**
  - **Action:** Build the command palette overlay: opens on the platform command/control key with K (preventing the
    browser default) and on the header trigger, with an empty query and focus in its input; traps keyboard focus,
    marks the rest of the page inert to assistive technology, and prevents background scroll; lists catalog entities
    capped at eight when the query is empty and re-ranks with AC-34's rules while ignoring the search view's active
    facets; Down/Up move a visible active selection with wrap-around keeping it scrolled into view; Enter navigates to
    the active item and closes; Escape, the backdrop, or the shortcut again close it and restore focus to the
    previously focused element; a no-results message with an inert Enter; and, when the catalog is empty or the index
    failed, an explanatory "nothing to search" message rather than an empty list.
  - **Module:** site
  - **Type:** ui
  - **Skills to use:** `react-best-practices`, `react-testing-library`, `frontend-architecture`
  - **Owned paths:** `site/src/palette/**`
  - **Depends-on:** T1, T3, T4, T6, T7
  - **Risk:** high
  - **Known gotchas:** the palette is an **overlay over any view, not a route** — it must not appear in the URL or in
    history. Detect the platform modifier from the event (`metaKey` vs `ctrlKey`), not from a user-agent string.
    Restoring focus on close requires capturing the previously focused element *before* the input takes focus.
  - **Acceptance:** satisfies AC-80 – AC-87. `npm run test:run -- palette` proves: the shortcut opens it from every
    view and the default is prevented; Tab cycles only within it; arrows wrap; Enter navigates and closes; Escape
    restores focus to the trigger; a nonsense query shows the message and Enter is inert; the empty fixture shows the
    "nothing to search" message.

### Phase 5 — Detail and content views

*runs concurrently: **T14, T15, T16***

- **T14**
  - **Action:** Build the plugin detail view: display name, version badge (or the AC-9 placeholder), description,
    author, last-updated stamp (omitted when not derivable), install command with a copy control, source link (new
    isolated context, pointing at the plugin's directory on the default branch), the artifacts grouped by kind in a
    stable order with each group labelled and counted and empty groups omitted, the dependency list (each showing name
    and requested range, navigable when it resolves inside the catalog and rendered non-navigable and marked external
    when it does not, section omitted when there are none), the rendered README (or a contribution placeholder linking
    to the guidelines), and the changelog newest-first with undated entries after dated ones and never an invalid date
    string. The compatibility badge is omitted while no plugin declares one. Back returns to the previously visited
    catalog view, or home when the view was reached by deep link.
  - **Module:** site
  - **Type:** ui
  - **Skills to use:** `react-best-practices`, `frontend-architecture`, `react-testing-library`
  - **Owned paths:** `site/src/views/plugin/**`
  - **Depends-on:** T1, T3, T4, T6, T7, T9, T10
  - **Risk:** medium
  - **Known gotchas:** "back to the previous catalog view, else home" cannot read `history.length` reliably — track
    in-session provenance explicitly through the router (T4). Undated changelog entries are the common case in this
    repository, so the dateless branch is the default rendering path (AC-58).
  - **Acceptance:** satisfies AC-50 – AC-61. `npm run test:run -- plugin` renders `full` and `incomplete` fixtures and
    proves: every region present for a populated plugin; a skills-only plugin shows exactly one group; an
    unresolvable dependency is not a link and is labelled external; a README-less plugin shows the placeholder with no
    layout break; an undated entry shows no date and never "Invalid Date"; a deep-linked view's back control reaches
    home.

- **T15**
  - **Action:** Build the artifact detail view: a catalog → owning plugin → artifact breadcrumb (the catalog segment
    restores the session's last query and filters, or the unfiltered browse state; the plugin segment opens that
    plugin), the kind badge, display name, description, the **owning plugin's** install command with a copy control
    plus explicit text stating that installing the plugin is what makes this artifact available, the invocation token
    rendered verbatim in monospace and copyable when declared (omitted otherwise), declared tools/permissions as
    discrete labelled items (section omitted when none), and the documentation body — or, when the artifact has none,
    a placeholder plus a link to its source in the repository.
  - **Module:** site
  - **Type:** ui
  - **Skills to use:** `react-best-practices`, `frontend-architecture`, `react-testing-library`
  - **Owned paths:** `site/src/views/artifact/**`
  - **Depends-on:** T1, T3, T4, T6, T7, T9, T10
  - **Risk:** medium
  - **Known gotchas:** the install command on this view is resolved through `owning plugin id` — never composed
    locally, or AC-66's "identical to the plugin page" fails. Hooks declare no invocation, so the omitted-invocation
    branch is exercised by real data (AC-64).
  - **Acceptance:** satisfies AC-62 – AC-67. `npm run test:run -- artifact` proves: all regions render for every kind;
    the copied text equals the owning plugin's; the explanatory sentence is present; a hook renders no invocation
    pill; an artifact with no tools shows no tools heading; a frontmatter-only artifact shows the placeholder plus a
    source link; and returning via the catalog breadcrumb from a filtered search restores those filters.

- **T16**
  - **Action:** Build the what's-new and getting-started views. What's-new: every changelog entry from every plugin,
    newest first, each showing plugin display name, version, date and summary; entries activatable by click, Enter or
    Space to reach the plugin view; a subscribe affordance opening the repository's releases/watch page in an isolated
    new context whose accessible name promises the repository rather than a feed file; an empty state with a route to
    getting-started when the catalog has no entries at all; a back-to-home control. Getting-started: an ordered
    sequence of numbered steps, each with a title, an explanation, a literal command and its own copy control, plus
    the note distinguishing updating the marketplace source from updating an installed plugin — with every command
    generated from the catalog's own identity (the manifest's marketplace name and a real plugin name from the index).
  - **Module:** site
  - **Type:** ui
  - **Skills to use:** `react-best-practices`, `frontend-architecture`, `react-testing-library`
  - **Owned paths:** `site/src/views/whats-new/**`, `site/src/views/getting-started/**`
  - **Depends-on:** T1, T3, T4, T6, T7, T9, T10
  - **Risk:** low
  - **Known gotchas:** no RSS document is generated (a spec non-goal), so the subscribe affordance's accessible name
    must not promise one (AC-70). Getting-started commands must be derived, not hard-coded, or AC-74's rename test
    fails.
  - **Acceptance:** satisfies AC-68 – AC-75. `npm run test:run -- whats-new getting-started` proves: the entry count
    equals the sum of all plugins' changelog entries; keyboard activation of a row reaches the plugin view; no
    request is made for a feed file; the empty fixture shows the empty state; every step exposes a number, title,
    command and its own copy control; copying step 2 places only step 2's command on the clipboard; and renaming the
    marketplace in a fixture changes the displayed commands.

### Phase 6 — Composition and budget gates

*runs concurrently: **T17, T18, T19***

- **T17**
  - **Action:** Compose the application: replace the placeholder `App.tsx`/`main.tsx`, wire the route table to the six
    views plus the not-found state, mount the shell, the palette overlay and the toast host, provide the loaded index
    through its read-only context with the loading / loaded / failed triad and a retry, and add an error boundary that
    renders the error state rather than a blank page. On every internal navigation: no full document reload, focus
    moves to the new view's main heading, the view change is announced to assistive technology, the document title is
    set to a value unique to that view and entity, and the scroll position is restored on Back/Forward.
  - **Module:** site
  - **Type:** ui
  - **Skills to use:** `react-best-practices`, `frontend-architecture`, `react-testing-library`
  - **Owned paths:** `site/src/App.tsx`, `site/src/main.tsx`, `site/src/app/**`
  - **Depends-on:** T8, T11, T12, T13, T14, T15, T16
  - **Risk:** medium
  - **Known gotchas:** moving focus to a heading requires a programmatically focusable target without adding it to the
    Tab order (`tabindex="-1"`), and the announcement needs a live region that is *not* re-created on every
    navigation or screen readers miss it (AC-94).
  - **Acceptance:** satisfies AC-11 (error surface), AC-94, AC-95, AC-105 (mount path), AC-91 (scroll).
    `npm run test:run -- app` proves: each of the six views has a distinct document title; navigating moves focus to
    the new main heading; search → detail → Back restores the same results and scroll offset; a truncated index
    renders the error state with a working retry; `npm run build` exits 0.

- **T18**
  - **Action:** Implement the measurable budget gates. `check-contrast.mjs`: parse the token layer, convert every
    `oklch()` value to sRGB, and assert every text/background and UI-boundary pair across the 2 themes × 4 accents
    meets 4.5:1 / 3:1, plus the focus ring at ≥3:1 — exit non-zero listing violations. `check-bundle-size.mjs`: after
    a production build, assert the entry chunk is ≤180 KB compressed excluding the index, and the index asset is
    ≤512 KB compressed. An axe-based automated a11y suite over every view in every state (populated, empty,
    zero-result, not-found, error) asserting zero violations, every icon-only control named, and every dynamic region
    announced. A reduced-motion assertion. A greyscale/colour-independence assertion that every kind, state and status
    carries a text label. A 320 px-width assertion of no horizontal scrolling. A performance test replaying a query
    and a facet toggle over the 2 000-entity fixture under 100 ms. Wire all of it into `npm run test:run` and the CI
    gate.
  - **Module:** site
  - **Type:** core + ui
  - **Skills to use:** `react-testing-library`, `typescript-expert`, `frontend-architecture`
  - **Owned paths:** `site/scripts/check-contrast.mjs`, `site/scripts/check-bundle-size.mjs`,
    `site/src/__tests__/a11y.test.tsx`, `site/src/__tests__/budgets.test.ts`,
    `site/src/__tests__/responsive.test.tsx`
  - **Depends-on:** T3, T7, T10, T17
  - **Risk:** high
  - **Known gotchas:** jsdom computes no layout, so the 320 px and clamping assertions verify the **applied CSS
    contract** (single-column rules, `overflow` handling, line-clamp declarations), not measured geometry — the
    measured check belongs to T20. axe cannot see contrast in jsdom either; that is exactly why the contrast matrix
    is a separate Node script over the token source.
  - **Acceptance:** satisfies AC-96, AC-97, AC-98, AC-99, AC-100, AC-101, AC-103, AC-104, AC-109, AC-10 (payload
    gate). `node scripts/check-contrast.mjs` exits 0 reporting zero violations across all eight theme × accent
    combinations; `npm run build && node scripts/check-bundle-size.mjs` exits 0 within both budgets;
    `npm run test:run` reports zero axe violations across all view states.

- **T19**
  - **Action:** Document the delivered site: update `site/README.md` with the local dev, test, index-generation and
    build commands, the routing scheme and why it is hash-based, the catalog index contract and where it comes from,
    the budget gates and how to run them, and the eight theme × accent combinations. Add a short section to
    `docs/PLUGIN-GUIDELINES.md` stating what a plugin must provide to appear well-formed in the catalog (manifest
    fields, README, dated CHANGELOG headings if dates are wanted) and what is optional, cross-referencing the spec.
  - **Module:** docs
  - **Type:** core
  - **Skills to use:** none
  - **Owned paths:** `site/README.md`, `docs/PLUGIN-GUIDELINES.md`
  - **Depends-on:** T5, T17
  - **Risk:** low
  - **Known gotchas:** do not restate the spec — link to it. Do not edit the spec (`site/specs/**` is read-only to
    every task in this plan).
  - **Acceptance:** no AC directly; supports AC-110's operability. Every command documented in `site/README.md` runs
    successfully when copy-pasted from a clean clone.

### Phase 7 — Measured verification

*Single task; runs after everything.*

- **T20**
  - **Action:** Run the measurements that only a real browser can produce, against a preview build and then the
    deployed Pages site: a Lighthouse mobile run asserting LCP ≤ 2.5 s and CLS ≤ 0.1 on the home view; a cold deep
    link to an artifact URL confirming it renders the artifact rather than the host's 404 page; a network trace of a
    full session confirming requests only to the site's own origin; a scripting-disabled load confirming the noscript
    message; a keyboard-only pass over every view; a 320 px-wide pass confirming no horizontal scrolling; and a
    build-stamp check after merging a plugin-only change. Record the results, and file any failure as a follow-up
    rather than silently loosening a budget.
  - **Module:** site
  - **Type:** e2e / verification
  - **Skills to use:** none
  - **Owned paths:** none (verification only; no file is edited)
  - **Depends-on:** T17, T18, T19
  - **Risk:** medium
  - **Known gotchas:** measure against `npm run preview` or the deployed site, never the dev server — dev has no
    minification and no compression, so every performance number is meaningless there. AC-110's stamp check needs an
    actual merge to the default branch.
  - **Acceptance:** satisfies AC-102, AC-93 (deployed), AC-105 (deployed), AC-106 (measured), AC-110 (measured).
    A recorded Lighthouse report meeting both thresholds, plus a written pass/fail line for each of the seven checks.

## Concurrency layout (3 implementers max)

| Phase | Tasks dispatched together | Barrier before next phase |
|---|---|---|
| 0 | T1 | T1 must land — every path below imports its toolchain |
| 1 | **T2, T3, T4** | contracts must be stable before consumers start |
| 2 | **T5, T6, T7** | data + logic + copy before any view |
| 3 | **T8, T9, T10** | shell + shared UI before the views |
| 4 | **T11, T12, T13** | none within phase; T17 needs both view phases |
| 5 | **T14, T15, T16** | all views must exist before composition |
| 6 | **T17, T18, T19** | T18 and T19 read T17's output; dispatch T17 first in the trio, or accept one re-run |
| 7 | T20 | — |

Dependency DAG (no cycles):

```
T1 ─┬─ T2 ─┬─ T5 ──────────────┬──────────────┬─ T19
    │       ├─ T7 ─┬───────────┤              │
    ├─ T3 ─┬───────┼─ T8 ──────┤              │
    │      ├───────┼─ T9  ─────┤              │
    │      └───────┼─ T10 ─────┤              │
    ├─ T4 ─────────┘           │              │
    └─ T6 ─────────────────────┤              │
                               ├─ T11 ─┐      │
                               ├─ T12 ─┤      │
                               ├─ T13 ─┼─ T17 ┼─ T18 ─┐
                               ├─ T14 ─┤      │       │
                               ├─ T15 ─┤      └───────┼─ T20
                               └─ T16 ─┘              │
                                                      │
                                     T18, T19 ────────┘
```

Note for the orchestrator: **T17 depends on all six view tasks**, so it cannot start until Phase 5 completes. In
Phase 6, dispatch T17 alone or first; T18 and T19 assert against its output.

## Testing strategy

Runner: **Vitest** with the **jsdom** environment and **React Testing Library**, added in T1. Queries go through
accessible role and name throughout (AC-109); a test identifier is permitted only where no accessible name can express
the element.

| Level | Scope | Command |
|---|---|---|
| Typecheck | whole site | `cd site && npm run typecheck` |
| Unit | index generator, URL codec, search/sort/facets, i18n catalogue, validator | `cd site && npm run test:run -- build-index routing catalog i18n validate` |
| Component | shell, copy/toast, shared components, all six views, palette, composition | `cd site && npm run test:run -- shell copy components home search palette plugin artifact whats-new getting-started app` |
| Automated a11y | every view in populated / empty / zero-result / not-found / error state | `cd site && npm run test:run -- a11y` |
| Budgets (static) | contrast matrix, bundle + index payload, 2 000-entity interaction | `cd site && node scripts/check-contrast.mjs && npm run build && node scripts/check-bundle-size.mjs && npm run test:run -- budgets` |
| Measured (manual, T20) | LCP/CLS, cold deep link on Pages, network trace, no-JS, keyboard pass, 320 px, build stamp | Lighthouse mobile + browser DevTools against `npm run preview` and the deployed site |
| CI gate | typecheck + full suite before the Pages build | `.github/workflows/pages.yml` (T1) |

Which ACs are verified where: AC-1 – AC-10, AC-34 – AC-36, AC-40, AC-58, AC-59, AC-74, AC-104, AC-107, AC-108,
AC-115 → unit. AC-11 – AC-99 behavioural surfaces, AC-100, AC-109, AC-111 – AC-114, AC-116 → component + a11y.
AC-10 payload, AC-96, AC-103, AC-104 → budget scripts. AC-93, AC-102, AC-105, AC-106, AC-110 → measured in T20.

## Risks & mitigations

- **The generator is the highest-risk task (T5).** It is the only thing reading outside `site/` and the only place a
  bad build breaks the deploy. → Ship it with fixture-tree unit tests for every failure path *in the same task*, and
  keep the failure contract narrow: fail only on an unparseable manifest or a duplicate id (AC-3, AC-5); tolerate
  every other gap (AC-4).
- **Shallow CI clone yields no git dates**, silently degrading every stamp to absent and quietly failing AC-110's
  observable. → Set `fetch-depth: 0` in the workflow (T1) *and* make the absent-date path correct (T5), so the
  feature degrades honestly if the setting is ever lost.
- **Contrast across 2 themes × 4 accents is 8 combinations no human will re-check by hand.** → T18 automates it as a
  script over the token source, so a token edit that breaks AC-96 fails the build.
- **The 180 KB gz entry budget (AC-103) is easy to blow** with a markdown renderer and a sanitiser. → Hand-rolled
  router and search, plus a mandatory dynamic import for `marked`/`dompurify` (T10), plus an automated size gate
  (T18) rather than a one-off measurement.
- **Parallel implementers on one branch can still collide through shared config.** → `site/package.json`,
  `site/vite.config.ts` and `site/tsconfig.json` are owned **exclusively by T1** and installed once up front; no
  later task may edit them. If a later task genuinely needs a new dependency, it must stop and report rather than
  edit the manifest.
- **jsdom cannot verify layout, contrast, or real performance.** → The plan does not pretend it can: those ACs are
  explicitly routed to the token script, the bundle script, or T20's measured pass.
- **Nested-interactive result cards are an a11y trap** that automated axe checks catch late. → The two-Tab-stop
  contract is specified in T10's acceptance with an explicit twelve-stops-for-six-cards assertion.
- **Seven "assumed default — confirm" answers.** → All seven are cheap to reverse: each is confined to one task
  (compatibility → T14, dates → T5, displayName → T5, brand → T5, accent → T3/T8, fonts → T3, URL shape → T4).

## Red-flags check

- [x] Every requirement maps to a task — all of AC-1 … AC-116 appear in the coverage map below; no id is unassigned.
- [x] No specification was authored or edited — `site/specs/**` is read-only to every task; the spec's own seven open
      questions are recorded here as "assumed default — confirm", not resolved in the spec.
- [x] Execution mode is recorded (multi-agent, max 3 concurrent) and every phase dispatches at most three tasks.
- [x] Dependencies form a DAG — see the diagram; every `Depends-on` points only to an earlier task, no cycles.
- [x] Concurrent tasks have non-overlapping `Owned paths` — verified per phase; shared config is owned solely by T1.
- [x] Every `Acceptance` is measurable — each cites `AC-N` ids plus a runnable command or an observable behaviour.
- [x] No edits to existing shared contracts — all four contracts are new files; no plugin, manifest, or spec is
      modified. The only pre-existing files edited are `.github/workflows/pages.yml`, `site/package.json`,
      `site/tsconfig.json`, `site/vite.config.ts`, `site/index.html`, `site/src/App.tsx`, `site/src/main.tsx`,
      `site/src/styles.css`, `site/README.md`, `docs/PLUGIN-GUIDELINES.md` — each owned by exactly one task.

## AC coverage map

| AC | Task(s) | AC | Task(s) |
|---|---|---|---|
| AC-1 | T5 | AC-59 | T5, T7, T14 |
| AC-2 | T2, T5 | AC-60 | T14 |
| AC-3 | T5 | AC-61 | T14 |
| AC-4 | T5 | AC-62 | T15 |
| AC-5 | T5 | AC-63 | T15 |
| AC-6 | T2, T5, T8 | AC-64 | T15 |
| AC-7 | T2, T5 | AC-65 | T15 |
| AC-8 | T2, T5 | AC-66 | T15 |
| AC-9 | T2, T5, T10 | AC-67 | T15 |
| AC-10 | T2, T5, T18 | AC-68 | T16 |
| AC-11 | T7, T17 | AC-69 | T16 |
| AC-12 | T7, T10 | AC-70 | T16 |
| AC-13 | T3, T8 | AC-71 | T16 |
| AC-14 | T8 | AC-72 | T16 |
| AC-15 | T8 | AC-73 | T16 |
| AC-16 | T8 | AC-74 | T5, T16 |
| AC-17 | T8 | AC-75 | T9, T16 |
| AC-18 | T3, T8 | AC-76 | T9 |
| AC-19 | T8 | AC-77 | T9 |
| AC-20 | T3, T8 | AC-78 | T9 |
| AC-21 | T8 | AC-79 | T9 |
| AC-22 | T8 | AC-80 | T13 |
| AC-23 | T11 | AC-81 | T13 |
| AC-24 | T11 | AC-82 | T13 |
| AC-25 | T11 | AC-83 | T13 |
| AC-26 | T11 | AC-84 | T13 |
| AC-27 | T11 | AC-85 | T13 |
| AC-28 | T11 | AC-86 | T13 |
| AC-29 | T11 | AC-87 | T13 |
| AC-30 | T11 | AC-88 | T4 |
| AC-31 | T11 | AC-89 | T4 |
| AC-32 | T11 | AC-90 | T4, T12 |
| AC-33 | T12 | AC-91 | T4, T17 |
| AC-34 | T7 | AC-92 | T4 |
| AC-35 | T7 | AC-93 | T4, T20 |
| AC-36 | T7 | AC-94 | T17 |
| AC-37 | T12 | AC-95 | T17 |
| AC-38 | T12 | AC-96 | T3, T18 |
| AC-39 | T12 | AC-97 | T18 |
| AC-40 | T7, T12 | AC-98 | T3, T18 |
| AC-41 | T12 | AC-99 | T9, T18 |
| AC-42 | T12 | AC-100 | T3, T10, T18 |
| AC-43 | T12 | AC-101 | T3, T12, T18 |
| AC-44 | T10 | AC-102 | T20 |
| AC-45 | T10, T12 | AC-103 | T10, T18 |
| AC-46 | T10 | AC-104 | T7, T18 |
| AC-47 | T10 | AC-105 | T3, T17, T20 |
| AC-48 | T10 | AC-106 | T3, T20 |
| AC-49 | T3, T10 | AC-107 | T6 |
| AC-50 | T14 | AC-108 | T6 |
| AC-51 | T14 | AC-109 | T18 |
| AC-52 | T14 | AC-110 | T1, T5, T20 |
| AC-53 | T14 | AC-111 | T10 |
| AC-54 | T14 | AC-112 | T10 |
| AC-55 | T14 | AC-113 | T10 |
| AC-56 | T14 | AC-114 | T5, T10 |
| AC-57 | T14 | AC-115 | T4 |
| AC-58 | T5, T14 | AC-116 | T6 |
