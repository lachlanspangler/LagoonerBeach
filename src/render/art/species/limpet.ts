/**
 * Limpet — OBJECT class (side view), size XS.
 * Silhouette: a low, wide rounded cone (a little volcano) with a soft apex, sitting on a skirt of
 * foot that peeks out at the base (R10: the low cone, exaggerated flat and wide).
 * CRITIQUE-2: off the cockle and the brown cluster: low dome 2.2:1, apex 10 % back, five radial
 * ribs #946043 on a sage shell (a limpet with its algae), the face on the front flank (a 3/4 look) at 55 % height.
 * Resting mouth: a stubborn little pout.
 * Personality: clingy, stubborn, sweet. Signature: hunkers down (squash, holding on tight with
 * squeezed eyes), then a tiny scoot sideways and a happy face.
 * Groups (back to front): skirt (the foot), body (the cone; the face rides on it).
 */
import { blob, defineArt, ellipse, join, tube } from '../kit.ts';

// CRITIQUE-2: a LOW dome 2.2:1, apex 10 % back (the limpet leans into the rock it clings to)
const cone = blob([
  [-37, 15],
  [-33, 6],
  [-25, -3],
  [-16, -10],
  [-6, -13.5],
  [5, -12.5],
  [16, -7.5],
  [27, 0],
  [34, 8],
  [37, 15],
  [20, 19],
  [0, 20],
  [-20, 19],
]);
// the foot skirt flares past the dome like a hat brim (clinging tight)
const skirt = blob([
  [-41, 18],
  [-32, 14],
  [0, 14],
  [32, 14],
  [41, 18],
  [37, 23],
  [0, 24.5],
  [-37, 23],
]);
// five radial ribs (4 u) fanning from the apex over the back two-thirds; the front flank is the face
const rib = (x: number, y: number) =>
  tube([
    [-6 + (x + 6) * 0.3, -12 + (y + 12) * 0.3, 2],
    [-8 + (x + 8) * 0.6, -13 + (y + 13) * 0.6, 2.2],
    [x, y, 2.4],
  ]);
const ribs = join(rib(-39, 12), rib(-29, 18), rib(-18, 21), rib(-8, 22), rib(2, 22));

export default defineArt({
  id: 'limpet',
  klass: 'object',
  size: 'XS',
  feature: 'a low wide dome, apex set back, five ribs, on a skirt of foot',
  personality: ['clingy', 'stubborn', 'sweet'],
  palette: { body: '#AABF7C', accent: '#946043', belly: '#F1E2CC' },
  groups: [
    { id: 'skirt', parts: [{ d: skirt, role: 'belly' }] },
    {
      id: 'body',
      parts: [
        { d: cone, role: 'body' },
        { d: ribs, role: 'accent', kind: 'pattern' },
        { d: ellipse(-6, -12.5, 4.5, 2.6), role: 'accent', kind: 'pattern' },
        { d: ellipse(0, 20, 40, 5), role: 'belly', kind: 'pattern', alpha: 0.6 },
      ],
    },
  ],
  shine: ellipse(-20, -6, 8, 3, -30),
  ground: true,
  face: {
    eyes: [
      [6, 4],
      [26, 5.5],
    ],
    eye: 12.8,
    zone: [-4, -18, 44, 40],
    mouth: { at: [16.5, 12], w: 5, shape: 'pout' },
    front: true,
    sweet: true,
  },
  idle: {
    ambient: [
      { m: 'breathe', amp: 0.015, period: 3.6 },
      { m: 'glide', g: 'skirt', amp: 0.8, period: 3.6, phase: 0.5 },
    ],
    signature: {
      dur: 1.2,
      tracks: [
        {
          p: 'sy',
          k: [
            [0, 1],
            [0.14, 0.84],
            [0.48, 0.84],
            [0.58, 1.1],
            [0.7, 0.96],
            [0.8, 1],
          ],
        },
        {
          p: 'sx',
          k: [
            [0, 1],
            [0.14, 1.14],
            [0.48, 1.14],
            [0.58, 0.92],
            [0.7, 1.03],
            [0.8, 1],
          ],
        },
        {
          p: 'rot',
          k: [
            [0.18, 0],
            [0.24, -2],
            [0.3, 2],
            [0.36, -2],
            [0.42, 2],
            [0.48, 0],
          ],
        },
        {
          p: 'tx',
          k: [
            [0.56, 0],
            [0.66, 2.6],
            [0.72, 2.6],
            [0.82, 2.6],
            [1, 2.6],
          ],
        },
        {
          p: 'ty',
          k: [
            [0.56, 0],
            [0.62, -2.5],
            [0.7, 0],
          ],
        },
      ],
      face: [
        [0.12, 0.5, 'happy'],
        [0.7, 1, 'proud'],
      ],
    },
  },
  catch: {
    dur: 0.5,
    tracks: [
      {
        p: 'sy',
        k: [
          [0, 1],
          [0.2, 0.86],
          [0.45, 1.14],
          [1, 1],
        ],
      },
      {
        p: 'sx',
        k: [
          [0, 1],
          [0.2, 1.12],
          [0.45, 0.9],
          [1, 1],
        ],
      },
    ],
    face: [[0, 1, 'happy']],
  },
});
