import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { visualizer } from 'rollup-plugin-visualizer';

// GitHub Pages serves a project site under /<repo>/, so the build must be
// prefixed with this base. During `vite dev` it resolves to '/'.
//
// Set ANALYZE=1 to emit a bundle-size report (site/dist/stats.html) for the
// AC-103 entry-chunk budget check; the plugin is otherwise omitted so it
// never affects normal builds.
export default defineConfig({
  base: '/ai-demo-marketplace/',
  plugins: [
    react(),
    ...(process.env.ANALYZE
      ? [
          visualizer({
            filename: 'dist/stats.html',
            gzipSize: true,
            brotliSize: true,
          }),
        ]
      : []),
  ],
  build: {
    rollupOptions: {
      output: {
        // The markdown renderer (marked + dompurify) is only needed on the
        // plugin/artifact detail views; isolating it into its own chunk
        // keeps it out of the home view's entry chunk (AC-103).
        manualChunks: {
          markdown: ['marked', 'dompurify'],
        },
      },
    },
  },
});
