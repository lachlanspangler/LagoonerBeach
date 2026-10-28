/**
 * The About page (ADR 0016): reachable from Settings, says "no funding" plainly, signed, and links
 * exactly the verified charities (src/meta/charities.ts ↔ docs/research/CHARITIES.md) as clean,
 * untracked links that leave the app. Tapping one must not navigate the game away.
 */
import { expect, test, type Page } from '@playwright/test';
import { CHARITIES } from '../../src/meta/charities.ts';
import { boot } from './helpers.ts';

async function openAbout(page: Page) {
  await page.getByRole('button', { name: 'Menu' }).click();
  await page.getByRole('button', { name: 'Settings' }).click();
  await page.getByRole('button', { name: /^A note from Lachlan/ }).click();
  await expect(page.locator('.sheet[data-kind="about"]')).toBeVisible();
}

test('About: pledge, signature and every charity link, from Settings and back', async ({ page }) => {
  const errors = await boot(page);
  await openAbout(page);
  const sheet = page.locator('.sheet[data-kind="about"]');
  await expect(sheet.getByRole('heading', { name: 'About', exact: true })).toBeVisible();
  await expect(sheet).toContainText('I will not take any funding.');
  await expect(sheet).toContainText('you can donate to these charities and funds to help coastal wildlife');
  await expect(sheet).toContainText('Lachlan Spangler');
  await expect(sheet).toContainText('grew up in Laguna Beach');
  const links = sheet.locator('a.ab-link');
  await expect(links).toHaveCount(CHARITIES.length);
  for (const [i, c] of CHARITIES.entries()) {
    const a = links.nth(i);
    await expect(a).toHaveAttribute('href', c.url);
    await expect(a).toHaveAttribute('target', '_blank');
    await expect(a).toHaveAttribute('rel', /noopener/);
    await expect(a).toHaveAttribute('rel', /noreferrer/);
    await expect(a).toHaveAttribute('referrerpolicy', 'no-referrer');
    // a screen reader hears the name, what it does, and that it leaves the app
    await expect(a).toHaveAccessibleName(new RegExp(`^${c.name}.*opens in your browser$`));
    const box = (await a.boundingBox())!;
    expect(box.height, `${c.name} tap target`).toBeGreaterThanOrEqual(44);
  }
  // a tap opens a new page and leaves the game where it was. No network: the charity is stubbed,
  // and the request it gets carries no referrer and nothing we added.
  const seen: { url: string; referer?: string }[] = [];
  await page.context().route(/^https:\/\/(?!localhost)/, (r) => {
    seen.push({ url: r.request().url(), referer: r.request().headers()['referer'] });
    return r.fulfill({ status: 200, contentType: 'text/html', body: '<title>stub</title>' });
  });
  const [popup] = await Promise.all([page.waitForEvent('popup'), links.first().click()]);
  await popup.waitForLoadState();
  expect(popup.url()).toBe(CHARITIES[0]!.url);
  expect(seen[0]).toEqual({ url: CHARITIES[0]!.url, referer: undefined });
  await popup.close();
  expect(new URL(page.url()).host).toMatch(/localhost|127\.0\.0\.1/);
  await expect(sheet).toBeVisible();
  // back returns to Settings
  await sheet.getByRole('button', { name: 'Back to settings' }).click();
  await expect(page.locator('.sheet[data-kind="settings"]')).toBeVisible();
  expect(errors).toEqual([]);
});

test('About: Larger text and Night keep it inside the screen and readable', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await page.emulateMedia({ colorScheme: 'dark' });
  await boot(page);
  await page.getByRole('button', { name: 'Menu' }).click();
  await page.getByRole('button', { name: 'Settings' }).click();
  await page.getByRole('switch', { name: 'Larger text' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-large', '1');
  await page.getByRole('button', { name: /^A note from Lachlan/ }).click();
  await expect(page.locator('.sheet[data-kind="about"]')).toBeVisible();
  await page.waitForTimeout(600);
  const r = await page.locator('.sheet[data-kind="about"]').boundingBox();
  expect(r!.x).toBeGreaterThanOrEqual(-1);
  expect(r!.x + r!.width).toBeLessThanOrEqual(376);
  // nothing overflows sideways inside the cards
  const over = await page.evaluate(
    () =>
      [...document.querySelectorAll<HTMLElement>('.ab-link')].filter((e) => e.scrollWidth > e.clientWidth + 1).length,
  );
  expect(over).toBe(0);
});

test('About from the home menu, with logos, and back to the menu', async ({ page }) => {
  await boot(page);
  await page.getByRole('button', { name: 'Menu' }).click();
  await page.getByRole('button', { name: 'About', exact: true }).click();
  const sheet = page.locator('.sheet[data-kind="about"]');
  await expect(sheet).toBeVisible();
  const logos = sheet.locator('.ab-logo img');
  await expect(logos).toHaveCount(CHARITIES.length);
  // every logo actually loads (bundled files, not hot-linked)
  await expect
    .poll(() => logos.evaluateAll((els) => els.every((e) => (e as HTMLImageElement).naturalWidth > 0)))
    .toBe(true);
  await sheet.getByRole('button', { name: 'Back to menu' }).click();
  await expect(page.locator('.sheet[data-kind="menu"]')).toBeVisible();
});
