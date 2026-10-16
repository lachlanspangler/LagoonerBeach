/**
 * Creature palette derivation (style guide R14–R17, R33). Pure: OKLCH math, derived ink and
 * belly, golden remap, and the contrast numbers the CI checks use.
 */

export type Oklch = readonly [l: number, c: number, h: number];

const toLin = (c: number) => {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
};
const toSrgb = (v: number) => {
  const c = v <= 0.0031308 ? v * 12.92 : 1.055 * Math.pow(v, 1 / 2.4) - 0.055;
  return Math.round(Math.max(0, Math.min(1, c)) * 255);
};

export function hexRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? [...h].map((c) => c + c).join('') : h.slice(0, 6), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
const hex2 = (n: number) => n.toString(16).padStart(2, '0');
export const rgbHex = (r: number, g: number, b: number) => `#${hex2(r)}${hex2(g)}${hex2(b)}`.toUpperCase();

/** sRGB hex → OKLCH (Ottosson 2020). Hue in degrees. */
export function oklch(hex: string): Oklch {
  const [r, g, b] = hexRgb(hex).map(toLin) as [number, number, number];
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  const C = Math.hypot(A, B);
  const H = ((Math.atan2(B, A) * 180) / Math.PI + 360) % 360;
  return [L, C, H];
}

/** OKLCH → sRGB hex; chroma is reduced until the colour fits the sRGB gamut. */
export function fromOklch([L, C, H]: Oklch): string {
  for (let c = C; c >= 0; c -= 0.005) {
    const a = c * Math.cos((H * Math.PI) / 180);
    const b = c * Math.sin((H * Math.PI) / 180);
    const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
    const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
    const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
    const r = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
    const g = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
    const bb = -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s;
    const e = 1e-4;
    if (r >= -e && r <= 1 + e && g >= -e && g <= 1 + e && bb >= -e && bb <= 1 + e)
      return rgbHex(toSrgb(r), toSrgb(g), toSrgb(bb));
  }
  return rgbHex(toSrgb(L ** 3), toSrgb(L ** 3), toSrgb(L ** 3));
}

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

/** R16: ink = oklch(L × 0.42, C × 0.9 + 0.02, hue − 8°), ink L clamped to 0.20–0.32. */
export function deriveInk(body: string): string {
  const [L, C, H] = oklch(body);
  return fromOklch([clamp(L * 0.42, 0.2, 0.32), C * 0.9 + 0.02, (H + 352) % 360]);
}

/** R16: belly = body lightness + 0.10, chroma × 0.6 (countershading). */
export function deriveBelly(body: string): string {
  const [L, C, H] = oklch(body);
  return fromOklch([Math.min(0.97, L + 0.1), C * 0.6, H]);
}

/** Shared colours (R7, R9, R15, R16). */
export const SHARED = {
  eye: '#2B2320',
  white: '#FFFFFF',
  blush: '#FF8FA3',
  tongue: '#F28C8C',
  rim: '#CFEFFF',
  /** Tiles used by the contrast checks: journal tile surfaces on each theme. */
  dayTile: '#E3D6C2',
  nightTile: '#15293A',
  /** R13 locked-silhouette inks. */
  silDay: '#3B3229',
  silNight: '#E8EEF2',
} as const;

/** R33 golden remap. `rose` is the Golden Turtle's own variant. */
export const GOLDEN = { body: '#F2C14E', accent: '#FFF1C2', belly: '#FFE08A', ink: '#8A5A12' } as const;
export const ROSE_GOLD = { body: '#F2A65A', accent: '#FFE3C2', belly: '#FFD0A0', ink: '#8A4A22' } as const;

/** Alpha-blend `top` (at alpha) over `base`, in sRGB (what a canvas does). */
export function blend(base: string, top: string, alpha: number): string {
  const a = hexRgb(base),
    b = hexRgb(top);
  return rgbHex(...(a.map((v, i) => Math.round(v * (1 - alpha) + b[i]! * alpha)) as [number, number, number]));
}

/** Hue distance in degrees (0–180). */
export const hueDelta = (a: number, b: number) => {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
};

/** R15: rim alpha is 0.30, or 0.45 for darker bodies (L < 0.5). */
export const rimAlpha = (body: string) => (oklch(body)[0] < 0.5 ? 0.45 : 0.3);
