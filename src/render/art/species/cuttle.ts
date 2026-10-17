/**
 * Cuttlefish — CHIBI class in profile (M), facing right. Round 3 after CRITIQUE-2.
 * Silhouette: a big round head (45 % of the length) with a 13 u W-pupil eye, an oval mantle in a
 * thin (4 u) lighter fin skirt that ripples, and a beard of four arms splayed in a fan under the
 * snout (R10: the round head + W eye + arm fan; the old fist read as a bread roll).
 * Palette (CRITIQUE-2): dusty rose #C98FA8 (owning the colour-changer hue, out of the brown
 * cluster), three tapering cream bands #F7E6EE that follow the mantle's curve.
 * Personality: moody, clever, shifty. Resting mouth: a flat, unimpressed line.
 * Signature: the colour ripple — the bands flash gold, lilac and mint one after the other while it
 * scoots back with a shifty tilt and a smug look, then a wink.
 */
import { blob, capsule, circle, defineArt, ellipse, join, tube } from '../kit.ts';

const MX = -11; // mantle centre
// the fin skirt: a soft ripple 4 u outside the mantle (16 even lobes)
const skirt = blob(
  Array.from({ length: 16 }, (_, i) => {
    const t = (i / 16) * Math.PI * 2;
    const r = i % 2 ? 0 : 2.4;
    return [MX + Math.cos(t) * (24.5 + r), Math.sin(t) * (20 + r)] as [number, number];
  }),
);
const mantle = ellipse(MX, 0, 21, 16.5);
const head = circle(11, 0, 19);
// four arms splayed in a fan under the snout (two parts so no subpaths overlap inside one part)
const arm = (deg: number, len: number) => {
  const t = (deg * Math.PI) / 180;
  return capsule(25, 8, 4.2, 25 + Math.cos(t) * len, 8 + Math.sin(t) * len, 2.5);
};
const armsA = join(arm(-12, 17), arm(36, 17));
const armsB = join(arm(12, 18), arm(62, 15));
// three cream bands that taper and bow with the mantle's curve
const band = (x: number) =>
  tube([
    [x + 3, -17, 3.4],
    [x - 1, -8, 2.9],
    [x - 2, 1, 2.2],
    [x, 9, 1.4],
  ]);
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
  feature: 'big round head with a W-pupil eye, banded oval mantle in a thin fin skirt, fanned arms',
  personality: ['moody', 'clever', 'shifty'],
  palette: { body: '#CC8AA8', accent: '#F7E6EE', belly: '#E9C3D3' },
  cycle: { rate: 8, during: 'signature' },
  groups: [
    { id: 'skirt', pivot: [MX, 0], parts: [{ d: skirt, role: 'belly' }] },
    {
      id: 'arms',
      pivot: [25, 8],
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
        { d: band(-31), role: 'accent', kind: 'pattern', cycle: ripple(2) },
        { d: band(-20), role: 'accent', kind: 'pattern', cycle: ripple(1) },
        { d: band(-9), role: 'accent', kind: 'pattern', cycle: ripple(0) },
        { d: ellipse(4, 17, 22, 4.5), role: 'belly', kind: 'pattern', alpha: 0.7 },
        // the collar where the mantle meets the round head
        { d: 'M-1 -15C-6 -6 -6 7 -1 16', role: 'ink', kind: 'line', w: 3, alpha: 0.3 },
      ],
    },
  ],
  shine: ellipse(3, -12, 8, 3.6, -25),
  face: {
    eyes: [[13, 1]],
    eye: 13,
    zone: [-8, -29, 42, 54],
    mouth: { at: [23.5, 7], w: 4, shape: 'flat' },
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
