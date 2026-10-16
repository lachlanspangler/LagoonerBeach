/**
 * Comb Jelly — JELLY class (S), night species.
 * Silhouette: a plain upright egg, no tentacles at all (R10: the egg, and the beaded comb rows
 * that run pole to pole). The comb plates are light organs, so the rows glow on Night.
 * Personality: shimmery, delicate, quiet. Signature: a slow little twirl while sparks of
 * light wink on all around it.
 */
import { blob, circle, defineArt, ellipse, join } from '../kit.ts';

const egg = blob([
  [0, -39],
  [14, -34],
  [24, -20],
  [28.6, 0],
  [27.4, 20],
  [17, 35],
  [0, 40],
  [-17, 35],
  [-27.4, 20],
  [-28.6, 0],
  [-24, -20],
  [-14, -34],
]);
// the little sense-organ knob on the top pole
const knob = circle(0, -39, 4);
// four visible comb rows (meridians), drawn as a faint line with beaded plates on it
const rows = join(
  'M-8 -36Q-28.7 0 -8 36',
  'M8 -36Q28.7 0 8 36',
  'M-11.9 -36Q-42.7 0 -11.9 36',
  'M11.9 -36Q42.7 0 11.9 36',
);
const plates = (ys: readonly number[], xs: readonly number[]) =>
  join(...ys.flatMap((y, i) => [circle(-xs[i]!, y, 2.4), circle(xs[i]!, y, 2.4)]));
const inner = plates([-30, -18, -6, 6, 18, 30], [12.2, 16.4, 18.3, 18.3, 16.4, 12.2]);
const outer = plates([-30, -18, -6, 6, 18, 30], [18, 24.4, 27, 27, 24.4, 18]);
// the shimmer: little sparks that wink on around it during the signature
const shimmer = join(circle(-34, -22, 2.6), circle(35, -8, 3), circle(-33, 14, 2.2), circle(31, 26, 2.4));

export default defineArt({
  id: 'combjelly',
  klass: 'jelly',
  size: 'S',
  feature: 'a plain upright egg with beaded comb rows pole to pole, no tentacles',
  personality: ['shimmery', 'delicate', 'quiet'],
  palette: { body: '#F4AECB', accent: '#A8F4FF' },
  groups: [
    {
      id: 'body',
      parts: [
        { d: egg, role: 'body', alpha: 0.88 },
        { d: knob, role: 'body' },
        { d: rows, role: 'light', kind: 'line', w: 1.4, alpha: 0.7 },
        { d: inner, role: 'light', kind: 'pattern' },
        { d: outer, role: 'light', kind: 'pattern' },
        { d: ellipse(0, 30, 18, 8), role: 'belly', kind: 'pattern', alpha: 0.6 },
      ],
    },
    { id: 'shimmer', prop: true, pivot: [0, 0], parts: [{ d: shimmer, role: 'light' }] },
  ],
  shine: ellipse(-10, -24, 5, 9, 25),
  face: {
    eyes: [
      [-8.5, 6],
      [8.5, 6],
    ],
    eye: 11.2,
    zone: [-30, -40, 60, 80],
    mouth: { at: [0, 13], w: 4, shape: 'smile' },
    front: true,
  },
  idle: {
    ambient: [
      { m: 'pulse', amp: 0.035, period: 1.8 },
      { m: 'bob', amp: 2, period: 2.8 },
      { m: 'sway', amp: 3, period: 3.6 },
    ],
    signature: {
      dur: 1.4,
      tracks: [
        {
          g: 'shimmer',
          p: 's',
          k: [
            [0, 0.8],
            [0.15, 1.08],
            [0.5, 0.96],
            [0.85, 1.04],
            [1, 0.8],
          ],
        },
        {
          g: 'shimmer',
          p: 'rot',
          k: [
            [0, -10],
            [1, 35],
          ],
        },
        {
          p: 'sx',
          k: [
            [0, 1],
            [0.3, 0.9],
            [0.55, 1.04],
            [0.8, 0.97],
            [1, 1],
          ],
        },
        {
          p: 'rot',
          k: [
            [0, 0],
            [0.3, -6],
            [0.6, 5],
            [1, 0],
          ],
        },
      ],
      face: [[0.2, 0.9, 'happy']],
    },
  },
});
