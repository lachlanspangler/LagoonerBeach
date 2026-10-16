/**
 * Shore Shrimp — LONG class, XS (profile). Silhouette: a plump C-curl comma — big round head, a
 * banded tail that curls under into a little fan — with two long filled antennae sweeping back
 * (R10: the curl and the antennae). Personality: jumpy, startled, silly.
 * Signature: the backward flick — the tail snaps and it recoils 8 units, startled, then grins.
 */
import { blob, capsule, defineArt, ellipse, join, tube } from '../kit.ts';

const head = ellipse(15, -6, 17, 14, -8);
const abdomen = tube([
  [4, -9, 12.5],
  [-10, -12, 11.5],
  [-22, -6, 10],
  [-27, 6, 8.6],
  [-22, 17, 7],
  [-13, 22, 5.6],
]);
const fan = blob([
  [-14, 18],
  [-5, 16],
  [3, 19],
  [5, 26],
  [-2, 30],
  [-11, 28],
]);
const rostrum = capsule(27, -14, 3.6, 37, -20, 2.6);
const antennae = join(
  tube([
    [26, -14, 2.6],
    [26, -28, 2.6],
    [16, -39, 2.5],
    [2, -43, 2.5],
  ]),
  tube([
    [24, -12, 2.6],
    [34, -26, 2.6],
    [36, -40, 2.5],
  ]),
);
const legs = join(capsule(0, 6, 2.8, -1, 14, 2.5), capsule(8, 7, 2.8, 9, 15, 2.5));
// cream bands: radial bars across the curl (centre of the C ≈ (-11, 5))
const band = (deg: number) => {
  const a = (deg * Math.PI) / 180;
  const c = Math.cos(a),
    s = Math.sin(a);
  return tube([
    [-11 + 7 * c, 5 + 7 * s, 2.4],
    [-11 + 30 * c, 5 + 30 * s, 2.6],
  ]);
};
const bands = join(band(-95), band(-135), band(-178), band(140));

export default defineArt({
  id: 'shrimp',
  klass: 'long',
  size: 'XS',
  feature: 'a plump C-curl comma with a big round head, a fan tail tucked under and two long antennae',
  personality: ['jumpy', 'startled', 'silly'],
  palette: { body: '#F59A8B', accent: '#FFF0DC' },
  groups: [
    {
      id: 'antennae',
      pivot: [25, -13],
      parts: [{ d: antennae, role: 'body', extra: true }],
    },
    {
      id: 'tail',
      pivot: [-16, 20],
      parts: [
        { d: fan, role: 'body' },
        { d: 'M-7 19L-4 28M-1 18L2 25', role: 'ink', kind: 'line', w: 1.2, alpha: 0.4 },
      ],
    },
    {
      id: 'body',
      parts: [
        { d: legs, role: 'body' },
        { d: abdomen, role: 'body' },
        { d: rostrum, role: 'body' },
        { d: head, role: 'body' },
        { d: bands, role: 'accent', kind: 'pattern' },
        { d: ellipse(14, 6, 13, 4, -6), role: 'accent', kind: 'pattern', alpha: 0.45 },
      ],
    },
  ],
  shine: ellipse(10, -15, 7, 3, -20),
  face: {
    eyes: [[18, -4]],
    eye: 6.7,
    zone: [2, -20, 30, 28],
    mouth: { at: [29, 2], w: 4.5, shape: 'smile' },
    sweet: true,
    blushInk: true,
  },
  idle: {
    ambient: [
      { m: 'bob', amp: 2, period: 1.6 },
      { m: 'sway', g: 'antennae', amp: 6, period: 1.2 },
      { m: 'wag', g: 'tail', amp: 8, period: 0.9, phase: 0.3 },
    ],
    signature: {
      dur: 0.9,
      every: [4, 7],
      tracks: [
        {
          g: 'tail',
          p: 'rot',
          k: [
            [0, 0],
            [0.12, -14],
            [0.22, 30],
            [0.45, 0],
          ],
        },
        {
          p: 'tx',
          k: [
            [0, 0],
            [0.12, 1.5],
            [0.3, -8],
            [0.7, -8],
            [1, 0],
          ],
        },
        {
          p: 'ty',
          k: [
            [0, 0],
            [0.3, -3],
            [0.5, 0],
          ],
        },
        {
          p: 'sy',
          k: [
            [0, 1],
            [0.12, 0.88],
            [0.3, 1.12],
            [0.45, 1],
          ],
        },
        {
          g: 'antennae',
          p: 'rot',
          k: [
            [0, 0],
            [0.3, 18],
            [0.5, -8],
            [0.7, 0],
          ],
        },
      ],
      face: [
        [0.12, 0.6, 'surprised'],
        [0.72, 1, 'happy'],
      ],
    },
  },
});
