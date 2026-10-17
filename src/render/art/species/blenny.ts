/**
 * Blenny — the nosy neighbour of the shallows (fish class, profile view, level).
 * Silhouette (R10): a blunt, round-headed body (2.2 : 1) with two plump upright eyebrow tufts
 * (cirri) on the brow and one long, low dorsal ridge running from the nape to the tail; a little
 * round tail. The tufts are the only "antennae" in the fish family at 24 px.
 * Personality: nosy, cheeky, peeky. Signature: ducks out of sight below the tile edge, peeks back
 * up, and waggles its eyebrows.
 */
import { blob, capsule, circle, defineArt, ellipse, join, tube, waveTrack, within } from '../kit.ts';

// blunt round head at the front (+38), an even body to the tail root at −31
const body = blob([
  [38, 1],
  [35, -12],
  [25, -20],
  [10, -19],
  [-4, -11],
  [-18, -6],
  [-30, -3.5],
  [-32, 0],
  [-30, 3.5],
  [-18, 5],
  [-4, 10],
  [10, 18],
  [25, 19],
  [35, 12],
]);
// the long, low dorsal ridge: one continuous band from the nape to the tail
const dorsal = tube(
  [
    [10, -17, 3],
    [-2, -12.5, 3.4],
    [-16, -8, 3],
    [-29, -4.5, 2.4],
  ],
  0.9,
);
const tail = blob(
  [
    [-29, -4],
    [-36, -10],
    [-43, -9],
    [-45, 0],
    [-43, 9],
    [-36, 10],
    [-29, 4],
  ],
  0.9,
);
// the eyebrow tufts: two plump upright cirri (6 thick × 10 tall) with round tips
const tufts = join(capsule(27, -16, 3, 30, -33, 3), capsule(18, -17, 3, 17, -34, 3));
const pectoral = ellipse(-8, 7, 5, 2.8, 26);
// darker olive spots (R18 spots, ≥ 6 u), placed by hand behind the face
const spots = join(circle(-6, -3, 3.4), circle(-17, 1, 3.2), circle(-26, -1, 3), circle(-4, 7, 3));

export default defineArt({
  id: 'blenny',
  klass: 'fish',
  size: 'S',
  feature: 'blunt round-headed body with two upright eyebrow tufts and a long low dorsal ridge',
  personality: ['nosy', 'cheeky', 'peeky'],
  palette: { body: '#9AAE5E', accent: '#5F7436' },
  groups: [
    {
      id: 'tail',
      pivot: [-31, 0],
      parts: [
        { d: tail, role: 'body' },
        { d: ellipse(-45, 0, 3, 8), role: 'accent', kind: 'pattern', alpha: 0.7 },
      ],
    },
    {
      id: 'tufts',
      pivot: [22, -15],
      parts: [
        { d: tufts, role: 'body' },
        { d: join(circle(30, -33, 3), circle(17, -34, 3)), role: 'accent', kind: 'pattern' },
      ],
    },
    {
      id: 'body',
      parts: [
        { d: dorsal, role: 'body' },
        { d: body, role: 'body' },
        { d: ellipse(14, 16, 26, 6), role: 'belly', kind: 'pattern' },
        {
          d: tube(
            [
              [10, -17.5, 2.2],
              [-2, -13, 2.4],
              [-16, -8.5, 2.2],
              [-29, -5, 2.1],
            ],
            0.9,
          ),
          role: 'accent',
          kind: 'pattern',
          alpha: 0.55,
        },
        { d: spots, role: 'accent', kind: 'pattern', alpha: 0.8 },
      ],
    },
    { id: 'finA', pivot: [-11, 5], parts: [{ d: pectoral, role: 'body' }] },
  ],
  shine: ellipse(28, -9, 6, 2.6, -24),
  face: {
    eyes: [[13, -1]],
    eye: 10.6,
    zone: [2, -27, 38, 45],
    mouth: { at: [33, 6], w: 6.5, shape: 'smile' },
    sweet: true,
  },
  idle: {
    ambient: [
      { m: 'bob', amp: 2, period: 2 },
      { m: 'wag', g: 'tail', amp: 10, period: 0.8 },
      { m: 'sway', g: 'tufts', amp: 6, period: 1.6 },
      { m: 'flutter', g: 'finA', amp: 16, period: 0.45 },
    ],
    signature: {
      dur: 1.5,
      every: [5, 8],
      tracks: [
        {
          p: 'ty',
          k: [
            [0, 0],
            [0.08, -2],
            [0.2, 34],
            [0.4, 34],
            [0.62, -3],
            [0.72, 0],
          ],
        },
        within(waveTrack('tufts', 20, 3), 0.62, 1),
      ],
      face: [
        [0.4, 0.62, 'surprised'],
        [0.66, 0.86, 'happy'],
        [0.86, 1, 'wink'],
      ],
    },
  },
  catch: {
    dur: 0.5,
    tracks: [
      waveTrack('tufts', 22, 2),
      {
        p: 'sy',
        k: [
          [0, 1],
          [0.2, 0.88],
          [0.45, 1.1],
          [1, 1],
        ],
      },
    ],
    face: [[0, 1, 'happy']],
  },
});
