import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'tests',
  testMatch: ['e2e/**/*.spec.ts', 'perf/**/*.spec.ts'],
  timeout: 90_000,
  fullyParallel: true,
  workers: 4,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://localhost:4317',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Pixel 7'] } },
    // Safari engine: gameplay flows only (perf numbers are Chromium-specific via CDP)
    { name: 'webkit', use: { ...devices['iPhone 15'] }, testMatch: ['e2e/gameplay.spec.ts'] },
  ],

  webServer: {
    command: 'npx vite preview --port 4317 --strictPort',
    url: 'http://localhost:4317',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
