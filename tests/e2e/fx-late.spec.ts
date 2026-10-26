/**
 * Back from the background mid-celebration: the visuals settle, but the queued haptics (and sounds)
 * don't all fire at once — steps more than 250 ms late drop their side effects.
 */
import { expect, test, type Page } from '@playwright/test';
import { boot } from './helpers.ts';
import { BOARDS, boardString } from './celebrate-boards.ts';

/** The move's own buzzes (place tick + capture heavy); the discovery reveal has its own, later. */
const haptics = (page: Page) =>
  page.evaluate(
    () =>
      ((window as any).__atoll.haptics() as { k: string }[]).filter((h) => h.k === 'tick' || h.k === 'heavy').length,
  );

for (const stall of [0, 1500]) {
  test(`celebration haptics ${stall ? 'are dropped after a stall' : 'play normally'}`, async ({ page }) => {
    await boot(page, 'seed=42');
    const s = BOARDS.atoll!;
    await page.evaluate(([b, t]) => (window as any).__atoll.setup(b, t), [boardString(s), s.tray] as const);
    await page.waitForTimeout(700);
    const before = await haptics(page);
    await page.evaluate(
      ([m, ms]) => {
        (window as any).__atoll.commitMove(m);
        // block the main thread like a backgrounded tab (no frames), then come back
        const end = performance.now() + (ms as number);
        while (performance.now() < end) {
          /* stall */
        }
      },
      [s.move, stall] as const,
    );
    await page.waitForTimeout(2500);
    const fired = (await haptics(page)) - before;
    if (stall) expect(fired).toBeLessThanOrEqual(0);
    else expect(fired).toBeGreaterThanOrEqual(2);
    // the board still settles either way
    expect(await page.evaluate(() => (window as any).__atoll.state().moves)).toBe(1);
  });
}

test('a capture that fills a journal page announces both (neither overwrites the other)', async ({ page }) => {
  await boot(page, 'seed=42');
  const s = BOARDS.atoll!;
  await page.evaluate(([b, t]) => (window as any).__atoll.setup(b, t), [boardString(s), s.tray] as const);
  await page.waitForTimeout(700);
  const text = await page.evaluate(async (m) => {
    (window as any).__atoll.commitMove(m);
    await Promise.resolve();
    return document.getElementById('sr')!.textContent;
  }, s.move);
  expect(text).toContain('Captured');
  expect(text).toContain('New in your journal');
});
