/**
 * Cuttlefish — CHIBI class in profile (M), facing right. Round 4 after CRITIQUE-3 (grub / pill bug).
 * Silhouette: a separate round head (45 % of the length, a ~5 u neck notch) with a 13 u W-pupil eye
 * on plain skin, an oval mantle in a thin lobed fin skirt, and a tuft of four arms splayed ±20°
 * (R10: round head + W eye + arm tuft + fin skirt).
 * Palette: dusty rose #CC8AA8, three cream #F7E6EE chevrons on the mantle (apex toward the head)
 * that taper to 0 at the fin edge and stay off the head.
 * Personality: moody, clever, shifty. Resting mouth: a flat, unimpressed line.
 * Signature: the colour ripple — the bands flash gold, lilac and mint one after the other while it
 * scoots back with a shifty tilt and a smug look, then a wink.
 */
import { blob, capsule, circle, defineArt, ellipse, join } from '../kit.ts';

const MX = -18; // mantle centre
const MRX = 20,
  MRY = 15;
// the fin skirt: a soft ripple around the mantle only (16 even lobes), stopping short of the neck
const skirt = blob(
  Array.from({ length: 16 }, (_, i) => {
    const t = (i / 16) * Math.PI * 2;
    const r = i % 2 ? 0 : 2.2;
    return [MX - 3 + Math.cos(t) * (18.6 + r), Math.sin(t) * (17.4 + r)] as [number, number];
  }),
);
const mantle = ellipse(MX, 0, MRX, MRY);
// CRITIQUE-3: a separate round head (45 % of the length) with a ~5 u neck notch at x = -3
const head = circle(10, 0, 17);
// four arms splayed ±20° around a forward-down tuft (12°), from staggered roots on the snout (two parts: no overlapping subpaths)
const arm = (y: number, deg: number, len: number) => {
  const t = (deg * Math.PI) / 180;
  return capsule(23, y, 3.6, 23 + Math.cos(t) * len, y + Math.sin(t) * len, 2.5);
};
const armsA = join(arm(-1, -8, 12.5), arm(7, 18, 16));
const armsB = join(arm(3, 5, 16), arm(11, 31, 12));
// three cream chevrons on the mantle, apex toward the head, tapering to 0 at the fin edge
const halfH = (x: number) => MRY * Math.sqrt(Math.max(0, 1 - ((x - MX) / MRX) ** 2));
const chevron = (ax: number) => {
  const tip = ax - 8;
  const h = halfH(tip) + 1;
  return blob([
    [tip, -h],
    [ax - 0.5, -h * 0.5],
    [ax + 3.6, 0],
    [ax - 0.5, h * 0.5],
    [tip, h],
    [ax - 6.8, h * 0.4],
    [ax - 3.6, 0],
    [ax - 6.8, -h * 0.4],
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
  feature: 'round head with a W-pupil eye, a neck notch, chevroned mantle in a fin skirt, arm tuft',
  personality: ['moody', 'clever', 'shifty'],
  palette: { body: '#CC8AA8', accent: '#F7E6EE', belly: '#E9C3D3' },
  cycle: { rate: 8, during: 'signature' },
  groups: [
    { id: 'skirt', pivot: [MX - 3, 0], parts: [{ d: skirt, role: 'belly' }] },
    {
      id: 'arms',
      pivot: [23, 5],
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
        { d: chevron(-27), role: 'accent', kind: 'pattern', cycle: ripple(2) },
        { d: chevron(-18), role: 'accent', kind: 'pattern', cycle: ripple(1) },
        { d: chevron(-9), role: 'accent', kind: 'pattern', cycle: ripple(0) },
        { d: ellipse(MX, 15, 20, 4), role: 'belly', kind: 'pattern', alpha: 0.7 },
      ],
    },
  ],
  shine: ellipse(4, -9, 6, 2.8, -30),
  face: {
    eyes: [[11.5, 0.5]],
    eye: 13,
    zone: [-6, -29, 34, 54],
    mouth: { at: [21.5, 8], w: 4, shape: 'flat' },
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
