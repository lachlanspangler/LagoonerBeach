/**
 * Celebrations (ADR 0012): pixel baselines of the big moments (reduced motion, frozen clock),
 * the no-flash guardrail, the haptic guard, and that input is never blocked by a celebration.
 * Update baselines intentionally: npx playwright test tests/e2e/celebrate.spec.ts --update-snapshots
 */
import { expect, test, type Page } from '@playwright/test';
import { boot, settleReveal } from './helpers.ts';
import { BOARDS, boardString } from './celebrate-boards.ts';

test.describe.configure({ mode: 'parallel' });

async function stage(page: Page, name: keyof typeof BOARDS) {
  const s = BOARDS[name]!;
  await page.evaluate(([b, t]) => (window as any).__atoll.setup(b, t), [boardString(s), s.tray] as const);
  if (s.combo) await page.evaluate((n) => (window as any).__atoll.stageCombo(n), s.combo);
  await page.waitForTimeout(700);
  return s;
}

/** Commit the staged move on a frozen clock and render exactly `t` ms after it. */
async function frozenMoment(page: Page, name: keyof typeof BOARDS, t: number) {
  const s = await stage(page, name);
  await page.evaluate((m) => {
    const a = (window as any).__atoll;
    a.freezeNow();
    a.commitMove(m);
  }, s.move);
  await page.evaluate((t) => (window as any).__atoll.freeze(t), t);
  for (let i = 0; i < 3; i++) await page.evaluate(() => new Promise(requestAnimationFrame));
}

const rmContext = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, reducedMotion: 'reduce' as const };
const SNAP = { maxDiffPixelRatio: 0.002, threshold: 0.08 };

test.describe('baselines', () => {
  test.skip(
    ({ browserName }) => browserName !== 'chromium' || process.platform !== 'darwin',
    'Chromium/macOS baselines',
  );

  test('COMBO ×5 Atoll moment', async ({ browser }) => {
    const ctx = await browser.newContext(rmContext);
    const page = await ctx.newPage();
    await boot(page, 'seed=42');
    await frozenMoment(page, 'atoll', 600);
    await expect(page).toHaveScreenshot('moment-atoll-combo5.png', SNAP);
    await ctx.close();
  });

  test('Spotless moment', async ({ browser }) => {
    const ctx = await browser.newContext(rmContext);
    const page = await ctx.newPage();
    await boot(page, 'seed=42');
    await frozenMoment(page, 'spotless', 700);
    await expect(page).toHaveScreenshot('moment-spotless.png', SNAP);
    await ctx.close();
  });

  test('NEW HIGH SCORE results card', async ({ browser }) => {
    const ctx = await browser.newContext(rmContext);
    const page = await ctx.newPage();
    await boot(page, 'seed=42');
    await page.evaluate(() => (window as any).__atoll.showResults({ score: 5230, prevBest: 4100 }));
    await expect(page.getByTestId('new-high-score')).toBeVisible();
    await page.waitForTimeout(500);
    await expect(page).toHaveScreenshot('results-new-high-score.png', SNAP);
    await ctx.close();
  });

  for (const id of ['boxcrab', 'kraken', 'seadragon'])
    test(`discovery reveal: ${id}`, async ({ browser }) => {
      const ctx = await browser.newContext(rmContext);
      const page = await ctx.newPage();
      await boot(page, 'seed=42');
      await page.evaluate((id) => (window as any).__atoll.revealSpecies(id), id);
      await page.waitForTimeout(300);
      await page.evaluate(() => (window as any).__atoll.revealFreeze(3000));
      await page.waitForTimeout(400);
      await expect(page.locator('.reveal .rv-name')).toBeVisible();
      await expect(page).toHaveScreenshot(`reveal-${id}.png`, SNAP);
      await ctx.close();
    });
});

