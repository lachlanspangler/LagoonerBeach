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
  [-28, -2, 3.4],
  [-38, 1, 2.8],
  [-45, 5, 2.5],
]);
const spots = join(circle(-6, -12, 3), circle(-11, 2, 3.4), circle(-4, 14, 3), circle(3, -23, 2.8), circle(5, 24, 2.8));

export default defineArt({
  id: 'stingray',
  klass: 'wing',
  size: 'L',
  feature: 'a plump rounded diamond disc, as wide as long, trailing a long thin whip tail',
  personality: ['serene', 'gliding', 'aloof'],
  palette: { body: '#879CB2', accent: '#D6DEE6', belly: '#EEF2F5' },
  groups: [
    {
      id: 'tail',
      pivot: [-17, 0],
      parts: [
        { d: tail, role: 'body' },
        { d: ellipse(-31, 0, 10, 1.2, 0), role: 'ink', kind: 'pattern', alpha: 0.18 },
      ],
    },
    {
      id: 'body',
      parts: [
        { d: disc, role: 'body' },
        { d: ellipse(2, 34, 32, 8), role: 'belly', kind: 'pattern' },
        { d: ellipse(2, -35, 30, 6), role: 'belly', kind: 'pattern', alpha: 0.5 },
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
    eye: 7,
    front: true,
    zone: [4, -21, 32, 30],
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
