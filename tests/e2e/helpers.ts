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

/** Perform the bot's next move with a real pointer drag. Returns false if the game is over. */
export async function dragMove(page: Page, bot = 'greedy', wait = 60): Promise<boolean> {
  const plan = await page.evaluate((b) => (window as any).__atoll.plan(b), bot);
  if (!plan) return false;
  const before = await page.evaluate(() => (window as any).__atoll.state().moves);
  await page.mouse.move(plan.down.x, plan.down.y);
  await page.mouse.down();
  await page.mouse.move((plan.down.x + plan.up.x) / 2, (plan.down.y + plan.up.y) / 2, { steps: 4 });
  await page.mouse.move(plan.up.x, plan.up.y, { steps: 4 });
  await page.mouse.up();
  await expect.poll(() => page.evaluate(() => (window as any).__atoll.state().moves)).toBe(before + 1);
  if (wait) await page.waitForTimeout(wait);
  return true;
}

export const state = (page: Page) => page.evaluate(() => (window as any).__atoll.state());
