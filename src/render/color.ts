/** Color math for accessibility checks: sRGB ↔ linear, CVD simulation (Machado 2009), ΔE (CIE76 Lab). */
export type RGB = readonly [number, number, number];

export function hexToRgb(hex: string): RGB {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

const toLin = (c: number) => {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
};
const toSrgb = (v: number) => {
  const c = v <= 0.0031308 ? v * 12.92 : 1.055 * Math.pow(v, 1 / 2.4) - 0.055;
  return Math.max(0, Math.min(255, c * 255));
};

/** Machado et al. 2009 full-severity matrices (linear RGB). */
const CVD: Record<'protan' | 'deutan' | 'tritan', number[]> = {
  protan: [0.152286, 1.052583, -0.204868, 0.114503, 0.786281, 0.099216, -0.003882, -0.048116, 1.051998],
  deutan: [0.367322, 0.860646, -0.227968, 0.280085, 0.672501, 0.047413, -0.01182, 0.04294, 0.968881],
  tritan: [1.255528, -0.076749, -0.178779, -0.078411, 0.930809, 0.147602, 0.004733, 0.691367, 0.3039],
};

export function simulate(rgb: RGB, kind: keyof typeof CVD): RGB {
  const [r, g, b] = rgb.map(toLin) as [number, number, number];
  const m = CVD[kind];
  return [
    toSrgb(m[0]! * r + m[1]! * g + m[2]! * b),
    toSrgb(m[3]! * r + m[4]! * g + m[5]! * b),
    toSrgb(m[6]! * r + m[7]! * g + m[8]! * b),
  ];
}

function toLab(rgb: RGB): RGB {
  const [r, g, b] = rgb.map(toLin) as [number, number, number];
  const x = (0.4124 * r + 0.3576 * g + 0.1805 * b) / 0.95047;
  const y = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  const z = (0.0193 * r + 0.1192 * g + 0.9505 * b) / 1.08883;
  const f = (t: number) => (t > 216 / 24389 ? Math.cbrt(t) : ((24389 / 27) * t + 16) / 116);
  return [116 * f(y) - 16, 500 * (f(x) - f(y)), 200 * (f(y) - f(z))];
}

export function deltaE(a: RGB, b: RGB): number {
  const [l1, a1, b1] = toLab(a);
  const [l2, a2, b2] = toLab(b);
  return Math.hypot(l1 - l2, a1 - a2, b1 - b2);
}

/** Smallest pairwise ΔE between colors, optionally under a color-vision deficiency. */
export function minPairDelta(hexes: readonly string[], kind?: keyof typeof CVD): number {
  const cs = hexes.map(hexToRgb).map((c) => (kind ? simulate(c, kind) : c));
  let m = Infinity;
  for (let i = 0; i < cs.length; i++) for (let j = i + 1; j < cs.length; j++) m = Math.min(m, deltaE(cs[i]!, cs[j]!));
  return m;
}
