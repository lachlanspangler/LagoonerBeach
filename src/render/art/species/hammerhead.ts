/**
 * Hammerhead — SHARK class (profile body, the hammer turned a little toward us).
 * Silhouette: a plump torpedo with a tall rounded dorsal, a crescent shark tail, and the
 * signature T: a wide rounded hammer bar across the front (R10, exaggerated ~2×).
 * Personality: earnest, curious, wide-eyed. Signature: scans side to side with the hammer
 * ("sees every direction"), then a pleased little nod.
 */
import { blob, defineArt, ellipse, tube } from '../kit.ts';

const body = blob([
  [30, -2],
  [22, -10],
  [8, -17],
  [-4, -18],
  [-16, -14],
  [-30, -6],
  [-35, -1],
  [-30, 5],
  [-14, 13],
  [4, 16],
  [20, 9],
]);
// a gentle forward crescent, one piece with the snout: round lobes top and bottom, the eye on the top one
const hammer = blob([
  [27, -29],
  [34, -30],
  [38.5, -21],
  [38.5, -5],
  [38.5, 11],
  [35, 21],
  [28, 22],
  [25, 12],
  [27, 0],
  [24.5, -14],
]);
const dorsal = blob([
  [6, -14],
  [-2, -30],
  [-8, -38],
  [-13, -33],
  [-14, -14],
]);
const tail = blob([
  [-31, -3],
  [-38, -15],
  [-42.5, -26],
  [-44.5, -19],
  [-41.5, -3],
  [-42.5, 11],
  [-40, 13],
  [-32, 5],
]);
const pectoral = tube([
  [4, 10, 5.4],
  [-2, 18, 4.6],
  [-8, 23, 3.2],
]);

export default defineArt({
  id: 'hammerhead',
  klass: 'shark',
  size: 'XL',
  feature: 'a wide T-shaped hammer across the front, eye at its tip, tall dorsal',
  personality: ['earnest', 'curious', 'wide-eyed'],
  palette: { body: '#7A8DA3', belly: '#E6ECF2' },
  groups: [
    { id: 'tail', pivot: [-33, 0], parts: [{ d: tail, role: 'body' }] },
    {
      id: 'body',
      parts: [
        { d: dorsal, role: 'body' },
        { d: body, role: 'body' },
        { d: ellipse(-2, 15, 34, 8, -4), role: 'belly', kind: 'pattern' },
        { d: 'M8 -2C10 1 10 5 8 8M13 -2C15 1 15 5 13 8', role: 'ink', kind: 'line', w: 1.4, alpha: 0.5 },
      ],
    },
    {
      id: 'head',
      pivot: [26, 0],
      parts: [
        { d: hammer, role: 'body' },
        { d: ellipse(32, 23, 12, 6), role: 'belly', kind: 'pattern' },
      ],
    },
    { id: 'finA', pivot: [4, 9], parts: [{ d: pectoral, role: 'body' }] },
  ],
  shine: ellipse(8, -10, 10, 3.2, -8),
  face: {
    g: 'head',
    eyes: [[32, -17]],
    eye: 9,
    zone: [24, -32, 18, 56],
    mouth: { at: [33, -9.5], w: 6, shape: 'smile' },
    sweet: true,
  },
  deviations: {
    R7: 'the appendix puts the eye at the hammer tip, far forward and high, not 34 % back along the body',
  },
  idle: {
    ambient: [
      { m: 'bob', amp: 1.5, period: 3.2 },
      { m: 'wag', g: 'tail', amp: 7, period: 1.4 },
      { m: 'flutter', g: 'finA', amp: 8, period: 1.6 },
    ],
    signature: {
      dur: 1.5,
      every: [5, 8],
      tracks: [
        {
          g: 'head',
          p: 'rot',
          k: [
            [0, 0],
            [0.15, -14],
            [0.35, -14],
            [0.5, 14],
            [0.7, 14],
            [0.85, -3],
            [1, 0],
          ],
        },
        {
          g: 'head',
          p: 'sx',
          k: [
            [0, 1],
            [0.15, 0.82],
            [0.35, 0.82],
            [0.42, 1],
            [0.5, 0.82],
            [0.7, 0.82],
            [0.85, 1],
          ],
        },
        {
          p: 'rot',
          k: [
            [0, 0],
            [0.8, 0],
            [0.88, 4],
            [1, 0],
          ],
        },
      ],
      face: [
        [0.12, 0.75, 'surprised'],
        [0.85, 1, 'happy'],
      ],
    },
  },
  catch: {
    dur: 0.5,
    tracks: [
      {
        g: 'tail',
        p: 'rot',
        k: [
          [0, 0],
          [0.25, 16],
          [0.5, -16],
          [0.75, 10],
          [1, 0],
        ],
      },
      {
        g: 'head',
        p: 'rot',
        k: [
          [0, 0],
          [0.3, -10],
          [0.65, 8],
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
