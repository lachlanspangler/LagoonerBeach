import { expect, test, type Page } from '@playwright/test';
import { boot, dragMove } from './helpers.ts';

// Discovery pacing (ADR 0012, final review fixes): the first-ever catch, one pop at a time, the
// strip's progress line hidden under a pop, fast-play backlogs merged, and game over folding them.

/** Record every reveal element as it's added: when, what, and whether the strip was held. */
async function watchReveals(page: Page): Promise<void> {
  await page.evaluate(() => {
    const w = window as any;
    w.__rv = { added: [] as { t: number; cls: string; text: string; chipsEnd: number }[], maxPops: 0, unheld: 0 };
    const root = document.getElementById('ui')!;
    new MutationObserver((ms) => {
      for (const m of ms)
        for (const n of m.addedNodes)
          if (n instanceof HTMLElement && (n.classList.contains('reveal') || n.classList.contains('reveal-pop')))
            w.__rv.added.push({
              t: performance.now(),
              cls: n.className,
              text: n.textContent ?? '',
              chipsEnd: w.__atoll.chipsEnd(),
            });
    }).observe(root, { childList: true });
    const tick = () => {
      const pops = root.querySelectorAll('.reveal-pop').length;
      w.__rv.maxPops = Math.max(w.__rv.maxPops, root.querySelectorAll('.reveal-pop, .reveal').length);
      // a pop on screen (fading out included) always holds the strip: no progress line under it
      if (pops && !w.__atoll.stripHeld()) w.__rv.unheld++;
      requestAnimationFrame(tick);
    };
    tick();
  });
}

const rv = (page: Page) => page.evaluate(() => (window as any).__rv);

test('the first-ever catch: the lesson chips play first, then a full card that introduces the journal', async ({
  page,
}) => {
  await boot(page, 'seed=42');
  await watchReveals(page);
  for (let i = 0; i < 30 && !(await rv(page)).added.length; i++) {
    // play on like a player, but never dismiss the card here: we read it below
    const st = await page.evaluate(() => (window as any).__atoll.revealState());
    if (st) break;
    await dragMove(page, 'greedy', 300);
  }
  await expect.poll(async () => (await rv(page)).added.length, { timeout: 15000 }).toBeGreaterThan(0);
  const first = (await rv(page)).added[0];
  // a modal card (never the small pop), after "That's a lagoon!" / "Water fills any closed ring"
  expect(first.cls).toContain('r-intro');
  expect(first.cls).not.toContain('reveal-pop');
  expect(first.t).toBeGreaterThanOrEqual(first.chipsEnd);
  expect(first.text).toContain('Your first catch');
  expect(first.text).toContain('they live in your Beach Journal');
  // (a drag helper may already have pressed Continue for us)
  if (await page.locator('.reveal').count()) {
    await expect(page.locator('.reveal.settled')).toHaveCount(1, { timeout: 5000 });
    await page.locator('.reveal.settled .btn.primary').click();
  }
  // then it points at the journal button (a glow and a small arrow; no creature flies there)
  await expect(page.locator('#side-btn.guide')).toHaveCount(1);
  await expect(page.locator('.journal-guide')).toBeVisible();
  await expect(page.locator('.journal-guide')).toHaveCount(0, { timeout: 7000 });
  await expect(page.locator('#side-btn.guide')).toHaveCount(0);
});

test('two discovery pops never show at once, and a pop always holds the strip (no progress line under it)', async ({
  page,
}) => {
  await boot(page, 'mode=puzzle');
  await watchReveals(page);
  await page.evaluate(() => (window as any).__atoll.revealSpecies('periwinkle'));
  await page.waitForTimeout(150);
  await page.evaluate(() => (window as any).__atoll.revealSpecies('minnow'));
  await expect.poll(async () => (await rv(page)).added.length, { timeout: 8000 }).toBe(2);
  await expect(page.locator('.reveal-pop')).toHaveCount(0, { timeout: 5000 });
  const r = await rv(page);
  expect(r.maxPops).toBe(1);
  expect(r.unheld).toBe(0);
  expect(r.added.map((a: { text: string }) => a.text)).toEqual([
    expect.stringContaining('Periwinkle'),
    expect.stringContaining('Minnow'),
  ]);
});

