/**
 * Leafy Sea Dragon — HORSE class, legendary showpiece (profile, swimming level). Silhouette: a
 * seahorse S laid down flat — round head on a long pipette snout, a slim body and a gently curling
 * tail — wrapped in seven rounded leaf lobes that stick out all around (R10: the leaves, oversized).
 * Personality: regal, leafy, shy. Signature: the leaves sway in a current (front and back layers
 * lag each other), then it bows, proud, and winks.
 */
import { blob, capsule, defineArt, ellipse, join, tube } from '../kit.ts';

const head = ellipse(15, -14, 11.5, 10.5, -14);
// a thin pipette snout with a little rounded flare at the tip
const snout = join(capsule(21, -14, 4, 38, -10, 2.3), ellipse(39, -10, 3, 2.8));
// a slim arched body (a plump torso read as a puppy)
const torso = blob([
  [8, -10],
  [10, -1],
  [4, 6],
  [-8, 8],
  [-20, 6],
  [-24, 0],
  [-18, -5],
  [-5, -6],
]);
const tail = tube([
  [-20, 3, 5],
  [-28, 9, 4.2],
  [-31, 17, 3.4],
  [-27, 24, 3],
  [-20, 24, 2.6],
]);
/** A leaf lobe rooted at (bx, by), pointing at `deg`: narrow stalk, wide rounded blade. */
function leaf(bx: number, by: number, deg: number, len: number, w: number): string {
  const a = (deg * Math.PI) / 180;
  const c = Math.cos(a),
    s = Math.sin(a);
  const P = (u: number, v: number): [number, number] => [bx + u * c - v * s, by + u * s + v * c];
  return blob([
    P(0, -1.8),
    P(len * 0.4, -w * 0.46),
    P(len * 0.82, -w * 0.42),
    P(len, 0),
    P(len * 0.82, w * 0.42),
    P(len * 0.4, w * 0.46),
    P(0, 1.8),
  ]);
}
const rib = (bx: number, by: number, deg: number, len: number) => {
  const a = (deg * Math.PI) / 180;
  return `M${bx + 3 * Math.cos(a)} ${by + 3 * Math.sin(a)}L${bx + len * 0.8 * Math.cos(a)} ${by + len * 0.8 * Math.sin(a)}`;
};
// back crown of three, two under the belly, two on the tail (seven lobes, R10)
// forked fronds: two blades from one root (the leafy look), on the neck, back and rump
const B = [
  [8, -11, -90, 19, 10],
  [-7, -5, -118, 20, 10.5],
  [-22, -2, -152, 17, 9.5],
] as const;
// belly leaves trail backwards so they never read as legs
const F = [
  [-2, 6, 116, 17, 10],
  [-15, 6, 146, 15, 9.5],
] as const;
const T = [
  [-30, 10, 195, 11, 7.5],
  [-26, 23, 150, 11, 7],
] as const;
const fork = ([x, y, d, len, w]: readonly [number, number, number, number, number]) =>
  join(leaf(x, y, d - 14, len, w), leaf(x, y, d + 20, len * 0.78, w * 0.8));
const backLeaves = join(...B.map(fork));
const frontLeaves = join(...F.map(fork));
const tailLeaves = join(...T.map(([x, y, d, len, w]) => leaf(x, y, d, len, w)));
const veins = (L: readonly (readonly [number, number, number, number, number])[]) =>
  join(...L.map(([x, y, d, len]) => rib(x, y, d, len)));
const stripes = join(
  tube([
    [2, -10, 1.4],
    [1, 9, 1.4],
  ]),
  tube([
    [-9, -8, 1.4],
    [-10, 10, 1.4],
  ]),
  tube([
    [-27, 4, 1.2],
    [-25, 13, 1.2],
  ]),
);

export default defineArt({
  id: 'seadragon',
  klass: 'horse',
  size: 'M',
  feature: 'a seahorse laid level on a long pipette snout, wrapped in seven big rounded leaf lobes',
  personality: ['regal', 'leafy', 'shy'],
  palette: { body: '#C9A53B', accent: '#F5E6B0', belly: '#9CC487' },
  groups: [
    {
      id: 'leavesB',
      pivot: [-6, -5],
      parts: [
        { d: backLeaves, role: 'belly' },
        { d: veins(B), role: 'ink', kind: 'line', w: 1.2, alpha: 0.3 },
      ],
    },
    {
      id: 'tail',
      pivot: [-20, 3],
      parts: [
        { d: tailLeaves, role: 'belly' },
        { d: tail, role: 'body' },
        { d: veins(T), role: 'ink', kind: 'line', w: 1.1, alpha: 0.3 },
        {
          d: tube([
            [-29, 11, 1.2],
            [-32, 17, 1.2],
          ]),
          role: 'accent',
          kind: 'pattern',
        },
      ],
    },
    {
      id: 'body',
      parts: [
        { d: torso, role: 'body' },
        { d: snout, role: 'body' },
        { d: head, role: 'body' },
        { d: stripes, role: 'accent', kind: 'pattern' },
        { d: ellipse(-8, 8, 13, 2.6, -4), role: 'accent', kind: 'pattern', alpha: 0.6 },
      ],
    },
    {
      id: 'leavesF',
      pivot: [-8, 6],
      parts: [
        { d: frontLeaves, role: 'belly' },
        { d: veins(F), role: 'ink', kind: 'line', w: 1.2, alpha: 0.3 },
      ],
    },
  ],
  shine: ellipse(12, -21, 5.5, 2.4, -20),
  face: {
    eyes: [[16, -12]],
    eye: 6.4,
    zone: [4, -28, 26, 28],
    mouth: { at: [39, -7], w: 4, shape: 'smile' },
    sweet: true,
  },
  idle: {
    ambient: [
      { m: 'bob', amp: 2, period: 2 },
      { m: 'sway', g: ['leavesB', 'leavesF'], amp: 7, period: 2.4, lag: 0.15 },
      { m: 'sway', g: 'tail', amp: 5, period: 2.4, phase: 0.3 },
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
            [0.12, -14],
            [0.28, 12],
            [0.44, -8],
            [0.56, 0],
          ],
        },
        {
          g: 'leavesF',
          p: 'rot',
          k: [
            [0, 0],
            [0.2, 14],
            [0.36, -12],
            [0.52, 8],
            [0.64, 0],
          ],
        },
        {
          g: 'tail',
          p: 'rot',
          k: [
            [0, 0],
            [0.2, 10],
            [0.4, -10],
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
      ],
      face: [
        [0.6, 0.88, 'proud'],
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
