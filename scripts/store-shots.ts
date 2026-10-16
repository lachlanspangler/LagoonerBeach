/**
 * Store screenshots: 1290×2796 (iPhone 6.7"; also used for Play). Two passes:
 *  1. stage real game moments with debug hooks and capture the app at 430×932 @3×;
 *  2. compose each into a marketing frame: caption band on top, the screen below in a rounded card.
 *   npx tsx scripts/store-shots.ts   → artifacts/store/*.png  (raw captures in artifacts/store/raw/)
 */
import { chromium, type Page } from '@playwright/test';
import { mkdirSync, readFileSync } from 'node:fs';

mkdirSync('artifacts/store/raw', { recursive: true });
const W = 430;
const H = 932;
const URL = `${process.env.LB_URL ?? 'http://localhost:5317'}/?debug=1&seed=42`;
const b = await chromium.launch();

async function open(theme: 'light' | 'dark'): Promise<Page> {
  const p = await b.newPage({
    viewport: { width: W, height: H },
    deviceScaleFactor: 3,
    colorScheme: theme,
    reducedMotion: 'no-preference',
  });
  await p.goto(URL);
  await p.waitForFunction(() => (window as any).__atoll);
  await p.waitForTimeout(400);
  // a lived-in profile: believable best, first-run hint off
  await p.evaluate(() => {
    const a = (window as any).__atoll;
    a.profile().firstRunDone = true;
    a.restart();
    a.stageBest(12480);
  });
  await p.waitForTimeout(300);
  return p;
}

async function hold(p: Page, slot: number, x: number, y: number) {
  const path = await p.evaluate((m) => (window as any).__atoll.pathFor(m), { slot, x, y });
  await p.mouse.move(path.down.x, path.down.y);
  await p.mouse.down();
  await p.mouse.move(path.up.x, path.up.y, { steps: 10 });
  await p.waitForTimeout(350);
}

// A lived-in board: a 3×2 lagoon waiting for its lid, plus scattered reef around it.
const row = (r: string) => r.replace(/\./g, '0');
const BOARD = ['........', '.5...5..', '.5...5.2', '.5...5.2', '.55555..', '......14', '33....14', '3.66..44']
  .map(row)
  .join('');
// night: a wide 4×2 lagoon; glyph: an irregular one, so no two shots share a board
const NIGHT = ['........', '.33...3.', '.3....3.', '.3....3.', '.333333.', '........', '22....55', '2..11.55']
  .map(row)
  .join('');
const GLYPH = ['1......2', '1......2', '..5...5.', '..5..65.', '..5...5.', '..55555.', '33......', '3..44...']
  .map(row)
  .join('');

