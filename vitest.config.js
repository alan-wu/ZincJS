import { defineConfig } from 'vitest/config';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  plugins: [
    nodePolyfills({
      globals: { Buffer: true, process: true },
    }),
  ],
  test: {
    environment: 'happy-dom',
    globals: true,
    sourcemap: true,

    // 1. Replaces: --glob *.test.{js,ts}
    // Tells Vitest exactly which test file patterns to match
    include: ['./test/*.test.{js,ts}'],

    // 2. Replaces: --require prepare/setup.js
    // Runs this file once before executing your test suites
    setupFiles: [path.resolve(import.meta.dirname, './test/prepare/setup.js')],

    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
    },
  },
});