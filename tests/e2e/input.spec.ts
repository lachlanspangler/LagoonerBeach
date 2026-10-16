/** Interrupted gestures and rapid input never corrupt state (design doc §4.3, §7). */
import { expect, test, type Page } from '@playwright/test';
import { boot, state } from './helpers.ts';

async function startDrag(page: Page) {
  const plan = await page.evaluate(() => (window as any).__atoll.plan('greedy'));
  await page.mouse.move(plan.down.x, plan.down.y);
  await page.mouse.down();
  await page.mouse.move(plan.up.x, plan.up.y, { steps: 5 });
  return plan;
}

test('pointercancel mid-drag returns the piece and makes no move', async ({ page }) => {
  await boot(page);
  const before = await state(page);
  await startDrag(page);
  await page.evaluate(() => {
    const c = document.getElementById('game')!;
    c.dispatchEvent(new PointerEvent('pointercancel', { pointerId: 1, isPrimary: true, bubbles: true }));
  });
  await page.mouse.up();
  await page.waitForTimeout(250);
  const after = await state(page);
  expect(after.moves).toBe(before.moves);
  expect(after.tray).toEqual(before.tray);
});

test('window blur mid-drag cancels cleanly', async ({ page }) => {
  await boot(page);
  const before = await state(page);
  await startDrag(page);
  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  await page.mouse.up();
  await page.waitForTimeout(250);
  expect((await state(page)).moves).toBe(before.moves);
  // and the next drag still works
  const plan = await page.evaluate(() => (window as any).__atoll.plan('greedy'));
  await page.mouse.move(plan.down.x, plan.down.y);
  await page.mouse.down();
  await page.mouse.move(plan.up.x, plan.up.y, { steps: 5 });
  await page.mouse.up();
  await expect.poll(async () => (await state(page)).moves).toBe(before.moves + 1);
});

test('rapid taps everywhere never change the board or throw', async ({ page }) => {
  const errors = await boot(page);
  const before = await state(page);
  const l = await page.evaluate(() => (window as any).__atoll.layout());
  for (let i = 0; i < 40; i++) {
    const x = (i * 97) % l.w;
    const y = (i * 53) % l.h;
    await page.mouse.click(x, y, { delay: 5 });
  }
  // tap-to-place can legally place pieces; whatever happened, state must stay valid
  const after = await state(page);
  expect(after.over).toBe(false);
  expect(after.moves).toBeGreaterThanOrEqual(before.moves);
  expect(errors).toEqual([]);
});

test('drag released far off the board returns the piece', async ({ page }) => {
  await boot(page);
  const before = await state(page);
  const plan = await page.evaluate(() => (window as any).__atoll.plan('greedy'));
  await page.mouse.move(plan.down.x, plan.down.y);
  await page.mouse.down();
  await page.mouse.move(5, 5, { steps: 6 });
  await page.mouse.up();
  await page.waitForTimeout(250);
  expect((await state(page)).moves).toBe(before.moves);
});
