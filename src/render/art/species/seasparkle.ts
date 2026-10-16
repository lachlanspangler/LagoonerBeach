/**
 * Sea Sparkle — JELLY class (XS), night species: a speck of bioluminescent plankton.
 * Silhouette: a cluster of three orbs, one big round one with the face and two little ones
 * huddled at its shoulder (R10: the trio). Glowing cores are light organs, lit on Night.
 * Personality: twinkly, tiny, starry. Signature: a twinkle — the little orbs pop bright out of
 * phase while the big one hops and grins.
 */
import { blob, circle, defineArt, ellipse, join } from '../kit.ts';

// a four-point twinkle star (rounded tips), shown only during the signature
const star = blob(
  [
    [-34, -36],
    [-31.5, -27.5],
    [-23, -25],
    [-31.5, -22.5],
    [-34, -14],
    [-36.5, -22.5],
    [-45, -25],
    [-36.5, -27.5],
  ],
  0.7,
);

export default defineArt({
  id: 'seasparkle',
  klass: 'jelly',
  size: 'XS',
  feature: 'a cluster of three glowing orbs, one big with the face',
  personality: ['twinkly', 'tiny', 'starry'],
  palette: { body: '#4FCFC2', accent: '#DDFFF9' },
  groups: [
    {
      id: 'orbA',
      pivot: [25, -22],
      parts: [
        { d: circle(25, -22, 11), role: 'body' },
        { d: circle(23, -24, 5), role: 'light', kind: 'pattern' },
      ],
    },
    {
      id: 'orbB',
      pivot: [33, 6],
      parts: [
        { d: circle(33, 6, 8.5), role: 'body' },
        { d: circle(31.5, 4.5, 3.8), role: 'light', kind: 'pattern' },
      ],
    },
    { id: 'twinkle', prop: true, pivot: [-34, -25], parts: [{ d: star, role: 'light' }] },
    {
      id: 'body',
      pivot: [-6, 6],
      parts: [
        { d: circle(-6, 6, 30), role: 'body' },
        // a soft glowing core high on the big orb, plus two sparkle specks on its rim
        { d: join(circle(-13, -11, 7), circle(10, -14, 2.6), circle(-28, 16, 2.6)), role: 'light', kind: 'pattern' },
        { d: ellipse(-6, 30, 22, 7), role: 'belly', kind: 'pattern', alpha: 0.7 },
      ],
    },
  ],
  shine: ellipse(-20, -10, 6, 3.6, -35),
  face: {
    eyes: [
      [-17, 11],
      [5, 11],
    ],
    eye: 14.4,
    zone: [-36, -24, 60, 60],
    mouth: { at: [-6, 20], w: 6, shape: 'smile' },
    front: true,
    sweet: true,
  },
  idle: {
    ambient: [
      { m: 'pulse', amp: 0.03, period: 1.6 },
      { m: 'bob', amp: 2, period: 2.2 },
      { m: 'pulse', g: ['orbA', 'orbB'], amp: 0.08, period: 1.2, lag: 0.3 },
    ],
    signature: {
      dur: 1.1,
      tracks: [
        {
          g: 'orbA',
          p: 's',
          k: [
            [0, 1],
            [0.15, 1.3],
            [0.35, 0.9],
            [0.6, 1.25],
            [0.8, 1],
          ],
        },
        {
          g: 'orbB',
          p: 's',
          k: [
            [0, 1],
            [0.25, 0.85],
            [0.45, 1.35],
            [0.7, 0.9],
            [0.9, 1],
          ],
        },
        {
          g: 'twinkle',
          p: 's',
          k: [
            [0.2, 0],
            [0.4, 1.2],
            [0.55, 0.8],
            [0.7, 1.1],
            [1, 0],
          ],
        },
        {
          g: 'twinkle',
          p: 'rot',
          k: [
            [0.2, -30],
            [1, 30],
          ],
        },
        {
          p: 'ty',
          k: [
            [0, 0],
            [0.12, 1.5],
            [0.4, -7],
            [0.7, 0],
            [0.8, 1],
            [1, 0],
          ],
        },
        {
          p: 'sy',
          k: [
            [0, 1],
            [0.12, 0.88],
            [0.3, 1.12],
            [0.55, 1],
            [0.75, 0.92],
            [1, 1],
          ],
        },
      ],
      face: [
        [0.15, 0.8, 'happy'],
        [0.8, 1, 'wink'],
      ],
    },
  },
});
