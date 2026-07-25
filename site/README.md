# site — AI Demo Marketplace catalog site

A **super-basic** Vite + React + TypeScript scaffold ("Hello World"), deployed to GitHub Pages. This is the starting point; the real catalog UI is written later via Spec-Driven Development.

## Local dev

```bash
cd site
npm install
npm run dev      # http://localhost:5173
npm run build    # tsc --noEmit && vite build → site/dist
npm run preview  # serve the production build
```

## Deploy (GitHub Pages)

`.github/workflows/pages.yml` builds and deploys on push to `main` (and via manual `workflow_dispatch`).

One-time repo setup: **Settings → Pages → Build and deployment → Source: GitHub Actions**.

The published URL will be `https://burnjohn.github.io/ai-demo-marketplace/` — hence `base: '/ai-demo-marketplace/'` in `vite.config.ts`.
