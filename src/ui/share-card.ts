/**
 * Share card for a discovery (UI_DESIGN §6.9): a 1080×1350 (4:5) picture of the creature in a
 * lagoon ringed by blocks, on its tier colour, with the app's icon mark, its name (plain Fraunces)
 * and rarity. Spoiler-free: no hint of how it was caught.
 * Canvas → PNG → native: Filesystem + Share plugins; web: Web Share (files) → download.
 */
import type { Species } from '../meta/creatures.ts';
import { SPECIES } from '../meta/creatures.ts';
import { drawCreature, type DrawOpts } from '../render/creatures.ts';
import { DISPLAY_STACK, FONT_STACK } from '../render/theme.ts';
import { drawPips, HABITAT_TINT, RARITY_COLOR, RARITY_RANK } from './rarity.ts';

export { drawPips, HABITAT_TINT, RARITY_COLOR, RARITY_RANK };

let lastCard: { key: string; c: HTMLCanvasElement } | null = null;

/**
 * PLACEHOLDER (owner): the short link printed on share cards. Replace with the real store/landing
 * short link before launch (it is drawn as plain text, no QR).
 */
export const SHARE_URL = 'lagooner.beach';
/** The share card's way back to the game (footer line next to the app mark). */
export const SHARE_FOOT = 'Free on iOS & Android';

export const W = 1080;
export const H = 1350;

