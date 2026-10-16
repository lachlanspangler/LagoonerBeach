/**
 * Blue damselfish — the tiniest defender of the reef (fish class, profile view).
 * Silhouette (R10): a deep oval body held tall and chest-out (a slight nose-up stance) with a big
 * swallow tail whose two long lobes flare up and down. Deeper than the minnow, forked unlike the
 * clownfish and butterfly.
 * Personality: brave, small, bold. Signature: puffs its chest and charges 4 units at the viewer's
 * finger, then settles, very pleased with itself.
 */
import { blob, defineArt, ellipse, join } from '../kit.ts';

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
    [14, -21],
    [6, -32],
    [-8, -36],
    [-22, -36],
    [-16, -18],
  ],
  0.9,
);
const anal = blob(
  [
    [4, 22],
    [-6, 30],
    [-18, 30],
    [-15, 16],
  ],
  0.9,
);
const pectoral = ellipse(-2, 8, 5.5, 3, 26);
// pale-blue fin tips (accent)
const tips = join(ellipse(-42, -26, 6, 5, 40), ellipse(-42, 26, 6, 5, -40));
const finTips = join(ellipse(-8, -37, 16, 5, 4), ellipse(-10, 31.5, 10, 4, -6));

export default defineArt({
  id: 'damsel',
  klass: 'fish',
  size: 'S',
  feature: 'deep oval held tall and chest-out, with a big flaring swallow tail',
  personality: ['brave', 'small', 'bold'],
  palette: { body: '#4A78E0', accent: '#9BC2FF' },
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
    { id: 'finA', pivot: [-4, 6], parts: [{ d: pectoral, role: 'body' }] },
  ],
  shine: ellipse(14, -13, 8, 3.4, -20),
  face: {
    eyes: [[7, 1]],
    eye: 9.2,
    zone: [-6, -25, 36, 44],
    mouth: { at: [26, 6], w: 6, shape: 'smile' },
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
