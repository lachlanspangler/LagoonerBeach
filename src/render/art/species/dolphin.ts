/**
 * Dolphin — SHARK (large swimmer) class, profile.
 * Silhouette: a sleek body arched like a happy eyebrow, a round melon forehead and a short beak, a
 * curved (falcate) dorsal swept back, and crescent flukes tipped up (R10: the arch + beak).
 * Personality: joyful, friendly, showy. Its mouth line is a permanent smile.
 * Signature: a little spin-leap inside the tile (hop + full roll), landing with a happy face.
 */
import { blob, defineArt, ellipse, tube } from '../kit.ts';

const body = blob([
  [42, 5],
  [39, 2],
  [34, 0],
  [33, -8],
  [26, -16],
  [12, -19],
  [-4, -17],
  [-18, -12],
  [-29, -8],
  [-31, -3],
  [-22, 3],
  [-6, 11],
  [12, 15],
  [28, 13],
  [37, 9],
  [41, 8],
]);
// whale-style flukes: two round lobes fanned up and down from a slim stock
const flukes = blob([
  [-27, -8],
  [-33, -15],
  [-38, -23],
  [-42, -20],
  [-38, -7],
  [-42, 4],
  [-37, 6],
  [-31, -2],
]);
// a low, hooked dorsal (a shark's is tall and straight)
const dorsal = blob([
  [6, -17],
  [-3, -24],
  [-14, -29],
  [-16, -25],
  [-13, -15],
]);
const pectoral = tube([
  [5, 10, 5],
  [-1, 17, 4.4],
  [-7, 20, 3],
]);

export default defineArt({
  id: 'dolphin',
  klass: 'shark',
  size: 'XL',
  feature: 'a sleek arched body with a round melon, short beak, swept dorsal and up-tipped flukes',
  personality: ['joyful', 'friendly', 'showy'],
  palette: { body: '#7FA8C9', belly: '#EEF3F7' },
  groups: [
    { id: 'tail', pivot: [-28, -5], parts: [{ d: flukes, role: 'body' }] },
    {
      id: 'body',
      parts: [
        { d: dorsal, role: 'body' },
        { d: body, role: 'body' },
        { d: ellipse(12, 16, 34, 9, -4), role: 'belly', kind: 'pattern' },
      ],
    },
    { id: 'finA', pivot: [5, 9], parts: [{ d: pectoral, role: 'body' }] },
  ],
  shine: ellipse(20, -12, 9, 3.2, -14),
  face: {
    eyes: [[14, -3]],
    eye: 8,
    zone: [-2, -24, 46, 36],
    mouth: { at: [33, 7], w: 6, shape: 'smile' },
    sweet: true,
  },
  idle: {
    ambient: [
      { m: 'bob', amp: 1.8, period: 3 },
      { m: 'wag', g: 'tail', amp: 9, period: 1.3 },
      { m: 'flutter', g: 'finA', amp: 10, period: 1.3, phase: 0.25 },
    ],
    signature: {
      dur: 1.2,
      every: [5, 8],
      tracks: [
        {
          p: 'ty',
          k: [
            [0, 0],
            [0.12, 2],
            [0.45, -12],
            [0.8, 0],
            [0.9, 1.5],
            [1, 0],
          ],
        },
        {
          p: 'rot',
          k: [
            [0, 0],
            [0.18, 0],
            [0.72, -360],
            [1, -360],
          ],
        },
        {
          p: 'sy',
          k: [
            [0, 1],
            [0.12, 0.95],
            [0.24, 1.05],
            [0.8, 1],
            [0.88, 0.95],
            [1, 1],
          ],
        },
        {
          g: 'tail',
          p: 'rot',
          k: [
            [0, 0],
            [0.1, 18],
            [0.2, -14],
            [0.85, 0],
            [0.92, 10],
            [1, 0],
          ],
        },
      ],
      face: [[0.15, 1, 'happy']],
    },
  },
  catch: {
    dur: 0.5,
    tracks: [
      {
        g: 'tail',
        p: 'rot',
        k: [
          [0, 0],
          [0.25, 20],
          [0.5, -16],
          [0.75, 12],
          [1, 0],
        ],
      },
      {
        g: 'finA',
        p: 'rot',
        k: [
          [0, 0],
          [0.3, -24],
          [0.7, 14],
          [1, 0],
        ],
      },
      {
        p: 'sy',
        k: [
          [0, 1],
          [0.2, 0.95],
          [0.45, 1.05],
          [1, 1],
        ],
      },
    ],
    face: [[0, 1, 'happy']],
  },
});
