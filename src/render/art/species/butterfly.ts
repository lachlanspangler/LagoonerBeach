/**
 * Butterflyfish — the reef's little trickster (fish class, profile view, level).
 * Silhouette (R10): a deep, upright disc (taller than long), a short straight tweezer snout, a narrow
 * tail root and a clear pale fan tail. The real eye sits in a dark vertical eye-band (the classic
 * mask) inside a white ring; a smaller ringed false eye near the tail is the joke.
 * Personality: dainty, tricky, sunny. Signature: spins round to show the false eye, spins back and
 * winks with the real one.
 */
import { blob, capsule, circle, defineArt, ellipse, join, tube } from '../kit.ts';

// the disc: deep and upright, soft dorsal/anal fins folded into one smooth outline
const disc = blob(
  [
    [18, 0],
    [14, -17],
    [4, -31],
    [-9, -37],
    [-19, -29],
    [-22, -14],
    [-24, -4],
    [-24, 4],
    [-22, 14],
    [-19, 29],
    [-9, 37],
    [4, 31],
    [14, 17],
  ],
  1,
);
// the threadfin's pennant: one plump filament trailing off the rear dorsal corner (rounded tip)
const filament = tube(
  [
    [-16, -32, 3.6],
    [-28, -36, 3.2],
    [-40, -34, 3],
    [-44, -28, 2.8],
  ],
  1,
);
// the short straight tweezer snout (rounded tip, R3)
const snout = capsule(15, 3, 4.2, 30, 3.5, 3);
// narrow tail root, then a clear fan tail in the pale fin colour
const tail = blob(
  [
    [-21, -3.5],
    [-30, -7],
    [-39, -16],
    [-45, -11],
    [-46, 0],
    [-45, 11],
    [-39, 16],
    [-30, 7],
    [-21, 3.5],
  ],
  0.95,
);
// the eye-band: a vertical mask through the eye, mid-dark (never eye-coloured, R18E)
const band = tube(
  [
    [3, -34, 4.6],
    [5, -14, 5.4],
    [5, 10, 5.4],
    [3, 32, 4.6],
  ],
  1,
);
// white ring so the real eye pops out of its mask
const ring = circle(5, 1, 7.8);
// pale fin margins top and bottom at the back (they read as the soft dorsal/anal fins)
const fins = join(ellipse(-12, -34, 13, 6, 30), ellipse(-12, 34, 13, 6, -30));
// the false eye near the tail: a small dark dot in a pale ring
const falseRing = circle(-15, -5, 4.8);
const falseEye = circle(-15, -5, 3.1);

export default defineArt({
  id: 'butterfly',
  klass: 'fish',
  size: 'M',
  feature: 'deep upright disc, short tweezer snout, real eye in a dark band, a false eye by the tail',
  personality: ['dainty', 'tricky', 'sunny'],
  palette: { body: '#F2D43B', accent: '#8C6A3A', belly: '#FFF6D0' },
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
        { d: filament, role: 'belly', extra: true },
        { d: fins, role: 'belly', kind: 'pattern' },
        { d: band, role: 'accent', kind: 'pattern' },
        { d: ring, role: 'white', kind: 'pattern' },
        { d: falseRing, role: 'white', kind: 'pattern' },
        { d: falseEye, role: 'ink', kind: 'pattern' },
      ],
    },
  ],
  shine: ellipse(-6, -20, 8, 3.4, -28),
  face: {
    eyes: [[5, 1]],
    eye: 10.6,
    zone: [-8, -25, 38, 46],
    mouth: { at: [28.5, 6], w: 4.6, shape: 'smile' },
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
            [0.13, -1],
            [0.52, -1],
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
