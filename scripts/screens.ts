/**
 * Every screen of the game, one PNG each (aesthetic review, before/after sets):
 *   LB_URL=http://localhost:5317 npx tsx scripts/screens.ts <label> [--only name,name] [--night]
 * → artifacts/ux/<label>/<name>.png (390×844 @2×). `--night` adds a Night copy of each screen.
 * Staged with the debug hooks (lived-in profile, frozen clocks for moments), so runs are comparable.
 */
import { chromium, type Page } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';

const label = process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : 'now';
const arg = (k: string, d: string) => {
  const i = process.argv.indexOf(`--${k}`);
  return i >= 0 ? process.argv[i + 1]! : d;
};
const only = arg('only', '').split(',').filter(Boolean);
const nightToo = process.argv.includes('--night');
const base = process.env.LB_URL ?? 'http://localhost:5317';
const dir = `artifacts/ux/${label}`;
mkdirSync(dir, { recursive: true });
const b = await chromium.launch();
const errors: string[] = [];

const LIVED = ['minnow', 'periwinkle', 'hermit', 'limpet', 'sanddollar', 'shrimp', 'cockle', 'sandeel', 'moray'];
const MORE = ['gardeneel', 'boxcrab', 'starfish', 'cuttle', 'clownfish', 'puffer', 'octopus', 'turtle', 'urchin'];
const JOURNAL = [...LIVED, ...MORE, 'moonjelly', 'firefly', 'angler', 'giantclam', 'nautilus', 'kraken', 'seahorse'];
const row = (r: string) => r.replace(/\./g, '0');
const BOARD = ['........', '.5...5..', '.5...5.2', '.5...5.2', '.55555..', '......14', '33....14', '3.66..44']
  .map(row)
  .join('');

async function open(night: boolean, query = 'seed=42', fresh = false): Promise<Page> {
  const ctx = await b.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    hasTouch: false,
    colorScheme: night ? 'dark' : 'light',
  });
  const p = await ctx.newPage();
  p.on('pageerror', (e) => errors.push(String(e)));
  p.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  await p.goto(`${base}/?debug=1&${query}`);
  await p.waitForFunction(() => (window as any).__atoll, null, { timeout: 15000 });
  await p.evaluate(() => document.fonts.ready);
  if (!fresh)
    await p.evaluate((ids) => {
      const a = (window as any).__atoll;
      const pr = a.profile();
      pr.firstRunDone = true;
      pr.lesson2Done = true;
      pr.best = 12480;
      pr.stats.games = 41;
      pr.stats.captures = 388;
      pr.stats.bestPocket = 14;
      pr.daily.current = 6;
      pr.puzzle.solved = Array.from({ length: 27 }, (_, i) => `r${String(i + 1).padStart(3, '0')}`);
      a.stageJournal(ids);
      a.markSeen(ids.slice(0, -2)); // two fresh pages wear the "new" dot
      if (a.mode() !== 'puzzle') a.restart();
      a.stageBest(12480);
    }, JOURNAL);
  await p.waitForTimeout(700);
  return p;
}
const frames = (p: Page) => p.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));