export function renderShareCard(
  sp: Species,
  o: {
    golden?: boolean;
    date?: string;
    /** The player's beach name ("Found by CORAL"); omitted when they haven't chosen one. */
    name?: string;
    /** Collects every string drawn (tests). */ log?: string[];
  } = {},
): HTMLCanvasElement {
  // the same card again (prepared when the reveal settled) → the same, already encoded canvas
  const key = o.log ? null : `${sp.id}|${!!o.golden}|${o.date ?? ''}|${o.name ?? ''}`;
  if (key && lastCard?.key === key) return lastCard.c;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  // fonts still loading → don't keep this rendering (it would use fallback faces)
  if (key && document.fonts?.status !== 'loading') lastCard = { key, c };
  const g = c.getContext('2d')!;
  if (o.log) {
    const fill = g.fillText.bind(g);
    g.fillText = (t: string, x: number, y: number, m?: number) => (o.log!.push(t), fill(t, x, y, m));
  }
  // session-3 UX review: tier colour + lagoon water (not a grey-blue gradient with generic rays),
  // the app's icon mark, and plain Fraunces for the name (outlined display type clashed with the
  // wordmark). The creature sits in a lagoon ringed by blocks: the game in one picture.
  const rank = RARITY_RANK[sp.rarity];
  const tier = o.golden ? '#E9B23A' : RARITY_COLOR[sp.rarity];
  const frame = o.golden ? '#C9922B' : tier;
  const bg = g.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, mix(tier, '#FFFFFF', 0.55));
  bg.addColorStop(0.55, mix(tier, '#FFFFFF', 0.2));
  bg.addColorStop(1, mix(tier, '#000000', 0.25));
  g.fillStyle = bg;
  g.fillRect(0, 0, W, H);
  // the header: the app's icon mark + wordmark, in ink that reads on the tier's light top
  const ink = '#2B231C';
  const ink2 = '#5A4B3C';
  drawIconMark(g, 96, 62, 104);
  g.textAlign = 'left';
  g.textBaseline = 'middle';
  g.fillStyle = ink;
  g.font = `900 58px ${DISPLAY_STACK}`;
  g.fillText('Lagooner Beach', 228, 116);
  // the lagoon: a pool of water with caustics, ringed by blocks
  const px = 130;
  const py = 230;
  const pw = W - 260;
  const ph = 600;
  drawBlockRing(g, px, py, pw, ph);
  g.save();
  g.beginPath();
  g.roundRect(px, py, pw, ph, 70);
  g.clip();
  const water = g.createLinearGradient(0, py, 0, py + ph);
  water.addColorStop(0, '#BFF1FA');
  water.addColorStop(0.5, '#5CC8E0');
  water.addColorStop(1, '#2B8FC0');
  g.fillStyle = water;
  g.fillRect(px, py, pw, ph);
  caustics(g, px, py, pw, ph);
  // the tier's light pools behind the creature (rare and up glow more)
  const glow = g.createRadialGradient(W / 2, 540, 30, W / 2, 540, 420);
  glow.addColorStop(0, hexA(o.golden ? '#FFE79A' : mix(tier, '#FFFFFF', 0.4), rank >= 3 || o.golden ? 0.85 : 0.55));
  glow.addColorStop(1, hexA(tier, 0));
  g.fillStyle = glow;
  g.fillRect(px, py, pw, ph);
  g.restore();
  g.lineWidth = 10;
  g.strokeStyle = 'rgba(255,255,255,0.85)';
  g.beginPath();
  g.roundRect(px, py, pw, ph, 70);
  g.stroke();
  // the creature, big and happy
  drawCreature(g, sp, W / 2, 540, 560, 0, { golden: o.golden, expression: 'happy', t: 0.4 } as DrawOpts);
  if (o.golden) sparkles(g, W / 2, 540, 320, 7);
  // the label: a cream panel (dark ink on cream: always readable, whatever the tier)
  const ly = 856;
  g.fillStyle = 'rgba(43,35,28,0.18)';
  g.beginPath();
  g.roundRect(96, ly + 10, W - 192, H - ly - 158, 48);
  g.fill();
  g.fillStyle = '#FFF8EC';
  g.beginPath();
  g.roundRect(96, ly, W - 192, H - ly - 158, 48);
  g.fill();
  g.textAlign = 'center';
  g.fillStyle = ink2;
  g.font = `800 30px ${FONT_STACK}`;
  g.fillText(o.golden ? 'GOLDEN FIND' : 'NEW DISCOVERY', W / 2, ly + 54);
  // name: plain Fraunces (no outline)
  let size = 92;
  g.font = `900 ${size}px ${DISPLAY_STACK}`;
  while (g.measureText(sp.name).width > W - 280 && size > 52) {
    size -= 4;
    g.font = `900 ${size}px ${DISPLAY_STACK}`;
  }
  g.fillStyle = ink;
  g.fillText(sp.name, W / 2, ly + 130);
  drawPips(g, W / 2, ly + 202, 16, rank, frame, ink2);
  g.fillStyle = ink2;
  g.font = `800 30px ${FONT_STACK}`;
  g.fillText(`${sp.rarity.toUpperCase()} · No. ${SPECIES.indexOf(sp) + 1} of ${SPECIES.length}`, W / 2, ly + 250);
  // who found it, and when (UI_DESIGN §6.9: no URL soup, no QR)
  const foot = [o.name ? `Found by ${o.name.toUpperCase()}` : '', o.date ? longDate(o.date) : '']
    .filter(Boolean)
    .join(' · ');
  if (foot) {
    g.font = `700 28px ${FONT_STACK}`;
    g.fillText(foot, W / 2, ly + 300);
  }
  // the way back to the game: app mark · "Free on iOS & Android" · short link (cream on the tier's
  // dark foot; no QR)
  const fy = H - 96;
  g.font = `800 30px ${FONT_STACK}`;
  const line = `${SHARE_FOOT}  ·  ${SHARE_URL}`;
  const lw = g.measureText(line).width;
  const mark = 50;
  const fx0 = W / 2 - (mark + 18 + lw) / 2;
  drawIconMark(g, fx0, fy - mark / 2, mark);
  g.textAlign = 'left';
  g.fillStyle = 'rgba(20,14,8,0.35)';
  g.fillText(line, fx0 + mark + 18, fy + 2);
  g.fillStyle = '#FFF8EC';
  g.fillText(line, fx0 + mark + 18, fy);
  g.textAlign = 'center';
  // frame
  g.lineWidth = o.golden ? 18 : 12;
  if (o.golden) {
    const fg = g.createLinearGradient(0, 0, W, H);
    fg.addColorStop(0, '#F7D774');
    fg.addColorStop(0.5, '#C9922B');
    fg.addColorStop(1, '#F7D774');
    g.strokeStyle = fg;
  } else g.strokeStyle = mix(frame, '#000000', 0.1);
  g.beginPath();
  g.roundRect(30, 30, W - 60, H - 60, 64);
  g.stroke();
  return c;
}

