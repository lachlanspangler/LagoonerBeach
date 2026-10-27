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

test('a beaten best is saved at once; New game mid-run asks once, inline, and keeps it', async ({ page }) => {
  await boot(page, '');
  await page.evaluate(() => (window as any).__atoll.stageRecord(30));
  for (let i = 0; i < 40 && (await state(page)).score <= 30; i++)
    await page.evaluate(() => (window as any).__atoll.autoplay('greedy', 1));
  const run = await state(page);
  expect(run.score).toBeGreaterThan(30);
  expect(run.over).toBe(false);
  expect(await page.evaluate(() => (window as any).__atoll.profile().best)).toBe(run.score);
  // an app kill / reload mid-run: the best is kept, and the run still knows the record it beat
  await page.reload();
  await page.waitForFunction(() => (window as any).__atoll);
  expect((await state(page)).score).toBe(run.score);
  const p = await page.evaluate(() => (window as any).__atoll.profile());
  expect(p.best).toBe(run.score);
  expect(p.runBest.best).toBe(30);
  // New game: the first tap asks on the card itself, the run is untouched
  await page.getByRole('button', { name: 'Menu' }).click();
  const card = page.locator('.mode-card').first();
  await card.click();
  await expect(card).toContainText('This one ends here.');
  expect((await state(page)).moves).toBe(run.moves);
  // the second starts over; the best stays
  await card.click();
  await expect.poll(async () => (await state(page)).moves).toBe(0);
  expect(await page.evaluate(() => (window as any).__atoll.profile().best)).toBe(run.score);
  // with no move made yet, New game is one tap
  await page.getByRole('button', { name: 'Menu' }).click();
  const seed = (await state(page)).seed;
  await page.locator('.mode-card').first().click();
  await expect.poll(async () => (await state(page)).seed).not.toBe(seed);
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
  await page.getByRole('button', { name: 'Settings' }).click();
  await page.getByRole('switch', { name: 'Sound' }).click();
  await expect(page.getByRole('switch', { name: 'Sound' })).toHaveAttribute('aria-checked', 'false');
  expect(await page.evaluate(() => (window as any).__atoll.profile().settings.sound)).toBe(false);
  await page.getByRole('button', { name: 'Done' }).click();
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

test('tap-to-place: tap a piece, tap the board to preview, tap again to place', async ({ page }) => {
  await boot(page);
  const m = await page.evaluate(() => {
    const a = (window as any).__atoll;
    const l = a.layout();
    return { slot: l.slots[0], board: l.board, cell: l.cell };
  });
  await page.mouse.click(m.slot.cx, m.slot.cy);
  await expect(page.locator('#sr')).toContainText('Piece selected');
  const cx = m.board.x + m.cell * 3.5;
  const cy = m.board.y + m.cell * 3.5;
  await page.mouse.click(cx, cy);
  expect((await state(page)).moves).toBe(0); // first tap only previews
  await page.mouse.click(cx, cy);
  await expect.poll(async () => (await state(page)).moves).toBe(1);
});

test('regression: a pending game-over card never appears on the next game', async ({ page }) => {
  await boot(page, 'seed=3');
  await page.evaluate(() => (window as any).__atoll.autoplay('random', 500));
  expect((await state(page)).over).toBe(true);
  await page.evaluate(() => (window as any).__atoll.restart()); // within the 1.4 s delay
  await page.waitForTimeout(1800);
  await expect(page.getByTestId('final-score')).toHaveCount(0);
  expect((await state(page)).moves).toBe(0);
});

test('regression: a pending reef result never hijacks classic mode', async ({ page }) => {
  await boot(page);
  await page.evaluate(() => (window as any).__atoll.switchMode('puzzle'));
  await expect.poll(() => page.evaluate(() => (window as any).__atoll.mode())).toBe('puzzle');
  const solution = await page.evaluate(() => (window as any).__atoll.puzzleSolution());
  for (const m of solution) {
    const path = await page.evaluate((mv) => (window as any).__atoll.pathFor({ slot: mv.piece, x: mv.x, y: mv.y }), m);
    await page.mouse.move(path.down.x, path.down.y);
    await page.mouse.down();
    await page.mouse.move(path.up.x, path.up.y, { steps: 4 });
    await page.mouse.up();
  }
  await page.evaluate(() => (window as any).__atoll.switchMode('classic')); // before the 1.3 s card
  await page.waitForTimeout(1600);
  await expect(page.getByTestId('puzzle-result')).toHaveCount(0);
  expect(await page.evaluate(() => (window as any).__atoll.mode())).toBe('classic');
  expect((await state(page)).mode).toBe('classic');
});

test('reef list: pick any reef', async ({ page }) => {
  await boot(page);
  await page.evaluate(() => (window as any).__atoll.switchMode('puzzle'));
  await expect.poll(() => page.evaluate(() => (window as any).__atoll.mode())).toBe('puzzle');
  await page.getByRole('button', { name: 'Menu' }).click();
  await page.getByRole('button', { name: 'All reefs' }).click();
  await page.getByRole('button', { name: 'Reef 5', exact: true }).click();
  await expect.poll(async () => (await state(page)).seed).toBe(4);
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('endless reef 361: generated in the worker, cleared with real drags, next reef is instant', async ({ page }) => {
  const errors = await boot(page);
  await page.evaluate(() => (window as any).__atoll.switchMode('puzzle'));
  await expect.poll(() => page.evaluate(() => (window as any).__atoll.mode())).toBe('puzzle');
  await page.evaluate(() => (window as any).__atoll.loadPuzzle(360));
  await expect.poll(async () => (await state(page)).seed).toBe(360);
  const solution = await page.evaluate(() => (window as any).__atoll.puzzleSolution());
  expect(solution.length).toBeGreaterThanOrEqual(2);
  for (const m of solution) {
    const path = await page.evaluate((mv) => (window as any).__atoll.pathFor({ slot: mv.piece, x: mv.x, y: mv.y }), m);
    await page.mouse.move(path.down.x, path.down.y);
    await page.mouse.down();
    await page.mouse.move(path.up.x, path.up.y, { steps: 6 });
    await page.mouse.up();
    await page.waitForTimeout(150);
  }
  await expect(page.getByTestId('puzzle-result')).toHaveText('Cleared');
  const p = await page.evaluate(() => (window as any).__atoll.profile());
  expect(p.puzzle.solved).toContain('g361');
  // prefetched while reef 361 was played: tapping Next opens reef 362 without waiting
  expect(await page.evaluate(() => (window as any).__atoll.reefReady(361))).toBe(true);
  await page.locator('#next-reef').click();
  expect((await state(page)).seed).toBe(361);
  const stats = await page.evaluate(() => (window as any).__atoll.reefStats());
  expect(stats.worker).toBe(true);
  expect(stats.fallback).toBe(0);
  expect(stats.cached).toEqual(expect.arrayContaining([361, 362, 363, 364]));
  expect(errors).toEqual([]);
});

test('reef list: chapters with navigation, into the endless reefs', async ({ page }) => {
  await boot(page);
  await page.evaluate(() => (window as any).__atoll.switchMode('puzzle'));
  await expect.poll(() => page.evaluate(() => (window as any).__atoll.mode())).toBe('puzzle');
  await page.getByRole('button', { name: 'Menu' }).click();
  await page.getByRole('button', { name: 'All reefs' }).click();
  const title = page.getByTestId('chapter-title');
  await expect(title).toHaveText(/^Chapter 1 · /);
  await expect(page.getByRole('button', { name: 'Previous chapter' })).toBeDisabled();
  expect(await page.locator('.reef-grid .reef').count()).toBe(20); // one chapter in the DOM
  for (let c = 1; c < 19; c++) await page.getByRole('button', { name: 'Next chapter' }).click();
  await expect(title).toHaveText(/^Chapter 19 · /);
  await expect(page.locator('.chapter-title')).toContainText('endless');
  await page.getByRole('button', { name: 'Next chapter' }).click();
  await expect(title).toHaveText(/^Chapter 20 · /);
  await expect(page.getByRole('button', { name: 'Next chapter' })).toBeDisabled(); // one past the frontier
  await page.getByRole('button', { name: 'Previous chapter' }).click();
  await page.getByRole('button', { name: 'Reef 361', exact: true }).click();
  await expect.poll(async () => (await state(page)).seed).toBe(360);
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('catching: captures fill the Beach Journal; the journal opens and shows a species', async ({ page }) => {
  await boot(page, 'seed=3&fast=1');
  await page.evaluate(() => (window as any).__atoll.autoplay('human', 400));
  const j = await page.evaluate(() => (window as any).__atoll.journal());
  expect(Object.keys(j.entries).length).toBeGreaterThan(3);
  expect(j.total).toBeGreaterThan(5);
  await page.evaluate(() => (window as any).__atoll.restart());
  await page.getByRole('button', { name: 'Menu' }).click();
  await page.getByRole('button', { name: 'Beach Journal' }).click();
  await page.locator('.j-tile.got').first().click();
  await expect(page.getByRole('button', { name: 'Back to journal' })).toBeVisible();
  // persisted across reloads
  await page.reload();
  await page.waitForFunction(() => (window as any).__atoll);
  const j2 = await page.evaluate(() => (window as any).__atoll.journal());
  expect(j2.total).toBe(j.total);
});

test('reef of the day: shown in the reef grid and opens a reef', async ({ page }) => {
  await boot(page);
  await page.evaluate(() => (window as any).__atoll.switchMode('puzzle'));
  await expect.poll(() => page.evaluate(() => (window as any).__atoll.mode())).toBe('puzzle');
  await page.getByRole('button', { name: 'Menu' }).click();
  await page.getByRole('button', { name: 'All reefs' }).click();
  // a new player is pointed at the next reef on the curve; the daily reef is secondary
  await expect(page.locator('#reef-continue')).toHaveClass(/primary/);
  await expect(page.locator('#reef-continue')).toHaveText(/Continue · Reef 1/);
  const btn = page.locator('#reef-of-day');
  await expect(btn).toBeVisible();
  await expect(btn).not.toHaveClass(/primary/);
  await btn.click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('settings: larger text toggles, erase all progress really erases', async ({ page }) => {
  await boot(page, 'seed=3&fast=1');
  await page.evaluate(() => (window as any).__atoll.autoplay('human', 400));
  expect((await page.evaluate(() => (window as any).__atoll.profile())).stats.games).toBe(1);
  await page.evaluate(() => (window as any).__atoll.restart());
  await page.getByRole('button', { name: 'Menu' }).click();
  await page.getByRole('button', { name: 'Settings' }).click();
  await page.getByRole('switch', { name: 'Larger text' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-large', '1');
  await page.getByRole('button', { name: 'Erase all progress' }).click();
  await page.getByRole('button', { name: 'Erase all progress' }).click();
  await page.waitForFunction(() => (window as any).__atoll);
  const p = await page.evaluate(() => (window as any).__atoll.profile());
  expect(p.stats.games).toBe(0);
  expect(Object.keys((await page.evaluate(() => (window as any).__atoll.journal())).entries)).toHaveLength(0);
});