const screens: Record<string, (p: Page) => Promise<void>> = {
  'play-start': async () => {},
  'play-midgame': async (p) => {
    await p.evaluate((bd) => (window as any).__atoll.setup(bd, ['tri-h', 'square', 'cup-up']), BOARD);
    await p.evaluate(() => {
      const a = (window as any).__atoll;
      a.stageBest(12480, 3150);
      a.stageCombo(6, 1);
    });
    await p.waitForTimeout(600);
  },
  'play-preview': async (p) => {
    await p.evaluate((bd) => (window as any).__atoll.setup(bd, ['tri-h', 'square', 'cup-up']), BOARD);
    await p.evaluate(() => (window as any).__atoll.stageBest(12480, 3150));
    await p.waitForTimeout(500);
    const path = await p.evaluate(() => (window as any).__atoll.pathFor({ slot: 0, x: 2, y: 1 }));
    await p.mouse.move(path.down.x, path.down.y);
    await p.mouse.down();
    await p.mouse.move(path.up.x, path.up.y, { steps: 8 });
    await p.waitForTimeout(300);
  },
  'play-word': async (p) => {
    await p.evaluate((bd) => (window as any).__atoll.setup(bd, ['tri-h', 'square', 'cup-up']), BOARD);
    await p.evaluate(() => {
      const a = (window as any).__atoll;
      a.stageBest(12480, 3150);
      a.stageCombo(4);
    });
    await p.waitForTimeout(500);
    await p.evaluate(() => {
      const a = (window as any).__atoll;
      a.freezeNow();
      a.commitMove({ slot: 0, x: 2, y: 1 });
    });
    await p.evaluate(() => (window as any).__atoll.freeze(420));
    await frames(p);
  },
  'play-burst': async (p) => {
    await p.evaluate((bd) => (window as any).__atoll.setup(bd, ['tri-h', 'square', 'cup-up']), BOARD);
    await p.evaluate(() => (window as any).__atoll.stageBest(12480, 3150));
    await p.waitForTimeout(500);
    await p.evaluate(() => {
      const a = (window as any).__atoll;
      a.freezeNow();
      a.commitMove({ slot: 0, x: 2, y: 1 });
    });
    await p.evaluate(() => (window as any).__atoll.freeze(260));
    await frames(p);
  },
  'play-chip-combo': async (p) => {
    await p.evaluate((bd) => (window as any).__atoll.setup(bd, ['tri-h', 'square', 'cup-up']), BOARD);
    await p.evaluate(() => {
      const a = (window as any).__atoll;
      a.stageBest(12480, 3150);
      a.stageCombo(5);
      a.toast?.('Bigger lagoons, bigger catches');
    });
    await p.waitForTimeout(700);
  },
  menu: async (p) => {
    await p.getByRole('button', { name: 'Menu' }).click();
    await p.waitForTimeout(600);
  },
  settings: async (p) => {
    await p.getByRole('button', { name: 'Menu' }).click();
    await p.getByRole('button', { name: 'Settings' }).click();
    await p.waitForTimeout(600);
  },
  'settings-about': async (p) => {
    await p.getByRole('button', { name: 'Menu' }).click();
    await p.getByRole('button', { name: 'Settings' }).click();
    await p.waitForTimeout(500);
    await p.evaluate(() => {
      const s = document.querySelector('.veil .sheet, .veil .card') as HTMLElement | null;
      const sc = (document.querySelector('.veil .sheet-body') as HTMLElement | null) ?? s;
      if (sc) sc.scrollTop = 9999;
    });
    await p.waitForTimeout(200);
  },
  results: async (p) => {
    await p.evaluate(() => (window as any).__atoll.showResults({ score: 9640, prevBest: 12480 }));
    await p.waitForTimeout(1600);
  },
  'results-record': async (p) => {
    await p.evaluate(() => (window as any).__atoll.showResults({ score: 15230, prevBest: 12480 }));
    await p.waitForTimeout(1900);
  },
  'results-real': async (p) => {
    await p.evaluate(() => (window as any).__atoll.autoplay('human', 400));
    await p.getByTestId('final-score').waitFor({ timeout: 15000 });
    await p.waitForTimeout(1800);
  },
  'name-entry': async (p) => {
    await p.evaluate(() => (window as any).__atoll.autoplay('human', 400));
    await p.getByTestId('final-score').waitFor({ timeout: 15000 });
    await p.waitForTimeout(1200);
    await p.locator('#lb-open').click();
    await p.getByTestId('lb-name-entry').waitFor();
    await p.keyboard.type('coral');
    await p.waitForTimeout(500);
  },
  leaderboard: async (p) => {
    await p.evaluate(() => (window as any).__atoll.autoplay('human', 400));
    await p.getByTestId('final-score').waitFor({ timeout: 15000 });
    await p.waitForTimeout(1200);
    await p.locator('#lb-open').click();
    await p.getByTestId('lb-name-entry').waitFor();
    await p.keyboard.type('coral');
    await p.getByTestId('lb-post').click();
    await p.locator('.lb-row.me').waitFor();
    await p.waitForTimeout(700);
  },
  'leaderboard-menu': async (p) => {
    await p.getByRole('button', { name: 'Menu' }).click();
    await p
      .getByRole('button', { name: /Leaderboard/ })
      .first()
      .click();
    await p.waitForTimeout(800);
  },
  journal: async (p) => {
    await p.getByRole('button', { name: 'Menu' }).click();
    await p
      .getByRole('button', { name: /Beach Journal/ })
      .first()
      .click();
    await p.waitForTimeout(800);
  },
  species: async (p) => {
    await p.getByRole('button', { name: 'Menu' }).click();
    await p
      .getByRole('button', { name: /Beach Journal/ })
      .first()
      .click();
    await p.waitForTimeout(500);
    await p.getByRole('button', { name: /^Moray/ }).click();
    await p.waitForTimeout(900);
  },
  'species-unknown': async (p) => {
    await p.getByRole('button', { name: 'Menu' }).click();
    await p
      .getByRole('button', { name: /Beach Journal/ })
      .first()
      .click();
    await p.waitForTimeout(500);
    await p
      .getByRole('button', { name: /^Unknown/ })
      .first()
      .click();
    await p.waitForTimeout(700);
  },
  'reveal-common': async (p) => {
    await p.evaluate(() => (window as any).__atoll.revealSpecies('blenny', { size: 6.2 }));
    await p.waitForTimeout(700);
  },
  'reveal-uncommon': async (p) => {
    await p.evaluate(() => (window as any).__atoll.revealSpecies('boxcrab', { size: 9.4 }));
    await p.waitForTimeout(400);
    await p.evaluate(() => (window as any).__atoll.revealFreeze(1400));
    await p.waitForTimeout(500);
  },
  'reveal-legendary': async (p) => {
    await p.evaluate(() => (window as any).__atoll.revealSpecies('kraken', { size: 1240 }));
    await p.waitForTimeout(400);
    await p.evaluate(() => (window as any).__atoll.revealFreeze(2300));
    await p.waitForTimeout(500);
  },
  'reveal-golden': async (p) => {
    await p.evaluate(() => (window as any).__atoll.revealSpecies('clownfish', { size: 8.1, golden: true }));
    await p.waitForTimeout(400);
    await p.evaluate(() => (window as any).__atoll.revealFreeze(1600));
    await p.waitForTimeout(500);
  },
  'share-card': async (p) => {
    const url = await p.evaluate(async () => {
      const { renderShareCard } = await import('/src/ui/share-card.ts' as string);
      const { SPECIES_BY_ID } = await import('/src/meta/creatures.ts' as string);
      const c = renderShareCard(SPECIES_BY_ID.get('octopus'), { date: '2026-10-16', name: 'CORAL' });
      return c.toDataURL('image/png');
    });
    writeFileSync(`${dir}/share-card-raw.png`, Buffer.from(url.split(',')[1]!, 'base64'));
    await p.setContent(
      `<body style="margin:0;background:#222;display:grid;place-items:center;height:100vh"><img src="${url}" style="width:340px;border-radius:12px"></body>`,
    );
    await p.waitForTimeout(200);
  },
  'reef-list': async (p) => {
    await p.evaluate(() => (window as any).__atoll.switchMode('puzzle'));
    await p.waitForTimeout(1200);
    await p.getByRole('button', { name: 'Menu' }).click();
    await p.getByRole('button', { name: 'All reefs' }).click();
    await p.waitForTimeout(600);
  },
  'reef-play': async (p) => {
    await p.evaluate(() => (window as any).__atoll.switchMode('puzzle'));
    await p.waitForTimeout(1200);
    await p.evaluate(() => (window as any).__atoll.loadPuzzle(27));
    await p.waitForTimeout(800);
  },
  'reef-result': async (p) => {
    await p.evaluate(() => (window as any).__atoll.switchMode('puzzle'));
    await p.waitForTimeout(1200);
    await p.evaluate(() => (window as any).__atoll.loadPuzzle(27));
    await p.waitForTimeout(600);
    await p.evaluate(() => {
      const a = (window as any).__atoll;
      for (const s of a.puzzleSolution()) a.commitMove({ slot: s.piece, x: s.x, y: s.y });
    });
    await p.waitForTimeout(2600);
  },
  'reef-endless': async (p) => {
    await p.evaluate(() => (window as any).__atoll.switchMode('puzzle'));
    await p.waitForTimeout(1200);
    await p.evaluate(() => (window as any).__atoll.loadPuzzle(372));
    await p.waitForFunction(() => (window as any).__atoll.state().seed === 372, null, { timeout: 30000 });
    await p.waitForTimeout(800);
  },
  'chapter-complete': async (p) => {
    await p.evaluate(() => (window as any).__atoll.switchMode('puzzle'));
    await p.waitForTimeout(1200);
    await p.evaluate(() => {
      const a = (window as any).__atoll;
      a.freezeNow();
      a.chapterMoment(23, 'Heron Narrows');
    });
    await p.evaluate(() => (window as any).__atoll.freeze(1200));
    await frames(p);
  },
  daily: async (p) => {
    await p.evaluate(() => (window as any).__atoll.switchMode('daily'));
    await p.waitForTimeout(800);
    await p.evaluate(() => (window as any).__atoll.autoplay('greedy', 9));
    await p.waitForTimeout(1500);
  },
  'first-run': async () => {},
  offline: async (p) => {
    await p.getByRole('button', { name: 'Menu' }).click();
    await p
      .getByRole('button', { name: /Leaderboard/ })
      .first()
      .click();
    await p.waitForTimeout(800);
  },
};
const special: Record<string, { query?: string; fresh?: boolean }> = {
  'first-run': { query: 'seed=42', fresh: true },
  offline: { query: 'seed=5&lboffline=1' },
  'results-real': { query: 'seed=8&fast=1' },
  'name-entry': { query: 'mode=daily&fast=1' },
  leaderboard: { query: 'mode=daily&fast=1' },
};

for (const [name, run] of Object.entries(screens)) {
  if (only.length && !only.includes(name)) continue;
  for (const night of nightToo ? [false, true] : [false]) {
    const s = special[name] ?? {};
    const p = await open(night, s.query, s.fresh);
    try {
      await run(p);
      await p.screenshot({ path: `${dir}/${name}${night ? '-night' : ''}.png` });
    } catch (e) {
      console.log('FAILED', name, String(e).split('\n')[0]);
    }
    await p.context().close();
  }
}
await b.close();
console.log(errors.length ? `console errors:\n${[...new Set(errors)].join('\n')}` : 'no console errors');
console.log('screens →', dir);
