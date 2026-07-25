import { defineConfig, mergeConfig } from 'vitest/config';
import viteConfig from './vite.config';

// Vitest config layered on top of the app's Vite config so path resolution,
// plugins, and the base URL stay consistent between `vite build` and tests.
//
// `globals: false` on purpose: every test file imports what it needs
// (describe/it/expect) explicitly from 'vitest' rather than relying on
// ambient globals. The setup file follows the same rule.
export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: 'jsdom',
      globals: false,
      setupFiles: ['./src/test/setup.ts'],
      css: true,
      include: ['src/**/*.test.{ts,tsx}', 'scripts/**/*.test.{ts,mjs}'],
      passWithNoTests: true,
    },
  }),
);
