# Workflow Retro Ledger

One row per retro, so multi-agent runs can be compared over time.
Written by the `workflow-retro` skill. Append-only.

| date | label | agents | in→out tok | cache hit | wall | parallelism | cost | top recommendation |
|------|-------|--------|-----------|-----------|------|-------------|------|--------------------|
| 2026-07-25 | catalog-site-mvp-sdd | 26 (25 top-level + 1 nested) | 17.5k → 638k | 94% | 2h19m | 4.58× | $73.75 | Gate every implementer dispatch on a "does a test actually activate this?" check — jsdom's non-compliant `popstate` let 149 green tests hide 5 dead links |