test('fast play: a backlog of common finds leaves as one "+N new" pop', async ({ page }) => {
  await boot(page);
  await watchReveals(page);
  await page.evaluate(() => {
    const a = (window as any).__atoll;
    a.revealSpecies('periwinkle');
    setTimeout(() => ['minnow', 'hermit', 'limpet'].forEach((id) => a.revealSpecies(id)), 100);
  });
  await expect.poll(async () => (await rv(page)).added.length, { timeout: 8000 }).toBe(2);
  await page.waitForTimeout(2500);
  const r = await rv(page);
  expect(r.added.length).toBe(2);
  expect(r.added[0].text).toContain('Periwinkle');
  expect(r.added[1].text).toContain('+3 new');
  expect(r.maxPops).toBe(1);
});

test('game over: pending commons fold into the results, at most one modal card still plays', async ({ page }) => {
  await boot(page);
  await watchReveals(page);
  await page.evaluate(() => {
    const a = (window as any).__atoll;
    for (const id of ['periwinkle', 'minnow', 'hermit', 'sandeel', 'moray']) a.revealSpecies(id);
    a.revealEndGame();
  });
  await expect.poll(async () => (await rv(page)).added.length, { timeout: 5000 }).toBeGreaterThan(0);
  await expect(page.locator('.reveal.settled')).toHaveCount(1, { timeout: 5000 });
  await page.locator('.reveal.settled .btn.primary').click();
  await page.waitForTimeout(1500);
  const r = await rv(page);
  // the first pop on screen may finish; then only the rarest modal (the moray)
  const shown = r.added.map(
    (a: { cls: string; text: string }) => a.cls.split(' ')[0] + ':' + a.text.replace(/\s+/g, ' '),
  );
  expect(shown.filter((s: string) => s.startsWith('reveal:')).length).toBe(1);
  expect(shown.find((s: string) => s.startsWith('reveal:'))).toContain('Moray');
  expect(shown.length).toBeLessThanOrEqual(2);
  expect(await page.evaluate(() => (window as any).__atoll.revealState())).toBeNull();
});

test('results "New in your journal": the rarity pips fit inside their thumbnails', async ({ page }) => {
  await boot(page);
  await page.evaluate(() =>
    (window as any).__atoll.showResults({ score: 900, prevBest: 2000, newIds: ['periwinkle', 'moray', 'kraken'] }),
  );
  await expect(page.locator('.jstrip-row .j-tile')).toHaveCount(3, { timeout: 5000 });
  const fits = await page.evaluate(() =>
    [...document.querySelectorAll('.jstrip-row .j-tile')].map((t) => {
      const a = t.getBoundingClientRect();
      const p = t.querySelector('.pips')!.getBoundingClientRect();
      return p.left >= a.left + 2 && p.right <= a.right - 2;
    }),
  );
  expect(fits).toEqual([true, true, true]);
});

test('results: an unlocked style is a "New style" with its colours and a Try it button (never "pebbles")', async ({
  page,
}) => {
  await boot(page);
  await page.evaluate(() => (window as any).__atoll.showResults({ score: 900, prevBest: 2000, unlocked: ['glyph'] }));
  const u = page.getByTestId('unlock');
  await expect(u).toContainText('New style: Glyph');
  await expect(u).not.toContainText(/pebble/i);
  await expect(u.locator('.swatches i')).toHaveCount(6);
  await u.getByRole('button', { name: 'Try the Glyph (high contrast) style' }).click();
  await expect(u.locator('.btn.try')).toHaveText('On');
});