test('no flashes: mean board luminance never jumps more than 8% between frames (Spotless, biggest)', async ({
  page,
}) => {
  await boot(page, 'seed=42');
  for (const name of ['spotless', 'biggest'] as const) {
    await page.evaluate(() => (window as any).__atoll.freeze(null));
    const s = await stage(page, name);
    await page.evaluate((m) => {
      const a = (window as any).__atoll;
      a.freezeNow();
      a.commitMove(m);
    }, s.move);
    const lum: number[] = [];
    for (let t = 0; t <= 1400; t += 33) {
      await page.evaluate((t) => (window as any).__atoll.freeze(t), t);
      await page.evaluate(() => new Promise(requestAnimationFrame));
      lum.push(
        await page.evaluate(() => {
          const c = document.getElementById('game') as HTMLCanvasElement;
          const l = (window as any).__atoll.layout();
          const dpr = c.width / l.w;
          const g = c.getContext('2d')!;
          const d = g.getImageData(l.board.x * dpr, l.board.y * dpr, l.board.w * dpr, l.board.h * dpr).data;
          let sum = 0;
          for (let i = 0; i < d.length; i += 16) {
            const f = (v: number) => {
              const x = v / 255;
              return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
            };
            sum += 0.2126 * f(d[i]!) + 0.7152 * f(d[i + 1]!) + 0.0722 * f(d[i + 2]!);
          }
          return sum / (d.length / 16);
        }),
      );
    }
    let worst = 0;
    for (let i = 1; i < lum.length; i++) worst = Math.max(worst, Math.abs(lum[i]! - lum[i - 1]!) / lum[i - 1]!);
    console.log(name, 'worst frame-to-frame luminance change', (worst * 100).toFixed(1) + '%');
    expect(worst).toBeLessThan(0.08);
  }
});

test('input is accepted during a celebration (no waiting on the moment)', async ({ page }) => {
  await boot(page, 'seed=42');
  const s = await stage(page, 'atoll');
  const path = await page.evaluate((m) => (window as any).__atoll.pathFor(m), s.move);
  await page.mouse.move(path.down.x, path.down.y);
  await page.mouse.down();
  await page.mouse.move(path.up.x, path.up.y, { steps: 4 });
  await page.mouse.up();
  await expect.poll(() => page.evaluate(() => (window as any).__atoll.state().moves)).toBe(1);
  // immediately (while the Atoll word, burst and combo punch play) place the next piece
  await page.waitForTimeout(120);
  const next = await page.evaluate(() => (window as any).__atoll.pathFor({ slot: 2, x: 0, y: 4 }));
  await page.mouse.move(next.down.x, next.down.y);
  await page.mouse.down();
  await page.mouse.move(next.up.x, next.up.y, { steps: 4 });
  await page.mouse.up();
  await expect.poll(() => page.evaluate(() => (window as any).__atoll.state().moves), { timeout: 1500 }).toBe(2);
  // haptic guard: never two heavies within 300 ms
  const log: { k: string; t: number }[] = await page.evaluate(() => (window as any).__atoll.haptics());
  const heavies = log.filter((h) => h.k === 'heavy').map((h) => h.t);
  for (let i = 1; i < heavies.length; i++) expect(heavies[i]! - heavies[i - 1]!).toBeGreaterThanOrEqual(300);
});

test('a discovery reveal: tap skips the animation, Continue returns to the board; game input resumes', async ({
  page,
}) => {
  await boot(page, 'seed=42');
  await page.evaluate(() => (window as any).__atoll.revealSpecies('kraken'));
  await expect(page.locator('.reveal')).toBeVisible();
  const st = await page.evaluate(() => (window as any).__atoll.revealState());
  expect(st).toMatchObject({ id: 'kraken', modal: true, settled: false });
  // one tap anywhere skips to the settled card (≤ 2 s even without it)
  await page.mouse.click(20, 20);
  await expect.poll(() => page.evaluate(() => (window as any).__atoll.revealState()?.settled)).toBe(true);
  await expect(page.locator('.reveal .rv-name')).toHaveText('Baby Kraken');
  await expect(page.locator('.reveal')).toContainText('Added to your Beach Journal');
  await page.locator('.reveal .btn.primary').click();
  await expect(page.locator('.reveal')).toHaveCount(0);
  await settleReveal(page);
  const plan = await page.evaluate(() => (window as any).__atoll.plan('greedy'));
  await page.mouse.move(plan.down.x, plan.down.y);
  await page.mouse.down();
  await page.mouse.move(plan.up.x, plan.up.y, { steps: 4 });
  await page.mouse.up();
  await expect.poll(() => page.evaluate(() => (window as any).__atoll.state().moves)).toBe(1);
});

