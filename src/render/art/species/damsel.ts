/**
 * Blue damselfish — the tiniest defender of the reef (fish class, profile view).
 * Silhouette (R10): a deep oval body held tall and chest-out (a slight nose-up stance) with a big
 * swallow tail whose two long lobes flare up and down. Deeper than the minnow, forked unlike the
 * clownfish and butterfly.
 * Personality: brave, small, bold; rests with a set little frown (a tiny bouncer). Signature: puffs
 * its chest and charges 4 units at the viewer's finger, then settles, very pleased with itself.
 */
import { blob, capsule, defineArt, ellipse, join } from '../kit.ts';

// deep, short oval body: snout at +30, tail root at −17 (deeper than long, chest out)
const body = blob([
  [30, 2],
  [27, -11],
  [16, -22],
  [0, -25],
  [-12, -20],
  [-18, -9],
  [-18, 9],
  [-12, 20],
  [0, 25],
  [16, 23],
  [27, 13],
]);
// swallow tail: a deep V, two plump lobes splayed at ~40°, rounded tips
const tail = blob(
  [
    [-14, -7],
    [-26, -16],
    [-38, -27],
    [-44, -24],
    [-36, -10],
    [-29, 0],
    [-36, 10],
    [-44, 24],
    [-38, 27],
    [-26, 16],
    [-14, 7],
  ],
  0.9,
);
// an upright dorsal sail that trails back into a rounded point, and a matching anal fin
const dorsal = blob(
  [
    [16, -20],
    [6, -30],
    [-6, -34],
    [-17, -34],
    [-21, -29],
    [-17, -22],
    [-12, -17],
  ],
  0.9,
);
const anal = blob(
  [
    [14, 19],
    [4, 30],
    [-7, 33],
    [-17, 32.5],
    [-21, 27.5],
    [-17, 21],
    [-11, 16],
  ],
  0.9,
);
// a small pectoral tucked flat against the flank, swept 30° back (no hanging arm, no bar)
const pectoral = capsule(-4, 8, 2.6, -8.5, 10.6, 1.9);
// pale-blue fin tips (accent)
const tips = join(ellipse(-42, -27, 8, 6, 40), ellipse(-42, 27, 8, 6, -40));
const finTips = join(ellipse(-19, -33, 7, 5, 20), ellipse(-19, 31, 7, 5, -20));

export default defineArt({
  id: 'damsel',
  klass: 'fish',
  size: 'S',
  feature: 'deep oval held tall and chest-out, with a big flaring swallow tail',
  personality: ['brave', 'small', 'bold'],
  palette: { body: '#4A78E0', accent: '#9DB8FF' },
  groups: [
    {
      id: 'tail',
      pivot: [-16, 0],
      parts: [
        { d: tail, role: 'body' },
        { d: tips, role: 'accent', kind: 'pattern' },
      ],
    },
    {
      id: 'body',
      parts: [
        { d: dorsal, role: 'body' },
        { d: anal, role: 'body' },
        { d: body, role: 'body' },
        { d: ellipse(6, 24, 26, 9), role: 'belly', kind: 'pattern' },
        { d: finTips, role: 'accent', kind: 'pattern' },
      ],
    },
    { id: 'finA', pivot: [-4, 8], parts: [{ d: pectoral, role: 'belly', outline: false }] },
  ],
  shine: ellipse(14, -13, 8, 3.4, -20),
  face: {
    eyes: [[7, 1]],
    eye: 10.4,
    zone: [-6, -25, 36, 44],
    // brave: the chest-out little frown of a tiny bouncer (CRITIQUE-2 resting mouths)
    mouth: { at: [24.5, 6.5], w: 6, shape: 'flat' },
  },
  idle: {
    ambient: [
      { m: 'bob', amp: 2.5, period: 2.2 },
      { m: 'wag', g: 'tail', amp: 9, period: 0.7 },
      { m: 'flutter', g: 'finA', amp: 18, period: 0.4 },
    ],
    signature: {
      dur: 1.1,
      every: [4, 7],
      tracks: [
        {
          p: 's',
          k: [
            [0, 1],
            [0.2, 1.1],
            [0.55, 1.1],
            [0.75, 0.97],
            [0.88, 1],
          ],
        },
        {
          p: 'tx',
          k: [
            [0, 0],
            [0.2, -2],
            [0.34, 5],
            [0.4, 4],
            [0.48, 6],
            [0.75, 0],
          ],
        },
        {
          p: 'rot',
          k: [
            [0, 0],
            [0.2, -6],
            [0.55, -6],
            [0.75, 0],
          ],
        },
        {
          g: 'tail',
          p: 'rot',
          k: [
            [0.2, 0],
            [0.28, 18],
            [0.36, -18],
            [0.44, 14],
            [0.52, 0],
          ],
        },
      ],
      face: [
        [0.12, 0.58, 'proud'],
        [0.7, 0.95, 'happy'],
      ],
    },
  },
  catch: {
    dur: 0.5,
    tracks: [
      {
        p: 's',
        k: [
          [0, 1],
          [0.3, 1.1],
          [0.6, 0.96],
          [1, 1],
        ],
      },
      {
        g: 'tail',
        p: 'rot',
        k: [
          [0, 0],
          [0.25, 20],
          [0.5, -20],
          [0.75, 12],
          [1, 0],
        ],
      },
    ],
    face: [[0, 1, 'proud']],
  },
});
