/**
 * Barracuda — the long one (fish class, profile view).
 * Silhouette (R10): a 3 : 1 needle with a jutting underbite jaw and a crisp forked tail; at 24 px it
 * is the only fish this long and thin.
 * Personality: sleek, toothy, aloof. Signature: a fast 10-unit lunge, then it acts as if nothing
 * happened (smug `proud` face, eyes elsewhere).
 */
import { blob, defineArt, ellipse, join, tube } from '../kit.ts';

// needle body: upper snout at +37, lower jaw juts out to +42, tail root at −30
const body = blob([
  [40.5, 5.5],
  [37.5, 2.5],
  [35, 1],
  [36, -1.5],
  [28, -8.5],
  [12, -12.5],
  [-6, -12],
  [-22, -8.5],
  [-31, -3.5],
  [-31, 3.5],
  [-22, 8.5],
  [-6, 12],
  [12, 12.5],
  [30, 10.5],
  [38, 9],
]);
const tail = blob(
  [
    [-28, -4],
    [-36, -10],
    [-41, -16],
    [-43, -12],
    [-41, -4],
    [-39, 0],
    [-41, 4],
    [-43, 12],
    [-41, 16],
    [-36, 10],
    [-28, 4],
  ],
  0.9,
);
const dorsal1 = blob(
  [
    [5, -11],
    [-2, -19.5],
    [-8, -18.5],
    [-10, -10],
  ],
  0.9,
);
const dorsal2 = blob(
  [
    [-15, -8],
    [-20, -15],
    [-25, -14],
    [-26, -7],
  ],
  0.9,
);
const anal = blob(
  [
    [-15, 8],
    [-20, 15],
    [-25, 14],
    [-26, 7],
  ],
  0.9,
);
const pectoral = ellipse(4, 6, 6, 2.6, 18);
// six dark chevrons along the back (R18 bands), pointing forward like a speed mark
const chevron = (x: number) =>
  tube([
    [x - 2.5, -12, 1.3],
    [x + 1, -7, 1.6],
    [x - 1.5, -2, 1.1],
  ]);
const chevrons = join(chevron(-26), chevron(-18), chevron(-10), chevron(-2), chevron(6), chevron(13));

export default defineArt({
  id: 'barracuda',
  klass: 'fish',
  size: 'L',
  feature: 'a 3 : 1 needle with a jutting underbite jaw and a forked tail',
  personality: ['sleek', 'toothy', 'aloof'],
  palette: { body: '#94A8BC', accent: '#3B4652' },
  groups: [
    {
      id: 'tail',
      pivot: [-30, 0],
      parts: [
        { d: tail, role: 'body' },
        { d: join(ellipse(-42.5, -14, 4, 4), ellipse(-42.5, 14, 4, 4)), role: 'accent', kind: 'pattern', alpha: 0.7 },
      ],
    },
    {
      id: 'body',
      parts: [
        { d: dorsal1, role: 'body' },
        { d: dorsal2, role: 'body' },
        { d: anal, role: 'body' },
        { d: body, role: 'body' },
        { d: ellipse(6, 10, 40, 5), role: 'belly', kind: 'pattern' },
        { d: chevrons, role: 'accent', kind: 'pattern', alpha: 0.6 },
        { d: 'M24 -6Q27 0 24 6', role: 'ink', kind: 'line', w: 1.4 },
      ],
    },
    { id: 'finA', pivot: [0, 5], parts: [{ d: pectoral, role: 'body' }] },
  ],
  shine: ellipse(26, -6, 8, 2.2, -8),
  face: {
    eyes: [[15, 1.5]],
    eye: 8,
    zone: [0, -19, 42, 36],
    mouth: { at: [34.5, 3.4], w: 6, shape: 'underbite' },
  },
  idle: {
    ambient: [
      { m: 'bob', amp: 1.5, period: 3 },
      { m: 'wag', g: 'tail', amp: 7, period: 1.2 },
      { m: 'flutter', g: 'finA', amp: 12, period: 0.6 },
    ],
    signature: {
      dur: 1.2,
      every: [5, 8],
      tracks: [
        {
          p: 'tx',
          k: [
            [0, 0],
            [0.1, -3],
            [0.2, 10],
            [0.4, 10],
            [0.75, 0],
            [1, 0],
          ],
        },
        {
          p: 'sx',
          k: [
            [0, 1],
            [0.1, 0.92],
            [0.2, 1.08],
            [0.32, 1],
          ],
        },
        {
          p: 'rot',
          k: [
            [0, 0],
            [0.4, 0],
            [0.5, -6],
            [0.85, -6],
            [1, 0],
          ],
        },
        {
          g: 'tail',
          p: 'rot',
          k: [
            [0, 0],
            [0.08, 22],
            [0.16, -18],
            [0.26, 0],
          ],
        },
      ],
      face: [
        [0.12, 0.36, 'surprised'],
        [0.42, 0.95, 'proud'],
      ],
    },
  },
  catch: {
    dur: 0.5,
    tracks: [
      {
        p: 'sx',
        k: [
          [0, 1],
          [0.2, 0.92],
          [0.45, 1.08],
          [1, 1],
        ],
      },
      {
        g: 'tail',
        p: 'rot',
        k: [
          [0, 0],
          [0.25, 18],
          [0.5, -18],
          [0.75, 10],
          [1, 0],
        ],
      },
    ],
    face: [[0, 1, 'happy']],
  },
});
