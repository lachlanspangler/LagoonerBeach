import { defineConfig, devices } from '@playwright/test';

// PW_PORT lets parallel worktrees run e2e side by side without fighting over :4317
const PORT = Number(process.env.PW_PORT ?? 4317);

export default defineConfig({
  testDir: 'tests',
  testMatch: ['e2e/**/*.spec.ts', 'perf/**/*.spec.ts'],
  timeout: 90_000,
  fullyParallel: true,
  // CI runners have 2 cores: fewer workers, one retry for timing-sensitive flows, and failures as
  // GitHub annotations (readable through the public API, unlike job logs).
  workers: process.env.CI ? 2 : 4,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI
    ? [['list'], ['github'], ['html', { open: 'never' }]]
    : [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Pixel 7'] } },
    // Safari engine: gameplay flows only (perf numbers are Chromium-specific via CDP)
    {
      name: 'webkit',
      use: { ...devices['iPhone 15'] },
      testMatch: [
        'e2e/gameplay.spec.ts',
        'e2e/input.spec.ts',
        'e2e/a11y.spec.ts',
        'e2e/leaderboard.spec.ts',
        'e2e/art.spec.ts',
        'e2e/art-kit.spec.ts',
        'e2e/larger-text.spec.ts',
        'e2e/loop.spec.ts',
      ],
    },
  ],

  webServer: {
    command: `npx vite preview --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
