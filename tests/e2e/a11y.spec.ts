/** Accessibility sweep: every control on every screen has a ≥44 px target and an accessible name. */
import { expect, test, type Page } from '@playwright/test';
import { boot } from './helpers.ts';

async function checkTargets(page: Page, where: string) {
  // measure settled layouts: sheets scale in/out, so mid-animation sizes read 43.9 px
  await page.waitForFunction(() =>
    document.getAnimations().every((a) => a.playState !== 'running' || a.effect?.getTiming().iterations === Infinity),
  );
  const measure = () =>
    page.evaluate(() => {
      const out: string[] = [];
      for (const el of document.querySelectorAll<HTMLElement>(
        'button, [role="button"], [role="switch"], [role="radio"], [role="tab"], [role="textbox"]',
      )) {
        const r = el.getBoundingClientRect();
        if (r.width === 0 || getComputedStyle(el).visibility === 'hidden') continue;
        const name = el.getAttribute('aria-label') || el.textContent?.trim();
        if (r.width < 44 || r.height < 44) out.push(`${name} ${Math.round(r.width)}×${Math.round(r.height)}`);
        if (!name) out.push(`unnamed control ${el.className}`);
      }
      return out;
    });
  // a sheet's spring can still be settling a frame after its animations end: poll until stable
  await expect.poll(measure, { message: where, timeout: 3000 }).toEqual([]);
}

test('touch targets and names on every screen', async ({ page }) => {
  await boot(page, 'seed=3&fast=1');
  await checkTargets(page, 'game');
  await page.getByRole('button', { name: 'Menu' }).click();
  await checkTargets(page, 'menu');
  await page.getByRole('button', { name: 'Settings' }).click();
  await checkTargets(page, 'settings');
  await page.getByRole('button', { name: 'Done' }).click();
  await page.evaluate(() => (window as any).__atoll.autoplay('human', 400));
  await page.waitForTimeout(300);
  await checkTargets(page, 'game over');
  await page.locator('#lb-open').click();
  await expect(page.getByTestId('lb-name-entry')).toBeVisible();
  await checkTargets(page, 'leaderboard name entry');
  await page.keyboard.type('coral');
  await page.getByTestId('lb-post').click();
  await expect(page.locator('.lb-row.me')).toBeVisible();
  await checkTargets(page, 'leaderboard');
  await page.getByRole('button', { name: 'Close leaderboard' }).click();
  await expect(page.getByTestId('lb-board')).toHaveCount(0); // its exit animation scales it below 44 px
  await page.evaluate(() => (window as any).__atoll.restart());
  await page.getByRole('button', { name: 'Menu' }).click();
  await page.getByRole('button', { name: 'Beach Journal' }).click();
  await checkTargets(page, 'journal');
  await page.locator('.j-tile').first().click();
  await checkTargets(page, 'species');
  await page.evaluate(() => (window as any).__atoll.switchMode('puzzle'));
  await expect.poll(() => page.evaluate(() => (window as any).__atoll.mode())).toBe('puzzle');
  await page.getByRole('button', { name: 'Menu' }).click();
  await page.getByRole('button', { name: 'All reefs' }).click();
  await checkTargets(page, 'reef grid');
});

test('keyboard: Escape closes dismissable dialogs, Tab stays inside', async ({ page }) => {
  await boot(page);
  await page.getByRole('button', { name: 'Menu' }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog')).toBeVisible();
  for (let i = 0; i < 12; i++) await page.keyboard.press('Tab');
  expect(await page.evaluate(() => !!document.activeElement?.closest('[role="dialog"]'))).toBe(true);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('keyboard: the dialog Tab cycle skips inactive tabs (roving tabindex) and hidden controls', async ({ page }) => {
  await boot(page);
  await page.getByRole('button', { name: 'Menu' }).focus();
  await page.keyboard.press('Enter');
  await page.getByRole('button', { name: 'Leaderboards' }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('lb-board')).toBeVisible();
  await expect(page.locator('.lb-row').first()).toBeVisible();
  const seen: string[] = [];
  for (let i = 0; i < 16; i++) {
    await page.keyboard.press('Tab');
    seen.push(
      await page.evaluate(() => {
        const a = document.activeElement as HTMLElement | null;
        if (!a) return 'none';
        return `${a.getAttribute('role') ?? a.tagName}:${a.getAttribute('aria-selected') ?? ''}:${a.tabIndex}`;
      }),
    );
  }
  expect(seen.filter((s) => s.startsWith('tab:'))).not.toHaveLength(0); // the selected tab is reachable
  expect(seen.filter((s) => s.startsWith('tab:false'))).toEqual([]); // inactive tabs are arrow-key only
  expect(seen.filter((s) => s.endsWith(':-1'))).toEqual([]);
});
