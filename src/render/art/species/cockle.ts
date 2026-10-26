/**
 * Cockle — OBJECT class (front view of one valve), size XS.
 * Silhouette (CRITIQUE-2): a heart-ish rounded fan 1.35:1 wide, the top edge one smooth arc (no
 * apex), narrowing to a hinge knob at the bottom centre. R10: four broad ribs (≥ 6 u) fanning up
 * from that hinge; they fade under a pale face window so the eyes never sit on stripes.
 * Warmer, pinker than the brown cluster (#F2C9A8, ribs #C27A5A) and nothing like the low limpet dome.
 * Personality: dreamy, musical, round. Resting mouth: a little "o", humming to itself.
 * Signature: rocks on its hinge like a metronome while three notes float up, then a wink.
 * Groups (back to front): body (shell + ribs; the face rides on it), notes (prop).
 */
import { blob, capsule, circle, defineArt, ellipse, join, tube, xform } from '../kit.ts';

const S = 0.8;
const TX = 8;
const F = (d: string) => xform(d, { sx: S, sy: S, tx: TX });
const OPEN = -38; // the back valve, tipped open on the hinge

// four rib lobes along the top arc (the rib ends), convex flanks, a soft heart point at the hinge
const shell = blob([
  [0, -26.5],
  [17, -30],
  [27, -27],
  [36, -24],
  [41, -14],
  [41, -4],
  [32, 9],
  [19, 20],
  [7, 28],
  [0, 31],
  [-7, 28],
  [-19, 20],
  [-32, 9],
  [-41, -4],
  [-41, -14],
  [-36, -24],
  [-27, -27],
  [-17, -30],
]);
// the hinge knob with its two little "ears" (the auricles), in the rib colour
const hinge = capsule(-5, 31, 4.4, 5, 31, 4.4);
// four broad ribs fanning up from the hinge (pattern, clipped to the shell)
const rib = (xt: number, from: number) =>
  tube([
    [xt * from, 30 - 62 * from, 2.6],
    [xt * (from + 1) * 0.5, 30 - 31 * (from + 1), 3.8],
    [xt * 1.05, -33, 4.8],
  ]);
// the outer pair starts low on the flanks, the inner pair only above the face (no moustache)
const ribs = join(rib(-38, 0.22), rib(-17, 0.7), rib(17, 0.7), rib(38, 0.22));
// the pale face window where the ribs fade (CRITIQUE-2 combjelly trick, shared language)
const window = ellipse(0, -2, 22, 14);
const notes = join(
  circle(28, -36, 3),
  capsule(30.6, -36, 1.3, 30.6, -45, 1.3),
  circle(38, -41, 2.6),
  capsule(40.3, -41, 1.2, 40.3, -48, 1.2),
);

export default defineArt({
  id: 'cockle',
  klass: 'object',
  size: 'XS',
  feature: 'a heart-ish rounded fan with four broad ribs from a bottom hinge',
  personality: ['dreamy', 'musical', 'round'],
  palette: { body: '#F5BD98', accent: '#C27A5A', belly: '#FBE4D3' },
  groups: [
    {
      id: 'back',
      pivot: [TX, 31 * S],
      parts: [
        { d: F(xform(shell, { rot: OPEN, ox: 0, oy: 31 })), role: 'body' },
        { d: F(xform(ribs, { rot: OPEN, ox: 0, oy: 31 })), role: 'accent', kind: 'pattern' },
      ],
    },
    {
      id: 'body',
      pivot: [TX, 31 * S],
      parts: [
        { d: F(shell), role: 'body' },
        { d: F(ribs), role: 'accent', kind: 'pattern' },
        { d: F(window), role: 'belly', kind: 'pattern' },
        { d: F(hinge), role: 'accent' },
      ],
    },
    { id: 'notes', pivot: [34, -42], prop: true, parts: [{ d: notes, role: 'accent' }] },
  ],
  shine: F(ellipse(-22, -21, 8, 3.6, -28)),
  face: {
    eyes: [
      [TX - 10.5, -2],
      [TX + 10.5, -2],
    ],
    eye: 13,
    zone: [TX - 26, -30, 52, 48],
    mouth: { at: [TX, 5], w: 4.5, shape: 'o' },
    front: true,
    sweet: true,
  },
  idle: {
    ambient: [
      { m: 'breathe', amp: 0.015, period: 3.6 },
      { m: 'sway', g: 'back', amp: 3, period: 3.6 },
    ],
    signature: {
      dur: 1.4,
      tracks: [
        {
          p: 'rot',
          k: [
            [0, 0],
            [0.15, -7],
            [0.35, 7],
            [0.55, -7],
            [0.75, 7],
            [0.9, -1.5],
            [1, 0],
          ],
        },
        {
          g: 'back',
          p: 'rot',
          k: [
            [0, 0],
            [0.12, -12],
            [0.8, -12],
            [0.95, 1],
            [1, 0],
          ],
        },
        {
          g: 'notes',
          p: 's',
          k: [
            [0, 0],
            [0.18, 0],
            [0.3, 1],
            [0.78, 1],
            [0.92, 0],
          ],
        },
        {
          g: 'notes',
          p: 'ty',
          k: [
            [0.18, 6],
            [0.92, -6],
          ],
        },
      ],
      face: [
        [0.12, 0.86, 'happy'],
        [0.88, 1, 'wink'],
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
        g: 'body',
        p: 'rot',
        k: [
          [0, 0],
          [0.35, 8],
          [0.7, -5],
          [1, 0],
        ],
      },
    ],
    face: [[0, 1, 'happy']],
  },
});
