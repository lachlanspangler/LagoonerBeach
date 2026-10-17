/**
 * Shore Shrimp — LONG class, XS (profile, level). Silhouette: a plump C-curl comma lying level — a
 * big round head on the right, a banded tail arching over and curling under into a little fan —
 * with two filled antennae sweeping back (R10: the curl and the antennae). A big eye (24 %) on the
 * front-top of the head, clear of the curl. Personality: jumpy, startled, silly.
 * Signature: the backward flick — the tail snaps and it recoils 8 units, startled, then grins.
 */
import { blob, capsule, defineArt, ellipse, join, tube } from '../kit.ts';

const head = ellipse(17, 1, 16, 14);
const abdomen = tube([
  [6, -7, 12],
  [-8, -11, 11.5],
  [-20, -6, 10.2],
  [-25, 6, 8.8],
  [-19, 16, 7.2],
  [-8, 20, 5.8],
]);
const fan = blob([
  [-9, 16],
  [0, 14],
  [7, 17],
  [9, 24],
  [2, 28],
  [-6, 26],
]);
const rostrum = capsule(28, -6, 3.8, 37, -10, 2.6);
const antennae = join(
  tube([
    [25, -9, 2.6],
    [24, -21, 2.6],
    [15, -30, 2.5],
    [4, -33, 2.5],
  ]),
  tube([
    [23, -7, 2.6],
    [32, -19, 2.6],
    [34, -30, 2.5],
  ]),
);
const legs = join(capsule(14, 12, 2.8, 15, 19, 2.5), capsule(22, 11, 2.8, 24, 17, 2.5));
// cream bands: radial bars across the curl (centre of the C ≈ (-8, 5))
const band = (deg: number) => {
  const a = (deg * Math.PI) / 180;
  const c = Math.cos(a),
    s = Math.sin(a);
  return tube([
    [-8 + 6 * c, 5 + 6 * s, 2.4],
    [-8 + 30 * c, 5 + 30 * s, 2.6],
  ]);
};
const bands = join(band(-80), band(-125), band(-170), band(145));

export default defineArt({
  id: 'shrimp',
  klass: 'long',
  size: 'XS',
  feature: 'a plump level C-curl comma with a big round head, a fan tail tucked under and two antennae',
  personality: ['jumpy', 'startled', 'silly'],
  palette: { body: '#F59A8B', accent: '#FFF0DC' },
  groups: [
    {
      id: 'antennae',
      pivot: [24, -8],
      parts: [{ d: antennae, role: 'body', extra: true }],
    },
    {
      id: 'tail',
      pivot: [-10, 18],
      parts: [
        { d: fan, role: 'body' },
        { d: 'M-1 17L2 26', role: 'ink', kind: 'line', w: 3, alpha: 0.25 },
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
        { d: ellipse(18, 13, 13, 4.4), role: 'accent', kind: 'pattern', alpha: 0.45 },
      ],
    },
  ],
  shine: ellipse(11, -8, 7, 3, -16),
  face: {
    eyes: [[17, -3]],
    eye: 11.2,
    zone: [3, -31, 32, 47],
    mouth: { at: [30, 7], w: 5, shape: 'smile' },
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
