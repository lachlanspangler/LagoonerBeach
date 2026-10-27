/**
 * Limpet — OBJECT class (side view), size XS.
 * Silhouette: a low, wide rounded cone (a little volcano) with a soft apex, sitting on a skirt of
 * foot that peeks out at the base (R10: the low cone, exaggerated flat and wide).
 * CRITIQUE-3 (watermelon slice / mini turtle shell → limpet): a true little volcano with a rounded
 * apex nub, four umber ribs down the back slope and one at the front edge, two algae dabs, on a buff
 * shell; the front flank is left plain for the face (eyes 13 u at 55 % of the cone height).
 * Resting mouth: a stubborn little pout.
 * Personality: clingy, stubborn, sweet. Signature: hunkers down (squash, holding on tight with
 * squeezed eyes), then a tiny scoot sideways and a happy face.
 * Groups (back to front): skirt (the foot), body (the cone; the face rides on it).
 */
import { blob, circle, defineArt, ellipse, join, tube } from '../kit.ts';

// CRITIQUE-3: a true little volcano (not a dome): a rounded apex set 6 % back, straight-ish flanks
const cone = blob([
  [-38, 15],
  [-31, 2],
  [-22, -9],
  [-12, -16.5],
  [-3, -19],
  [7, -16],
  [17, -8],
  [28, 2],
  [38, 15],
  [20, 18.5],
  [0, 19.5],
  [-20, 18.5],
]);
// the foot skirt flares past the cone like a hat brim (clinging tight)
const skirt = blob([
  [-40.5, 18],
  [-32, 14],
  [0, 14],
  [32, 14],
  [40.5, 18],
  [37, 23],
  [0, 24.5],
  [-37, 23],
]);
// radial ribs (4-5 u, tapering up) fanning from the apex: four down the back slope, one on the
// front edge; the front flank between them stays plain for the face
const APEX: [number, number] = [-3, -19];
const rib = (x: number, y: number) =>
  tube([
    [APEX[0] + (x - APEX[0]) * 0.18, APEX[1] + (y - APEX[1]) * 0.18, 1.6],
    [APEX[0] + (x - APEX[0]) * 0.6, APEX[1] + (y - APEX[1]) * 0.6, 2.2],
    [x, y, 2.6],
  ]);
const ribs = join(rib(-40, 15), rib(-33, 19), rib(-25, 21.5), rib(-16, 23), rib(42, 16));
// two algae dabs on the back slope (a limpet wears its garden)
const algae = join(ellipse(-24, 0, 4.2, 3.2, -35), ellipse(-13, -12, 3.6, 3, -30));

export default defineArt({
  id: 'limpet',
  klass: 'object',
  size: 'XS',
  feature: 'a little ribbed volcano with an apex nub, on a skirt of foot',
  personality: ['clingy', 'stubborn', 'sweet'],
  // CRITIQUE-3 asked slate-buff #B8A88E: C 0.04 fails R16S (and sits ΔE 5 from the flounder), so
  // the nearest buff that passes and keeps ΔE >= 6 from every body is #BDB276. Umber ribs as asked;
  // the belly role carries the sea-green algae dabs (the foot is the body hex under a pale wash).
  palette: { body: '#BDB276', accent: '#7E6450', belly: '#8DB069' },
  groups: [
    {
      id: 'skirt',
      parts: [
        { d: skirt, role: 'body' },
        { d: skirt, role: 'white', kind: 'pattern', alpha: 0.5 },
      ],
    },
    {
      id: 'body',
      parts: [
        { d: cone, role: 'body' },
        { d: ribs, role: 'accent', kind: 'pattern' },
        { d: circle(APEX[0], APEX[1] - 0.5, 3.4), role: 'accent', kind: 'pattern' },
        { d: algae, role: 'belly', kind: 'pattern' },
      ],
    },
  ],
  shine: ellipse(-16, -9, 7, 2.6, -48),
  ground: true,
  face: {
    eyes: [
      [4, 1.5],
      [22.5, 2.5],
    ],
    eye: 13,
    zone: [-8, -21, 42, 40],
    mouth: { at: [14, 9.5], w: 5, shape: 'pout' },
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
