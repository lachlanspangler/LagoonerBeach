/**
 * Share card for a discovery (UI_DESIGN §6.9): a 1080×1350 (4:5) picture of the creature, its name
 * and rarity, with the game's name. Spoiler-free: no hint of how it was caught.
 * Canvas → PNG → native: Filesystem + Share plugins; web: Web Share (files) → download.
 */
import type { Species } from '../meta/creatures.ts';
import { SPECIES } from '../meta/creatures.ts';
import { drawCreature, type DrawOpts } from '../render/creatures.ts';
import { DISPLAY_STACK, FONT_STACK } from '../render/theme.ts';
import { drawPips, HABITAT_TINT, RARITY_COLOR, RARITY_RANK } from './rarity.ts';

export { drawPips, HABITAT_TINT, RARITY_COLOR, RARITY_RANK };

let lastCard: { key: string; c: HTMLCanvasElement } | null = null;

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
  const night = sp.habitat === 'night';
  const [a, b] = HABITAT_TINT[sp.habitat];
  const bg = g.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, a);
  bg.addColorStop(1, b);
  g.fillStyle = bg;
  g.fillRect(0, 0, W, H);
  // soft pool of light behind the creature
  const pool = g.createRadialGradient(W / 2, 530, 40, W / 2, 530, 500);
  pool.addColorStop(0, night ? 'rgba(160,240,255,0.35)' : 'rgba(255,255,255,0.75)');
  pool.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = pool;
  g.fillRect(0, 0, W, H);
  // rays for rare and up
  const rank = RARITY_RANK[sp.rarity];
  if (rank >= 3) {
    g.save();
    g.translate(W / 2, 530);
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
  // the habitat gradient darkens toward the bottom: secondary lines use full ink there (≥ 4.5:1)
  const ink2 = night ? '#C9D6E0' : '#2B231C';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillStyle = ink2;
  g.font = `800 34px ${FONT_STACK}`;
  g.fillText(o.golden ? 'GOLDEN FIND' : 'NEW DISCOVERY', W / 2, 140);
  // the creature, big and happy
  drawCreature(g, sp, W / 2, 520, 600, 0, { golden: o.golden, expression: 'happy', t: 0.4, night } as DrawOpts);
  if (o.golden) sparkles(g, W / 2, 530, 320, 7);
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
  g.strokeText(name, W / 2, 950);
  const fill = g.createLinearGradient(0, 950 - size / 2, 0, 950 + size / 2);
  const [f0, f1, f2] = o.golden || rank >= 5 ? ['#FFF4C2', '#F2C14E', '#B9821F'] : ['#E8FCFF', '#6FD3EC', '#2B8FC0'];
  fill.addColorStop(0, f0);
  fill.addColorStop(0.5, f1);
  fill.addColorStop(1, f2);
  g.fillStyle = fill;
  g.fillText(name, W / 2, 950);
  drawPips(g, W / 2, 1042, 16, rank, frame, ink2);
  g.fillStyle = ink2;
  g.font = `800 32px ${FONT_STACK}`;
  g.fillText(`${sp.rarity.toUpperCase()} · No. ${SPECIES.indexOf(sp) + 1} of ${SPECIES.length}`, W / 2, 1096);
  // who found it, and the game's mark (UI_DESIGN §6.9: no URL soup, no QR)
  if (o.name) {
    g.fillStyle = ink2;
    g.font = `700 34px ${FONT_STACK}`;
    const lead = 'Found by ';
    g.textAlign = 'left';
    g.font = `700 34px ${FONT_STACK}`;
    const lw = g.measureText(lead).width;
    g.font = `900 36px ${DISPLAY_STACK}`;
    const nw = g.measureText(o.name.toUpperCase()).width;
    const x0 = W / 2 - (lw + nw) / 2;
    g.font = `700 34px ${FONT_STACK}`;
    g.fillText(lead, x0, 1166);
    g.fillStyle = ink;
    g.font = `900 36px ${DISPLAY_STACK}`;
    g.fillText(o.name.toUpperCase(), x0 + lw, 1166);
    g.textAlign = 'center';
  }
  g.fillStyle = ink;
  g.font = `900 46px ${DISPLAY_STACK}`;
  g.fillText('Lagooner Beach', W / 2, o.name ? 1226 : 1210);
  if (o.date) {
    g.fillStyle = ink2;
    g.font = `700 26px ${FONT_STACK}`;
    g.fillText(longDate(o.date), W / 2, o.name ? 1268 : 1254);
  }
  return c;
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