test('a tap mid-reveal on where Continue will be only skips the animation (never closes it)', async ({ page }) => {
  await boot(page, 'seed=42');
  await page.evaluate(() => (window as any).__atoll.revealSpecies('kraken'));
  await expect(page.locator('.reveal')).toHaveCount(1);
  const t0 = Date.now();
  const pt = await page.evaluate(() => {
    const r = document.querySelector('.reveal .btn.primary')!.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  });
  // hidden and not pressable until settled
  expect(await page.evaluate(() => getComputedStyle(document.querySelector('.reveal .rv-btns')!).visibility)).toBe(
    'hidden',
  );
  await page.waitForTimeout(Math.max(0, 400 - (Date.now() - t0))); // past the grace (from first paint)
  expect(await page.evaluate(() => (window as any).__atoll.revealState()?.settled)).toBe(false);
  await page.mouse.click(pt.x, pt.y);
  await expect.poll(() => page.evaluate(() => (window as any).__atoll.revealState()?.settled)).toBe(true);
  await page.waitForTimeout(300);
  await expect(page.locator('.reveal')).toHaveCount(1);
  // now Continue does close it
  await page.locator('.reveal .btn.primary').click();
  await expect(page.locator('.reveal')).toHaveCount(0);
});

test('the reveal grace runs from the first paint: a slow open never eats it', async ({ page }) => {
  await boot(page, 'seed=42');
  // open() is followed by a long task (a loaded phone building the card), then the first paint; a
  // press right after that paint was aimed at the board: it must not skip (or close) the card
  await page.evaluate(
    () =>
      new Promise<void>((done) => {
        const root = document.getElementById('ui')!;
        const mo = new MutationObserver(() => {
          const el = root.querySelector('.reveal');
          if (!el) return;
          mo.disconnect();
          const t = performance.now();
          while (performance.now() - t < 400); // the slow build, before anything is painted
          requestAnimationFrame(() =>
            setTimeout(() => {
              el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: 20, clientY: 20 }));
              el.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: 20, clientY: 20 }));
              done();
            }, 0),
          );
        });
        mo.observe(root, { childList: true, subtree: true });
        (window as any).__atoll.revealSpecies('kraken');
      }),
  );
  expect(await page.evaluate(() => (window as any).__atoll.revealState())).toMatchObject({
    id: 'kraken',
    settled: false,
  });
  // after the grace a tap skips as before
  await page.waitForTimeout(300);
  await page.mouse.click(20, 20);
  await expect.poll(() => page.evaluate(() => (window as any).__atoll.revealState()?.settled)).toBe(true);
});

test('reduced motion: a press in the reveal grace is swallowed whatever it hits, and so is its click', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await boot(page, 'seed=42');
  // a press on the board just as the (at once settled) card paints: it must not close the card
  const openAndPress = (target: 'board' | 'continue') =>
    page.evaluate(
      (target) =>
        new Promise<void>((done) => {
          const root = document.getElementById('ui')!;
          const mo = new MutationObserver(() => {
            const el = root.querySelector('.reveal');
            if (!el) return;
            mo.disconnect();
            requestAnimationFrame(() =>
              setTimeout(() => {
                const t = target === 'board' ? document.querySelector('canvas')! : el.querySelector('.btn.primary')!;
                const r = t.getBoundingClientRect();
                const at = { bubbles: true, clientX: r.left + r.width / 2, clientY: r.top + r.height / 2 };
                t.dispatchEvent(new PointerEvent('pointerdown', { ...at, pointerId: 7 }));
                // it lifts after the grace: still the same press
                setTimeout(() => {
                  t.dispatchEvent(new PointerEvent('pointerup', { ...at, pointerId: 7 }));
                  t.dispatchEvent(new MouseEvent('click', at));
                  done();
                }, 350);
              }, 0),
            );
          });
          mo.observe(root, { childList: true, subtree: true });
          (window as any).__atoll.revealSpecies('kraken');
        }),
      target,
    );
  await openAndPress('board');
  expect(await page.evaluate(() => (window as any).__atoll.revealState())).toMatchObject({
    id: 'kraken',
    settled: true,
  });
  await expect(page.locator('.reveal')).toHaveCount(1);
  await page.evaluate(() => (window as any).__atoll.revealSkip());
  await expect(page.locator('.reveal')).toHaveCount(0);
  await openAndPress('continue');
  await expect(page.locator('.reveal')).toHaveCount(1);
  // a fresh press after the grace closes it as before
  await page.locator('.reveal .btn.primary').click();
  await expect(page.locator('.reveal')).toHaveCount(0);
});

