/**
 * Generates every native icon and splash from one design (same art as public/icon.svg):
 *  - iOS AppIcon 1024 (full-bleed, opaque — the App Store rejects alpha), iOS splash 2732²
 *  - Android legacy + round launcher icons (mdpi…xxxhdpi), adaptive foreground (108dp canvas,
 *    art inside the 72dp safe zone) + background colour, splash.png at every existing size
 *  - Play Store: 512 icon and 1024×500 feature graphic → artifacts/store/
 *   npx tsx scripts/native-assets.ts [--play-only | --splash-only]   (LB_URL dev server: the creature on the feature graphic)
 * Splashes come in Day and Night (iOS: a dark-appearance variant; Android: `-night` resources), so a
 * cold launch goes from the splash to the title screen (ADR 0015) without a dark → cream flash.
 */
import { chromium } from '@playwright/test';
import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const SEA = '#0F2233';
const PEBBLES = `
  <rect x="0" y="0" width="100" height="100" rx="26" fill="#F2795B"/>
  <rect x="110" y="0" width="100" height="100" rx="26" fill="#F2B93B"/>
  <rect x="220" y="0" width="100" height="100" rx="26" fill="#F2B93B"/>
  <rect x="0" y="110" width="100" height="100" rx="26" fill="#F2795B"/>
  <rect x="110" y="110" width="100" height="100" rx="26" fill="url(#lag)"/>
  <rect x="220" y="110" width="100" height="100" rx="26" fill="#53C08C"/>
  <rect x="0" y="220" width="100" height="100" rx="26" fill="#8E5BD8"/>
  <rect x="110" y="220" width="100" height="100" rx="26" fill="#8E5BD8"/>
  <rect x="220" y="220" width="100" height="100" rx="26" fill="#53C08C"/>`;
const DEFS = `<defs>
  <radialGradient id="sea" cx="50%" cy="45%" r="70%"><stop offset="0" stop-color="#1B4E6B"/><stop offset="1" stop-color="#0B1622"/></radialGradient>
  <linearGradient id="lag" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#BFF1FA"/><stop offset="1" stop-color="#2FB8D8"/></linearGradient></defs>`;
/** art: 320-unit pebble grid placed at `scale` of a 512 canvas, centered. */
const svg = (o: { bg: boolean; rx: number; scale: number }) => {
  const k = o.scale;
  const off = (512 - 320 * k) / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">${DEFS}
    ${o.bg ? `<rect width="512" height="512" rx="${o.rx}" fill="url(#sea)"/>` : ''}
    <g transform="translate(${off} ${off}) scale(${k})">${PEBBLES}</g></svg>`;
};

const b = await chromium.launch();
const p = await b.newPage();
async function render(markup: string, w: number, h: number, path: string, transparent = false) {
  await p.setViewportSize({ width: w, height: h });
  await p.setContent(
    `<html><body style="margin:0;background:${transparent ? 'transparent' : SEA}">${markup}</body></html>`,
  );
  await p.evaluate(() => document.fonts.ready);
  await p.screenshot({ path, omitBackground: transparent });
}
const sized = (s: string, w: number, h: number) =>
  s.replace('width="512" height="512"', `width="${w}" height="${h}" preserveAspectRatio="xMidYMid slice"`);

// --play-only: just the Play Store icon + feature graphic (leaves the native projects alone)
if (process.argv.includes('--splash-only')) await splashes();
else if (!process.argv.includes('--play-only')) await natives();
/** Day (the title's sand) and Night (the sea) splashes, iOS and Android. */
async function splashes(): Promise<void> {
  const splash = (w: number, h: number, night: boolean) =>
    `<div style="width:${w}px;height:${h}px;display:grid;place-items:center;background:${
      night
        ? 'radial-gradient(circle at 50% 45%,#1B4E6B,#0B1622 70%)'
        : 'radial-gradient(circle at 50% 45%,#FFFDF8,#F3E7D5 75%)'
    }">
  ${sized(svg({ bg: false, rx: 0, scale: 1 }), Math.round(Math.min(w, h) * 0.22), Math.round(Math.min(w, h) * 0.22))}</div>`;
  const IOS = 'ios/App/App/Assets.xcassets/Splash.imageset';
  // one image per appearance (scale-less): the same 2732² art served every scale before, three times over
  for (const f of readdirSync(IOS).filter((x) => x.endsWith('.png'))) rmSync(`${IOS}/${f}`);
  await render(splash(2732, 2732, false), 2732, 2732, `${IOS}/splash-2732x2732.png`);
  await render(splash(2732, 2732, true), 2732, 2732, `${IOS}/splash-2732x2732-dark.png`);
  const images = [
    { idiom: 'universal', filename: 'splash-2732x2732.png' },
    {
      appearances: [{ appearance: 'luminosity', value: 'dark' }],
      idiom: 'universal',
      filename: 'splash-2732x2732-dark.png',
    },
  ];
  writeFileSync(
    `${IOS}/Contents.json`,
    JSON.stringify({ images, info: { version: 1, author: 'xcode' } }, null, 2) + '\n',
  );
  // Android: every existing splash.png at its own size (Day), and a -night twin of each
  const RES = 'android/app/src/main/res';
  const sizeOf = (f: string) => {
    const out = execFileSync('sips', ['-g', 'pixelWidth', '-g', 'pixelHeight', f]).toString();
    return { w: Number(/pixelWidth: (\d+)/.exec(out)![1]), h: Number(/pixelHeight: (\d+)/.exec(out)![1]) };
  };
  for (const dir of readdirSync(RES).filter((x) => x.startsWith('drawable') && !x.includes('night'))) {
    const f = `${RES}/${dir}/splash.png`;
    if (!existsSync(f)) continue;
    const { w, h } = sizeOf(f);
    await render(splash(w, h, false), w, h, f);
    // qualifier order: orientation, then night, then density (drawable-port-night-xxhdpi)
    const nd = dir === 'drawable' ? 'drawable-night' : dir.replace(/^drawable-(port|land)-/, 'drawable-$1-night-');
    mkdirSync(`${RES}/${nd}`, { recursive: true });
    await render(splash(w, h, true), w, h, `${RES}/${nd}/splash.png`);
  }
}

async function natives(): Promise<void> {
  // iOS
  await render(
    sized(svg({ bg: true, rx: 0, scale: 1.0 }), 1024, 1024),
    1024,
    1024,
    'ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png',
  );
  // strip alpha (App Store requirement) with sips
  execFileSync(
    'sips',
    [
      '-s',
      'format',
      'jpeg',
      'ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png',
      '--out',
      '/tmp/appicon.jpg',
    ],
    { stdio: 'ignore' },
  );
  execFileSync(
    'sips',
    [
      '-s',
      'format',
      'png',
      '/tmp/appicon.jpg',
      '--out',
      'ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png',
    ],
    { stdio: 'ignore' },
  );
  await splashes();

  // Android launcher icons
  const RES = 'android/app/src/main/res';
  const D: Record<string, number> = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 };
  for (const [d, k] of Object.entries(D)) {
    const dir = `${RES}/mipmap-${d}`;
    const s48 = Math.round(48 * k);
    await render(
      sized(svg({ bg: true, rx: 512 * 0.18, scale: 1 }), s48, s48),
      s48,
      s48,
      `${dir}/ic_launcher.png`,
      true,
    );
    await render(
      sized(svg({ bg: true, rx: 256, scale: 0.92 }), s48, s48),
      s48,
      s48,
      `${dir}/ic_launcher_round.png`,
      true,
    );
    const s108 = Math.round(108 * k);
    // adaptive foreground: art fits the 72/108 safe zone (and a bit inside it)
    await render(
      sized(svg({ bg: false, rx: 0, scale: 0.74 }), s108, s108),
      s108,
      s108,
      `${dir}/ic_launcher_foreground.png`,
      true,
    );
  }
  writeFileSync(
    `${RES}/values/ic_launcher_background.xml`,
    `<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">${SEA}</color>\n</resources>\n`,
  );
}

