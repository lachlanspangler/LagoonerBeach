/**
 * Stingray — WING class (seen from above, gliding right). Silhouette: a plump rounded kite/diamond
 * disc, as wide as it is long, trailing a long thin whip tail (R10: the diamond plus the whip).
 * The face sits on the front of the disc, sand-dollar style. Personality: serene, gliding, aloof.
 * Signature: a slow wing ripple and a glide across the tile, tail trailing.
 */
import { blob, circle, defineArt, ellipse, join, tube } from '../kit.ts';

const disc = blob([
  [35, 0],
  [29, -11],
  [15, -24],
  [4, -33],
  [-3, -31],
  [-12, -17],
  [-19, -5],
  [-19, 5],
  [-12, 17],
  [-3, 31],
  [4, 33],
  [15, 24],
  [29, 11],
]);
const tail = tube([
  [-17, 0, 4.4],
  [-26, -2, 3.4],
  [-34, 0.5, 2.8],
  [-40, 5, 2.5],
]);
const spots = join(
  circle(-6, -12, 3.2),
  circle(-11, 2, 3.6),
  circle(-4, 14, 3.2),
  circle(3, -22, 3.1),
  circle(5, 23, 3.1),
);
// a cream rim along the leading edge (the belly peeking round the front, not a wedge)
const rim = tube([
  [3, -30.5, 2.6],
  [14, -23, 2.8],
  [27, -10, 2.8],
  [32.5, 0, 2.8],
  [27, 10, 2.8],
  [14, 23, 2.8],
  [3, 30.5, 2.6],
]);

export default defineArt({
  id: 'stingray',
  klass: 'wing',
  size: 'L',
  feature: 'a plump rounded diamond disc, as wide as long, trailing a long thin whip tail',
  personality: ['serene', 'gliding', 'aloof'],
  palette: { body: '#7C9FD0', accent: '#D6DEE6', belly: '#F3EEDF' },
  groups: [
    {
      id: 'tail',
      pivot: [-17, 0],
      // a shorter whip (box 77 × 67, was 82) so the disc reads L in the tile
      parts: [{ d: tail, role: 'body' }],
    },
    {
      id: 'body',
      parts: [
        { d: disc, role: 'body' },
        { d: rim, role: 'belly', kind: 'pattern' },
        { d: spots, role: 'accent', kind: 'pattern' },
        { d: ellipse(-2, 0, 18, 8), role: 'ink', kind: 'pattern', alpha: 0.08 },
      ],
    },
  ],
  shine: ellipse(10, -17, 8, 3, -34),
  face: {
    eyes: [
      [14, -4],
      [25, -4],
    ],
    eye: 7.8,
    front: true,
    zone: [4, -22, 32, 33],
    mouth: { at: [19.5, 5], w: 5, shape: 'smile' },
  },
  idle: {
    ambient: [
      { m: 'bob', amp: 1.6, period: 3 },
      { m: 'pulse', amp: 0.025, period: 2 },
      { m: 'wave', g: 'tail', amp: 9, period: 2, phase: 0.2 },
    ],
    signature: {
      dur: 1.5,
      every: [5, 8],
      tracks: [
        {
          p: 'tx',
          k: [
            [0, 0],
            [0.15, -2],
            [0.5, 8],
            [0.75, 8],
            [1, 0],
          ],
        },
        {
          p: 'sy',
          k: [
            [0, 1],
            [0.15, 1.04],
            [0.3, 0.95],
            [0.45, 1.04],
            [0.6, 0.97],
            [0.75, 1.02],
            [1, 1],
          ],
        },
        {
          p: 'rot',
          k: [
            [0, 0],
            [0.3, -4],
            [0.6, 3],
            [1, 0],
          ],
        },
        {
          g: 'tail',
          p: 'rot',
          k: [
            [0, 0],
            [0.25, 14],
            [0.5, -10],
            [0.75, 6],
            [1, 0],
          ],
        },
      ],
      face: [
        [0.2, 0.75, 'proud'],
        [0.85, 1, 'blink'],
      ],
    },
  },
});
