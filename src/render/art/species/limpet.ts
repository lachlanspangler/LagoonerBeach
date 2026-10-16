/**
 * Limpet — OBJECT class (side view), size XS.
 * Silhouette: a low, wide rounded cone (a little volcano) with a soft apex, sitting on a skirt of
 * foot that peeks out at the base (R10: the low cone, exaggerated flat and wide).
 * Ribs as three ridges only (appendix). Body lightness raised for Day. Eyes at the cone's base.
 * Personality: clingy, stubborn, sweet. Signature: hunkers down (squash, holding on tight with
 * squeezed eyes), then a tiny scoot sideways and a happy face.
 * Groups (back to front): skirt (the foot), body (the cone; the face rides on it).
 */
import { blob, defineArt, ellipse, join, tube } from '../kit.ts';

const cone = blob([
  [-37, 15],
  [-31, 6],
  [-20, -4],
  [-10, -14],
  [-4, -20],
  [4, -20],
  [12, -12],
  [26, -2],
  [35, 6],
  [37, 15],
  [20, 20],
  [0, 21],
  [-20, 20],
]);
const skirt = blob([
  [-41, 18],
  [-30, 14],
  [0, 13],
  [30, 14],
  [41, 18],
  [36, 24],
  [0, 26],
  [-36, 24],
]);
// three ridges from the apex (R18: ribs as 3 ridges only)
const ridges = join(
  tube([
    [-5, -17, 1.6],
    [-15, -7, 2.6],
    [-28, 5, 3],
  ]),
  tube([
    [0, -19, 1.6],
    [0, -14, 2.2],
    [0, -9, 1.6],
  ]),
  tube([
    [5, -17, 1.6],
    [15, -7, 2.6],
    [28, 5, 3],
  ]),
);

export default defineArt({
  id: 'limpet',
  klass: 'object',
  size: 'XS',
  feature: 'a low wide volcano cone on a skirt of foot',
  personality: ['clingy', 'stubborn', 'sweet'],
  palette: { body: '#D5B397', accent: '#A3745A', belly: '#F6E3D2' },
  groups: [
    { id: 'skirt', parts: [{ d: skirt, role: 'belly' }] },
    {
      id: 'body',
      parts: [
        { d: cone, role: 'body' },
        { d: ridges, role: 'accent', kind: 'pattern' },
        { d: ellipse(0, -18, 5, 3), role: 'accent', kind: 'pattern' },
        { d: ellipse(0, 20, 40, 5), role: 'belly', kind: 'pattern', alpha: 0.6 },
      ],
    },
  ],
  shine: ellipse(-16, -4, 8, 3.2, -34),
  ground: true,
  face: {
    eyes: [
      [-7, 7],
      [7, 7],
    ],
    eye: 7.6,
    zone: [-34, -11, 68, 32],
    mouth: { at: [0, 13], w: 5, shape: 'smile' },
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