test('scene-tier buttons shown before the card settles are aria-disabled until it does', async ({ page }) => {
  await boot(page, 'seed=42');
  await page.evaluate(() => (window as any).__atoll.revealSpecies('kraken'));
  const cont = page.locator('.reveal .btn.primary');
  await expect(page.locator('.reveal')).toHaveCount(1);
  // the card is in (chrome at 1750 ms, info at +200) but not settled (2100 ms): dimmed, visible, inert
  await page.evaluate(() => (window as any).__atoll.revealFreeze(2000));
  await expect(page.locator('.reveal.info:not(.settled)')).toHaveCount(1);
  expect(await cont.evaluate((b) => getComputedStyle(b).visibility)).toBe('visible');
  await expect(cont).toHaveAttribute('aria-disabled', 'true');
  await expect(page.locator('.reveal .btn.ghost')).toHaveAttribute('aria-disabled', 'true');
  await page.waitForTimeout(300); // past the grace
  await page.mouse.click(20, 20);
  await expect(page.locator('.reveal.settled')).toHaveCount(1);
  await expect(cont).not.toHaveAttribute('aria-disabled');
  await expect(page.locator('.reveal .btn.ghost')).not.toHaveAttribute('aria-disabled');
});

test('reveal a11y: the rest is inert, Tab stays in the dialog, focus returns; read once', async ({ page }) => {
  await boot(page, 'seed=42');
  const menu = page.locator('#menu-btn');
  await menu.focus();
  await page.keyboard.press('Shift'); // a keyboard user
  await page.evaluate(() => (window as any).__atoll.revealSpecies('kraken'));
  await expect(page.locator('.reveal')).toHaveCount(1);
  await expect(menu).toHaveAttribute('inert', '');
  await expect(page.locator('#game')).toHaveAttribute('inert', '');
  // one announcement: the dialog's name carries it, the live region doesn't repeat it
  await expect(page.locator('.reveal')).toHaveAttribute('aria-label', /Baby Kraken, legendary/);
  expect(await page.locator('#sr').textContent()).not.toContain('Baby Kraken');
  // Enter skips the animation; focus lands on Continue only once it can be pressed
  await page.keyboard.press('Enter');
  await expect.poll(() => page.evaluate(() => (window as any).__atoll.revealState()?.settled)).toBe(true);
  await expect(page.locator('.reveal .btn.primary')).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.locator('.reveal .btn.ghost')).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.locator('.reveal .btn.primary')).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.locator('.reveal')).toHaveCount(0);
  await expect(menu).toBeFocused();
  await expect(menu).not.toHaveAttribute('inert', '');
  await expect(page.locator('#game')).not.toHaveAttribute('inert', '');
});

test('reduced motion: a modal reveal settles at once (never blocks the board for REVEAL_MS)', async ({ browser }) => {
  const ctx = await browser.newContext(rmContext);
  const page = await ctx.newPage();
  await boot(page, 'seed=42');
  await page.evaluate(() => (window as any).__atoll.revealSpecies('kraken'));
  await expect(page.locator('.reveal')).toHaveCount(1);
  const st = await page.evaluate(() => (window as any).__atoll.revealState());
  expect(st).toMatchObject({ id: 'kraken', modal: true, settled: true });
  await ctx.close();
});

