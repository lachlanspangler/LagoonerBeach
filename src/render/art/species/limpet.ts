/**
 * Limpet — OBJECT class (side view), size XS.
 * Silhouette: a low, wide rounded cone (a little volcano) with a soft apex, sitting on a skirt of
 * foot that peeks out at the base (R10: the low cone, exaggerated flat and wide).
 * CRITIQUE-4 (cold read "generic cone/tent": ribs on one half only): a slate-buff dome 0.55 × its
 * width with the apex nub 10 % forward, five umber ribs fanned evenly from the apex (−60…+60°; the
 * middle one stops above the face), two green algae dabs, sitting inside a wide brim of foot (the
 * brim also keeps it clear of the cockle's heart).
 * Resting mouth: a stubborn little pout.
 * Personality: clingy, stubborn, sweet. Signature: hunkers down (squash, holding on tight with
 * squeezed eyes), then a tiny scoot sideways and a happy face.
 * Groups (back to front): skirt (the foot), body (the cone; the face rides on it).
 */
import { blob, defineArt, ellipse, join, tube, xform } from '../kit.ts';

// CRITIQUE-4: a low dome (height 0.55 x width: 41 / 74), straight-ish flanks so it reads as a
// little volcano, not a bell with the apex nub 10 % forward of centre
const APEX: [number, number] = [7, -24];
const SH = (d: string) => xform(d, { sx: 0.93, sy: 0.93, oy: 17 }); // the dome sits inside a wide brim
const dome = SH(
  blob([
    [-37, 17],
    [-33, 6],
    [-23, -6.5],
    [-12, -17],
    [-2, -22.5],
    [7, -24],
    [15, -22],
    [23, -14],
    [31.5, 0],
    [37, 17],
    [18, 19.5],
    [0, 20],
    [-18, 19.5],
  ]),
);
// the apex nub: a little knob, 10 % forward, that just breaks the silhouette
const nub = SH(ellipse(APEX[0], APEX[1] - 1, 4.4, 3.4));
// the foot skirt flares past the dome like a hat brim (clinging tight)
const skirt = blob([
  [-40, 18.5],
  [-33, 14],
  [0, 14],
  [33, 14],
  [40, 18.5],
  [37.5, 23],
  [0, 23.5],
  [-37.5, 23],
]);
// CRITIQUE-4: 5 ribs fanned evenly from the apex (meridians at -60, -30, 0, +30, +60 degrees round
// the dome, so they meet the rim at sin(lon) of the half-width), bowed a little with the dome. The
// critique's 2 u tips are under the R18W 4 u floor: 4 u at the apex out to 4.8 u. The three middle
// ribs stop above the eyes (a bar through the face reads as a nose); the outer two run to the rim.
const rib = (lon: number, f: number) => {
  const s = Math.sin((lon * Math.PI) / 180);
  const bx = APEX[0] + s * (lon >= 0 ? 30 : 44); // the dome is wider behind the apex than in front
  const at = (t: number, r: number): [number, number, number] => [
    APEX[0] + (bx - APEX[0]) * t + s * 5 * Math.sin(Math.PI * t),
    APEX[1] + (19 - APEX[1]) * t,
    r,
  ];
  return tube([at(0.04, 2.3), at(f * 0.5, 2.45), at(f, 2.6)]);
};
const ribs = SH(join(rib(-60, 1), rib(-30, 1), rib(0, 0.4), rib(30, 1), rib(60, 1)));
// two 6 u algae dabs on the back slope, between the ribs (a limpet wears its garden)
const algae = SH(join(ellipse(-18.5, 7, 4.6, 3.6, -25), ellipse(-14.5, -12, 3.8, 3.2, -35)));

export default defineArt({
  id: 'limpet',
  klass: 'object',
  size: 'XS',
  tileScale: 1.15,
  feature: 'a little ribbed volcano with an apex nub, on a skirt of foot',
  personality: ['clingy', 'stubborn', 'sweet'],
  // CRITIQUE-4: slate-buff #B8A88E dome. The umber ribs are the body's own ink at 0.49 (#7F6950 on
  // the dome, ΔE ~1 from the asked #7E6450): golden then darkens to a deep gold (#BF8E31, after the
  // asked #B07A1E) instead of the golden accent's cream. Belly role = the sea-green algae dabs.
  palette: { body: '#B8A88E', belly: '#8DB069' },
  deviations: {
    R16S: 'CRITIQUE-4 slate-buff #B8A88E (chroma 0.04): the ink outline, umber ribs and green dabs keep it off sand and mint',
  },
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
        { d: dome, role: 'body' },
        { d: nub, role: 'body' },
        { d: ribs, role: 'ink', kind: 'pattern', alpha: 0.49 },
        { d: algae, role: 'belly', kind: 'pattern' },
      ],
    },
  ],
  shine: ellipse(-6, -15, 6.5, 2.6, -30),
  ground: true,
  face: {
    eyes: [
      [-2.6, 5.4],
      [15.1, 5.4],
    ],
    eye: 13,
    zone: [-10, -19, 42, 40],
    mouth: { at: [6.3, 12], w: 5, shape: 'pout' },
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
