/** The render loop survives a throwing draw (e.g. a canvas API an old WebView lacks): it logs and keeps going. */
import { expect, test } from '@playwright/test';
import { boot } from './helpers.ts';

test('a throwing draw is logged and the loop keeps running', async ({ page }) => {
  const errors = await boot(page);
  const draws = () => page.evaluate(() => (window as any).__atoll.drawTimes().length as number);
  await page.evaluate(() => (window as any).__atoll.breakDraw(3));
  await page.evaluate(() => (window as any).__atoll.autoplay('greedy', 1)); // something to draw
  await page.waitForTimeout(200);
  const after = await draws();
  await page.evaluate(() => (window as any).__atoll.autoplay('greedy', 1));
  await expect.poll(draws).toBeGreaterThan(after);
  expect(errors.some((e) => e.includes('frame failed'))).toBe(true);
});
