/**
 * Generates every native icon and splash from one design (same art as public/icon.svg):
 *  - iOS AppIcon 1024 (full-bleed, opaque — the App Store rejects alpha), iOS splash 2732²
 *  - Android legacy + round launcher icons (mdpi…xxxhdpi), adaptive foreground (108dp canvas,
 *    art inside the 72dp safe zone) + background colour, splash.png at every existing size
 *  - Play Store: 512 icon and 1024×500 feature graphic → artifacts/store/
 *   npx tsx scripts/native-assets.ts
 */
import { chromium } from '@playwright/test';
import { readdirSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
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
  await p.screenshot({ path, omitBackground: transparent });
}
const sized = (s: string, w: number, h: number) =>
  s.replace('width="512" height="512"', `width="${w}" height="${h}" preserveAspectRatio="xMidYMid slice"`);

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
const splash = (
  w: number,
  h: number,
) => `<div style="width:${w}px;height:${h}px;display:grid;place-items:center;background:radial-gradient(circle at 50% 45%,#1B4E6B,#0B1622 70%)">
  ${sized(svg({ bg: false, rx: 0, scale: 1 }), Math.round(Math.min(w, h) * 0.22), Math.round(Math.min(w, h) * 0.22))}</div>`;
for (const f of readdirSync('ios/App/App/Assets.xcassets/Splash.imageset').filter((x) => x.endsWith('.png')))
  await render(splash(2732, 2732), 2732, 2732, `ios/App/App/Assets.xcassets/Splash.imageset/${f}`);

// Android launcher icons
const RES = 'android/app/src/main/res';
const D: Record<string, number> = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 };
for (const [d, k] of Object.entries(D)) {
  const dir = `${RES}/mipmap-${d}`;
  const s48 = Math.round(48 * k);
  await render(sized(svg({ bg: true, rx: 512 * 0.18, scale: 1 }), s48, s48), s48, s48, `${dir}/ic_launcher.png`, true);
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
// Android splash: regenerate every existing splash.png at its own size
const { default: sizeOf } = {
  default: (f: string) => {
    const out = execFileSync('sips', ['-g', 'pixelWidth', '-g', 'pixelHeight', f]).toString();
    return { w: Number(/pixelWidth: (\d+)/.exec(out)![1]), h: Number(/pixelHeight: (\d+)/.exec(out)![1]) };
  },
};
for (const dir of readdirSync(RES).filter((x) => x.startsWith('drawable'))) {
  const f = `${RES}/${dir}/splash.png`;
  if (!existsSync(f)) continue;
  const { w, h } = sizeOf(f);
  await render(splash(w, h), w, h, f);
}

// Play Store assets
mkdirSync('artifacts/store', { recursive: true });
await render(sized(svg({ bg: true, rx: 0, scale: 1 }), 512, 512), 512, 512, 'artifacts/store/play-icon-512.png');
await render(
  `<div style="width:1024px;height:500px;display:flex;align-items:center;gap:48px;padding:0 70px;box-sizing:border-box;background:linear-gradient(120deg,#0B1622,#1B4E6B);font-family:ui-rounded,system-ui,sans-serif">
    ${sized(svg({ bg: false, rx: 0, scale: 1 }), 300, 300)}
    <div style="color:#E8EEF2"><div style="font-size:72px;font-weight:800;line-height:1">Lagooner Beach</div>
    <div style="font-size:36px;font-weight:700;color:#9BF0FF;margin-top:18px">Close a loop. Water fills it, the ring pops.</div></div></div>`,
  1024,
  500,
  'artifacts/store/play-feature-1024x500.png',
);
await b.close();
console.log('native icons + splashes regenerated; Play assets in artifacts/store/');
