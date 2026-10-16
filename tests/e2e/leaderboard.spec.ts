/** Leaderboards on the on-device (demo) backend: post a Daily, see yourself, reach it from the menu, erase. */
import { expect, test, type Page } from '@playwright/test';
import { boot, dragMove } from './helpers.ts';

const rot13 = (s: string) => s.replace(/[A-Z]/g, (c) => String.fromCharCode(((c.charCodeAt(0) - 52) % 26) + 65));

async function finishDaily(page: Page) {
  await page.evaluate(() => (window as any).__atoll.autoplay('human', 400));
  await expect(page.getByTestId('final-score')).toBeVisible();
  return Number(await page.getByTestId('final-score').textContent());
}

const slots = (page: Page) => page.getByTestId('lb-slots');

test('daily: name entry strips invalid keys live, posts, and shows you with the row above', async ({ page }) => {
  const errors = await boot(page, 'mode=daily&fast=1');
  const score = await finishDaily(page);
  await page.locator('#lb-open').click();
  await expect(page.getByTestId('lb-name-entry')).toBeVisible();
  await expect(page.getByTestId('lb-post')).toBeDisabled();
  // digits and symbols are refused as they're typed; letters are uppercased
  await page.keyboard.type('n3m0x!');
  await expect(slots(page)).toHaveAttribute('aria-valuetext', 'NMX');
  await expect(page.locator('#lb-name-hint')).toHaveText('Letters A–Z only');
  for (let i = 0; i < 3; i++) await page.keyboard.press('Backspace');
  // the on-screen keypad types too
  for (const k of ['N', 'E', 'M', 'O']) await page.getByRole('button', { name: k, exact: true }).click();
  await expect(slots(page)).toHaveAttribute('aria-valuetext', 'NEMO');
  await expect(page.locator('#lb-name-hint')).toHaveText('3 letters left · A–Z only');
  await expect(page.locator('.lb-name-hero')).toHaveText('NEMO');
  await page.getByTestId('lb-post').click();

  const me = page.locator('.lb-row.me');
  await expect(me).toContainText('NEMO');
  await expect(me.locator('.lb-sc')).toContainText(score.toLocaleString('en-US'));
  await expect(page.locator('.lb-note')).toContainText('Posted: #');
  await expect(page.locator('.lb-demo')).toBeVisible(); // demo data is labelled
  const rank = Number((await me.getAttribute('aria-label'))!.match(/rank (\d+)/)![1]);
  if (rank > 1) {
    // the target card names whoever is just above you, and they are the row ranked one higher
    const above = page.locator('.lb-target-who .lb-nm');
    const name = (await above.textContent())!;
    await expect(page.locator('.lb-target-line')).toContainText(`to pass ${name}`);
    await expect(page.locator(`.lb-row[aria-label*="rank ${rank - 1},"]`)).toContainText(name);
  } else await expect(page.locator('.lb-target-card.gold')).toContainText("You're on top");

  // back to the results card, whose button now shows the rank
  await page.getByRole('button', { name: 'Back to results' }).click();
  await expect(page.getByTestId('final-score')).toBeVisible();
  await expect(page.locator('#lb-open')).toHaveText(`Leaderboard · #${rank} today`);
  // the name is remembered for next time
  expect(await page.evaluate(() => (window as any).__atoll.profile().lb.name)).toBe('NEMO');
  expect(errors).toEqual([]);
});

test('blocked and reserved names are refused before posting', async ({ page }) => {
  await boot(page, 'mode=daily&fast=1');
  await finishDaily(page);
  await page.locator('#lb-open').click();
  await page.keyboard.type(rot13('SHPX'));
  await expect(page.locator('#lb-name-hint')).toHaveText("That name isn't allowed. Try another");
  await expect(page.getByTestId('lb-post')).toBeDisabled();
  for (let i = 0; i < 4; i++) await page.keyboard.press('Backspace');
  await page.keyboard.type('admin');
  await expect(page.locator('#lb-name-hint')).toHaveText('That name is reserved. Try another');
  // "No thanks" goes back to the results
  await page.getByRole('button', { name: 'No thanks' }).click();
  await expect(page.getByTestId('final-score')).toBeVisible();
});

