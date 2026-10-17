/**
 * Minnow — the first fish anyone catches (fish class, profile view).
 * Silhouette (R10): a slim little torpedo with an oversized, deeply forked V tail; the fork notch is
 * what separates it from the wrasse's cigar and the barracuda's needle at 24 px.
 * Personality: eager, first, twitchy. Signature: darts forward and back in a blink.
 */
import { blob, defineArt, ellipse, join, tube } from '../kit.ts';

// slim torpedo: blunt rounded snout at +38, tail root at −22
const body = blob([
  [36.5, 1],
  [32, -9],
  [20, -14.5],
  [2, -15],
  [-12, -11],
  [-22, -5],
  [-22, 5],
  [-12, 11],
  [2, 15],
  [20, 14.5],
  [32, 10],
]);
// deep V fork: one fan with a deep rounded notch (two plump lobes, rounded tips, R3)
const tail = blob(
  [
    [-18, -6],
    [-30, -14],
    [-41, -22],
    [-47, -19],
    [-40, -8],
    [-34, 0],
    [-40, 8],
    [-47, 19],
    [-41, 22],
    [-30, 14],
    [-18, 6],
  ],
  0.9,
);
const dorsal = blob(
  [
    [6, -13],
    [-3, -21],
    [-9, -20],
    [-12, -11],
  ],
  0.9,
);
const pelvic = blob(
  [
    [0, 13],
    [-6, 20],
    [-10, 19],
    [-10, 11],
  ],
  0.9,
);
const pectoral = ellipse(-6, 8, 5.5, 3, 28);
// one lagoon-blue lateral stripe from behind the eye to the tail (makes the silver read on Day)
const stripe = tube([
  [-1, -2, 1.2],
  [-10, -1.5, 2.6],
  [-24, 0, 1.8],
]);
export default defineArt({
  id: 'minnow',
  klass: 'fish',
  size: 'S',
  feature: 'slim torpedo with an oversized, deeply forked V tail',
  personality: ['eager', 'first', 'twitchy'],
  palette: { body: '#B0C4D8', accent: '#2E86D6' },
  groups: [
    {
      id: 'tail',
      pivot: [-21, 0],
      parts: [
        { d: tail, role: 'body' },
        {
          d: join(ellipse(-44, -19, 5, 5, 35), ellipse(-44, 19, 5, 5, -35)),
          role: 'accent',
          kind: 'pattern',
          alpha: 0.6,
        },
      ],
    },
    {
      id: 'body',
      parts: [
        { d: dorsal, role: 'body' },
        { d: pelvic, role: 'body' },
        { d: body, role: 'body' },
        { d: ellipse(8, 14, 32, 6), role: 'belly', kind: 'pattern' },
        { d: stripe, role: 'accent', kind: 'pattern' },
      ],
    },
    { id: 'finA', pivot: [-2, 6], parts: [{ d: pectoral, role: 'body' }] },
  ],
  shine: ellipse(24, -8, 7, 2.6, -14),
  face: {
    eyes: [[10.5, 1]],
    eye: 8.6,
    zone: [4, -20, 33, 36],
    mouth: { at: [29, 6], w: 5.5, shape: 'smile' },
    sweet: true,
  },
  idle: {
    ambient: [
      { m: 'bob', amp: 2.5, period: 2.2 },
      { m: 'wag', g: 'tail', amp: 12, period: 0.6 },
      { m: 'flutter', g: 'finA', amp: 18, period: 0.4 },
    ],
    signature: {
      dur: 0.8,
      every: [4, 7],
      tracks: [
        {
          p: 'tx',
          k: [
            [0, 0],
            [0.1, -2],
            [0.22, 9],
            [0.36, 9],
            [0.5, -4],
            [0.62, 1],
            [0.75, 0],
            [1, 0],
          ],
        },
        {
          p: 'sx',
          k: [
            [0, 1],
            [0.1, 0.9],
            [0.22, 1.12],
            [0.36, 1],
            [0.5, 1.06],
            [0.62, 1],
          ],
        },
        {
          g: 'tail',
          p: 'rot',
          k: [
            [0, 0],
            [0.1, 20],
            [0.18, -20],
            [0.26, 14],
            [0.4, 0],
            [0.46, -18],
            [0.54, 14],
            [0.64, 0],
          ],
        },
      ],
      face: [
        [0.18, 0.4, 'surprised'],
        [0.62, 0.92, 'happy'],
      ],
    },
  },
  catch: {
    dur: 0.45,
    tracks: [
      {
        g: 'tail',
        p: 'rot',
        k: [
          [0, 0],
          [0.2, 26],
          [0.4, -26],
          [0.6, 20],
          [0.8, -12],
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
