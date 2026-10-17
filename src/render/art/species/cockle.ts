/**
 * Cockle — OBJECT class (front view), size XS.
 * Silhouette: a ribbed fan-shaped lid with a soft rounded apex over a deep cream bowl, lifted open so
 * a wide lens-shaped gap shows the pink mantle and the face (R6), plus a small cream foot nub at the
 * side (cockles hop with it). R10: the four broad ribs fanning from the apex (R18: 4 ridges).
 * Every rounder, wider, heart-shaped version normalised onto the sand dollar's coin (IoU 0.80–0.93),
 * so the fan apex and the foot nub are the silhouette levers.
 * Personality: dreamy, musical, round. Signature: the lid rocks open while it hums three notes, wink.
 * Groups (back to front): mantle (with the foot; the face rides on it), body (bowl), lid, notes (prop).
 */
import { blob, capsule, circle, defineArt, ellipse, join, tube, xform } from '../kit.ts';

const HINGE: [number, number] = [-40, 4];
const OPEN = 0; // resting tilt in degrees (the signature tips the lid open on its left hinge)
const S = 0.9; // the whole shell, scaled to fit the 84-unit box once tipped open
const fit = (d: string) => xform(d, { sx: S, sy: S });
const tip = (d: string) => fit(xform(d, { rot: OPEN, ox: HINGE[0], oy: HINGE[1] }));

// the closed lid: convex shoulders, an off-centre umbo knob (cockles' beaks sit a touch forward)
const lidShape = join(
  blob([
    [-38, 2],
    [-28, -10],
    [-16, -23],
    [-6, -34],
    [0, -38],
    [6, -34],
    [16, -23],
    [28, -10],
    [38, 2],
    [22, -5],
    [0, -9],
    [-22, -5],
  ]),
);
// four broad ribs fanning from the umbo (pattern strokes ≥ 4 units)
const rib = (x: number) =>
  tube([
    [-1 + x * 0.12, -32, 1.6],
    [x * 0.55, -14, 2.4],
    [x, 4, 2.9],
  ]);
const ribs = join(rib(-31), rib(-11), rib(10), rib(30));
// the lower valve: a deep rounded bowl with a soft heart point
const base = blob([
  [-40, 5],
  [-20, 12],
  [0, 15],
  [20, 12],
  [40, 5],
  [41, 21],
  [35, 30],
  [18, 33],
  [0, 34],
  [-18, 33],
  [-35, 30],
  [-41, 21],
]);
// the mantle: soft and pale inside the gap
const mantle = ellipse(0, 3, 32, 13);
// a small cream foot nub peeking out at the side (cockles hop with it)
const foot = capsule(30, 24, 5.5, 46, 31, 4.6);
const notes = join(
  circle(30, -32, 3),
  capsule(32.6, -32, 1.3, 32.6, -41, 1.3),
  circle(39, -38, 2.6),
  capsule(41.3, -38, 1.2, 41.3, -45, 1.2),
);

export default defineArt({
  id: 'cockle',
  klass: 'object',
  size: 'XS',
  feature: 'a ribbed fan lid lifted open over a cream bowl, face peeking from the gap',
  personality: ['dreamy', 'musical', 'round'],
  palette: { body: '#E8CCA3', accent: '#B07A4E', belly: '#F6C6B2' },
  groups: [
    {
      id: 'mantle',
      parts: [
        { d: fit(foot), role: 'body' },
        { d: fit(mantle), role: 'belly' },
      ],
    },
    {
      id: 'body',
      parts: [{ d: fit(base), role: 'body' }],
    },
    {
      id: 'lid',
      pivot: [HINGE[0] * S, HINGE[1] * S],
      parts: [
        { d: tip(lidShape), role: 'body' },
        { d: tip(ribs), role: 'accent', kind: 'pattern' },
      ],
    },
    { id: 'notes', pivot: [34, -38], prop: true, parts: [{ d: notes, role: 'accent' }] },
  ],
  shineOn: 'lid',
  shine: tip(ellipse(-20, -22, 8, 3.6, -28)),
  face: {
    g: 'mantle',
    eyes: [
      [-8.6, 2.5],
      [8.6, 2.5],
    ],
    eye: 12.6,
    zone: [-34, -30, 68, 56],
    mouth: { at: [0, 7.5], w: 5, shape: 'smile' },
    front: true,
    sweet: true,
  },
  deviations: {
    R16S: 'warm cream shell after the critique’s #F1DDBB, deepened so it clears mint (ΔE ≥ 0.1); chroma 0.065; the broad brown ribs carry it on sand',
  },
  idle: {
    ambient: [
      { m: 'breathe', amp: 0.015, period: 3.6 },
      { m: 'sway', g: 'lid', amp: 1.6, period: 3.6 },
    ],
    signature: {
      dur: 1.4,
      tracks: [
        {
          g: 'lid',
          p: 'rot',
          k: [
            [0, 0],
            [0.18, -8],
            [0.36, -4],
            [0.54, -8],
            [0.72, -4],
            [0.88, 0.6],
            [1, 0],
          ],
        },
        {
          g: 'notes',
          p: 's',
          k: [
            [0, 0],
            [0.2, 0],
            [0.32, 1],
            [0.78, 1],
            [0.92, 0],
          ],
        },
        {
          g: 'notes',
          p: 'ty',
          k: [
            [0.2, 6],
            [0.92, -6],
          ],
        },
        {
          p: 'rot',
          k: [
            [0.2, 0],
            [0.38, 3],
            [0.56, -3],
            [0.74, 2],
            [0.9, 0],
          ],
        },
      ],
      face: [
        [0.18, 0.86, 'happy'],
        [0.88, 1, 'wink'],
      ],
    },
  },
  catch: {
    dur: 0.5,
    tracks: [
      {
        g: 'lid',
        p: 'rot',
        k: [
          [0, 0],
          [0.3, -9],
          [0.7, -6],
          [1, 0],
        ],
      },
      {
        p: 'sy',
        k: [
          [0, 1],
          [0.2, 0.86],
          [0.45, 1.14],
          [1, 1],
        ],
      },
    ],
    face: [[0, 1, 'happy']],
  },
});
