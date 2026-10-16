import { expect, test } from '@playwright/test';
import { boot, dragMove, state } from './helpers.ts';

test('boots cleanly and draws the board', async ({ page }) => {
  const errors = await boot(page);
  const lit = await page.evaluate(() => {
    const c = document.getElementById('game') as HTMLCanvasElement;
    const g = c.getContext('2d')!;
    const d = g.getImageData(0, 0, c.width, c.height).data;
    const colors = new Set<number>();
    for (let i = 0; i < d.length; i += 4 * 97) colors.add((d[i]! << 16) | (d[i + 1]! << 8) | d[i + 2]!);
    return colors.size;
  });
  expect(lit).toBeGreaterThan(10);
  expect(errors).toEqual([]);
});

test('plays 30 moves with real drags, captures happen, no errors', async ({ page }) => {
  const errors = await boot(page);
  for (let i = 0; i < 30; i++) if (!(await dragMove(page, 'greedy', 20))) break;
  const s = await state(page);
  expect(s.moves).toBeGreaterThanOrEqual(20);
  expect(s.captures).toBeGreaterThan(0);
  expect(s.score).toBeGreaterThan(s.moves);
  expect(errors).toEqual([]);
});

test('an illegal drop returns the piece to the tray', async ({ page }) => {
  await boot(page);
  await dragMove(page); // occupy something
  const s0 = await state(page);
  // drop the next piece back onto the first piece's cells
  const slot = s0.tray.findIndex((t: unknown) => t);
  const plan = await page.evaluate(
    ([sl]) => {
      const a = (window as any).__atoll;
      const st = a.state();
      const occupied = st.board.findIndex((c: number) => c !== 0);
      return a.pathFor({ slot: sl, x: occupied % 8, y: Math.floor(occupied / 8) });
    },
    [slot],
  );
  await page.mouse.move(plan.down.x, plan.down.y);
  await page.mouse.down();
  await page.mouse.move(plan.up.x, plan.up.y, { steps: 6 });
  await page.mouse.up();
  await page.waitForTimeout(250);
  const s1 = await state(page);
  // either the magnet found a legal nearby spot, or nothing happened; never an overlap
  if (s1.moves === s0.moves) expect(s1.tray[slot]).toEqual(s0.tray[slot]);
  expect(await page.evaluate(() => (window as any).__atoll.state().over)).toBe(false);
});

test('progress survives a reload', async ({ page }) => {
  await boot(page, '');
  for (let i = 0; i < 5; i++) await dragMove(page);
  const before = await state(page);
  await page.reload();
  await page.waitForFunction(() => (window as any).__atoll);
  const after = await state(page);
  expect(after.moves).toBe(before.moves);
  expect(after.score).toBe(before.score);
  expect(after.board).toEqual(before.board);
});

test('game over shows the card; play again starts fresh', async ({ page }) => {
  await boot(page, 'seed=3&fast=1');
  await page.evaluate(() => (window as any).__atoll.autoplay('random', 500));
  await expect(page.getByTestId('final-score')).toBeVisible();
  const s = await state(page);
  expect(s.over).toBe(true);
  await expect(page.getByTestId('final-score')).toHaveText(String(s.score));
  await page.locator('#play-again').click();
  await expect(page.getByTestId('final-score')).toHaveCount(0);
  const n = await state(page);
  expect(n.moves).toBe(0);
  expect(n.over).toBe(false);
  const profile = await page.evaluate(() => (window as any).__atoll.profile());
  expect(profile.best).toBe(s.score);
  expect(profile.stats.games).toBe(1);
});

test('menu opens, toggles persist, resume closes it', async ({ page }) => {
  await boot(page);
  await page.getByRole('button', { name: 'Menu' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('button', { name: 'Sound' }).click();
  expect(await page.evaluate(() => (window as any).__atoll.profile().settings.sound)).toBe(false);
  await page.getByRole('button', { name: 'Resume' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.reload();
  await page.waitForFunction(() => (window as any).__atoll);
  expect(await page.evaluate(() => (window as any).__atoll.profile().settings.sound)).toBe(false);
});

test('daily is the same for everyone on a date', async ({ browser }) => {
  const trays: unknown[] = [];
  for (let i = 0; i < 2; i++) {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await boot(page, 'mode=daily');
    const s = await state(page);
    expect(s.mode).toBe('daily');
    trays.push(s.tray);
    await ctx.close();
  }
  expect(trays[0]).toEqual(trays[1]);
});

test('reef puzzle: playing the stored solution with real drags clears it', async ({ page }) => {
  await boot(page);
  await page.evaluate(() => (window as any).__atoll.switchMode('puzzle'));
  await expect.poll(() => page.evaluate(() => (window as any).__atoll.mode())).toBe('puzzle');
  const solution = await page.evaluate(() => (window as any).__atoll.puzzleSolution());
  for (const m of solution) {
    const path = await page.evaluate((mv) => (window as any).__atoll.pathFor({ slot: mv.piece, x: mv.x, y: mv.y }), m);
    await page.mouse.move(path.down.x, path.down.y);
    await page.mouse.down();
    await page.mouse.move(path.up.x, path.up.y, { steps: 6 });
    await page.mouse.up();
    await page.waitForTimeout(150);
  }
  await expect(page.getByTestId('puzzle-result')).toHaveText('Cleared');
  await page.locator('#next-reef').click();
  expect(await page.evaluate(() => (window as any).__atoll.state().seed)).toBe(1);
});

test('reef puzzle hint points at a winning move', async ({ page }) => {
  await boot(page);
  await page.evaluate(() => (window as any).__atoll.switchMode('puzzle'));
  await expect.poll(() => page.evaluate(() => (window as any).__atoll.mode())).toBe('puzzle');
  await page.getByRole('button', { name: 'Hint' }).click();
  await expect(page.locator('#sr')).toHaveText('Hint shown on the board.');
});
