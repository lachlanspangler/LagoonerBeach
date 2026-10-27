/**
 * Leafy Sea Dragon — HORSE class, the legendary showpiece. Round 5 after CRITIQUE-4 ("a kiwi bird
 * with leaves": the round head + 1.6× beak on an upright body with fronds hanging down like legs).
 * Silhouette: a long, gently arched dragon drifting level — head, a 1.0 × head-length tube snout
 * (5 u, a 3 u flared tip), an arched banded body and a tail trailing back — wearing seven stalked
 * lime-cream leaves that all point up-and-back or down-and-back (never straight down: those read as legs).
 * Palette (CRITIQUE-4): emerald #3FAE6A (its own hue window), fronds lime-cream #CFE38A with dark
 * veins (ink at 65 % ≈ #2F6B45), cream bands #FFF4D6. Personality: regal, leafy, shy. Always awake
 * (a legendary is never found asleep): the fronds ripple in a current with staggered phases, then a
 * slow royal bow, a proud face and a wink.
 */
import { blob, defineArt, ellipse, join, tube } from '../kit.ts';

const head = ellipse(12, -11, 10.5, 9.2, 8);
// head length 21 → snout ~19 u from the head front to the tip, 5 u thick, a 3 u flared tube mouth
const snout = tube([
  [18, -8.8, 4.2],
  [24, -7, 2.6],
  [32, -5.2, 2.5],
  [36.5, -4.3, 2.6],
  [38.6, -3.9, 3.1],
]);
// the body arches up into the neck and settles into the tail (level trunk)
const torso = blob([
  [6, -17],
  [-5, -14],
  [-15, -9.5],
  [-22, -3],
  [-20, 5],
  [-10, 8],
  [0, 5],
  [7, -3],
]);
const tail = tube([
  [-17, 1, 5.4],
  [-23, 1.5, 4.2],
  [-28, 2.5, 3.2],
  [-32, 3, 2.5],
  [-35, 4, 2.1],
]);

/**
 * A leaf frond on a short stalk, rooted at (bx, by), pointing at `deg`: ONE smooth closed curve
 * (stalk, a leaf with two rounded side lobes and a round tip) so nothing loops back on itself (WebKit and the
 * rasteriser fill self-crossings differently).
 */
type Frond = readonly [number, number, number, number, number];
function frond([bx, by, deg, len, w]: Frond): string {
  const a = (deg * Math.PI) / 180;
  const c = Math.cos(a),
    s = Math.sin(a);
  const P = (u: number, v: number): [number, number] => [bx + u * c - v * s, by + u * s + v * c];
  return blob(
    [
      P(-1, -1.9),
      P(len * 0.32, -2.1),
      P(len * 0.5, -w * 0.46),
      P(len * 0.64, -w * 0.33),
      P(len * 0.84, -w * 0.5),
      P(len * 1.02, 0),
      P(len * 0.84, w * 0.5),
      P(len * 0.64, w * 0.33),
      P(len * 0.5, w * 0.46),
      P(len * 0.32, 2.1),
      P(-1, 1.9),
    ],
    0.5,
  );
}
const vein = ([x, y, d, len]: Frond) => {
  const a = (d * Math.PI) / 180;
  return `M${x + len * 0.4 * Math.cos(a)} ${y + len * 0.4 * Math.sin(a)}L${x + len * 0.84 * Math.cos(a)} ${y + len * 0.84 * Math.sin(a)}`;
};
// seven leaves, spaced so each reads alone at 24 px: crest, neck and back (up and back), the belly
// (down and back, never straight down: those read as legs) and three on the tail. All sweep back,
// so the current seems to flow through them from the snout.
const CREST: Frond = [10, -19, -100, 12, 9];
const NECK: Frond = [-3, -14, -115, 22, 15];
const BACK: Frond = [-15, -9, -150, 20, 14];
const BELLY: Frond = [-8, 7, 136, 20, 14];
const TAILUP: Frond = [-25, 0.5, -138, 15, 11];
const TAILDN: Frond = [-28, 3.5, 150, 15, 11];
const TIP: Frond = [-34, 4, 178, 10, 9];
const VEIN = { role: 'ink', kind: 'line', w: 3, alpha: 0.65 } as const;