test('a classic game resumed after a reload can still be posted (move log saved with the game)', async ({ page }) => {
  await boot(page, '');
  for (let i = 0; i < 4; i++) await dragMove(page);
  await page.reload();
  await page.waitForFunction(() => (window as any).__atoll);
  expect((await page.evaluate(() => (window as any).__atoll.state())).moves).toBe(4);
  await page.evaluate(() => (window as any).__atoll.autoplay('random', 500));
  await expect(page.getByTestId('final-score')).toBeVisible({ timeout: 5000 });
  await page.locator('#lb-open').click();
  await page.keyboard.type('kelp');
  await page.keyboard.press('Enter');
  await expect(page.getByRole('tab', { name: 'This week' })).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('.lb-row.me')).toContainText('KELP');
  await page.getByRole('tab', { name: 'All-time' }).click();
  await expect(page.locator('.lb-row.me')).toContainText('KELP');
});

test('leaderboards are reachable from the menu; tabs work by keyboard; Escape closes', async ({ page }) => {
  await boot(page);
  await page.getByRole('button', { name: 'Menu' }).click();
  await page.getByRole('button', { name: 'Leaderboards' }).click();
  await expect(page.getByTestId('lb-board')).toBeVisible();
  await expect(page.getByRole('tab', { name: 'This week' })).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('.lb-row:not(.lb-skel)').first()).toBeVisible();
  await expect(page.getByRole('button', { name: 'Choose a name' })).toBeVisible(); // not named yet
  await page.getByRole('tab', { name: 'This week' }).focus();
  await page.keyboard.press('ArrowLeft');
  await expect(page.getByRole('tab', { name: 'Daily' })).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByRole('tab', { name: 'Daily' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('erase all progress removes your scores, the queue and your id', async ({ page }) => {
  await boot(page, 'mode=daily&fast=1');
  await finishDaily(page);
  await page.locator('#lb-open').click();
  await page.keyboard.type('tide');
  await page.getByTestId('lb-post').click();
  await expect(page.locator('.lb-row.me')).toContainText('TIDE');
  const id = await page.evaluate(() => (window as any).__atoll.profile().lb.installId);
  expect(id).toMatch(/^[0-9a-f]{32}$/);
  expect(await page.evaluate((i) => localStorage.getItem('atoll.v1.lbmock')!.includes(i), id)).toBe(true);
  await page.getByRole('button', { name: 'Close leaderboard' }).click();
  await page.evaluate(() => (window as any).__atoll.restart());
  await page.getByRole('button', { name: 'Menu' }).click();
  await page.getByRole('button', { name: 'Settings' }).click();
  await page.getByRole('button', { name: 'Erase all progress' }).click();
  await page.getByRole('button', { name: 'Erase all progress' }).click();
  await page.waitForFunction(() => (window as any).__atoll);
  // the deletion request is processed in the background, then its tombstone is dropped
  await expect.poll(() => page.evaluate(() => localStorage.getItem('atoll.v1.lbforget'))).toBeNull();
  const left = await page.evaluate(() => ({
    queue: localStorage.getItem('atoll.v1.lbqueue'),
    mock: localStorage.getItem('atoll.v1.lbmock') ?? '',
    lb: (window as any).__atoll.profile().lb,
  }));
  expect(left.queue).toBeNull();
  expect(left.mock.includes(id)).toBe(false);
  expect(left.lb ?? {}).toEqual({});
  await page.getByRole('button', { name: 'Menu' }).click();
  await page.getByRole('button', { name: 'Leaderboards' }).click();
  await page.getByRole('tab', { name: 'Daily' }).click();
  await expect(page.getByRole('button', { name: 'Choose a name' })).toBeVisible();
  await expect(page.locator('.lb-row.me', { hasText: 'TIDE' })).toHaveCount(0);
});
