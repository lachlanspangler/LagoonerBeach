/**
 * Whale Shark — SHARK class, profile, XXL (the tile crops its tail on purpose, R27/R28).
 * Silhouette: a huge deep body behind a wide, flat, blunt head with a long gentle mouth across the
 * front (R10: the broad box of a head and the wide smile), small dorsal, crescent tail.
 * Dark identity lifted (R16): slate blue at L 0.58, white belly, an authored grid of white spots.
 * Personality: gentle, huge, kind. Signature: an enormous slow blink and a tiny smile while three
 * plankton specks drift into its mouth.
 */
import { blob, circle, defineArt, ellipse, join, tube } from '../kit.ts';

// front-heavy: the deepest point is just behind the head, the front is a flat, near-vertical face
const body = blob([
  [46, -5],
  [45, -12],
  [38, -16],
  [20, -18],
  [2, -17],
  [-14, -13],
  [-26, -7],
  [-35, -2],
  [-35, 3],
  [-26, 6],
  [-12, 10],
  [6, 14],
  [26, 14],
  [41, 11],
  [46, 4],
]);
// the front half as its own (non-extra) part: it alone sets the body box, so the tile frames the
// big head and lets the back half and the tail run off the left edge (XXL, R27/R28)
const head = blob([
  [46, -5],
  [45, -12],
  [38, -16],
  [20, -18],
  [2, -17],
  [-14, -13],
  [-24, -6],
  [-26, 1],
  [-22, 6],
  [-12, 10],
  [6, 14],
  [26, 14],
  [41, 11],
  [46, 4],
]);
const tail = blob([
  [-30, -3],
  [-36, -14],
  [-41, -25],
  [-44, -20],
  [-41, -3],
  [-43, 12],
  [-39, 14],
  [-32, 5],
]);
const dorsal = blob([
  [-2, -16],
  [-8, -26],
  [-14, -29],
  [-16, -25],
  [-17, -13],
]);
const pectoral = tube([
  [8, 11, 5.4],
  [2, 18, 4.8],
  [-6, 23, 3.2],
]);
// the authored spot grid (R18: 9 spots, ≥ 6 units), bigger toward the head, three rows
const spots = join(
  circle(28, -9, 3.1),
  circle(16, -11, 3.3),
  circle(4, -10, 3.2),
  circle(-8, -7, 3),
  circle(-20, -4, 2.8),
  circle(10, -1, 3),
  circle(-2, 1, 3),
  circle(-14, 2, 2.8),
  circle(22, 0, 2.9),
);
// the long mouth across the front of the flat head (a part, not the rig mouth: it's 3× wider)
const mouthLine = 'M46 2C42 8 35 10 29 9';
const plankton = join(circle(47, 2, 1.8), circle(46, 9, 1.4), circle(48.5, -3, 1.2));

export default defineArt({
  id: 'whaleshark',
  klass: 'shark',
  size: 'XXL',
  feature: 'a wide flat blunt head with a long smile across the front, deep spotted body',
  personality: ['gentle', 'huge', 'kind'],
  palette: { body: '#5F7F9C', accent: '#F2F6F9', belly: '#E8EEF2' },
  groups: [
    // the tail is `extra`: outside the body box, so the XXL tile crops it (R28 "it doesn't fit")
    { id: 'tail', pivot: [-31, 0], parts: [{ d: tail, role: 'body', extra: true }] },
    {
      id: 'body',
      parts: [
        { d: dorsal, role: 'body' },
        { d: body, role: 'body', extra: true },
        { d: head, role: 'body' },
        { d: ellipse(12, 16, 40, 8, -2), role: 'belly', kind: 'pattern' },
        { d: spots, role: 'accent', kind: 'pattern', alpha: 0.9 },
        { d: mouthLine, role: 'ink', kind: 'line', w: 1.8 },
        { d: 'M8 -6C10 -2 10 2 8 6M3 -5C5 -1 5 3 3 7', role: 'ink', kind: 'line', w: 1.3, alpha: 0.4 },
      ],
    },
    { id: 'finA', pivot: [8, 10], parts: [{ d: pectoral, role: 'body' }] },
    { id: 'plankton', pivot: [47, 3], prop: true, parts: [{ d: plankton, role: 'accent' }] },
  ],
  shine: ellipse(26, -13, 11, 2.8, -6),
  face: {
    eyes: [[22, 0]],
    eye: 7,
    zone: [8, -20, 38, 34],
    mouth: { at: [36, 9.5], w: 5, shape: 'none' },
    sweet: true,
  },
  idle: {
    ambient: [
      { m: 'bob', amp: 1.5, period: 3.2 },
      { m: 'wag', g: 'tail', amp: 6, period: 1.4 },
      { m: 'flutter', g: 'finA', amp: 6, period: 1.8 },
    ],
    signature: {
      dur: 1.5,
      every: [6, 8],
      tracks: [
        {
          g: 'plankton',
          p: 'tx',
          k: [
            [0, 2],
            [0.6, -10],
            [0.75, -12],
          ],
        },
        {
          g: 'plankton',
          p: 's',
          k: [
            [0, 0],
            [0.12, 1],
            [0.55, 1],
            [0.72, 0],
            [1, 0],
          ],
        },
        {
          p: 'sy',
          k: [
            [0, 1],
            [0.6, 1],
            [0.7, 0.97],
            [0.82, 1.02],
            [1, 1],
          ],
        },
      ],
      face: [
        [0.2, 0.62, 'blink'],
        [0.7, 1, 'proud'],
      ],
    },
  },
  catch: {
    dur: 0.6,
    tracks: [
      {
        g: 'tail',
        p: 'rot',
        k: [
          [0, 0],
          [0.3, 12],
          [0.65, -10],
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