/** The app icon (public/icon.svg) drawn in canvas: night sea tile, 3×3 blocks, a lagoon cell. */
function drawIconMark(g: CanvasRenderingContext2D, x: number, y: number, s: number): void {
  const k = s / 512;
  g.save();
  g.translate(x, y);
  g.scale(k, k);
  const sea = g.createRadialGradient(256, 230, 0, 256, 230, 360);
  sea.addColorStop(0, '#1B4E6B');
  sea.addColorStop(1, '#0B1622');
  g.fillStyle = sea;
  g.beginPath();
  g.roundRect(0, 0, 512, 512, 112);
  g.fill();
  const cols = ['#F2795B', '#F2B93B', '#F2B93B', '#F2795B', '', '#53C08C', '#8E5BD8', '#8E5BD8', '#53C08C'];
  cols.forEach((c, i) => {
    const bx = 96 + (i % 3) * 110;
    const by = 96 + Math.floor(i / 3) * 110;
    if (c) g.fillStyle = c;
    else {
      const lag = g.createLinearGradient(0, by, 0, by + 100);
      lag.addColorStop(0, '#BFF1FA');
      lag.addColorStop(1, '#2FB8D8');
      g.fillStyle = lag;
    }
    g.beginPath();
    g.roundRect(bx, by, 100, 100, 26);
    g.fill();
  });
  g.restore();
}