const shots: { name: string; caption: string; theme: 'light' | 'dark'; stage: (p: Page) => Promise<void> }[] = [
  {
    name: '1-seal',
    caption: 'Close a loop.',
    theme: 'light',
    stage: async (p) => {
      await p.evaluate((bd) => (window as any).__atoll.setup(bd, ['tri-h', 'square', 'cup-up']), BOARD);
      await p.evaluate(() => (window as any).__atoll.stageBest(12480, 4316));
      await hold(p, 0, 2, 0);
    },
  },
  {
    name: '2-pop',
    caption: 'Water fills it.\nThe ring pops.',
    theme: 'light',
    stage: async (p) => {
      await p.evaluate((bd) => (window as any).__atoll.setup(bd, ['tri-h', 'square', 'cup-up']), BOARD);
      await p.evaluate(() => (window as any).__atoll.stageBest(12480, 4316));
      await hold(p, 0, 2, 0);
      await p.mouse.up();
      await p.waitForTimeout(330);
    },
  },
  {
    name: '3-journal',
    caption: 'Every lagoon\ncatches something.',
    theme: 'light',
    stage: async (p) => {
      await p.evaluate(() => {
        const a = (window as any).__atoll;
        a.stageJournal([
          'minnow',
          'periwinkle',
          'hermit',
          'limpet',
          'sanddollar',
          'shrimp',
          'blenny',
          'cockle',
          'sandeel',
          'gardeneel',
          'boxcrab',
          'starfish',
          'cuttle',
          'flounder',
          'clownfish',
          'puffer',
          'parrot',
          'grouper',
          'seahorse',
          'stingray',
          'octopus',
          'turtle',
          'urchin',
          'lanternfish',
          'moonjelly',
          'butterfly',
        ]);
      });
      await p.getByRole('button', { name: 'Menu' }).click();
      await p.getByRole('button', { name: 'Beach Journal' }).click();
      await p.waitForTimeout(500);
    },
  },
  {
    name: '4-night',
    caption: 'Calm by day.\nGlowing by night.',
    theme: 'dark',
    stage: async (p) => {
      await p.evaluate((bd) => (window as any).__atoll.setup(bd, ['tri-h', 'cup-up', 'square']), NIGHT);
      await p.evaluate(() => (window as any).__atoll.stageBest(12480, 4316));
      await hold(p, 0, 3, 1);
    },
  },
  {
    name: '5-reef',
    caption: '360 reef puzzles.\nEvery one solvable.',
    theme: 'light',
    stage: async (p) => {
      await p.evaluate(() => (window as any).__atoll.switchMode('puzzle'));
      await p.waitForTimeout(400);
      await p.evaluate(() => (window as any).__atoll.loadPuzzle(185));
      await p.waitForTimeout(500);
      // the first move of a fresh reef: full tray, the plan still to find
      const sol = await p.evaluate(() => (window as any).__atoll.puzzleSolution());
      await hold(p, sol[0].piece, sol[0].x, sol[0].y);
    },
  },
  {
    name: '6-glyph',
    caption: 'Made for every eye.',
    theme: 'light',
    stage: async (p) => {
      await p.evaluate(() => (window as any).__atoll.debugSkin('glyph'));
      await p.evaluate((bd) => (window as any).__atoll.setup(bd, ['tri-h', 'square', 'cup-up']), GLYPH);
      await p.evaluate(() => (window as any).__atoll.stageBest(12480, 4316));
      await hold(p, 0, 3, 2);
    },
  },
];

for (const s of shots) {
  const p = await open(s.theme);
  await s.stage(p);
  await p.screenshot({ path: `artifacts/store/raw/${s.name}.png` });
  await p.close();
}

// pass 2: compose
const comp = await b.newPage({ viewport: { width: 1290, height: 2796 }, deviceScaleFactor: 1 });
for (const s of shots) {
  const img = readFileSync(`artifacts/store/raw/${s.name}.png`).toString('base64');
  const night = s.theme === 'dark';
  await comp.setContent(`<html><body style="margin:0;width:1290px;height:2796px;overflow:hidden;
    background:${night ? 'linear-gradient(#08131D,#12273A)' : 'linear-gradient(#F7F1E7,#E9DCC6)'};
    font-family:ui-rounded,'SF Pro Rounded',system-ui,-apple-system,sans-serif">
    <div style="height:520px;display:flex;align-items:center;justify-content:center;text-align:center;
      color:${night ? '#E8EEF2' : '#3B3229'};font-weight:800;font-size:104px;line-height:1.08;letter-spacing:-1px;white-space:pre-line;padding:0 80px">${s.caption}</div>
    <div style="margin:0 auto;width:1090px;height:2236px;border-radius:84px;overflow:hidden;box-shadow:0 40px 120px rgba(0,0,0,${night ? 0.6 : 0.25})">
      <img src="data:image/png;base64,${img}" style="width:1090px;height:2363px;display:block;margin-top:-40px"/></div>
  </body></html>`);
  await comp.waitForTimeout(150);
  await comp.screenshot({ path: `artifacts/store/${s.name}.png` });
}
await b.close();
console.log('store shots → artifacts/store');
