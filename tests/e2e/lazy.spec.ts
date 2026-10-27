/**
 * Lazy chunks that fail to load: the failure isn't cached (a retry chip offers another go), and
 * `vite:preloadError` reloads the page once (a deploy replaced the hashed files), never in a loop.
 */
import { expect, test } from '@playwright/test';
import { boot } from './helpers.ts';

const SHEETS = /\/assets\/sheets-[^/]*\.(js|css)$/;

test('a blocked Settings chunk shows a retry chip; once unblocked, Settings opens', async ({ page }) => {
  // as if we had just reloaded for this failure: the preload guard holds, so no reload now
  await page.addInitScript(() => sessionStorage.setItem('lb.chunkReload', String(Date.now())));
  let blocked = true;
  await page.route(SHEETS, (r) => (blocked ? r.abort() : r.continue()));
  await boot(page);
  await page.getByRole('button', { name: 'Menu' }).click();
  await page.getByRole('button', { name: 'Settings' }).click();
  const chip = page.getByTestId('retry-chip');
  await expect(chip).toBeVisible();
  await expect(chip).toHaveText(/Couldn.t load/);
  blocked = false;
  await chip.click();
  await expect(page.getByRole('switch', { name: 'Larger text' })).toBeVisible();
  await expect(chip).toHaveCount(0);
});

test('vite:preloadError reloads the page once, not in a loop', async ({ page }) => {
  await page.route(SHEETS, (r) => r.abort());
  let loads = 0;
  page.on('load', () => loads++);
  await boot(page);
  await page.getByRole('button', { name: 'Menu' }).click();
  await page.getByRole('button', { name: 'Settings' }).click();
  await expect.poll(() => loads, { timeout: 8000 }).toBe(2); // the one-shot reload
  await page.waitForFunction(() => (window as any).__atoll);
  await page.getByRole('button', { name: 'Menu' }).click();
  await page.getByRole('button', { name: 'Settings' }).click();
  await expect(page.getByTestId('retry-chip')).toBeVisible();
  await page.waitForTimeout(2500); // idle prefetches fail too: still no second reload
  expect(loads).toBe(2);
});

test('a blocked results chunk shows a retry chip at game over; once unblocked, the card appears', async ({ page }) => {
  await page.addInitScript(() => sessionStorage.setItem('lb.chunkReload', String(Date.now())));
  let blocked = true;
  await page.route(/\/assets\/results-[^/]*\.(js|css)$/, (r) => (blocked ? r.abort() : r.continue()));
  await boot(page);
  await page.evaluate(() => (window as any).__atoll.showResults({ score: 1234, prevBest: 900 }));
  const chip = page.getByTestId('retry-chip');
  await expect(chip).toBeVisible();
  blocked = false;
  await chip.click();
  await expect(page.getByTestId('final-score')).toHaveText('1234');
  await expect(chip).toHaveCount(0);
});