// Play Store assets
mkdirSync('artifacts/store', { recursive: true });
await render(sized(svg({ bg: true, rx: 0, scale: 1 }), 512, 512), 512, 512, 'artifacts/store/play-icon-512.png');

/**
 * A creature for the feature graphic, drawn by the game's own art kit on the dev server (LB_URL).
 * Without a server the graphic still renders, pebbles only.
 */
async function creaturePng(id: string, px: number): Promise<string | null> {
  const base = process.env.LB_URL ?? 'http://localhost:5317';
  const q = await b.newPage();
  try {
    await q.goto(`${base}/?debug=1`, { timeout: 8000 });
    // a string body: tsx would inject `__name` helpers into a function passed to the page
    return (await q.evaluate(`(async () => {
      const m = await import('/src/render/creatures.ts');
      await m.loadCreatureArt();
      const { SPECIES_BY_ID } = await import('/src/meta/creatures.ts');
      const c = document.createElement('canvas');
      c.width = c.height = ${px};
      m.drawCreature(c.getContext('2d'), SPECIES_BY_ID.get('${id}'), ${px / 2}, ${px / 2}, ${px * 0.92}, -0.32,
        { expression: 'happy', t: 0.4, fit: 'detail' });
      return c.toDataURL('image/png');
    })()`)) as string;
  } catch {
    return null;
  } finally {
    await q.close();
  }
}
const fish = await creaturePng('clownfish', 420);
const font = (f: string) => `data:font/woff2;base64,${readFileSync(`public/fonts/${f}`).toString('base64')}`;
await render(
  `<style>
    @font-face{font-family:'Lagoon Display';src:url(${font('lagoon-display-900.woff2')}) format('woff2');font-weight:900}
    @font-face{font-family:'Lagoon UI';src:url(${font('lagoon-ui.woff2')}) format('woff2');font-weight:200 1000}
  </style>
  <div style="position:relative;width:1024px;height:500px;overflow:hidden;box-sizing:border-box;
    background:radial-gradient(80% 120% at 22% 55%,#1E5A7A 0%,#0F2D44 45%,#0A1520 100%)">
    <div style="position:absolute;left:58px;top:92px;filter:drop-shadow(0 18px 30px rgba(0,0,0,.45))">
      ${sized(svg({ bg: false, rx: 0, scale: 1 }), 300, 300)}</div>
    ${fish ? `<img src="${fish}" style="position:absolute;left:150px;top:-6px;width:290px;height:290px;filter:drop-shadow(0 10px 18px rgba(0,0,0,.35))">` : ''}
    <div style="position:absolute;left:440px;top:0;bottom:0;right:48px;display:flex;flex-direction:column;justify-content:center">
      <div style="font:900 84px/0.98 'Lagoon Display',Georgia,serif;color:#EEF3F6;letter-spacing:-1px">Lagooner<br>Beach</div>
      <div style="margin-top:22px;font:800 30px/1.3 'Lagoon UI',system-ui,sans-serif;color:#9BF0FF">Close a loop. Water fills it.<br>Every lagoon catches a creature.</div>
    </div>
  </div>`,
  1024,
  500,
  'artifacts/store/play-feature-1024x500.png',
);
await b.close();
console.log(
  'Play assets in artifacts/store/' +
    (process.argv.includes('--play-only') ? '' : '; native icons + splashes regenerated'),
);
