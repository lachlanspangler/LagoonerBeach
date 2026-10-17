/**
 * Larger text must scale text, not boxes: every card and sheet stays inside the viewport on small
 * phones. (It used to be `zoom: 1.12`, which also scaled min(100vw, 480px) and the dvh heights, so
 * the Settings sheet was 420×729 on a 375×667 screen.)
 */
import { expect, test, type Page } from '@playwright/test';
import { boot } from './helpers.ts';

async function expectInside(page: Page, where: string) {
  // let the enter transition finish (sheets slide up, cards scale in)
  await page.waitForTimeout(700);
  const out = await page.evaluate(() => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const bad: string[] = [];
    let seen = 0;
    for (const el of document.querySelectorAll<HTMLElement>('.veil.show .card, .veil.show .sheet')) {
      const r = el.getBoundingClientRect();
      if (r.width === 0) continue;
      seen++;
      if (r.left < -1 || r.top < -1 || r.right > vw + 1 || r.bottom > vh + 1)
        bad.push(
          `${el.className} ${Math.round(r.left)},${Math.round(r.top)} ${Math.round(r.width)}×${Math.round(r.height)} in ${vw}×${vh}`,
        );
    }
    return { bad, seen };
  });
  expect(out.seen, `${where}: a card or sheet is open`).toBeGreaterThan(0);
  expect(out.bad, where).toEqual([]);
}

for (const vp of [
  { width: 375, height: 667 },
  { width: 390, height: 844 },
]) {
  test(`larger text: every sheet and card fits ${vp.width}×${vp.height}`, async ({ page }) => {
    await page.setViewportSize(vp);
    await boot(page, 'seed=3&fast=1');
    await page.getByRole('button', { name: 'Menu' }).click();
    await page.getByRole('button', { name: 'Settings' }).click();
    const sw = page.getByRole('switch', { name: 'Larger text' });
    await sw.click();
    await expect(page.locator('html')).toHaveAttribute('data-large', '1');
    // the text really is larger
    const fs = await page
      .locator('.sheet .title-m')
      .first()
      .evaluate((e) => parseFloat(getComputedStyle(e).fontSize));
    expect(fs).toBeGreaterThan(22);
    await expectInside(page, 'settings');
    await page.getByRole('button', { name: 'Done' }).click();
    await page.getByRole('button', { name: 'Menu' }).click();
    await expectInside(page, 'menu');
    await page.getByRole('button', { name: 'Beach Journal' }).click();
    await expectInside(page, 'journal');
    await page.locator('.j-tile').first().click();
    await expectInside(page, 'species');
    await page.keyboard.press('Escape');
    await page.keyboard.press('Escape');
    await page.evaluate(() => (window as any).__atoll.switchMode('puzzle'));
    await expect.poll(() => page.evaluate(() => (window as any).__atoll.mode())).toBe('puzzle');
    await page.getByRole('button', { name: 'Menu' }).click();
    await page.getByRole('button', { name: 'All reefs' }).click();
    await expectInside(page, 'reef grid');
    await page.keyboard.press('Escape');
    await page.evaluate(() => (window as any).__atoll.switchMode('classic'));
    await page.evaluate(() => (window as any).__atoll.showResults({ score: 1234, prevBest: 900 }));
    await expectInside(page, 'results');
  });
}
