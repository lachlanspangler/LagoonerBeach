/**
 * Store screenshots: 1290×2796 (iPhone 6.7"; also used for Play). Two passes:
 *  1. stage distinct moments with debug hooks (frozen clocks for celebrations) and capture the app
 *     at 430×932 @3×: a closed ring filling with water (+N), a discovery reveal, the Beach Journal,
 *     a reef chapter cleared, the Night theme — every one mid-game (real scores, never "0");
 *  2. compose each into a marketing frame: a saturated lagoon-cyan or sunset gradient (never cream
 *     on cream), a Fraunces caption (key word accented), the screen in a dark-rimmed device card
 *     that bleeds off the bottom edge, and a creature from the game's art on every frame.
 * Leaderboards stay out (the boards are demo-only until the real server exists, ADR 0010): the app
 * is opened with `?nolb` (the release look). `--with-leaderboard` adds the board shot back.
 *   LB_URL=http://localhost:5317 npx tsx scripts/store-shots.ts [--only 1-lagoon,…] [--with-leaderboard]
 *   → artifacts/store/*.png (raw captures in raw/)
 */
import { chromium, type Page } from '@playwright/test';
import { mkdirSync, readFileSync } from 'node:fs';

mkdirSync('artifacts/store/raw', { recursive: true });
const W = 430;
const H = 932;
const WITH_LB = process.argv.includes('--with-leaderboard');
const oi = process.argv.indexOf('--only');
const ONLY = oi >= 0 ? process.argv[oi + 1]!.split(',') : [];
const BASE = `${process.env.LB_URL ?? 'http://localhost:5317'}/?debug=1${WITH_LB ? '' : '&nolb=1'}`;
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
    pr.best = 12480;
    pr.stats.games = 41;
    if (a.mode() !== 'puzzle') a.restart();
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
// a wide 4×2 lagoon whose ring the tri-h seals (shot 1 by day; the night shot holds it, unsealed)
const RING = ['........', '.33...3.', '.3....3.', '.3....3.', '.333333.', '........', '22....55', '2..11.55']
  .map(row)
  .join('');
// a lived-in board behind the reveal (never an empty "0" game behind a card)
const MID = ['........', '.5...5..', '.5...5.2', '.5...5.2', '.55555..', '......14', '33....14', '3.66..44']
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