/** Blocks (the game's pebble colours) around the pool, as if the ring just closed. */
function drawBlockRing(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void {
  const pal = ['#F2795B', '#F2B93B', '#53C08C', '#3D9BE9', '#8E5BD8', '#F28DB2'];
  const b = 78;
  const step = 96;
  const spots: [number, number][] = [];
  const nx = Math.floor((w + b) / step);
  const ny = Math.floor((h + b) / step);
  const ox = x + (w - (nx - 1) * step) / 2;
  const oy = y + (h - (ny - 1) * step) / 2;
  for (let i = 0; i < nx; i++) spots.push([ox + i * step, y - 8], [ox + i * step, y + h + 8]);
  for (let j = 1; j < ny - 1; j++) spots.push([x - 8, oy + j * step], [x + w + 8, oy + j * step]);
  spots.forEach(([cx, cy], i) => {
    const c = pal[(i * 7 + 3) % pal.length]!;
    g.fillStyle = mix(c, '#000000', 0.22);
    g.beginPath();
    g.roundRect(cx - b / 2, cy - b / 2 + 7, b, b, 20);
    g.fill();
    g.fillStyle = c;
    g.beginPath();
    g.roundRect(cx - b / 2, cy - b / 2, b, b, 20);
    g.fill();
    g.fillStyle = 'rgba(255,255,255,0.35)';
    g.beginPath();
    g.roundRect(cx - b / 2 + 10, cy - b / 2 + 8, b - 20, 14, 7);
    g.fill();
  });
}

/** Lagoon water texture: soft caustic light lines (deterministic, no noise). */
function caustics(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void {
  g.save();
  g.strokeStyle = 'rgba(255,255,255,0.22)';
  g.lineCap = 'round';
  for (let r = 0; r < 9; r++) {
    g.lineWidth = r % 3 === 0 ? 7 : 4;
    g.beginPath();
    for (let i = 0; i <= 40; i++) {
      const u = i / 40;
      const xx = x + u * w;
      const yy = y + 40 + r * (h / 8.5) + Math.sin(u * 9 + r * 1.7) * 16 + Math.sin(u * 23 + r) * 6;
      if (i === 0) g.moveTo(xx, yy);
      else g.lineTo(xx, yy);
    }
    g.stroke();
  }
  g.restore();
}

function mix(a: string, b: string, k: number): string {
  const p = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const [x, y] = [p(a), p(b)];
  const c = x.map((v, i) => Math.round(v + (y[i]! - v) * k));
  return `#${c.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}
function hexA(hex: string, a: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

/** 2026-10-16 → "16 October 2026" (unambiguous everywhere). */
function longDate(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return iso;
  const months = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];
  return `${Number(m[3])} ${months[Number(m[2]) - 1]} ${m[1]}`;
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

export type ShareOutcome = 'shared' | 'downloaded' | 'cancelled' | 'failed';

/** What to tell the player (screen readers) after a share; '' when they simply closed the sheet. */
export function shareAnnouncement(how: ShareOutcome): string {
  return { shared: 'Shared', downloaded: 'Saved the picture', cancelled: '', failed: 'Could not share' }[how];
}

const isNative = (): boolean =>
  !!(globalThis as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor?.isNativePlatform?.();

/** Encoded cards (PNG base64), by canvas: encode once, ahead of the tap when we can. */
const encoded = new WeakMap<HTMLCanvasElement, string>();
const base64Of = (c: HTMLCanvasElement): string => {
  let b = encoded.get(c);
  if (b === undefined) {
    b = c.toDataURL('image/png').split(',')[1] ?? '';
    encoded.set(c, b);
  }
  return b;
};
function fileOf(c: HTMLCanvasElement, name: string): File | null {
  const b64 = base64Of(c);
  if (!b64) return null;
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new File([bytes], name, { type: 'image/png' });
}

/**
 * Render and encode a card ahead of the Share tap (call when the reveal settles, on idle). iOS only
 * shares from a live user activation, so the tap itself must not wait on rendering or `toBlob`.
 * `renderShareCard` with the same arguments then returns this canvas, already encoded.
 */
export function prepareShareCard(sp: Species, o: Parameters<typeof renderShareCard>[1] = {}): void {
  void base64Of(renderShareCard(sp, o));
}

const isAbort = (e: unknown): boolean =>
  (e as Error)?.name === 'AbortError' || /cancel/i.test(String((e as Error)?.message ?? e));

/**
 * Share a rendered card. Native shells: write the PNG to the cache dir (Filesystem) and open the
 * system sheet (Share) — WebViews have no working `<a download>` (Android has no navigator.share).
 * Web: navigator.share with the file when the browser can, else a download. Synchronous up to the
 * share call (no toBlob await), so the click's user activation survives.
 */
export async function shareCanvas(c: HTMLCanvasElement, file: string, text: string): Promise<ShareOutcome> {
  if (isNative()) {
    try {
      const data = base64Of(c);
      if (!data) return 'failed';
      const [{ Filesystem, Directory }, { Share }] = await Promise.all([
        import('@capacitor/filesystem'),
        import('@capacitor/share'),
      ]);
      const w = await Filesystem.writeFile({ path: file, data, directory: Directory.Cache });
      await Share.share({ title: 'Lagooner Beach', text, files: [w.uri] });
      return 'shared';
    } catch (e) {
      return isAbort(e) ? 'cancelled' : 'failed';
    }
  }
  const f = fileOf(c, file);
  if (!f) return 'failed';
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  if (nav.share && nav.canShare?.({ files: [f] })) {
    try {
      await nav.share({ files: [f], text, title: 'Lagooner Beach' });
      return 'shared';
    } catch (e) {
      if (isAbort(e)) return 'cancelled'; // the player closed the sheet
      /* NotAllowedError etc.: fall back to a download */
    }
  }
  try {
    const url = URL.createObjectURL(f);
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
