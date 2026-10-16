/**
 * Share card for a discovery (UI_DESIGN §6.9): a 1080×1350 (4:5) picture of the creature, its name
 * and rarity, with the game's name. Spoiler-free: no hint of how it was caught.
 * Canvas → PNG blob → Web Share (files) → Capacitor Share (if the plugins exist) → download.
 */
import type { Habitat, Rarity, Species } from '../meta/creatures.ts';
import { SPECIES } from '../meta/creatures.ts';
import { drawCreature, type DrawOpts } from '../render/creatures.ts';
import { DISPLAY_STACK, FONT_STACK } from '../render/theme.ts';

export const RARITY_COLOR: Record<Rarity, string> = {
  common: '#B8A88F',
  uncommon: '#53C08C',
  rare: '#3D9BE9',
  epic: '#8E5BD8',
  legendary: '#F2B93B',
};
export const RARITY_RANK: Record<Rarity, number> = { common: 1, uncommon: 2, rare: 3, epic: 4, legendary: 5 };

/** Habitat backdrop: top → bottom. */
export const HABITAT_TINT: Record<Habitat, readonly [string, string]> = {
  shallows: ['#F6EBD6', '#E2CFAE'],
  lagoon: ['#DDF4F8', '#9ED8E6'],
  deep: ['#D5DEEE', '#7E97BE'],
  night: ['#1F3A57', '#0B1622'],
  reef: ['#FBE3DA', '#EDB3A0'],
  legend: ['#FFF4D6', '#F0C978'],
};

export const W = 1080;
export const H = 1350;

/** Little shell pips: `n` filled of 5 (rarity never by hue alone). */
export function drawPips(
  g: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  n: number,
  on: string,
  off: string,
): void {
  const gap = r * 3.2;
  const x0 = cx - gap * 2;
  for (let i = 0; i < 5; i++) {
    const x = x0 + i * gap;
    g.beginPath();
    g.moveTo(x, cy + r * 0.9);
    g.arc(x, cy + r * 0.15, r, Math.PI * 1.05, Math.PI * 1.95);
    g.closePath();
    if (i < n) {
      g.fillStyle = on;
      g.fill();
    } else {
      g.strokeStyle = off;
      g.lineWidth = Math.max(1.5, r * 0.3);
      g.stroke();
    }
  }
}

export function renderShareCard(sp: Species, o: { golden?: boolean; date?: string } = {}): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const g = c.getContext('2d')!;
  const night = sp.habitat === 'night';
  const [a, b] = HABITAT_TINT[sp.habitat];
  const bg = g.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, a);
  bg.addColorStop(1, b);
  g.fillStyle = bg;
  g.fillRect(0, 0, W, H);
  // soft pool of light behind the creature
  const pool = g.createRadialGradient(W / 2, 560, 40, W / 2, 560, 520);
  pool.addColorStop(0, night ? 'rgba(160,240,255,0.35)' : 'rgba(255,255,255,0.75)');
  pool.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = pool;
  g.fillRect(0, 0, W, H);
  // rays for rare and up
  const rank = RARITY_RANK[sp.rarity];
  if (rank >= 3) {
    g.save();
    g.translate(W / 2, 560);
    const n = rank >= 5 ? 16 : rank >= 4 ? 12 : 8;
    for (let i = 0; i < n; i++) {
      g.rotate((Math.PI * 2) / n);
      const gr = g.createLinearGradient(0, 0, 0, -620);
      gr.addColorStop(0, rank >= 5 ? 'rgba(255,230,150,0.42)' : 'rgba(255,255,255,0.32)');
      gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr;
      g.beginPath();
      g.moveTo(0, 0);
      g.lineTo(-60, -620);
      g.lineTo(60, -620);
      g.closePath();
      g.fill();
    }
    g.restore();
  }
  // frame
  const frame = o.golden ? '#C9922B' : RARITY_COLOR[sp.rarity];
  g.lineWidth = o.golden ? 18 : 12;
  if (o.golden) {
    const fg = g.createLinearGradient(0, 0, W, H);
    fg.addColorStop(0, '#F7D774');
    fg.addColorStop(0.5, '#C9922B');
    fg.addColorStop(1, '#F7D774');
    g.strokeStyle = fg;
  } else g.strokeStyle = frame;
  g.beginPath();
  g.roundRect(36, 36, W - 72, H - 72, 64);
  g.stroke();
  // overline
  const ink = night ? '#EEF3F6' : '#2B231C';
  const ink2 = night ? '#A3B5C3' : '#6B5C4B';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillStyle = ink2;
  g.font = `800 34px ${FONT_STACK}`;
  g.fillText(o.golden ? 'GOLDEN FIND' : 'NEW DISCOVERY', W / 2, 140);
  // the creature, big and happy
  drawCreature(g, sp, W / 2, 570, 560, 0, { golden: o.golden, expression: 'happy', t: 0.4, night } as DrawOpts);
  if (o.golden) sparkles(g, W / 2, 570, 330, 7);
  // name: display caps, outlined like the in-game callouts
  const name = sp.name.toUpperCase();
  let size = 96;
  g.font = `900 ${size}px ${DISPLAY_STACK}`;
  while (g.measureText(name).width > W - 180 && size > 52) {
    size -= 4;
    g.font = `900 ${size}px ${DISPLAY_STACK}`;
  }
  g.lineJoin = 'round';
  g.lineWidth = size * 0.16;
  g.strokeStyle = night ? '#04212D' : '#2B231C';
  g.strokeText(name, W / 2, 1000);
  const fill = g.createLinearGradient(0, 1000 - size / 2, 0, 1000 + size / 2);
  const [f0, f1, f2] = o.golden || rank >= 5 ? ['#FFF4C2', '#F2C14E', '#B9821F'] : ['#FFFFFF', '#E8FCFF', '#9ED8E6'];
  fill.addColorStop(0, f0);
  fill.addColorStop(0.5, f1);
  fill.addColorStop(1, f2);
  g.fillStyle = fill;
  g.fillText(name, W / 2, 1000);
  drawPips(g, W / 2, 1100, 16, rank, frame, ink2);
  g.fillStyle = ink2;
  g.font = `800 32px ${FONT_STACK}`;
  g.fillText(`${sp.rarity.toUpperCase()} · No. ${SPECIES.indexOf(sp) + 1} of ${SPECIES.length}`, W / 2, 1160);
  // the game's mark
  g.fillStyle = ink;
  g.font = `900 46px ${DISPLAY_STACK}`;
  g.fillText('Lagooner Beach', W / 2, 1250);
  if (o.date) {
    g.fillStyle = ink2;
    g.font = `700 26px ${FONT_STACK}`;
    g.fillText(o.date, W / 2, 1296);
  }
  return c;
}

