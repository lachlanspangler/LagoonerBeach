/**
 * Share card outcomes are honest: a closed share sheet is 'cancelled' (not "Shared"), no Web Share
 * falls back to a download, and the native shells never claim a download a WebView can't do.
 */
import { expect, test, type Page } from '@playwright/test';
import { boot } from './helpers.ts';

const tryShare = (page: Page) => page.evaluate(() => (window as any).__atoll.shareTry('boxcrab') as Promise<string>);

test('share card: shared / cancelled / download / native failure', async ({ page }) => {
  await boot(page);
  // Web Share with files, completed
  await page.evaluate(() => {
    const n = navigator as any;
    n.canShare = (d: { files?: File[] }) => !!d.files?.[0] && d.files[0].type === 'image/png' && d.files[0].size > 1000;
    n.share = async () => undefined;
  });
  expect(await tryShare(page)).toBe('shared');
  // the player closes the sheet
  await page.evaluate(() => {
    (navigator as any).share = async () => {
      throw new DOMException('closed', 'AbortError');
    };
  });
  expect(await tryShare(page)).toBe('cancelled');
  // no Web Share: a download
  await page.evaluate(() => {
    (navigator as any).canShare = undefined;
    (navigator as any).share = undefined;
  });
  const dl = page.waitForEvent('download');
  expect(await tryShare(page)).toBe('downloaded');
  expect((await dl).suggestedFilename()).toBe('lagooner-beach-boxcrab.png');
  // a native shell whose share plugin fails: 'failed', never a pretend download
  await page.evaluate(() => {
    (window as any).Capacitor = { isNativePlatform: () => true, Plugins: {} };
  });
  expect(await tryShare(page)).toBe('failed');
});