/** Record when the chapter word and the first discovery (pop or card) appear, page-side. */
async function watchMoments(page: Page) {
  await page.evaluate(() => {
    const w = window as any;
    w.__seen = {};
    const tick = () => {
      const now = performance.now();
      const word = w.__atoll.celebrateWord();
      if (word && !w.__seen[word]) w.__seen[word] = now;
      if (!w.__seen.reveal && document.querySelector('.reveal, .reveal-pop')) w.__seen.reveal = now;
      if (!w.__seen.result && document.querySelector('[data-testid="puzzle-result"]')) w.__seen.result = now;
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}

/** A reef one dot away from the end: the dot closes a ring around one cell (captures, discovers). */
async function stageReefEnd(page: Page, rows: string[], solvedOthers: boolean) {
  await page.evaluate(() => (window as any).__atoll.switchMode('puzzle'));
  await expect.poll(() => page.evaluate(() => (window as any).__atoll.mode())).toBe('puzzle');
  await page.evaluate(
    ([board, others]) => {
      const a = (window as any).__atoll;
      a.setup(board, ['dot', null, null], 1); // reef 2 (seed 1)
      // every other reef of chapter 1 already cleared: clearing this one completes the chapter
      if (others)
        a.profile().puzzle.solved = Array.from({ length: 20 }, (_, k) => `R${String(k + 1).padStart(3, '0')}`).filter(
          (id) => id !== 'R002',
        );
    },
    [rows.join(''), solvedOthers] as const,
  );
  await page.waitForTimeout(400);
  await watchMoments(page);
  await page.evaluate(() => (window as any).__atoll.commitMove({ slot: 0, x: 3, y: 2 }));
}

test('a discovery that completes a chapter is revealed after the chapter moment, then the card', async ({ page }) => {
  await boot(page, 'seed=42');
  const ring = ['........', '........', '..1.1...', '..1.1...', '..111...', '........', '........', '........'];
  await stageReefEnd(page, ring, true);
  await expect(page.getByTestId('puzzle-result')).toBeVisible({ timeout: 10_000 });
  const seen = await page.evaluate(() => (window as any).__seen);
  expect(seen['Chapter 1'], 'chapter moment played').toBeGreaterThan(0);
  expect(seen.reveal, 'discovery revealed').toBeGreaterThan(0);
  // the chapter word lives 1.5 s; the discovery waits for it (never over it), the card for both
  expect(seen.reveal - seen['Chapter 1']).toBeGreaterThanOrEqual(1400);
  expect(seen.result).toBeGreaterThan(seen.reveal);
});

test('a discovery on a failed reef ("So close") is still revealed before the card', async ({ page }) => {
  await boot(page, 'seed=42');
  // the ring captures, but another pebble stays: the tray is empty and the board isn't → failed
  const ring = ['........', '........', '..1.1...', '..1.1...', '..111...', '........', '........', '......2.'];
  await stageReefEnd(page, ring, false);
  await expect(page.getByTestId('puzzle-result')).toBeVisible({ timeout: 10_000 });
  await expect(page.getByTestId('puzzle-result')).not.toHaveText('Cleared');
  const seen = await page.evaluate(() => (window as any).__seen);
  expect(seen.reveal, 'discovery revealed').toBeGreaterThan(0);
  expect(seen.result).toBeGreaterThan(seen.reveal);
});

test('share card: a 4:5 PNG with the name and the game, no hint', async ({ page }) => {
  await boot(page, 'seed=42');
  const card = await page.evaluate(() => (window as any).__atoll.shareCard('boxcrab'));
  expect(card.w).toBe(1080);
  expect(card.h).toBe(1350);
  expect(card.png).toBeGreaterThan(20_000);
  expect(card.text).toContain('Box Crab');
  expect(card.text).toContain('Lagooner Beach');
  expect(card.text.join(' ')).not.toContain(card.hint);
});

test('every modal reveal settles eyes-open on idle (scene tiers by the time the card settles)', async ({ page }) => {
  test.setTimeout(180_000); // 13 frozen reveals
  await boot(page, 'seed=42');
  // [species, freeze at (ms)]: uncommon/rare once the beat is over; epic/legendary at the settle frame
  const cases: [string, number][] = [
    ['boxcrab', 3200],
    ['moray', 3400],
    ['octopus', 1500],
    ['octopus', 1800],
    // CRITIQUE-4: settled (and eyes-open) by 2.1 s, not still `happy`
    ['kraken', 2100],
    ['seadragon', 2100],
    ['whaleshark', 2100],
    ['goldturtle', 2100],
    ['kraken', 2700],
    ['seadragon', 2700],
    ['whaleshark', 2700],
    // art critique round 5: every reveal is eyes-open idle by 2.1 s (a golden seahorse was still proud)
    ['seahorse*', 2100],
    ['moray', 2100],
    ['octopus*', 2100],
  ];
  for (const [key, t] of cases) {
    const id = key.replace('*', '');
    await page.evaluate(([id, golden]) => (window as any).__atoll.revealSpecies(id, { golden }), [
      id,
      key.endsWith('*'),
    ] as const);
    await page.waitForFunction(() => (window as any).__atoll.revealState());
    await page.evaluate((t) => (window as any).__atoll.revealFreeze(t), t);
    const st = await page.evaluate(() => (window as any).__atoll.revealState());
    expect(st.settled, id).toBe(true);
    expect(st.expr, `${id} at ${t} ms`).toBe('idle');
    await page.evaluate(() => (window as any).__atoll.revealSkip());
    await expect(page.locator('.reveal')).toHaveCount(0);
  }
});

test('a non-legendary present is at least 130 px tall on the card, whatever its size class', async ({ page }) => {
  await boot(page, 'seed=42');
  for (const [id, golden] of [
    ['seahorse', true],
    ['seahorse', false],
    ['damsel', false],
    ['boxcrab', false],
    ['moray', false],
  ] as const) {
    await page.evaluate(([id, golden]) => (window as any).__atoll.revealSpecies(id, { golden }), [id, golden] as const);
    await page.waitForFunction(() => (window as any).__atoll.revealState());
    await page.waitForTimeout(400); // the CSS entrance (a scale-in) is over: measure at full size
    // the settle frame, eyes-open idle (its signature, later, may curl it up for a moment)
    await page.evaluate(() => (window as any).__atoll.revealFreeze(2100));
    const box = await page.evaluate(() => {
      const c = document.querySelector('.reveal canvas:not(.rv-fx)') as HTMLCanvasElement;
      const d = c.getContext('2d')!.getImageData(0, 0, c.width, c.height).data;
      let y0 = -1;
      let y1 = -1;
      let x0 = c.width;
      let x1 = -1;
      for (let i = 3; i < d.length; i += 4)
        if (d[i]! > 40) {
          const p = (i - 3) / 4;
          const x = p % c.width;
          const y = (p - x) / c.width;
          if (y0 < 0) y0 = y;
          y1 = y;
          x0 = Math.min(x0, x);
          x1 = Math.max(x1, x);
        }
      const k = c.width / c.getBoundingClientRect().width;
      return { h: (y1 - y0) / k, w: (x1 - x0) / k, cw: c.width / k };
    });
    expect(box.h, `${id}${golden ? ' (golden)' : ''}`).toBeGreaterThanOrEqual(130);
    expect(box.w, `${id} fits its stage`).toBeLessThan(box.cw - 8);
    await page.evaluate(() => (window as any).__atoll.revealSkip());
    await expect(page.locator('.reveal')).toHaveCount(0);
  }
});

test('legendary backdrop: the rays never drop out around the settle (frozen frames, back to back)', async ({
  page,
}) => {
  await boot(page, 'seed=42');
  await page.evaluate(() => (window as any).__atoll.revealSpecies('kraken'));
  await page.waitForFunction(() => (window as any).__atoll.revealState());
  const lum: number[] = [];
  for (const t of [1900, 2000, 2050, 2100, 2110, 2200, 2400, 2800]) {
    lum.push(
      await page.evaluate((t) => {
        (window as any).__atoll.revealFreeze(t);
        const c = document.querySelector<HTMLCanvasElement>('.rv-fx:not(.rv-hero)')!;
        // the band above the card: scrim + rays (a dropout leaves it transparent)
        const d = c.getContext('2d')!.getImageData(0, 0, c.width, Math.round(c.height * 0.2)).data;
        let s = 0;
        for (let i = 0; i < d.length; i += 4) s += (d[i]! * d[i + 3]!) / 255;
        return s / (d.length / 4);
      }, t),
    );
  }
  for (const v of lum) expect(v).toBeGreaterThan(lum[0]! * 0.8);
});
