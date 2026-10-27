/**
 * Butterflyfish — the reef's little trickster (fish class, profile view, level).
 * Silhouette (R10): a deep, upright disc (taller than long), a short straight tweezer snout, a narrow
 * tail root and a clear pale fan tail. The real eye sits on clear lemon yellow, 4 u ahead of one
 * dark vertical band; a ringed false eye on the rear dorsal, behind the band, is the joke.
 * Personality: dainty, tricky, sunny. Signature: spins round to show the false eye, spins back and
 * winks with the real one.
 */
import { blob, capsule, circle, defineArt, ellipse, join, tube } from '../kit.ts';

// the disc: deep and upright, soft dorsal/anal fins folded into one smooth outline
const disc = blob(
  [
    [18, 0],
    [14, -17],
    [4, -32],
    [-8, -39],
    [-18, -31],
    [-22, -14],
    [-24, -4],
    [-24, 4],
    [-22, 14],
    [-19, 32],
    [-8, 39.5],
    [4, 33],
    [14, 17],
  ],
  1,
);
// the threadfin's pennant: a short plump filament off the rear dorsal corner (−40 %, rounded tip)
const filament = tube(
  [
    [-13, -33, 3.4],
    [-21, -36, 3],
    [-29, -34, 2.7],
    [-34, -30, 2.5],
  ],
  1,
);
// the short straight tweezer snout (rounded tip, R3)
const snout = capsule(15, 3, 4.8, 28.3, 3.5, 3.3);
// narrow tail root, then a clear fan tail in the pale fin colour
const tail = blob(
  [
    [-21, -3.5],
    [-29, -6],
    [-38.5, -18.5],
    [-44, -12],
    [-43, 0],
    [-44, 12],
    [-38.5, 18.5],
    [-29, 6],
    [-21, 3.5],
  ],
  0.95,
);
// the eye-band: a vertical mask through the eye, mid-dark (never eye-coloured, R18E)
const band = tube(
  [
    [-6.5, -36, 4],
    [-6, -14, 4.6],
    [-6, 10, 4.6],
    [-6.5, 34, 4],
  ],
  1,
);
// pale fin margins top and bottom at the back (they read as the soft dorsal/anal fins)
const fins = join(ellipse(-13, -31, 12, 5, 24), ellipse(-12, 33, 12, 5.5, -28));
// the false eye on the rear dorsal: a 7 u dark dot in a pale cream ring
const falseRing = circle(-17, -18, 6);
const falseEye = circle(-17, -18, 3.6);

export default defineArt({
  id: 'butterfly',
  klass: 'fish',
  size: 'M',
  tileScale: 0.95,
  feature:
    'deep upright disc, short tweezer snout, one dark band behind the eye, a ringed false eye on the rear dorsal',
  personality: ['dainty', 'tricky', 'sunny'],
  palette: { body: '#FFEC4A', accent: '#8A6838', belly: '#FFF6D0' },
  groups: [
    {
      id: 'tail',
      pivot: [-24, 0],
      parts: [{ d: tail, role: 'belly' }],
    },
    {
      id: 'body',
      parts: [
        { d: disc, role: 'body' },
        { d: snout, role: 'body' },
        { d: filament, role: 'body', extra: true },
        { d: fins, role: 'belly', kind: 'pattern' },
        { d: band, role: 'accent', kind: 'pattern' },
        { d: falseRing, role: 'white', kind: 'pattern' },
        { d: falseEye, role: 'ink', kind: 'pattern' },
      ],
    },
  ],
  shine: ellipse(6, -19, 6.5, 3, -30),
  deviations: {
    R16: 'lemon L 0.93: no yellow at L ≤ 0.90 sits ΔE ≥ 6 from the boxfish, seahorse and gold turtle bodies',
  },
  face: {
    eyes: [[7, 1]],
    eye: 11,
    zone: [-6, -25, 38, 46],
    mouth: { at: [27.8, 5.8], w: 4.4, shape: 'smile' },
    sweet: true,
  },
  idle: {
    ambient: [
      { m: 'bob', amp: 2.5, period: 2.6 },
      { m: 'wag', g: 'tail', amp: 10, period: 0.8 },
      { m: 'breathe', amp: 0.015, period: 2.6 },
    ],
    signature: {
      dur: 1.5,
      every: [5, 8],
      tracks: [
        {
          p: 'sx',
          k: [
            [0, 1],
            [0.08, 1],
            [0.105, 0.15],
            [0.106, -0.15],
            [0.13, -1],
            [0.52, -1],
            [0.535, -0.15],
            [0.536, 0.15],
            [0.57, 1],
            [1, 1],
          ],
        },
        {
          p: 'ty',
          k: [
            [0, 0],
            [0.06, 2],
            [0.16, -3],
            [0.3, 0],
            [0.56, -3],
            [0.68, 0],
          ],
        },
        {
          g: 'tail',
          p: 'rot',
          k: [
            [0.14, 0],
            [0.24, 16],
            [0.34, -16],
            [0.44, 0],
          ],
        },
      ],
      face: [
        [0.1, 0.56, 'happy'],
        [0.72, 0.96, 'wink'],
      ],
    },
  },
});
