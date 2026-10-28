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
    // functional e2e (everything except tests/perf)
    { name: 'chromium', use: { ...devices['Pixel 7'] }, testIgnore: ['perf/**'] },
    // frame budgets measure our own draw cost under a 4× CPU throttle: they only mean something on an
    // otherwise idle machine, so they run after the functional suites, one test at a time
    // (`make e2e` and CI run this project with --workers=1)
    { name: 'perf', use: { ...devices['Pixel 7'] }, testMatch: ['perf/**/*.spec.ts'] },
    // Safari engine: gameplay flows only (perf numbers are Chromium-specific via CDP)
    {
      name: 'webkit',
      use: { ...devices['iPhone 15'] },
      testMatch: [
        'e2e/gameplay.spec.ts',
        'e2e/about.spec.ts',
        'e2e/input.spec.ts',
        'e2e/a11y.spec.ts',
        'e2e/leaderboard.spec.ts',
        'e2e/art.spec.ts',
        'e2e/art-kit.spec.ts',
        'e2e/larger-text.spec.ts',
        'e2e/journal.spec.ts',
        'e2e/loop.spec.ts',
      ],
    },
  ],

  webServer: {
    // its own build with the on-device demo leaderboards (VITE_LB=demo): `npm run build` is a
    // release build, which hides leaderboards until a real server URL is configured (ADR 0010)
    command: `VITE_LB=demo VITE_DEBUG=1 npx vite build --outDir dist-e2e --emptyOutDir --logLevel warn && npx vite preview --outDir dist-e2e --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
