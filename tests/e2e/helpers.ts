import { expect, type Page } from '@playwright/test';

export async function boot(page: Page, query = 'seed=42'): Promise<string[]> {
  const errors: string[] = [];
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(`/?debug=1&${query}`);
  await page.waitForFunction(() => (window as any).__atoll);
  await page.waitForTimeout(300);
  return errors;
}

/**
 * A discovery reveal (ADR 0012) is a modal moment while it animates: let it settle, then carry on
 * the way a player would (the next press outside the card dismisses it and goes to the game).
 */
export async function settleReveal(page: Page): Promise<void> {
  await page.waitForFunction(() => {
    const s = (window as any).__atoll.revealState?.();
    return !s || !s.modal || s.settled;
  });
  // the card may cover the tray: tap Continue, as a player would
  const cont = page.locator('.reveal.settled .btn.primary');
  if (await cont.count()) await cont.click();
}

/** Perform the bot's next move with a real pointer drag. Returns false if the game is over. */
export async function dragMove(page: Page, bot = 'greedy', wait = 60): Promise<boolean> {
  const before = await page.evaluate(() => (window as any).__atoll.state().moves);
  // a reveal can open between two moves; if it swallowed the press, retry once it has settled
  for (let attempt = 0; attempt < 3; attempt++) {
    await settleReveal(page);
    const plan = await page.evaluate((b) => (window as any).__atoll.plan(b), bot);
    if (!plan) return false;
    await page.mouse.move(plan.down.x, plan.down.y);
    await page.mouse.down();
    await page.mouse.move((plan.down.x + plan.up.x) / 2, (plan.down.y + plan.up.y) / 2, { steps: 4 });
    await page.mouse.move(plan.up.x, plan.up.y, { steps: 4 });
    await page.mouse.up();
    const ok = await page
      .waitForFunction((n) => (window as any).__atoll.state().moves === n + 1, before, { timeout: 2500 })
      .then(() => true)
      .catch(() => false);
    if (ok) break;
  }
  await expect.poll(() => page.evaluate(() => (window as any).__atoll.state().moves)).toBe(before + 1);
  if (wait) await page.waitForTimeout(wait);
  return true;
}

export const state = (page: Page) => page.evaluate(() => (window as any).__atoll.state());
