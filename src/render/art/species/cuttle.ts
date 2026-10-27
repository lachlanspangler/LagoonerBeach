/**
 * Cuttlefish — CHIBI class in profile (M), facing right. Round 5 after CRITIQUE-4 ("pink grub
 * with a mitten").
 * Silhouette: a long flat oval mantle (1.6x the head's length) edged top and bottom by a lighter
 * #E9C3D3 fin-skirt frill (4 u, 5 scallops each), a separate round head (35 % of the body length)
 * carrying a 15 u W-pupil eye, and five tapered arms (30 % of the body length) fanned ±25°
 * (R10: frilled mantle + W eye + arm tuft).
 * Palette: dusty rose #CC8AA8, three cream #F7E6EE chevrons on the mantle (apex toward the head)
 * that taper to 0 at the fin edge and stay off the head.
 * Personality: moody, clever, shifty. Resting mouth: a flat, unimpressed line.
 * Signature: the colour ripple — the bands flash gold, lilac and mint one after the other while it
 * scoots back with a shifty tilt and a smug look, then a wink.
 */
import { blob, defineArt, ellipse, join, tube } from '../kit.ts';

// CRITIQUE-4: a long flat oval mantle 1.6x the head's length, the head 35 % of the body length,
// arms 30 % of it on top (body −43.4 … 14.6, arms out to ~33)
const MX = -25; // mantle centre
const MRX = 18.4,
  MRY = 13.5;
const HX = 3,
  HRX = 11.6,
  HRY = 13.5;
const mantle = ellipse(MX, 0, MRX, MRY);
const halfH = (x: number) => MRY * Math.sqrt(Math.max(0, 1 - ((x - MX) / MRX) ** 2));
// the lighter fin-skirt frill: 4 u along the top and the bottom of the mantle, 5 soft scallops
// each (peaks 4 u out, dips 1.5 u), tucked into the mantle at both ends
const frill = (sgn: 1 | -1) => {
  const xs = [-38.5, -34.5, -30.5, -26.5, -22.5, -18.5, -14.5, -10.5, -7];
  const pts: [number, number][] = [[-41.5, sgn * (halfH(-41.5) - 2)]];
  xs.forEach((x, i) => pts.push([x, sgn * (halfH(x) + (i % 2 ? 1 : 4) * (i === 8 ? 0.4 : 1))]));
  pts.push([-12, sgn * (halfH(-12) - 3)], [-36, sgn * (halfH(-36) - 3)]);
  return blob(pts.map(([x, y]) => [x, y]) as [number, number][]);
};
const head = ellipse(HX, 0, HRX, HRY);
// five tapered arms fanned ±25° round a forward-down tuft (+8°), from staggered roots on the
// snout; alternate arms share a part so no part's subpaths overlap
const arm = (y: number, deg: number, len: number) => {
  const t = (deg * Math.PI) / 180;
  const c = Math.cos(t),
    sn = Math.sin(t);
  // tapered 6 u → 2.6 u, with a little downward curl at the tip
  return tube([
    [11, y, 3],
    [11 + c * len * 0.55, y + sn * len * 0.55, 2.2],
    [11 + c * len + 1.2 * sn, y + sn * len + 1.6, 1.3],
  ]);
};
const armsA = join(arm(-4.5, -17, 18), arm(1.5, 8, 21), arm(7.5, 33, 16.5));
const armsB = join(arm(-1.5, -4.5, 20), arm(4.5, 20.5, 19));
// three cream chevrons on the mantle, apex toward the head, tapering to 0 at the fin edge
const chevron = (ax: number) => {
  const tip = ax - 7;
  const h = halfH(tip) + 1;
  return blob([
    [tip, -h],
    [ax - 1, -h * 0.5],
    [ax + 3, 0],
    [ax - 1, h * 0.5],
    [tip, h],
    [ax - 7.2, h * 0.3],
    [ax - 2.6, 0],
    [ax - 7.2, -h * 0.3],
  ]);
};
const C = '#F7E6EE',
  G = '#F7D58A',
  L = '#B9A7EC',
  M = '#9ED8C8';
// each band rests cream (step 0) and flashes in turn, front band first: a ripple running backward
const ripple = (k: number) => [C, ...Array<string>(k).fill(C), G, L, M, ...Array<string>(3 - k).fill(C)];

export default defineArt({
  id: 'cuttle',
  klass: 'chibi',
  size: 'M',
  feature: 'big W-pupil eye on a round head, a long frilled mantle with chevrons, five tapered arms',
  personality: ['moody', 'clever', 'shifty'],
  palette: { body: '#CC8AA8', accent: '#F7E6EE', belly: '#E9C3D3' },
  cycle: { rate: 8, during: 'signature' },
  groups: [
    {
      id: 'skirt',
      pivot: [MX, 0],
      parts: [
        { d: frill(-1), role: 'belly' },
        { d: frill(1), role: 'belly' },
      ],
    },
    {
      id: 'arms',
      pivot: [11.5, 1.5],
      parts: [
        { d: armsA, role: 'body' },
        { d: armsB, role: 'body' },
      ],
    },
    {
      id: 'body',
      parts: [
        { d: mantle, role: 'body' },
        { d: head, role: 'body' },
        { d: chevron(-31), role: 'accent', kind: 'pattern', cycle: ripple(2) },
        { d: chevron(-23), role: 'accent', kind: 'pattern', cycle: ripple(1) },
        { d: chevron(-15), role: 'accent', kind: 'pattern', cycle: ripple(0) },
        { d: ellipse(MX, 12, 18, 3.5), role: 'belly', kind: 'pattern', alpha: 0.7 },
      ],
    },
  ],
  shine: ellipse(-2, -9, 5, 2.4, -30),
  face: {
    eyes: [[3, -1]],
    eye: 15,
    zone: [-9, -37.5, 26, 64],
    mouth: { at: [12.2, 7.5], w: 4, shape: 'flat' },
    pupil: 'w',
  },
  idle: {
    ambient: [
      { m: 'breathe', amp: 0.02, period: 3 },
      { m: 'bob', amp: 1.8, period: 2.6 },
      { m: 'pulse', g: 'skirt', amp: 0.035, period: 0.9 },
      { m: 'sway', g: 'arms', amp: 6, period: 1.8 },
    ],
    signature: {
      dur: 1.4,
      tracks: [
        {
          p: 'tx',
          k: [
            [0, 0],
            [0.12, 1.5],
            [0.3, -8],
            [0.75, -6],
            [1, 0],
          ],
        },
        {
          p: 'rot',
          k: [
            [0, 0],
            [0.3, 4],
            [0.5, -6],
            [0.8, -6],
            [1, 0],
          ],
        },
        {
          g: 'arms',
          p: 'rot',
          k: [
            [0, 0],
            [0.3, 10],
            [0.5, -20],
            [0.8, -20],
            [0.95, 0],
          ],
        },
        {
          g: 'skirt',
          p: 'sy',
          k: [
            [0, 1],
            [0.2, 1.06],
            [0.4, 0.96],
            [0.6, 1.05],
            [0.8, 0.97],
            [1, 1],
          ],
        },
      ],
      face: [
        [0.35, 0.8, 'proud'],
        [0.8, 1, 'wink'],
      ],
    },
  },
});
