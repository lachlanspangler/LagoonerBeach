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

/** sRGB hex → CIELAB (D65, 2°). For CIEDE2000; the palette work itself stays in OKLCH. */
export function cielab(hex: string): [L: number, a: number, b: number] {
  const [r, g, b] = hexRgb(hex).map(toLin) as [number, number, number];
  const X = (0.4124564 * r + 0.3575761 * g + 0.1804375 * b) / 0.95047;
  const Y = 0.2126729 * r + 0.7151522 * g + 0.072175 * b;
  const Z = (0.0193339 * r + 0.119192 * g + 0.9503041 * b) / 1.08883;
  const f = (t: number) => (t > 216 / 24389 ? Math.cbrt(t) : ((24389 / 27) * t + 16) / 116);
  const [fx, fy, fz] = [f(X), f(Y), f(Z)];
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}

/** CIEDE2000 colour difference (Sharma, Wu & Dalal 2005), kL = kC = kH = 1. Inputs: CIELAB. */
export function deltaE2000(
  [L1, a1, b1]: readonly [number, number, number],
  [L2, a2, b2]: readonly [number, number, number],
): number {
  const rad = Math.PI / 180;
  const C1 = Math.hypot(a1, b1),
    C2 = Math.hypot(a2, b2);
  const Cm = (C1 + C2) / 2;
  const G = 0.5 * (1 - Math.sqrt(Cm ** 7 / (Cm ** 7 + 25 ** 7)));
  const ap1 = a1 * (1 + G),
    ap2 = a2 * (1 + G);
  const Cp1 = Math.hypot(ap1, b1),
    Cp2 = Math.hypot(ap2, b2);
  const hue = (b: number, a: number) => (b === 0 && a === 0 ? 0 : (Math.atan2(b, a) / rad + 360) % 360);
  const hp1 = hue(b1, ap1),
    hp2 = hue(b2, ap2);
  const dL = L2 - L1;
  const dC = Cp2 - Cp1;
  let dh = 0;
  if (Cp1 * Cp2 !== 0) {
    dh = hp2 - hp1;
    if (dh > 180) dh -= 360;
    else if (dh < -180) dh += 360;
  }
  const dH = 2 * Math.sqrt(Cp1 * Cp2) * Math.sin((dh / 2) * rad);
  const Lm = (L1 + L2) / 2;
  const Cpm = (Cp1 + Cp2) / 2;
  let hm = hp1 + hp2;
  if (Cp1 * Cp2 !== 0) {
    if (Math.abs(hp1 - hp2) <= 180) hm /= 2;
    else hm = hp1 + hp2 < 360 ? (hm + 360) / 2 : (hm - 360) / 2;
  }
  const T =
    1 -
    0.17 * Math.cos((hm - 30) * rad) +
    0.24 * Math.cos(2 * hm * rad) +
    0.32 * Math.cos((3 * hm + 6) * rad) -
    0.2 * Math.cos((4 * hm - 63) * rad);
  const dTheta = 30 * Math.exp(-(((hm - 275) / 25) ** 2));
  const RC = 2 * Math.sqrt(Cpm ** 7 / (Cpm ** 7 + 25 ** 7));
  const SL = 1 + (0.015 * (Lm - 50) ** 2) / Math.sqrt(20 + (Lm - 50) ** 2);
  const SC = 1 + 0.045 * Cpm;
  const SH = 1 + 0.015 * Cpm * T;
  const RT = -Math.sin(2 * dTheta * rad) * RC;
  return Math.sqrt((dL / SL) ** 2 + (dC / SC) ** 2 + (dH / SH) ** 2 + RT * (dC / SC) * (dH / SH));
}