/** Four-point twinkles around a center (golden finds). */
export function sparkles(g: CanvasRenderingContext2D, cx: number, cy: number, r: number, n: number, t = 0): void {
  g.save();
  g.fillStyle = '#FFF4C2';
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + t * 0.6;
    const x = cx + Math.cos(a) * r * (0.8 + 0.2 * Math.sin(i * 2.1));
    const y = cy + Math.sin(a) * r * 0.75;
    const s = r * 0.07 * (0.6 + 0.4 * Math.abs(Math.sin(t * 3 + i)));
    g.beginPath();
    g.moveTo(x, y - s * 2);
    g.quadraticCurveTo(x, y, x + s * 2, y);
    g.quadraticCurveTo(x, y, x, y + s * 2);
    g.quadraticCurveTo(x, y, x - s * 2, y);
    g.quadraticCurveTo(x, y, x, y - s * 2);
    g.fill();
  }
  g.restore();
}

type CapPlugins = {
  Share?: { share(o: { title?: string; text?: string; url?: string; files?: string[] }): Promise<unknown> };
  Filesystem?: {
    writeFile(o: { path: string; data: string; directory: string }): Promise<{ uri: string }>;
  };
};

/** Share a rendered card. Returns how it went out. */
export async function shareCanvas(
  c: HTMLCanvasElement,
  file: string,
  text: string,
): Promise<'shared' | 'downloaded' | 'failed'> {
  const blob = await new Promise<Blob | null>((res) => c.toBlob(res, 'image/png'));
  if (!blob) return 'failed';
  const f = new File([blob], file, { type: 'image/png' });
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  try {
    if (nav.share && nav.canShare?.({ files: [f] })) {
      await nav.share({ files: [f], text, title: 'Lagooner Beach' });
      return 'shared';
    }
  } catch (e) {
    if ((e as Error).name === 'AbortError') return 'shared'; // the player closed the sheet
  }
  const cap = (globalThis as { Capacitor?: { Plugins?: CapPlugins } }).Capacitor?.Plugins;
  if (cap?.Share && cap.Filesystem) {
    try {
      const data = c.toDataURL('image/png').split(',')[1]!;
      const w = await cap.Filesystem.writeFile({ path: file, data, directory: 'CACHE' });
      await cap.Share.share({ title: 'Lagooner Beach', text, files: [w.uri] });
      return 'shared';
    } catch {
      /* fall through to download */
    }
  }
  try {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = file;
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    return 'downloaded';
  } catch {
    return 'failed';
  }
}
