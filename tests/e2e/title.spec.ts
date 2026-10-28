/**
 * The title screen (ADR 0015): shows on a cold launch, one tap into play, never in the way of a deep
 * link, a quick return or a player who switched it off, and a quiet way to About and Settings.
 * Automated runs skip it unless asked: `?title` forces it, `?titlerules` applies the real rules.
 */
import { expect, test, type Page } from '@playwright/test';
import { boot, dragMove } from './helpers.ts';

const title = (page: Page) => page.locator('#title');
const showing = (page: Page) => page.evaluate(() => document.documentElement.dataset.title === '1');

test('cold launch: the title, then one tap into a playable board', async ({ page }) => {
  const errors = await boot(page, 'titlerules');
  await expect(title(page)).toBeVisible();
  await expect(page.getByRole('heading', { level: 1, name: 'Lagooner Beach' })).toBeVisible();
  const play = page.getByRole('button', { name: 'Play', exact: true });
  await expect(play).toBeFocused(); // Enter plays
  const box = (await play.boundingBox())!;
  expect(box.width).toBeGreaterThanOrEqual(240);
  expect(box.height).toBeGreaterThanOrEqual(64);
  for (const name of ['About', 'Settings']) {
    const b = (await page.getByRole('button', { name, exact: true }).boundingBox())!;
    expect(b.height, name).toBeGreaterThanOrEqual(44);
  }
  // the wordmark is set in its own face (2 KB, ADR 0013), not a fallback
  await page.evaluate(() => document.fonts.ready);
  expect(await page.evaluate(() => document.fonts.check('800 64px "Lagoon Title"', 'Lagooner Beach'))).toBe(true);
  const t0 = Date.now();
  await play.click();
  await expect(title(page)).toHaveCount(0, { timeout: 1500 });
  expect(Date.now() - t0).toBeLessThan(1500);
  expect(await showing(page)).toBe(false);
  expect(await dragMove(page)).toBe(true);
  expect(errors).toEqual([]);
});

test('keyboard: Enter on the focused Play starts the game', async ({ page }) => {
  await boot(page, 'title=1');
  await page.keyboard.press('Enter');
  await expect(title(page)).toHaveCount(0, { timeout: 1500 });
});

test('a run in progress: Play says what it continues', async ({ page }) => {
  await boot(page, 'seed=42');
  expect(await dragMove(page)).toBe(true);
  await page.goto('/?debug=1&title=1');
  await page.waitForFunction(() => (window as any).__atoll);
  await expect(page.getByRole('button', { name: /^Continue Endless/ })).toBeVisible();
  await expect(page.locator('.t-play-l')).toHaveText('Continue');
  await expect(page.locator('.t-play-s')).toHaveText(/^Endless/);
});

test('never in the way: deep links, quick returns and the setting skip it', async ({ browser }) => {
  // Each launch is a fresh context (a cold start) with the stored state set before any page script
  // runs. Pages sharing a context raced: a closing page's "hidden just now" write could land after
  // the next launch's setup (WebKit's storage is asynchronous across pages).
  const launch = async (query: string, prefs: object | null) => {
    const ctx = await browser.newContext();
    if (prefs) await ctx.addInitScript((v) => localStorage.setItem('atoll.v1.title', v), JSON.stringify(prefs));
    const p = await ctx.newPage();
    await p.goto(`/?debug=1&titlerules&${query}`);
    await p.waitForFunction(() => (window as any).__atoll);
    return p;
  };
  const shown = async (query: string, prefs: object | null) => {
    const p = await launch(query, prefs);
    const on = await showing(p);
    await p.context().close();
    return on;
  };
  expect(await shown('mode=daily', null), 'a shared Daily link: zero taps').toBe(false);
  expect(await shown('seed=5', null)).toBe(false);
  expect(await shown('', null), 'a cold launch').toBe(true);
  expect(await shown('', { at: Date.now() - 60_000 }), 'back within a minute').toBe(false);
  expect(await shown('', { at: Date.now() - 11 * 60_000 }), 'long gone: welcome back').toBe(true);
  expect(await shown('', { off: true }), 'Open straight into the game').toBe(false);
  // leaving the app records when (the next quick launch skips the title)
  const p = await launch('', null);
  await p.evaluate(() => window.dispatchEvent(new Event('pagehide')));
  const at = await p.evaluate(() => JSON.parse(localStorage.getItem('atoll.v1.title')!).at as number);
  expect(Math.abs(Date.now() - at)).toBeLessThan(10_000);
  // the setting, from the title's own Settings
  await p.evaluate(() => localStorage.removeItem('atoll.v1.title'));
  await p.getByRole('button', { name: 'Settings', exact: true }).click();
  const sw = p.getByRole('switch', { name: 'Open straight into the game' });
  await expect(sw).toHaveAttribute('aria-checked', 'false');
  await sw.click();
  await expect(p.getByRole('switch', { name: 'Open straight into the game' })).toHaveAttribute('aria-checked', 'true');
  expect(await p.evaluate(() => JSON.parse(localStorage.getItem('atoll.v1.title')!).off)).toBe(true);
  await p.context().close();
});

