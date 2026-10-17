import { defineConfig } from 'vitest/config';

const VERSION = process.env.npm_package_version ?? '1.0.0';

export default defineConfig({
  base: './',
  define: {
    __APP_VERSION__: JSON.stringify(VERSION),
    // per build: the service worker is registered as sw.js?v=<this>, so each deploy gets a new
    // worker + cache and old caches are dropped (public/sw.js, ADR 0005)
    __BUILD_ID__: JSON.stringify(`${VERSION}-${Date.now().toString(36)}`),
  },
  build: { target: 'es2022', sourcemap: true },
  server: { port: 5317, strictPort: true },
  preview: { port: 4317, strictPort: true },
  test: {
    include: ['tests/unit/**/*.test.ts', 'server/test/**/*.test.ts'],
    environment: 'node',
    testTimeout: 30_000,
    coverage: {
      include: ['src/core/**', 'src/sim/**', 'src/meta/**', 'src/render/color.ts'],
      reporter: ['text-summary', 'html'],
      thresholds: { statements: 95, branches: 88, functions: 95, lines: 95 },
    },
  },
});
