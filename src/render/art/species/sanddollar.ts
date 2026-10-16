/**
 * Sand Dollar — pilot exemplar for the OBJECT class (the whole shape is the face, R5/R6).
 * Silhouette: a flat coin, very slightly wider than tall
 * (R10: the five-petal flower, exaggerated, sits on the upper half; the face below it).
 * Personality: calm, coin-like, polite. Signature: spins like a tossed coin and lands happy.
 */
import { circle, defineArt, ellipse, join } from '../kit.ts';

// a clean coin, a touch wider than tall (a notched rim read as a lumpy potato at 54 px)
const disc = ellipse(0, 0, 40, 34);
const petal = (a: number) => {
  const r = (a * Math.PI) / 180;
  return ellipse(Math.sin(r) * 9.5, -13 - Math.cos(r) * 9.5, 3.4, 7.4, a);
};
const flower = join(...[0, 72, 144, 216, 288].map(petal));

export default defineArt({
  id: 'sanddollar',
  klass: 'object',
  size: 'S',
  feature: 'a five-petal flower on a flat coin',
  personality: ['calm', 'coin-like', 'polite'],
  palette: { body: '#E9DCC4', accent: '#B9946C' },
  groups: [
    {
      id: 'body',
      parts: [
        { d: disc, role: 'body' },
        { d: flower, role: 'accent', kind: 'pattern' },
        { d: circle(0, -13, 3), role: 'accent', kind: 'pattern' },
        // a soft inner rim, like the edge of a coin
        { d: ellipse(0, 0, 34, 28), role: 'ink', kind: 'line', w: 1.4, alpha: 0.28 },
      ],
    },
  ],
  shine: ellipse(-18, -18, 10, 4.6, -32),
  shade: ellipse(0, 33, 38, 8),
  deviations: {
    R16S: 'a bleached coin is the identity (graded A in CRITIQUE-1); the ink outline carries it on Day',
    R16M: 'pale on the mint tile by nature; outline + flower keep it readable (checked on the mint sheet)',
  },
  face: {
    eyes: [
      [-12, 7],
      [12, 7],
    ],
    eye: 13.6,
    zone: [-40, -34, 80, 68],
    mouth: { at: [0, 17], w: 7, shape: 'smile' },
    front: true,
    sweet: true,
  },
  idle: {
    ambient: [
      { m: 'breathe', amp: 0.015, period: 3.6 },
      { m: 'bob', amp: 1, period: 3.6, phase: 0.25 },
    ],
    signature: {
      dur: 1.3,
      tracks: [
        {
          p: 'sx',
          k: [
            [0, 1],
            [0.12, 1.05],
            [0.3, 0.05],
            [0.45, -1],
            [0.6, 0.05],
            [0.78, 1],
            [0.88, 1.06],
            [1, 1],
          ],
        },
        {
          p: 'ty',
          k: [
            [0, 0],
            [0.1, 2],
            [0.42, -12],
            [0.78, 0],
            [0.86, 1.5],
            [1, 0],
          ],
        },
        {
          p: 'sy',
          k: [
            [0, 1],
            [0.1, 0.9],
            [0.22, 1.06],
            [0.78, 1],
            [0.86, 0.92],
            [1, 1],
          ],
        },
      ],
      face: [[0.7, 1, 'happy']],
    },
  },
});
