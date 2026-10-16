/**
 * Ocean Sunfish (mola) — FISH class (profile), size XL.
 * Silhouette: a tall round disc with no tail, just a scalloped frill (the clavus) at the back, and
 * two long fins, one straight up and one straight down (R10: the missing tail and the tall fins;
 * at XL the fin tips break the tile frame, R28).
 * Personality: sunny, dopey, gentle. Signature: flops onto its side to sunbathe (blissful lids),
 * then rights itself with a happy face.
 * Groups (back to front): dorsal, anal, body (disc + clavus).
 */
import { blob, defineArt, ellipse, join } from '../kit.ts';

const disc = ellipse(2, 0, 28, 24);
// the clavus: a soft scalloped frill instead of a tail
const clavus = blob([
  [-18, -18],
  [-28, -16],
  [-33, -9],
  [-30, -3],
  [-34, 3],
  [-31, 9],
  [-33, 15],
  [-27, 19],
  [-17, 18],
]);
const dorsal = blob([
  [2, -19],
  [-4, -32],
  [-10, -40],
  [-17, -39],
  [-17, -28],
  [-14, -17],
]);
const anal = blob([
  [2, 19],
  [-4, 32],
  [-10, 40],
  [-17, 39],
  [-17, 28],
  [-14, 17],
]);
// darker fin tips and frill edge (accent), so the shape reads on the silver body
const dorsalTip = ellipse(-13, -39, 7, 6, 20);
const analTip = ellipse(-13, 39, 7, 6, -20);
const frillEdge = join(ellipse(-33, -9, 4, 5), ellipse(-34, 3, 4, 5), ellipse(-33, 15, 4, 5));

export default defineArt({
  id: 'sunfish',
  klass: 'fish',
  size: 'XL',
  feature: 'a tall disc with no tail, a scalloped frill and long fins up and down',
  personality: ['sunny', 'dopey', 'gentle'],
  palette: { body: '#A9C2D1', accent: '#6B8BA2', belly: '#D9E6EE' },
  groups: [
    {
      id: 'dorsal',
      pivot: [-6, -22],
      parts: [
        { d: dorsal, role: 'body' },
        { d: dorsalTip, role: 'accent', kind: 'pattern' },
      ],
    },
    {
      id: 'anal',
      pivot: [-6, 22],
      parts: [
        { d: anal, role: 'body' },
        { d: analTip, role: 'accent', kind: 'pattern' },
      ],
    },
    {
      id: 'body',
      parts: [
        { d: clavus, role: 'body' },
        { d: disc, role: 'body' },
        { d: ellipse(2, 20, 32, 11), role: 'belly', kind: 'pattern' },
        { d: frillEdge, role: 'accent', kind: 'pattern' },
        { d: 'M-18 -18C-24 -6 -24 6 -18 18', role: 'ink', kind: 'line', w: 1.6, alpha: 0.35 },
      ],
    },
  ],
  shine: ellipse(14, -16, 10, 4.4, -24),
  face: {
    eyes: [[10, 2]],
    eye: 8.4,
    zone: [-2, -22, 32, 42],
    mouth: { at: [29, 8], w: 4, shape: 'o' },
    sweet: true,
  },
  idle: {
    ambient: [
      { m: 'bob', amp: 1.5, period: 3.2 },
      { m: 'wag', g: 'dorsal', amp: 9, period: 1.4 },
      { m: 'wag', g: 'anal', amp: 9, period: 1.4, phase: 0.5 },
    ],
    signature: {
      dur: 1.5,
      every: [6, 8],
      tracks: [
        {
          p: 'rot',
          k: [
            [0, 0],
            [0.12, 5],
            [0.34, -82],
            [0.4, -76],
            [0.68, -78],
            [0.88, 5],
            [1, 0],
          ],
        },
        {
          p: 'ty',
          k: [
            [0, 0],
            [0.34, 6],
            [0.68, 6],
            [0.9, -2],
            [1, 0],
          ],
        },
        {
          p: 'sy',
          k: [
            [0.3, 1],
            [0.38, 0.95],
            [0.46, 1.02],
            [0.54, 1],
          ],
        },
      ],
      face: [
        [0.3, 0.74, 'sleepy'],
        [0.8, 1, 'happy'],
      ],
    },
  },
  catch: {
    dur: 0.5,
    tracks: [
      {
        g: 'dorsal',
        p: 'rot',
        k: [
          [0, 0],
          [0.3, -16],
          [0.65, 12],
          [1, 0],
        ],
      },
      {
        g: 'anal',
        p: 'rot',
        k: [
          [0, 0],
          [0.3, 16],
          [0.65, -12],
          [1, 0],
        ],
      },
      {
        p: 'sy',
        k: [
          [0, 1],
          [0.2, 0.95],
          [0.45, 1.05],
          [1, 1],
        ],
      },
    ],
    face: [[0, 1, 'happy']],
  },
});
