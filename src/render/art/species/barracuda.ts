/**
 * Barracuda — the long one (fish class, profile view, level).
 * Silhouette (R10): a true needle (≈ 4.5 : 1) whose snout tapers over the front 18 %, a lower jaw
 * jutting 6 units past it, two white upper teeth over the lip, and a crisp forked tail. Steel silver
 * with a slate back whose flat edge is the aloof brow, and four dark slanted bars.
 * Personality: sleek, toothy, aloof. Signature: a fast 10-unit lunge, then it acts as if nothing
 * happened (nose up, smug `proud` face).
 */
import { blob, capsule, defineArt, ellipse, join, tube } from '../kit.ts';

// needle body (depth ±7.2): the upper snout tapers over the front 18 % to a point at +35; the
// lower jaw juts 6 units on past it to +41; tail root at −30
const body = blob([
  [35, 0.5],
  [30, -3],
  [22, -6],
  [10, -7.2],
  [-6, -7.2],
  [-22, -5],
  [-30, -2.6],
  [-30, 2.6],
  [-22, 5],
  [-6, 7.2],
  [10, 7.2],
  [22, 6],
  [30, 3.5],
]);
// the jutting lower jaw (underbite +6 u): a plump wedge under and past the snout, tip lifted
const jaw = blob([
  [19, 3.5],
  [30, 3],
  [38, 1.6],
  [41.5, 2.4],
  [41, 5],
  [36, 7],
  [21, 7.2],
]);
// two white upper teeth hanging from the snout over the lower lip (5 u showing, rounded tips)
const teeth = join(capsule(26.5, 1.5, 1.9, 26.5, 9.3, 1.5), capsule(31.2, 0.5, 1.8, 31.2, 7.6, 1.4));
// crisp fork, taller than the body
const tail = blob(
  [
    [-28, -3.5],
    [-35, -9],
    [-38.5, -17],
    [-41.5, -15],
    [-40, -5],
    [-38, 0],
    [-40, 5],
    [-41.5, 15],
    [-38.5, 17],
    [-35, 9],
    [-28, 3.5],
  ],
  0.9,
);
const dorsal = blob(
  [
    [2, -7],
    [-4, -13.5],
    [-10, -12.5],
    [-12, -6.5],
  ],
  0.9,
);
const pectoral = ellipse(3, 4.5, 5, 2.4, 18);
// the dark back: its lower edge runs flat just over the eye (the aloof, level brow) and on back
const back = blob(
  [
    [27, -4.6],
    [14, -5.9],
    [0, -4.4],
    [-16, -3.2],
    [-34, -1.8],
    [-34, -16],
    [27, -16],
  ],
  0.6,
);
// four dark bars slanting back from the back line (R18 bands, ≥ 4 u), clear of the face
const bar = (x: number) =>
  tube([
    [x + 2, -5, 2.4],
    [x - 0.5, 0, 2.3],
    [x - 2.5, 4.5, 1.9],
  ]);
const bars = join(bar(-25), bar(-17), bar(-9), bar(-1));
export default defineArt({
  id: 'barracuda',
  klass: 'fish',
  size: 'L',
  tileScale: 1.12,
  feature: 'a true needle with an underbite, two white upper teeth, a slate back and four bars',
  personality: ['sleek', 'toothy', 'aloof'],
  palette: { body: '#9AA5AE', accent: '#3F5568' },
  deviations: {
    R16: 'steel silver (CRITIQUE-3): chroma 0.02 is the identity, darkened to L 0.72 to sit ΔE ≥ 6 off the minnow',
    R16S: 'silver identity; the slate back, dark bars and ink outline keep it off the sand and mint',
  },
  groups: [
    {
      id: 'tail',
      pivot: [-30, 0],
      parts: [
        { d: tail, role: 'body' },
        { d: join(ellipse(-42, -14, 4, 4), ellipse(-42, 14, 4, 4)), role: 'accent', kind: 'pattern' },
      ],
    },
    {
      id: 'jaw',
      pivot: [22, 5],
      parts: [
        { d: jaw, role: 'body' },
        { d: teeth, role: 'white' },
      ],
    },
    {
      id: 'body',
      parts: [
        { d: dorsal, role: 'body' },
        { d: body, role: 'body' },
        { d: ellipse(2, 8.5, 34, 3.6), role: 'belly', kind: 'pattern' },
        { d: back, role: 'accent', kind: 'pattern' },
        { d: bars, role: 'accent', kind: 'pattern', alpha: 0.9 },
      ],
    },
    { id: 'finA', pivot: [0, 4], parts: [{ d: pectoral, role: 'body' }] },
  ],
  shine: ellipse(-14, -4.6, 8, 1.6, -4),
  face: {
    eyes: [[15, -1.5]],
    eye: 8.2,
    zone: [1, -24, 38, 39],
    mouth: { at: [22, 4.2], w: 5, shape: 'flat' },
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
          g: 'jaw',
          p: 'rot',
          k: [
            [0.12, 0],
            [0.18, 10],
            [0.26, 0],
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