test('About from the title, then back to it and play', async ({ page }) => {
  await boot(page, 'title=1');
  await page.getByRole('button', { name: 'About', exact: true }).click();
  const about = page.locator('.sheet[data-kind="about"]');
  await expect(about).toBeVisible();
  await expect(about).toContainText('I will not take any funding.');
  // the sheet sits above the title, and closing it returns to the title
  const top = await page.evaluate(() => {
    const r = document.querySelector('.sheet[data-kind="about"]')!.getBoundingClientRect();
    return document.elementFromPoint(r.x + r.width / 2, r.y + 40)?.closest('.sheet') !== null;
  });
  expect(top).toBe(true);
  await about.getByRole('button', { name: 'Close' }).click();
  await expect(about).toBeHidden();
  await expect(title(page)).toBeVisible();
  await page.getByRole('button', { name: 'Play', exact: true }).click();
  await expect(title(page)).toHaveCount(0, { timeout: 1500 });
});

test('Night, reduced motion and a small phone with Larger text', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' });
  await boot(page, 'title=1');
  expect(await page.evaluate(() => document.documentElement.dataset.theme)).toBe('night');
  // everything on screen, nothing overlapping: lockup above Play above the footer
  const r = await page.evaluate(() => {
    const b = (s: string) => document.querySelector(s)!.getBoundingClientRect();
    return { lock: b('.t-lock'), play: b('.t-play'), foot: b('.t-foot'), h: innerHeight };
  });
  expect(r.lock.bottom).toBeLessThanOrEqual(r.play.top);
  expect(r.play.bottom).toBeLessThan(r.foot.top);
  expect(r.foot.bottom).toBeLessThanOrEqual(r.h);
  expect(r.lock.top).toBeGreaterThanOrEqual(0);
});

test('behind the title the game stays out of reach, even after a sheet opened from it closes', async ({ page }) => {
  await boot(page, 'title=1');
  const reachable = () =>
    page.evaluate(
      () => [...document.querySelectorAll('#ui > button, #game')].filter((e) => !e.closest('[inert]')).length,
    );
  expect(await reachable()).toBe(0);
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByRole('button', { name: 'Done' }).click();
  await expect(page.locator('.sheet[data-kind="settings"]')).toHaveCount(0);
  expect(await reachable()).toBe(0);
  await page.getByRole('button', { name: 'Play', exact: true }).click();
  await expect(title(page)).toHaveCount(0, { timeout: 1500 });
  expect(await reachable()).toBeGreaterThan(0);
});

test('the phone switching to dark mode while the title is up repaints its sky', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await boot(page, 'title=1');
  await page.waitForFunction(() => document.querySelector('#title-bg.on'));
  const sky = () =>
    page.evaluate(() => {
      const c = document.getElementById('title-bg') as HTMLCanvasElement;
      const d = c.getContext('2d')!.getImageData(4, 4, 1, 1).data;
      return d[0]! + d[1]! + d[2]!;
    });
  expect(await sky()).toBeGreaterThan(600); // cream
  await page.emulateMedia({ colorScheme: 'dark' });
  await expect.poll(sky).toBeLessThan(150); // night
  expect(await page.evaluate(() => document.documentElement.dataset.theme)).toBe('night');
});
