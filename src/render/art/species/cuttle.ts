/**
 * Cuttlefish — CHIBI class in profile (M), facing right.
 * Silhouette: a plump oval mantle wrapped in a frilly fin skirt, with a short tuft of arms poking
 * out under the snout (R10: the skirt, exaggerated into a soft frill all round). Big round head.
 * Personality: moody, clever, shifty. Signature: a shifty little scoot — it jets back, the arm
 * tuft twirls up like a moustache, it gives a smug look and a wink.
 */
import { blob, defineArt, ellipse, join, tube } from '../kit.ts';

// mantle + head as one smooth shape (the head bulges at the front)
const body = blob([
  [-31, 0],
  [-25, -13],
  [-10, -18.5],
  [8, -19],
  [22, -13],
  [28, 0],
  [24, 12],
  [10, 18],
  [-10, 18],
  [-25, 12],
]);
const skirt =
  'M22.0 0.0A4.4 4.4 0 0 1 20.2 8.2A4.7 4.7 0 0 1 15.0 15.4A5.0 5.0 0 0 1 7.0 20.8A5.4 5.4 0 0 1 -2.8 23.6A5.5 5.5 0 0 1 -13.2 23.6A5.4 5.4 0 0 1 -23.0 20.8A5.0 5.0 0 0 1 -31.0 15.4A4.7 4.7 0 0 1 -36.2 8.2A4.4 4.4 0 0 1 -38.0 0.0A4.4 4.4 0 0 1 -36.2 -8.2A4.7 4.7 0 0 1 -31.0 -15.4A5.0 5.0 0 0 1 -23.0 -20.8A5.4 5.4 0 0 1 -13.2 -23.6A5.5 5.5 0 0 1 -2.8 -23.6A5.4 5.4 0 0 1 7.0 -20.8A5.0 5.0 0 0 1 15.0 -15.4A4.7 4.7 0 0 1 20.2 -8.2A4.4 4.4 0 0 1 22.0 0.0Z';
// a short tuft of arms, behind the head, poking forward under the snout
const arms = join(
  tube([
    [18, 0, 5.2],
    [30, -1, 4.4],
    [38, -4, 3.4],
  ]),
  tube([
    [16, 6, 5.6],
    [30, 8, 4.8],
    [40, 7, 3.8],
  ]),
  tube([
    [14, 12, 5.6],
    [28, 16, 4.6],
    [37, 19, 3.6],
  ]),
  tube([
    [10, 15, 5.4],
    [20, 22, 4.4],
    [27, 26, 3.4],
  ]),
);
// three soft cream zebra bands across the back
const stripes = join(
  'M-26 -16C-22 -8 -27 0 -23 8C-21 12 -24 16 -24 18',
  'M-14 -20C-10 -11 -15 -2 -11 7C-9 12 -12 16 -12 20',
  'M-2 -20C2 -12 -3 -5 0 2',
);

export default defineArt({
  id: 'cuttle',
  klass: 'chibi',
  size: 'M',
  feature: 'oval mantle in a frilly fin skirt with a short arm tuft under the snout',
  personality: ['moody', 'clever', 'shifty'],
  palette: { body: '#C08A66', accent: '#F4E4C9' },
  groups: [
    {
      id: 'skirt',
      pivot: [-9, 0],
      parts: [{ d: skirt, role: 'belly' }],
    },
    { id: 'arms', pivot: [14, 10], parts: [{ d: arms, role: 'body' }] },
    {
      id: 'body',
      parts: [
        { d: body, role: 'body' },
        { d: stripes, role: 'accent', kind: 'line', w: 3.4 },
        { d: ellipse(-4, 18, 28, 6), role: 'belly', kind: 'pattern', alpha: 0.6 },
      ],
    },
  ],
  shine: ellipse(-4, -14, 11, 3.6, -6),
  face: {
    eyes: [[13, -1]],
    eye: 10.6,
    zone: [-2, -27, 30, 46],
    mouth: { at: [22, 8], w: 4, shape: 'smile' },
  },
  idle: {
    ambient: [
      { m: 'breathe', amp: 0.02, period: 3 },
      { m: 'bob', amp: 1.8, period: 2.6 },
      { m: 'pulse', g: 'skirt', amp: 0.03, period: 0.9 },
      { m: 'sway', g: 'arms', amp: 7, period: 1.8 },
    ],
    signature: {
      dur: 1.3,
      tracks: [
        {
          p: 'tx',
          k: [
            [0, 0],
            [0.12, 1.5],
            [0.3, -9],
            [0.75, -6],
            [1, 0],
          ],
        },
        {
          p: 'rot',
          k: [
            [0, 0],
            [0.3, 4],
            [0.5, -6],
            [0.8, -6],
            [1, 0],
          ],
        },
        {
          p: 'sx',
          k: [
            [0, 1],
            [0.12, 0.94],
            [0.3, 1.06],
            [0.5, 1],
          ],
        },
        {
          g: 'arms',
          p: 'rot',
          k: [
            [0, 0],
            [0.3, 12],
            [0.45, -38],
            [0.6, -26],
            [0.75, -38],
            [0.92, 0],
          ],
        },
      ],
      face: [
        [0.35, 0.8, 'proud'],
        [0.8, 1, 'wink'],
      ],
    },
  },
});
