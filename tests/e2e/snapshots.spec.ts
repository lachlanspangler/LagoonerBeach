/**
 * Visual regression: pixel baselines for key screens (deterministic seed, idle frame).
 * Update intentionally with: npx playwright test tests/e2e/snapshots.spec.ts --update-snapshots
 */
import { expect, test, type Page } from '@playwright/test';
import { boot } from './helpers.ts';

test.describe.configure({ mode: 'parallel' });
// Baselines are rendered on macOS (font rasterization differs per OS). On other platforms, record
// your own with --update-snapshots first.
test.skip(({ browserName }) => browserName !== 'chromium' || process.platform !== 'darwin', 'Chromium/macOS baselines');

async function idle(page: Page) {
  // wait until nothing animates (particles, tweens, deal-in)
  await page.waitForTimeout(1600);
}

for (const scheme of ['light', 'dark'] as const) {
  test(`start screen ${scheme}`, async ({ browser }) => {
    const ctx = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 1,
      colorScheme: scheme,
    });
    const page = await ctx.newPage();
    await boot(page, 'seed=42');
    await idle(page);
    await expect(page).toHaveScreenshot(`start-${scheme}.png`, { maxDiffPixelRatio: 0.001, threshold: 0.08 });
    await ctx.close();
  });
}

test('mid-game board after 10 moves', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await boot(page, 'seed=42');
  await page.evaluate(() => (window as any).__atoll.autoplay('random', 10));
  await idle(page);
  await expect(page).toHaveScreenshot('midgame.png', { maxDiffPixelRatio: 0.001, threshold: 0.08 });
  await ctx.close();
});

test('menu card', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await boot(page, 'seed=42');
  await page.getByRole('button', { name: 'Menu' }).click();
  await page.waitForTimeout(500);
  await expect(page).toHaveScreenshot('menu.png', { maxDiffPixelRatio: 0.002, threshold: 0.08 });
  await ctx.close();
});

test('reef puzzle screen', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await boot(page, 'seed=42');
  await page.evaluate(() => (window as any).__atoll.switchMode('puzzle'));
  await idle(page);
  await expect(page).toHaveScreenshot('reef.png', { maxDiffPixelRatio: 0.001, threshold: 0.08 });
  await ctx.close();
});
