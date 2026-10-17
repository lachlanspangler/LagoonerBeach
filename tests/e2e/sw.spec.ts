/**
 * Service worker policy (public/sw.js, ADR 0005): a deploy is picked up on the next load (index is
 * network-first), the shell still boots offline, a script request is never answered with
 * index.html, and a new build's worker drops the old caches.
 */
import { expect, test } from '@playwright/test';

test('service worker: new index after a deploy, offline shell, versioned caches', async ({ page, context }) => {
  await page.goto('/?sw=1&seed=5');
  await page.evaluate(() => navigator.serviceWorker.ready.then(() => undefined));
  await page.reload();
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
  const first = await page.evaluate(async () => (await caches.keys()).filter((k) => k.startsWith('lagooner-')));
  expect(first).toHaveLength(1);

  // "deploy" a new index: the server now answers with a marked page
  await context.route(
    (u) => u.pathname === '/' || u.pathname === '/index.html',
    async (r) => {
      const res = await r.fetch();
      const body = (await res.text()).replace('<head>', '<head><meta name="build" content="next" />');
      await r.fulfill({ response: res, body });
    },
  );
  await page.reload();
  await expect(page.locator('meta[name="build"]')).toHaveCount(1);
  await context.unrouteAll();

  // offline: the app shell (cached index + entry chunks) still boots
  await context.setOffline(true);
  await page.reload();
  await expect(page.locator('#game')).toBeVisible();
  await expect.poll(() => page.evaluate(() => document.getElementById('ui')!.childElementCount)).toBeGreaterThan(0);
  // a missing script is an error, never index.html served as JavaScript
  const missing = await page.evaluate(() =>
    fetch('./assets/not-a-chunk-123.js').then(
      (r) => `${r.status} ${r.headers.get('content-type') ?? ''}`,
      () => 'network error',
    ),
  );
  expect(missing).not.toMatch(/text\/html/);
  await context.setOffline(false);

  // a new build registers a new script URL: its activate drops the previous cache
  await page.evaluate(async () => {
    await navigator.serviceWorker.register('./sw.js?v=e2e-next');
  });
  await expect
    .poll(() => page.evaluate(async () => (await caches.keys()).filter((k) => k.startsWith('lagooner-'))))
    .toEqual(['lagooner-e2e-next']);
});
