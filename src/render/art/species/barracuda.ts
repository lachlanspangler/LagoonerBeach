/**
 * Barracuda — the long one (fish class, profile view, level).
 * Silhouette (R10): a true needle (≈ 3.5 : 1) with a lower jaw that juts 6 units past the snout, two
 * white rounded teeth on it, and a crisp forked tail taller than the body.
 * Personality: sleek, toothy, aloof. Signature: a fast 10-unit lunge, then it acts as if nothing
 * happened (nose up, smug `proud` face).
 */
import { blob, capsule, defineArt, ellipse, join, tube } from '../kit.ts';

// needle body: upper snout at +34, the lower jaw juts on to +41, tail root at −30
const body = blob([
  [34, -1],
  [28, -6],
  [12, -8.5],
  [-6, -8.5],
  [-22, -6],
  [-30, -3],
  [-30, 3],
  [-22, 6],
  [-6, 8.5],
  [12, 8.5],
  [28, 7.5],
  [34, 4.5],
]);
// the jutting lower jaw (R10, exaggerated): a plump rounded wedge under and past the snout
const jaw = blob([
  [24, 3],
  [33, 1.5],
  [40.5, 2.5],
  [41, 6],
  [36, 8.5],
  [24, 8.5],
]);
// two white rounded teeth standing on the jaw tip
const teeth = join(capsule(35.5, 2, 1.7, 35, -1.8, 1.4), capsule(39.5, 2.8, 1.6, 39.2, -0.8, 1.3));
// crisp fork, taller than the body
const tail = blob(
  [
    [-28, -3.5],
    [-35, -9],
    [-39.5, -17],
    [-42.5, -15],
    [-40, -5],
    [-38, 0],
    [-40, 5],
    [-42.5, 15],
    [-39.5, 17],
    [-35, 9],
    [-28, 3.5],
  ],
  0.9,
);
const dorsal = blob(
  [
    [2, -9],
    [-4, -14.5],
    [-10, -13.5],
    [-12, -8],
  ],
  0.9,
);
const pectoral = ellipse(4, 5, 5, 2.4, 18);
// six filled chevron bands (R18 bands, ≥ 6 units), mid-dark slate, behind the face
const chevron = (x: number) =>
  tube([
    [x - 3, -11, 2.8],
    [x + 1.5, -3, 3],
    [x - 1, 4, 2.4],
  ]);
const chevrons = join(chevron(-27), chevron(-18), chevron(-9), chevron(0), chevron(8), chevron(15.5));

export default defineArt({
  id: 'barracuda',
  klass: 'fish',
  size: 'L',
  feature: 'a true needle with a jaw that juts past the snout, two white teeth, and a forked tail',
  personality: ['sleek', 'toothy', 'aloof'],
  palette: { body: '#7AA3D4', accent: '#5F7385' },
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
        { d: teeth, role: 'white' },
        { d: jaw, role: 'body' },
      ],
    },
    {
      id: 'body',
      parts: [
        { d: dorsal, role: 'body' },
        { d: body, role: 'body' },
        { d: ellipse(4, 10, 34, 4.5), role: 'belly', kind: 'pattern' },
        { d: chevrons, role: 'accent', kind: 'pattern', alpha: 0.85 },
      ],
    },
    { id: 'finA', pivot: [0, 4], parts: [{ d: pectoral, role: 'body' }] },
  ],
  shine: ellipse(22, -5.5, 8, 2, -6),
  face: {
    eyes: [[18, -1.5]],
    eye: 8.2,
    zone: [4, -24, 38, 39],
    mouth: { at: [32, 3], w: 6, shape: 'flat' },
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
