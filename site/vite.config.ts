import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// GitHub Pages serves a project site under /<repo>/, so the build must be
// prefixed with this base. During `vite dev` it resolves to '/'.
export default defineConfig({
  base: '/ai-demo-marketplace/',
  plugins: [react()],
});
