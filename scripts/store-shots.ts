/**
 * Store screenshots: 1290×2796 (iPhone 6.7"; also used for Play). Two passes:
 *  1. stage six distinct moments with debug hooks (frozen clocks for celebrations) and capture the
 *     app at 430×932 @3×: a COMBO Atoll, a discovery reveal, the Beach Journal, the leaderboard with
 *     its "to pass" target, an endless-reefs chapter, the Night theme;
 *  2. compose each into a marketing frame: a Fraunces caption band (key word in the accent), the
 *     screen below in a rounded device card that bleeds off the bottom edge (the board reads larger).
 *   LB_URL=http://localhost:5317 npx tsx scripts/store-shots.ts → artifacts/store/*.png (raw in raw/)
 */
import { chromium, type Page } from '@playwright/test';
import { mkdirSync, readFileSync } from 'node:fs';
import { BOARDS, boardString } from '../tests/e2e/celebrate-boards.ts';

mkdirSync('artifacts/store/raw', { recursive: true });
const W = 430;
const H = 932;
const BASE = `${process.env.LB_URL ?? 'http://localhost:5317'}/?debug=1`;
const b = await chromium.launch();

async function open(theme: 'light' | 'dark', query = 'seed=42'): Promise<Page> {
  const p = await b.newPage({
    viewport: { width: W, height: H },
    deviceScaleFactor: 3,
    colorScheme: theme,
    reducedMotion: 'no-preference',
  });
  await p.goto(`${BASE}&${query}`);
  await p.evaluate(() => document.fonts.ready);
  await p.waitForFunction(() => (window as any).__atoll);
  await p.waitForTimeout(400);
  // a lived-in profile: believable best, first-run hint off
  await p.evaluate(() => {
    const a = (window as any).__atoll;
    const pr = a.profile();
    pr.firstRunDone = true;
    pr.lesson2Done = true;
    pr.daily.current = 6;
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

const row = (r: string) => r.replace(/\./g, '0');
// night: a wide 4×2 lagoon; glyph: an irregular one, so no two shots share a board
const NIGHT = ['........', '.33...3.', '.3....3.', '.3....3.', '.333333.', '........', '22....55', '2..11.55']
  .map(row)
  .join('');
const GLYPH = ['1......2', '1......2', '..5...5.', '..5..65.', '..5...5.', '..55555.', '33......', '3..44...']
  .map(row)
  .join('');

const JOURNAL = [
  'minnow',
  'periwinkle',
  'hermit',
  'limpet',
  'sanddollar',
  'shrimp',
  'cockle',
  'urchin',
  'sandeel',
  'moray',
  'gardeneel',
  'boxcrab',
  'starfish',
  'cuttle',
  'clownfish',
  'puffer',
  'boxfish',
  'flounder',
  'stingray',
  'seahorse',
  'octopus',
  'turtle',
  'nautilus',
  'moonjelly',
  'giantclam',
];

/** Caption: two lines, `*word*` = the accent word. */
const shots: {
  name: string;
  caption: string;
  theme: 'light' | 'dark';
  query?: string;
  stage: (p: Page) => Promise<void>;
}[] = [
  {
    name: '1-atoll',
    caption: 'Close a loop.\nWatch it *pop*.',
    theme: 'light',
    stage: async (p) => {
      const s = BOARDS.atoll!;
      await p.evaluate(([bd, tray]) => (window as any).__atoll.setup(bd, tray), [boardString(s), s.tray] as const);
      await p.evaluate((n) => {
        const a = (window as any).__atoll;
        a.stageBest(12480, 4316);
        a.stageCombo(n);
      }, s.combo ?? 0);
      await p.waitForTimeout(600);
      await p.evaluate((m) => {
        const a = (window as any).__atoll;
        a.freezeNow();
        a.commitMove(m);
      }, s.move);
      // the word has landed, the ring is mid-scatter
      await p.evaluate(() => (window as any).__atoll.freeze(520));
      await p.waitForTimeout(120);
    },
  },
  {
    name: '2-discovery',
    caption: 'Every lagoon\ncatches a *creature*.',
    theme: 'light',
    stage: async (p) => {
      await p.evaluate(() => (window as any).__atoll.revealSpecies('octopus', { size: 41.3 }));
      await p.waitForTimeout(500);
      await p.evaluate(() => (window as any).__atoll.revealFreeze(1700));
      await p.waitForTimeout(500);
    },
  },
  {
    name: '3-journal',
    caption: 'Fill your\n*Beach Journal*.',
    theme: 'light',
    stage: async (p) => {
      await p.evaluate((ids) => {
        const a = (window as any).__atoll;
        a.stageJournal(ids);
        a.markSeen(ids.slice(0, -1));
      }, JOURNAL);
      await p.getByRole('button', { name: 'Menu' }).click();
      await p.getByRole('button', { name: 'Beach Journal' }).click();
      await p.waitForTimeout(900);
      // scroll so the Lagoon section (the richest art) leads
      await p.evaluate(() => {
        const b = document.querySelector('.journal .sheet-body') as HTMLElement | null;
        const sec = document.querySelectorAll('.journal .j-sec')[1] as HTMLElement | undefined;
        if (b && sec) b.scrollTop += sec.getBoundingClientRect().top - b.getBoundingClientRect().top - 4;
      });
      await p.waitForTimeout(300);
    },
  },
  {
    name: '4-leaderboard',
    caption: 'Chase the name\n*just above* yours.',
    theme: 'light',
    query: 'mode=daily&fast=1',
    stage: async (p) => {
      await p.evaluate(() => (window as any).__atoll.autoplay('human', 400));
      await p.getByTestId('final-score').waitFor({ timeout: 15000 });
      await p.waitForTimeout(1200);
      await p.locator('#lb-open').click();
      await p.getByTestId('lb-name-entry').waitFor();
      await p.keyboard.type('coral');
      await p.getByTestId('lb-post').click();
      await p.locator('.lb-row.me').waitFor();
      await p.waitForTimeout(800);
    },
  },
  {
    name: '5-reefs',
    caption: 'Endless *reefs*.\nEvery one solvable.',
    theme: 'light',
    stage: async (p) => {
      await p.evaluate(() => (window as any).__atoll.switchMode('puzzle'));
      await p.waitForTimeout(900);
      await p.evaluate(() => (window as any).__atoll.loadPuzzle(371));
      await p.waitForFunction(() => (window as any).__atoll.state().seed === 371, null, { timeout: 30000 });
      await p.waitForTimeout(700);
      // a fresh reef: the full hand of three, the plan still to find
    },
  },
  {
    name: '6-night',
    caption: 'Calm by day.\n*Glowing* by night.',
    theme: 'dark',
    stage: async (p) => {
      await p.evaluate((bd) => (window as any).__atoll.setup(bd, ['tri-h', 'cup-up', 'square']), NIGHT);
      await p.evaluate(() => {
        const a = (window as any).__atoll;
        a.stageBest(12480, 4316);
        a.stageCombo(3);
      });
      await hold(p, 0, 3, 1);
    },
  },
];
void GLYPH; // kept for a Glyph (accessibility) shot when a seventh slot opens

for (const s of shots) {
  const p = await open(s.theme, s.query);
  await s.stage(p);
  await p.screenshot({ path: `artifacts/store/raw/${s.name}.png` });
  await p.close();
}

// pass 2: compose
const font = (f: string) => `data:font/woff2;base64,${readFileSync(`public/fonts/${f}`).toString('base64')}`;
const comp = await b.newPage({ viewport: { width: 1290, height: 2796 }, deviceScaleFactor: 1 });
for (const s of shots) {
  const img = readFileSync(`artifacts/store/raw/${s.name}.png`).toString('base64');
  const night = s.theme === 'dark';
  const accent = night ? '#6FD3EC' : '#16588A';
  const caption = s.caption.replace(/\*([^*]+)\*/g, `<em style="font-style:normal;color:${accent}">$1</em>`);
  await comp.setContent(`<html><head><style>
    @font-face{font-family:'Lagoon Display';src:url(${font('lagoon-display-900.woff2')}) format('woff2');font-weight:900}
    </style></head><body style="margin:0;width:1290px;height:2796px;overflow:hidden;position:relative;
    background:${night ? 'radial-gradient(120% 60% at 50% 0%,#17324A,#0A1520 70%)' : 'radial-gradient(120% 60% at 50% 0%,#FFFBF5,#F6EFE4 55%,#E9DCC6)'}">
    <div style="height:560px;display:flex;align-items:center;justify-content:center;text-align:center;
      color:${night ? '#EEF3F6' : '#2B231C'};font:900 112px/1.04 'Lagoon Display',Georgia,serif;letter-spacing:-1px;padding:20px 70px 0"><div style="white-space:pre-line">${caption}</div></div>
    <div style="position:absolute;left:115px;top:580px;width:1060px;height:2300px;border-radius:96px;overflow:hidden;
      box-shadow:0 40px 120px rgba(${night ? '0,0,0,0.6' : '74,52,30,0.28'}),0 0 0 14px ${night ? '#1C3550' : '#FFFFFF'}">
      <img src="data:image/png;base64,${img}" style="width:1060px;display:block"/></div>
  </body></html>`);
  await comp.evaluate(() => document.fonts.ready);
  await comp.waitForTimeout(150);
  await comp.screenshot({ path: `artifacts/store/${s.name}.png` });
}
await b.close();
console.log('store shots → artifacts/store');