const sway = (g: string, u0: number, a: number) => ({
  g,
  p: 'rot' as const,
  k: [
    [0, 0],
    [u0, 0],
    [u0 + 0.13, -a],
    [u0 + 0.26, a],
    [u0 + 0.39, -a * 0.4],
    [u0 + 0.5, 0],
  ] as [number, number][],
});

export default defineArt({
  id: 'seadragon',
  klass: 'horse',
  size: 'M',
  tileScale: 1.22,
  feature:
    'a long arched dragon with a straight tube snout, a trailing tail and seven stalked lime leaves all sweeping back',
  personality: ['regal', 'leafy', 'shy'],
  palette: { body: '#3FAE6A', accent: '#FFF4D6', belly: '#CFE38A' },
  neverSleepy: true,
  groups: [
    {
      id: 'crest',
      pivot: [-2, -14],
      parts: [
        { d: frond(CREST), role: 'belly', extra: true },
        { d: frond(NECK), role: 'belly' },
        { d: join(vein(CREST), vein(NECK)), ...VEIN },
      ],
    },
    {
      id: 'back',
      pivot: [-14, -9],
      parts: [
        { d: frond(BACK), role: 'belly' },
        { d: vein(BACK), ...VEIN },
      ],
    },
    {
      id: 'tail',
      pivot: [-17, 1],
      seamless: true,
      parts: [
        { d: join(frond(TAILUP), frond(TAILDN), frond(TIP)), role: 'belly', extra: true },
        { d: tail, role: 'body' },
        {
          d: tube([
            [-22.5, -4, 2.5],
            [-23.5, 8, 2.5],
          ]),
          role: 'accent',
          kind: 'pattern',
        },
        { d: join(vein(TAILUP), vein(TAILDN), vein(TIP)), ...VEIN },
      ],
    },
    {
      id: 'body',
      seamless: true,
      parts: [
        { d: torso, role: 'body' },
        { d: snout, role: 'body' },
        { d: head, role: 'body' },
        {
          d: join(
            tube([
              [-4, -18, 2.1],
              [-6, 10, 2.1],
            ]),
            tube([
              [-14, -13, 2.1],
              [-16, 8, 2.1],
            ]),
          ),
          role: 'accent',
          kind: 'pattern',
        },
      ],
    },
    {
      id: 'belly',
      pivot: [-8, 7],
      parts: [
        { d: frond(BELLY), role: 'belly' },
        { d: vein(BELLY), ...VEIN },
      ],
    },
  ],
  shine: ellipse(9, -17.5, 5.5, 2.3, -6),
  face: {
    eyes: [[13.5, -11]],
    eye: 12,
    zone: [1, -40, 26, 50],
    mouth: { at: [40, -2.5], w: 4, shape: 'smile' },
    sweet: true,
    // the default blush on emerald mixes to a grey eye-bag; an opaque light pink stays pink
    blush: { color: '#FFB0BE', alpha: 0.85 },
  },
  deviations: {
    R5T: 'the trunk drifts level; the up-swept neck leaves and the down-swept belly leaf skew the measured axis',
  },
  idle: {
    ambient: [
      { m: 'bob', amp: 2, period: 2.6 },
      { m: 'sway', g: ['crest', 'back', 'belly', 'tail'], amp: 7, period: 2.4, lag: 0.22 },
    ],
    signature: {
      dur: 1.5,
      every: [4.5, 5.5],
      tracks: [
        // the current reaches each frond in turn (±15°), snout to tail
        sway('crest', 0, 15),
        sway('belly', 0.08, 15),
        sway('back', 0.16, 15),
        sway('tail', 0.24, 12),
        // then a slow royal bow
        {
          p: 'rot',
          k: [
            [0, 0],
            [0.6, 0],
            [0.72, 12],
            [0.86, 12],
            [1, 0],
          ],
        },
        {
          p: 'ty',
          k: [
            [0, 0],
            [0.6, 0],
            [0.72, 2],
            [0.86, 2],
            [1, 0],
          ],
        },
      ],
      face: [
        [0.64, 0.88, 'proud'],
        [0.88, 0.98, 'wink'],
      ],
    },
  },
  catch: {
    dur: 0.5,
    tracks: [
      {
        g: 'crest',
        p: 'rot',
        k: [
          [0, 0],
          [0.3, -18],
          [0.7, 14],
          [1, 0],
        ],
      },
      {
        g: 'belly',
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
