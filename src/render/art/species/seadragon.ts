/**
 * Leafy Sea Dragon — HORSE class, the legendary showpiece (upright profile). Silhouette: a graceful
 * upright S — a seahorse-sized round head on a slim neck, a small pipette snout, a slender body and
 * a long tail that sweeps back — dressed at the outline in six big forked leaf fronds (R10: the
 * leaves, exaggerated ~2×; none ever crosses the face). Gold body, sea-green leaves, cream bands.
 * Personality: regal, leafy, shy; rests `proud`. Signature: a current sweeps through the fronds
 * (back and front layers with overlapping lag), then a slow royal bow and a wink.
 */
import { blob, capsule, defineArt, ellipse, join, tube } from '../kit.ts';

const head = ellipse(3, -27, 12.5, 11, -12);
// a short, slim pipette snout with a rounded tip
const snout = join(capsule(11, -25, 4.4, 24, -21.5, 3), ellipse(25.5, -21, 3.2, 3));
const torso = blob([
  [-5, -18],
  [6, -15],
  [11, -5],
  [12, 7],
  [7, 15],
  [-2, 17],
  [-10, 9],
  [-11, -5],
]);
const tail = tube([
  [-3, 13, 6.4],
  [-6, 23, 5.2],
  [-6, 32, 4.2],
  [-1, 36.5, 3.4],
  [6, 37.5, 2.8],
]);

/** A leaf blade rooted at (bx, by), pointing at `deg`: narrow stalk, wide rounded blade. */
function blade(bx: number, by: number, deg: number, len: number, w: number): string {
  const a = (deg * Math.PI) / 180;
  const c = Math.cos(a),
    s = Math.sin(a);
  const P = (u: number, v: number): [number, number] => [bx + u * c - v * s, by + u * s + v * c];
  return blob([
    P(0, -2),
    P(len * 0.4, -w * 0.48),
    P(len * 0.82, -w * 0.44),
    P(len, 0),
    P(len * 0.82, w * 0.44),
    P(len * 0.4, w * 0.48),
    P(0, 2),
  ]);
}
type Frond = readonly [number, number, number, number, number];
/** A forked frond: a big blade and a smaller sister blade from the same root (the leafy look). */
const frond = ([x, y, d, len, w]: Frond) =>
  join(blade(x, y, d - 12, len, w), blade(x, y, d + 30, len * 0.62, w * 0.72));
const rib = ([x, y, d, len]: Frond) => {
  const a = ((d - 12) * Math.PI) / 180;
  return `M${x + 4 * Math.cos(a)} ${y + 4 * Math.sin(a)}L${x + len * 0.78 * Math.cos(a)} ${y + len * 0.78 * Math.sin(a)}`;
};
// six fronds at the outline: crown, nape, back, rump (behind); belly (front); tail (with the tail)
const BACK: readonly Frond[] = [
  [-6, -30, -122, 15, 8],
  [-10, -15, -165, 25, 10],
  [-11, 3, 168, 25, 10],
];
const FRONT: readonly Frond[] = [[10, 8, 22, 22, 9.5]];
const TAIL: readonly Frond[] = [
  [-6, 27, 198, 22, 9],
  [3, 35.5, 24, 13, 7],
];
const bands = join(
  tube([
    [-11, -6, 2.2],
    [11, -4, 2.2],
  ]),
  tube([
    [-11, 5, 2.2],
    [11, 6, 2.2],
  ]),
);

export default defineArt({
  id: 'seadragon',
  klass: 'horse',
  size: 'M',
  feature: 'an upright S with a round head and small pipette snout, dressed in six big forked leaf fronds',
  personality: ['regal', 'leafy', 'shy'],
  palette: { body: '#E0B84A', accent: '#FFF4D6', belly: '#8AB17D' },
  restExpression: 'proud',
  groups: [
    {
      id: 'leavesB',
      pivot: [-8, -10],
      parts: [
        { d: join(...BACK.map(frond)), role: 'belly' },
        { d: join(...BACK.map(rib)), role: 'ink', kind: 'line', w: 3, alpha: 0.22 },
      ],
    },
    {
      id: 'tail',
      pivot: [-3, 14],
      seamless: true,
      parts: [
        { d: join(...TAIL.map(frond)), role: 'belly' },
        { d: tail, role: 'body' },
        {
          d: tube([
            [-12, 24, 2.6],
            [0, 22, 2.6],
          ]),
          role: 'accent',
          kind: 'pattern',
        },
        { d: join(...TAIL.map(rib)), role: 'ink', kind: 'line', w: 3, alpha: 0.22 },
      ],
    },
    {
      id: 'body',
      seamless: true,
      parts: [
        { d: torso, role: 'body' },
        { d: snout, role: 'body' },
        { d: head, role: 'body' },
        { d: bands, role: 'accent', kind: 'pattern' },
        { d: ellipse(9, 4, 3.4, 9), role: 'accent', kind: 'pattern', alpha: 0.55 },
      ],
    },
    {
      id: 'leavesF',
      pivot: [9, 8],
      parts: [
        { d: join(...FRONT.map(frond)), role: 'belly' },
        { d: join(...FRONT.map(rib)), role: 'ink', kind: 'line', w: 3, alpha: 0.22 },
      ],
    },
  ],
  shine: ellipse(-2, -34, 6, 2.6, -18),
  face: {
    eyes: [[7, -24]],
    eye: 10.2,
    zone: [-10, -48, 30, 44],
    mouth: { at: [26, -17.5], w: 5, shape: 'smile' },
    sweet: true,
  },
  idle: {
    ambient: [
      { m: 'bob', amp: 2, period: 2 },
      { m: 'sway', g: ['leavesB', 'tail', 'leavesF'], amp: 7, period: 2.6, lag: 0.15 },
    ],
    signature: {
      dur: 1.5,
      every: [5, 8],
      tracks: [
        {
          g: 'leavesB',
          p: 'rot',
          k: [
            [0, 0],
            [0.12, -16],
            [0.28, 13],
            [0.44, -8],
            [0.56, 0],
          ],
        },
        {
          g: 'leavesF',
          p: 'rot',
          k: [
            [0, 0],
            [0.2, 16],
            [0.36, -13],
            [0.52, 8],
            [0.64, 0],
          ],
        },
        {
          g: 'tail',
          p: 'rot',
          k: [
            [0, 0],
            [0.26, 10],
            [0.42, -10],
            [0.6, 0],
          ],
        },
        {
          p: 'rot',
          k: [
            [0, 0],
            [0.56, 0],
            [0.7, 14],
            [0.84, 14],
            [1, 0],
          ],
        },
        {
          p: 'ty',
          k: [
            [0, 0],
            [0.56, 0],
            [0.7, 2.5],
            [0.84, 2.5],
            [1, 0],
          ],
        },
      ],
      face: [
        [0.56, 0.88, 'blink'],
        [0.88, 1, 'wink'],
      ],
    },
  },
  catch: {
    dur: 0.5,
    tracks: [
      {
        g: 'leavesB',
        p: 'rot',
        k: [
          [0, 0],
          [0.3, -18],
          [0.7, 14],
          [1, 0],
        ],
      },
      {
        g: 'leavesF',
        p: 'rot',
        k: [
          [0, 0],
          [0.4, 18],
          [0.8, -12],
          [1, 0],
        ],
      },
      {
        p: 'sy',
        k: [
          [0, 1],
          [0.2, 0.92],
          [0.45, 1.08],
          [1, 1],
        ],
      },
    ],
    face: [[0, 1, 'happy']],
  },
});
