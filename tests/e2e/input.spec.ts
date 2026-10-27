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

test('real touch drag (CDP touch events) places a piece', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium', 'CDP touch is Chromium-only');
  await boot(page);
  const before = await state(page);
  const plan = await page.evaluate(() => (window as any).__atoll.plan('greedy'));
  const cdp = await page.context().newCDPSession(page);
  const touch = (type: string, x: number, y: number) =>
    cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y, id: 1 }] } as never);
  await touch('touchStart', plan.down.x, plan.down.y);
  for (let i = 1; i <= 8; i++)
    await touch(
      'touchMove',
      plan.down.x + ((plan.up.x - plan.down.x) * i) / 8,
      plan.down.y + ((plan.up.y - plan.down.y) * i) / 8,
    );
  await touch('touchEnd', plan.up.x, plan.up.y);
  await expect.poll(async () => (await state(page)).moves).toBe(before.moves + 1);
});

/** One real drag, no retry: it must count. */
test('a discovery due between quick moves waits until the player pauses (no drag is eaten)', async ({ page }) => {
  await boot(page, 'seed=606');
  // the drags run inside the page so the gaps really are 40 ms: Playwright's own round trips can
  // exceed the 600 ms pause on a loaded machine — and then opening the card would be correct
  const r = await page.evaluate(async () => {
    const a = (window as any).__atoll;
    const canvas = document.querySelector('canvas')!;
    const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));
    const ev = (type: string, x: number, y: number) =>
      canvas.dispatchEvent(
        new PointerEvent(type, { clientX: x, clientY: y, bubbles: true, isPrimary: true, pointerId: 1, buttons: 1 }),
      );
    const start = a.state().moves;
    let done = 0;
    for (let i = 0; i < 9 && !a.state().over; i++) {
      const plan = a.plan('greedy');
      if (!plan) break;
      ev('pointerdown', plan.down.x, plan.down.y);
      for (let k = 1; k <= 4; k++)
        ev(
          'pointermove',
          plan.down.x + ((plan.up.x - plan.down.x) * k) / 4,
          plan.down.y + ((plan.up.y - plan.down.y) * k) / 4,
        );
      ev('pointerup', plan.up.x, plan.up.y);
      done++;
      // a discovery is due right after this move; the next drag follows 40 ms later
      if (i % 3 === 0) a.revealSpecies('kraken');
      await sleep(40);
      if (a.revealState()) return { eaten: true, done, moves: a.state().moves - start };
    }
    return { eaten: false, done, moves: a.state().moves - start };
  });
  expect(r.eaten).toBe(false);
  expect(r.moves).toBe(r.done); // every drag landed
  // once the player pauses, it opens
  await expect
    .poll(() => page.evaluate(() => (window as any).__atoll.revealState()?.id), { timeout: 5000 })
    .toBe('kraken');
});

test('the first press within 250 ms of a card opening neither skips nor closes it', async ({ page }) => {
  await boot(page, 'seed=42');
  const r = await page.evaluate(
    () =>
      new Promise<{ settled: boolean; open: boolean }>((resolve) => {
        const a = (window as any).__atoll;
        a.revealSpecies('kraken');
        const wait = (): void => {
          const el = document.querySelector('.reveal');
          if (!el || !a.revealState()) return void requestAnimationFrame(wait);
          const o = { bubbles: true, isPrimary: true, pointerId: 1 };
          el.dispatchEvent(new PointerEvent('pointerdown', o));
          el.dispatchEvent(new PointerEvent('pointerup', o));
          el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
          const s = a.revealState();
          resolve({ settled: !!s?.settled, open: !!s });
        };
        wait();
      }),
  );
  expect(r).toEqual({ settled: false, open: true });
  // a later press does skip the animation, as before
  await page.waitForTimeout(300);
  await page.mouse.click(20, 20);
  await expect.poll(() => page.evaluate(() => (window as any).__atoll.revealState()?.settled)).toBe(true);
});
