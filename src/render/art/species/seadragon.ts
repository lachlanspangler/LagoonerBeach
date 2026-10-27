/**
 * Leafy Sea Dragon — HORSE class, the legendary showpiece (upright profile). Round 4 after
 * CRITIQUE-3 ("a duck / hoopoe in a shrub"; the 24 px coin was a bush).
 * Silhouette: an upright S — a small round head, a long straight pipette snout (1.3 × the head,
 * 4 u thick, a 2 u tube flare at the tip), a slender banded body and a tail that sweeps BACK (the
 * seahorse curls its tail forward) — with five big three-pronged fronds only at the extremities
 * (crest, mid-back, belly, two on the tail): spiky and dragon-like, never a bush, none over the face.
 * Palette (CRITIQUE-3): bronze-olive #B39234 body (off the gold cluster), sea-green #7FB08A fronds,
 * cream bands. Personality: regal, leafy, shy. Rests eyes OPEN everywhere (detail too); `proud` is an
 * occasional beat in the signature: a current sweeps through the fronds (back and front layers with
 * overlapping lag), then a slow royal bow with a proud face, and a wink.
 */
import { blob, defineArt, ellipse, join, tube } from '../kit.ts';

const head = ellipse(2, -24, 11, 9.6, -8);
// head length 22 → snout 28.6 u, 4 u thick, dead straight (a gentle 8° droop), flowing out of the
// head like a horse's muzzle (never a beak stuck on a ball), ending in a 2 u tube flare
const snout = tube([
  [9, -22.3, 4.6],
  [17, -21, 2.6],
  [24, -20, 2],
  [36, -18.3, 2],
  [38.6, -17.9, 2.7],
]);
const torso = blob([
  [-6, -17],
  [5, -14.5],
  [10, -4],
  [11.5, 8],
  [7.5, 15],
  [-2, 16],
  [-8.5, 8],
  [-9.5, -6],
]);
// the tail trails down and BACK (a seahorse curls its tail forward into a spiral; a dragon never does)
const tail = tube([
  [-3, 13, 5.8],
  [-7, 22, 4.5],
  [-11, 29, 3.6],
  [-16, 34, 2.9],
  [-22, 36, 2.4],
]);

/**
 * A three-pronged frond rooted at (bx, by), pointing at `deg`: ONE closed curve (root, outer edge,
 * three tips with two notches, other edge) so no subpaths overlap and nothing loops back on itself
 * (WebKit and the rasteriser fill self-crossings differently).
 */
type Frond = readonly [number, number, number, number, number];
function frond([bx, by, deg, len, w]: Frond): string {
  const a = (deg * Math.PI) / 180;
  const c = Math.cos(a),
    s = Math.sin(a);
  const P = (u: number, v: number): [number, number] => [bx + u * c - v * s, by + u * s + v * c];
  return blob(
    [
      P(-1, 0),
      P(len * 0.3, -w * 0.38),
      P(len * 0.84, -w * 0.6),
      P(len * 0.64, -w * 0.14),
      P(len * 1.08, 0),
      P(len * 0.64, w * 0.14),
      P(len * 0.84, w * 0.6),
      P(len * 0.3, w * 0.38),
    ],
    0.5,
  );
}
const vein = ([x, y, d, len]: Frond) => {
  const a = (d * Math.PI) / 180;
  return `M${x + 3 * Math.cos(a)} ${y + 3 * Math.sin(a)}L${x + len * 0.8 * Math.cos(a)} ${y + len * 0.8 * Math.sin(a)}`;
};
// five fronds at the extremities: crest and mid-back (behind), belly (front), tail and tail tip.
// The crest is `extra`: it breaks the tile frame a little, so the legendary reads bigger than an M.
const CREST: Frond = [-4, -29, -116, 18.5, 19];
const BACK: Frond = [-9, -3, 182, 28, 22];
const BELLY: Frond = [9, 10, 50, 22, 19];
const TAIL: Frond = [-9, 24, 158, 22, 18];
const TIP: Frond = [-21, 35, 192, 17, 14];
const bands = join(
  tube([
    [-10, -6, 2.2],
    [10.5, -4, 2.2],
  ]),
  tube([
    [-9.5, 5, 2.2],
    [11.5, 6, 2.2],
  ]),
);

export default defineArt({
  id: 'seadragon',
  klass: 'horse',
  size: 'M',
  tileScale: 1.25,
  feature:
    'an upright S with a small round head, a long straight tube snout and a back-swept tail, five spiky forked fronds at the tips',
  personality: ['regal', 'leafy', 'shy'],
  palette: { body: '#B39234', accent: '#FFF4D6', belly: '#7FB08A' },
  groups: [
    {
      id: 'leavesB',
      pivot: [-6, -12],
      parts: [
        { d: frond(CREST), role: 'belly', extra: true },
        { d: frond(BACK), role: 'belly' },
        { d: join(vein(CREST), vein(BACK)), role: 'white', kind: 'line', w: 3, alpha: 0.45 },
      ],
    },
    {
      id: 'tail',
      pivot: [-3, 14],
      seamless: true,
      parts: [
        { d: join(frond(TAIL), frond(TIP)), role: 'belly', extra: true },
        { d: tail, role: 'body' },
        {
          d: tube([
            [-12, 24, 2.6],
            [0, 22, 2.6],
          ]),
          role: 'accent',
          kind: 'pattern',
        },
        { d: join(vein(TAIL), vein(TIP)), role: 'white', kind: 'line', w: 3, alpha: 0.45 },
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
        { d: ellipse(8.5, 4, 3.2, 9), role: 'accent', kind: 'pattern', alpha: 0.55 },
      ],
    },
    {
      id: 'leavesF',
      pivot: [9, 10],
      parts: [
        { d: frond(BELLY), role: 'belly' },
        { d: vein(BELLY), role: 'white', kind: 'line', w: 3, alpha: 0.45 },
      ],
    },
  ],
  shine: ellipse(-2, -30, 5.5, 2.4, -18),
  face: {
    eyes: [[9, -25.5]],
    eye: 10,
    zone: [-9, -49, 26, 42],
    mouth: { at: [37.5, -15], w: 4, shape: 'smile' },
    sweet: true,
  },
  deviations: {
    R5T: 'the trunk stands upright; the back-swept tail and the long snout (CRITIQUE-3) skew the measured axis',
  },
  idle: {
    ambient: [
      { m: 'bob', amp: 2, period: 2 },
      { m: 'sway', g: ['leavesB', 'tail', 'leavesF'], amp: 7, period: 2.6, lag: 0.15 },
    ],
    signature: {
      dur: 1.5,
      every: [4.5, 5.5],
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
        [0.6, 0.9, 'proud'],
        [0.9, 1, 'wink'],
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
