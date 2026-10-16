/**
 * Leaderboard review shots: results card → name entry → board, the menu entry, offline state.
 *   LB_URL=http://localhost:5317 npx tsx scripts/lb-shots.ts [--theme night] [--w 390 --h 844]
 * Writes artifacts/shots/lb-*.png and prints console errors.
 */
import { chromium, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const arg = (k: string, d: string) => {
  const i = process.argv.indexOf(`--${k}`);
  return i >= 0 ? process.argv[i + 1]! : d;
};
const url = process.env.LB_URL ?? 'http://localhost:5317';
const theme = arg('theme', 'day');
const out = 'artifacts/shots';
mkdirSync(out, { recursive: true });
const browser = await chromium.launch();
const errors: string[] = [];

async function open(query: string): Promise<Page> {
  const ctx = await browser.newContext({
    viewport: { width: Number(arg('w', '390')), height: Number(arg('h', '844')) },
    deviceScaleFactor: 2,
    hasTouch: true,
    colorScheme: theme === 'night' ? 'dark' : 'light',
  });
  const page = await ctx.newPage();
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(`${url}/?debug=1&fast=1&${query}`);
  await page.waitForFunction(() => (window as any).__atoll, null, { timeout: 15000 });
  await page.waitForTimeout(400);
  return page;
}

const t = theme === 'night' ? '-night' : '';
const page = await open('mode=daily');
await page.evaluate(() => (window as any).__atoll.autoplay('human', 400));
await page.getByTestId('final-score').waitFor();
await page.waitForTimeout(500);
await page.screenshot({ path: `${out}/lb-1-results${t}.png` });
await page.locator('#lb-open').click();
await page.getByTestId('lb-name-entry').waitFor();
await page.waitForTimeout(400);
await page.screenshot({ path: `${out}/lb-2-name-empty${t}.png` });
await page.keyboard.type('c0r@al');
await page.waitForTimeout(250);
await page.screenshot({ path: `${out}/lb-3-name-typed${t}.png` });
await page.getByTestId('lb-post').click();
await page.locator('.lb-row.me').waitFor();
await page.waitForTimeout(500);
await page.screenshot({ path: `${out}/lb-4-board-daily${t}.png` });
await page.getByRole('tab', { name: 'All-time' }).click();
await page.waitForTimeout(500);
await page.screenshot({ path: `${out}/lb-5-board-alltime${t}.png` });

const p2 = await open('seed=5');
await p2.getByRole('button', { name: 'Menu' }).click();
await p2.getByRole('button', { name: 'Leaderboards' }).click();
await p2.waitForTimeout(600);
await p2.screenshot({ path: `${out}/lb-6-menu-board${t}.png` });

const p3 = await open('seed=5&lboffline=1');
await p3.getByRole('button', { name: 'Menu' }).click();
await p3.getByRole('button', { name: 'Leaderboards' }).click();
await p3.waitForTimeout(600);
await p3.screenshot({ path: `${out}/lb-7-offline${t}.png` });

console.log(errors.length ? `console errors:\n${errors.join('\n')}` : 'no console errors');
await browser.close();
