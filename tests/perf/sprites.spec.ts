/**
 * Block sprite warm-up (ADR 0014): the reef materials are drawn once into the sprite cache, never
 * per frame. Building the whole set a phone layout needs (6 colours × board cell in 3 per-cell
 * variants + tray cell, normal and lit) at dpr 3 under a 4× CPU throttle must stay a short, one-off
 * idle task. Rasterization is included (the hook forces the recorded canvases to draw).
 */
import { expect, test } from '@playwright/test';
import { boot } from '../e2e/helpers.ts';

const K = process.env.CI ? 3 : 1;

for (const scheme of ['light', 'dark'] as const)
  test(`sprite warm-up at dpr 3, 4× throttle (${scheme})`, async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, colorScheme: scheme });
    const page = await ctx.newPage();
    await boot(page, 'seed=11');
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    const runs: { ms: number; sprites: number }[] = [];
    for (let i = 0; i < 7; i++) runs.push(await page.evaluate(() => (window as any).__atoll.spriteWarm(3)));
    const ms = runs.map((r) => r.ms).sort((a, b) => a - b);
    console.log('sprite warm ms', scheme, runs[0]!.sprites, 'sprites:', ms.map((x) => x.toFixed(1)).join(' '));
    expect(runs[0]!.sprites).toBe(30); // 6 colours × (2 board variants × normal + lit, 1 tray)
    // median of 7: one idle task of a few tens of ms at most, once per theme/size change
    expect(ms[3]!).toBeLessThan(40 * K);
    await ctx.close();
  });
