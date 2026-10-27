/**
 * Ocean Sunfish (mola) — FISH class (profile), size XL.
 * Silhouette: a tall round disc with no tail, just a scalloped frill (the clavus) at the back, and
 * two long fins, one straight up and one straight down (R10: the missing tail and the tall fins;
 * at XL the fin tips break the tile frame, R28).
 * Personality: sunny, dopey, gentle. Signature: flops onto its side to sunbathe (blissful lids),
 * then rights itself with a happy face.
 * Groups (back to front): dorsal, anal, body (disc + clavus).
 */
import { blob, capsule, circle, defineArt, ellipse, join } from '../kit.ts';

const disc = ellipse(2, 0, 28, 24);
// the clavus: a smooth frill of three big round scallops instead of a tail
const clavus = join(
  blob([
    [-14, -18],
    [-24, -16],
    [-26, 0],
    [-24, 16],
    [-14, 18],
  ]),
  circle(-26, -11, 8),
  circle(-29, 1, 8.5),
  circle(-26, 13, 8),
);
const dorsal = blob([
  [2, -19],
  [-4, -30],
  [-9, -39],
  [-16, -39],
  [-17, -28],
  [-14, -17],
]);
const anal = blob([
  [2, 19],
  [-4, 30],
  [-9, 39],
  [-16, 39],
  [-17, 28],
  [-14, 17],
]);
// darker fin tips and frill edge (accent), so the shape reads on the silver body
const dorsalTip = ellipse(-13, -41, 7, 6.5, 10);
const analTip = ellipse(-13, 41, 7, 6.5, -10);
const frillEdge = join(ellipse(-31, -12, 4, 5.5), ellipse(-34, 1, 4, 6), ellipse(-31, 14, 4, 5.5));

export default defineArt({
  id: 'sunfish',
  klass: 'fish',
  size: 'XL',
  tileScale: 0.85,
  feature: 'a tall disc with no tail, a scalloped frill and long fins up and down',
  personality: ['sunny', 'dopey', 'gentle'],
  palette: { body: '#9FC0D4', accent: '#6B8BA2', belly: '#D9E6EE' },
  groups: [
    {
      id: 'dorsal',
      pivot: [-6, -22],
      parts: [
        { d: dorsal, role: 'body' },
        // XL frame-break (R28): the fin tip pokes 2–4 px past the tile's art box
        { d: capsule(-11, -34, 6, -12.5, -43.5, 4.4), role: 'body', extra: true },
        { d: dorsalTip, role: 'accent', kind: 'pattern' },
      ],
    },
    {
      id: 'anal',
      pivot: [-6, 22],
      parts: [
        { d: anal, role: 'body' },
        { d: capsule(-11, 34, 6, -12.5, 43.5, 4.4), role: 'body', extra: true },
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
    eye: 9.4,
    zone: [-2, -22, 32, 42],
    mouth: { at: [27, 8.5], w: 5, shape: 'o' },
    sweet: true,
    blush: { color: '#FFB3A0', always: true },
  },
  deviations: {
    R16S: 'silver identity (the mola is silver-grey); chroma 0.05 still reads on sand and mint, warmth comes from the sun-blush',
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
