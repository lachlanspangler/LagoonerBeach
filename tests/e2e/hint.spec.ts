/**
 * Endless and Daily: one hint per game, beside the journal. It outlines a good move (never plays
 * it), stays until you place a piece, and a second tap only says "One hint per game" — even after a
 * reload. A new game gets a new one; Reefs keep their own hint button.
 */
import { expect, test, type Page } from '@playwright/test';
import { boot, dragMove, state } from './helpers.ts';

const hint = (page: Page) => page.evaluate(() => (window as any).__atoll.sceneHint());

test('one hint per game: shows a move, never plays it, and stays used across a reload', async ({ page }) => {
  await boot(page, 'seed=42');
  await page.evaluate(() => ((window as any).__atoll.profile().firstRunDone = true));
  await page.evaluate(() => (window as any).__atoll.restart());
  const btn = page.locator('#hint-btn');
  await expect(btn).toBeVisible();
  await expect(btn).toHaveAccessibleName('Hint, one per game');
  // right beside the journal, same size
  const [h, j] = [(await btn.boundingBox())!, (await page.locator('#side-btn').boundingBox())!];
  expect(Math.abs(h.y - j.y)).toBeLessThan(1);
  expect(h.x + h.width).toBeLessThan(j.x);
  expect(h.height).toBeGreaterThanOrEqual(44);
  const moves = (await state(page)).moves;
  expect(await hint(page)).toBeNull();
  await btn.click();
  await expect.poll(() => hint(page)).not.toBeNull();
  expect((await state(page)).moves).toBe(moves); // it doesn't move for you
  await expect(btn).toHaveClass(/used/);
  await expect(btn).toHaveAccessibleName('Hint used for this game');
  // gone once you place a piece; a second tap doesn't bring another
  expect(await dragMove(page)).toBe(true);
  await expect.poll(() => hint(page)).toBeNull();
  await btn.click();
  await page.waitForTimeout(200);
  expect(await hint(page)).toBeNull();
  // a reload doesn't refund it
  await page.reload();
  await page.waitForFunction(() => (window as any).__atoll);
  await expect(page.locator('#hint-btn')).toHaveClass(/used/);
  // a new game gets a new hint
  await page.evaluate(() => (window as any).__atoll.restart());
  await expect(page.locator('#hint-btn')).not.toHaveClass(/used/);
});

test('Reefs keep their own hint; the per-game bulb is for Endless and Daily', async ({ page }) => {
  await boot(page, 'seed=42');
  await page.evaluate(() => (window as any).__atoll.switchMode('puzzle'));
  await page.waitForFunction(() => (window as any).__atoll.mode() === 'puzzle');
  await expect(page.locator('#hint-btn')).toBeHidden();
  await expect(page.locator('#side-btn')).toHaveAccessibleName('Hint');
});

test('Reefs from the menu always open the reef list, and any reef can be replayed from it', async ({ page }) => {
  await boot(page, 'seed=42');
  await page.getByRole('button', { name: 'Menu' }).click();
  await page.getByRole('button', { name: 'Reef puzzles' }).click();
  await expect(page.locator('.sheet[data-kind="reefs"]')).toBeVisible();
  await page.getByRole('button', { name: /^Reef 3(,|$)/ }).click();
  await page.waitForFunction(
    () => (window as any).__atoll.mode() === 'puzzle' && (window as any).__atoll.state().seed === 2,
  );
});
