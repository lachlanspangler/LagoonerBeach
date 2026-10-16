import { defineConfig } from 'vitest/config';

export default defineConfig({
  base: './',
  define: { __APP_VERSION__: JSON.stringify(process.env.npm_package_version ?? '1.0.0') },
  build: { target: 'es2022', sourcemap: true },
  server: { port: 5317, strictPort: true },
  preview: { port: 4317, strictPort: true },
  test: {
    include: ['tests/unit/**/*.test.ts'],
    environment: 'node',
    testTimeout: 30_000,
    coverage: {
      include: ['src/core/**', 'src/sim/**', 'src/meta/**', 'src/render/color.ts'],
      reporter: ['text-summary', 'html'],
      thresholds: { statements: 95, branches: 88, functions: 95, lines: 95 },
    },
  },
});
