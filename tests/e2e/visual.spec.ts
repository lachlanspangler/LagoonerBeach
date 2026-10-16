/**
 * Layout sanity + screenshots across phone sizes and themes. Screenshots land in
 * test-results/…/ and artifacts/shots/ for human/agent review each loop.
 */
import { expect, test } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { boot, dragMove } from './helpers.ts';

const SIZES = [
  { name: 'se', width: 375, height: 667 },
  { name: 'iphone15', width: 393, height: 852 },
  { name: 'tall-android', width: 412, height: 915 },
  { name: 'small', width: 320, height: 568 },
  { name: 'tablet', width: 820, height: 1180 },
];

for (const sz of SIZES)
  for (const theme of ['light', 'dark'] as const)
    test(`layout ${sz.name} ${theme}`, async ({ browser }) => {
      const ctx = await browser.newContext({
        viewport: { width: sz.width, height: sz.height },
        deviceScaleFactor: 2,
        colorScheme: theme,
        hasTouch: true,
      });
      const page = await ctx.newPage();
      const errors = await boot(page);
      const l = await page.evaluate(() => (window as any).__atoll.layout());
      // board and tray fully on screen, not overlapping, HUD above board
      expect(l.board.x).toBeGreaterThanOrEqual(0);
      expect(l.board.x + l.board.w).toBeLessThanOrEqual(sz.width);
      expect(l.board.y).toBeGreaterThanOrEqual(l.hud.y + l.hud.h - 1);
      expect(l.tray.y).toBeGreaterThan(l.board.y + l.board.h);
      expect(l.tray.y + l.tray.h).toBeLessThanOrEqual(sz.height + 1);
      // cells big enough to read and hit (≥ 34 CSS px on any phone ≥ 360 wide)
      if (sz.width >= 360) expect(l.cell).toBeGreaterThanOrEqual(34);
      for (let i = 0; i < 8; i++) await dragMove(page, 'greedy', 30);
      await page.waitForTimeout(900);
      mkdirSync('artifacts/shots', { recursive: true });
      await page.screenshot({ path: `artifacts/shots/e2e-${sz.name}-${theme}.png` });
      expect(errors).toEqual([]);
      await ctx.close();
    });
