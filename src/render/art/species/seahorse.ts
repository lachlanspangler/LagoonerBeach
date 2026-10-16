/**
 * Seahorse — HORSE class (upright profile). Silhouette: an S — a big round head with a coronet bump
 * and a stubby snout, a round chest bulging forward, and a tail that curls forward into a spiral,
 * plus a little fan dorsal on the back (R10: the curl). Personality: gentle, devoted, proud.
 * Signature: the dorsal flutters, the tail curls tighter and a tiny bubble rises from the snout.
 */
import { blob, capsule, circle, defineArt, ellipse, join, tube } from '../kit.ts';

const head = ellipse(1, -24, 14, 13, -10);
const snout = capsule(10, -22, 6, 24, -19.5, 4.4);
const coronet = capsule(-4, -33, 5.6, -7, -37.5, 4.2);
const torso = blob([
  [-8, -14],
  [4, -13],
  [12, -4],
  [14, 7],
  [9, 17],
  [-1, 21],
  [-11, 16],
  [-14, 3],
  [-12, -7],
]);
const tail = tube([
  [-5, 16, 8.4],
  [-6, 26, 6.6],
  [-2, 34, 5.2],
  [5, 37.5, 4.2],
  [11, 34, 3.6],
  [10, 28, 3.2],
  [5, 28, 2.8],
]);
const dorsal = blob([
  [-11, -6],
  [-20, -9],
  [-25, -1],
  [-23, 8],
  [-12, 8],
]);
const bands = join(
  tube([
    [-14, -6, 2.6],
    [0, -8, 2.8],
    [14, -2, 2.6],
  ]),
  tube([
    [-16, 5, 2.6],
    [0, 4, 3],
    [16, 7, 2.6],
  ]),
  tube([
    [-14, 15, 2.4],
    [0, 15, 2.8],
    [12, 18, 2.4],
  ]),
);

export default defineArt({
  id: 'seahorse',
  klass: 'horse',
  size: 'S',
  feature: 'an S of big round head, forward chest and a tail curled into a spiral, with a coronet bump',
  personality: ['gentle', 'devoted', 'proud'],
  palette: { body: '#F2B93B', accent: '#D9662A' },
  groups: [
    {
      id: 'finA',
      pivot: [-12, 1],
      parts: [
        { d: dorsal, role: 'belly' },
        { d: 'M-13 -2L-21 -3M-13 3L-22 4', role: 'ink', kind: 'line', w: 1.2, alpha: 0.45 },
      ],
    },
    {
      id: 'tail',
      pivot: [-5, 16],
      parts: [
        { d: tail, role: 'body' },
        {
          d: join(
            tube([
              [-12, 26, 1.6],
              [0, 26, 1.6],
            ]),
          ),
          role: 'accent',
          kind: 'pattern',
        },
      ],
    },
    {
      id: 'body',
      parts: [
        { d: torso, role: 'body' },
        { d: coronet, role: 'body' },
        { d: head, role: 'body' },
        { d: snout, role: 'body' },
        { d: bands, role: 'accent', kind: 'pattern' },
        { d: ellipse(11, 6, 4, 10, -6), role: 'belly', kind: 'pattern', alpha: 0.7 },
      ],
    },
    {
      id: 'bubble',
      pivot: [30, -22],
      prop: true,
      parts: [
        { d: circle(30, -26, 4), role: 'white' },
        { d: circle(28.6, -27.4, 1.2), role: 'ink', kind: 'pattern', alpha: 0.2 },
      ],
    },
  ],
  shine: ellipse(-4, -31, 6, 2.8, -24),
  face: {
    eyes: [[9, -23]],
    eye: 7.2,
    zone: [-10, -40, 26, 30],
    mouth: { at: [24, -15.5], w: 4.4, shape: 'smile' },
    sweet: true,
  },
  idle: {
    ambient: [
      { m: 'bob', amp: 2, period: 2 },
      { m: 'flutter', g: 'finA', amp: 10, period: 0.12 },
      { m: 'sway', g: 'tail', amp: 4, period: 2, phase: 0.4 },
    ],
    signature: {
      dur: 1.5,
      every: [5, 8],
      tracks: [
        {
          g: 'tail',
          p: 'rot',
          k: [
            [0, 0],
            [0.15, 4],
            [0.35, -16],
            [0.65, -16],
            [0.85, 2],
            [1, 0],
          ],
        },
        {
          g: 'finA',
          p: 'rot',
          k: [
            [0, 0],
            [0.08, 14],
            [0.16, -10],
            [0.24, 14],
            [0.32, -10],
            [0.4, 0],
          ],
        },
        {
          p: 'rot',
          k: [
            [0, 0],
            [0.35, -6],
            [0.7, -6],
            [1, 0],
          ],
        },
        {
          g: 'bubble',
          p: 's',
          k: [
            [0, 0],
            [0.45, 0],
            [0.6, 1.1],
            [0.7, 1],
            [0.92, 1],
            [1, 0],
          ],
        },
        {
          g: 'bubble',
          p: 'ty',
          k: [
            [0, 0],
            [0.6, 0],
            [1, -14],
          ],
        },
      ],
      face: [
        [0.3, 0.8, 'proud'],
        [0.85, 1, 'wink'],
      ],
    },
  },
});