type Bg = 'cyan' | 'sunset' | 'night';
/** Caption: two lines, `*word*` = the accent word. `mascot`: a creature riding the card's edge. */
interface Shot {
  name: string;
  caption: string;
  theme: 'light' | 'dark';
  bg: Bg;
  size?: number;
  mascot?: { id: string; side: 'left' | 'right'; y: number; px: number; flip?: boolean; tilt?: number };
  query?: string;
  stage: (p: Page) => Promise<void>;
}
const shots: Shot[] = [
  {
    name: '1-lagoon',
    caption: 'Close a ring.\nWater *fills* it.',
    theme: 'light',
    bg: 'cyan',
    mascot: { id: 'clownfish', side: 'left', y: 2300, px: 320, tilt: 10 },
    stage: async (p) => {
      await p.evaluate((bd) => (window as any).__atoll.setup(bd, ['tri-h', 'cup-up', 'square']), RING);
      await p.evaluate(() => {
        const a = (window as any).__atoll;
        a.stageBest(12480, 4316);
        a.stageCombo(3);
      });
      await p.waitForTimeout(600);
      await p.evaluate(() => {
        const a = (window as any).__atoll;
        a.freezeNow();
        a.commitMove({ slot: 0, x: 3, y: 1 });
      });
      // the lagoon is full of water, the ring still standing, the +N up above it
      await p.evaluate((t) => (window as any).__atoll.freeze(t), Number(process.env.SHOT1_T ?? 330));
      await p.waitForTimeout(120);
    },
  },
  {
    name: '2-discovery',
    caption: 'Every lagoon\ncatches a *creature*.',
    theme: 'light',
    bg: 'sunset',
    mascot: { id: 'hermit', side: 'left', y: 2520, px: 260, tilt: 8 },
    stage: async (p) => {
      await p.evaluate((bd) => (window as any).__atoll.setup(bd, ['tri-h', 'square', 'cup-up']), MID);
      await p.evaluate(() => (window as any).__atoll.stageBest(12480, 3150));
      await p.waitForTimeout(300);
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
    bg: 'cyan',
    mascot: { id: 'seahorse', side: 'right', y: 400, px: 250, tilt: 8 },
    stage: async (p) => {
      await p.evaluate((ids) => {
        const a = (window as any).__atoll;
        a.stageJournal(ids);
        a.markSeen(ids.slice(0, -1));
      }, JOURNAL);
      await p.getByRole('button', { name: 'Menu' }).click();
      await p.getByRole('button', { name: /Beach Journal/ }).click();
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
    name: '4-reefs',
    caption: 'Hundreds of hand-checked\nreefs. Then *endless*.',
    theme: 'light',
    bg: 'sunset',
    size: 84,
    mascot: { id: 'starfish', side: 'right', y: 700, px: 260, tilt: 14 },
    stage: async (p) => {
      await p.evaluate(() => (window as any).__atoll.switchMode('puzzle'));
      await p.waitForTimeout(1200);
      // reef 40 closes chapter 2: solve it for real → "Cleared · Chapter 2 complete" on a clean board
      await p.evaluate(() => {
        const a = (window as any).__atoll;
        const pr = a.profile();
        pr.puzzle.solved = Array.from({ length: 39 }, (_, i) => `R${String(i + 1).padStart(3, '0')}`);
        pr.puzzle.pure = pr.puzzle.solved.slice(0, 30);
      });
      await p.evaluate(() => (window as any).__atoll.loadPuzzle(39));
      await p.waitForTimeout(700);
      await p.evaluate(() => {
        const a = (window as any).__atoll;
        for (const s of a.puzzleSolution()) a.commitMove({ slot: s.piece, x: s.x, y: s.y });
      });
      await p.getByTestId('puzzle-result').waitFor({ timeout: 15000 });
      await p.waitForTimeout(1100);
      // then the map: chapter 2 all cleared (shell stickers, stars for no-hint clears), Depth 40 m,
      // the next chapters named, the sea darkening below
      await p.evaluate(() => (window as any).__atoll.loadPuzzle(39));
      await p.waitForTimeout(500);
      await p.getByRole('button', { name: 'Menu' }).click();
      await p.getByRole('button', { name: 'All reefs' }).click();
      await p.waitForTimeout(900);
    },
  },
  ...(WITH_LB
    ? [
        {
          name: '6-leaderboard',
          caption: 'Chase the name\n*just above* yours.',
          theme: 'light' as const,
          bg: 'cyan' as const,
          mascot: { id: 'puffer', side: 'right' as const, y: 560, px: 260 },
          query: 'mode=daily&fast=1',
          stage: async (p: Page) => {
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
      ]
    : []),
  {
    name: '5-night',
    caption: 'Calm by day.\n*Glowing* by night.',
    theme: 'dark',
    bg: 'night',
    mascot: { id: 'moonjelly', side: 'left', y: 2280, px: 300, tilt: -6 },
    stage: async (p) => {
      await p.evaluate((bd) => (window as any).__atoll.setup(bd, ['tri-h', 'cup-up', 'square']), RING);
      await p.evaluate(() => {
        const a = (window as any).__atoll;
        a.stageBest(12480, 4316);
        a.stageCombo(3);
      });
      await hold(p, 0, 3, 1);
    },
  },
];

const todo = shots.filter((s) => !ONLY.length || ONLY.includes(s.name));
for (const s of todo) {
  const p = await open(s.theme, s.query);
  await s.stage(p);
  await p.screenshot({ path: `artifacts/store/raw/${s.name}.png` });
  await p.close();
}

// the mascots, drawn by the game's own art code (dev server modules), as transparent PNGs
const art = await open('light');
await art.waitForTimeout(400);
const mascots: Record<string, string> = await art.evaluate(
  async (ids: string[]) => {
    const ov = await import('/src/ui/overlay.ts' as string);
    const cr = await import('/src/meta/creatures.ts' as string);
    const out: Record<string, string> = {};
    const cs = ids.map((id) => [id, ov.creatureThumb(cr.SPECIES_BY_ID.get(id), 220, undefined, false, {})] as const);
    await new Promise((r) => setTimeout(r, 900)); // the art chunk loads, thumbs redraw
    for (const [id, c] of cs) out[id] = (c as HTMLCanvasElement).toDataURL('image/png');
    return out;
  },
  [...new Set(todo.flatMap((s) => (s.mascot ? [s.mascot.id] : [])))],
);
await art.close();

// pass 2: compose
const font = (f: string) => `data:font/woff2;base64,${readFileSync(`public/fonts/${f}`).toString('base64')}`;
const BG: Record<Bg, { bg: string; ink: string; accent: string; rim: string; shadow: string }> = {
  // saturated lagoon water: reads in the App Store grid next to cream-on-cream screens
  cyan: {
    bg: 'radial-gradient(90% 55% at 30% 8%, #8BE3F2 0%, transparent 60%), linear-gradient(170deg, #22B5D6 0%, #128DBA 45%, #0B5D8E 100%)',
    ink: '#FFFFFF',
    accent: '#FFE08A',
    rim: '#0A3F63',
    shadow: '0 50px 140px rgba(4,30,52,0.55)',
  },
  // a beach sunset: coral into gold, the sea at the bottom
  sunset: {
    bg: 'linear-gradient(175deg, #FF8A65 0%, #FFB36B 30%, #FFD27A 52%, #6FD3EC 82%, #1E9CC4 100%)',
    ink: '#3A1E10',
    accent: '#0E4F80',
    rim: '#5A2A14',
    shadow: '0 50px 140px rgba(90,40,10,0.40)',
  },
  night: {
    bg: 'radial-gradient(80% 50% at 50% 0%, #1F5A7A 0%, transparent 70%), linear-gradient(180deg, #10304A 0%, #071420 100%)',
    ink: '#EEF3F6',
    accent: '#6FD3EC',
    rim: '#2B8FC0',
    shadow: '0 0 120px rgba(111,211,236,0.30), 0 50px 140px rgba(0,0,0,0.6)',
  },
};
const comp = await b.newPage({ viewport: { width: 1290, height: 2796 }, deviceScaleFactor: 1 });
for (const s of todo) {
  const img = readFileSync(`artifacts/store/raw/${s.name}.png`).toString('base64');
  const c = BG[s.bg];
  const caption = s.caption.replace(/\*([^*]+)\*/g, `<em style="font-style:normal;color:${c.accent}">$1</em>`);
  const m = s.mascot;
  const mascot =
    m && mascots[m.id]
      ? `<img src="${mascots[m.id]}" style="position:absolute;top:${m.y}px;${m.side}:${m.side === 'left' ? 10 : 6}px;width:${m.px}px;height:${m.px}px;transform:rotate(${m.tilt ?? 0}deg)${m.side === 'left' ? ' scaleX(-1)' : ''};filter:drop-shadow(0 18px 24px rgba(0,0,0,0.30));z-index:3"/>`
      : '';
  await comp.setContent(`<html><head><style>
    @font-face{font-family:'Lagoon Display';src:url(${font('lagoon-display-900.woff2')}) format('woff2');font-weight:900}
    </style></head><body style="margin:0;width:1290px;height:2796px;overflow:hidden;position:relative;background:${c.bg}">
    <div style="height:560px;display:flex;align-items:center;justify-content:center;text-align:center;
      color:${c.ink};font:900 ${s.size ?? 112}px/1.04 'Lagoon Display',Georgia,serif;letter-spacing:-1px;padding:20px 70px 0;
      text-shadow:0 4px 0 rgba(0,0,0,${s.bg === 'sunset' ? '0.06' : '0.16'})"><div style="white-space:pre-line">${caption}</div></div>
    <div style="position:absolute;left:115px;top:580px;width:1060px;height:2300px;border-radius:96px;overflow:hidden;
      box-shadow:${c.shadow},0 0 0 16px ${c.rim};z-index:2">
      <img src="data:image/png;base64,${img}" style="width:1060px;display:block"/></div>
    ${mascot}
  </body></html>`);
  await comp.evaluate(() => document.fonts.ready);
  await comp.waitForTimeout(150);
  await comp.screenshot({ path: `artifacts/store/${s.name}.png` });
}
await b.close();
console.log('store shots → artifacts/store');
