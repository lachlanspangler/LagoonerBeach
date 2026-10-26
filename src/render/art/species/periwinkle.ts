/**
 * Periwinkle — SNAIL class (profile, facing right), size XS.
 * Silhouette: a big round spiral shell riding high on a long cream foot, a round head in front with
 * two short knobbed stalks. R10: the stalks and the round shell. The eyes sit on the head, not the
 * stalk tips: at the 4 px eye floor, stalk-tip eyes read as spectacles (and sleepy as sunglasses).
 * Personality: slow, content, homebody. Signature: the eye-stalks stretch up and bob, then it slides
 * forward a little (2 units, squash-and-creep) and settles happy.
 * Groups (back to front): body (foot and head), shell, stalks (the face rides on them).
 */
import { blob, capsule, circle, defineArt, ellipse, join } from '../kit.ts';

const SX = -13,
  SY = -12;
const shell = circle(SX, SY, 26);
// a semicircle spiral: three cream rings winding into the apex (R18 `rings`)
const spiral =
  `M${SX + 22} ${SY}A22 22 0 0 0 ${SX - 20} ${SY}A18 18 0 0 0 ${SX + 16} ${SY}` +
  `A13 13 0 0 0 ${SX - 10} ${SY}A8 8 0 0 0 ${SX + 6} ${SY}`;
const foot = blob([
  [-38, 28],
  [-29, 23],
  [-10, 21],
  [16, 18],
  [21, 2],
  [29, -5],
  [38, -4],
  [42, 6],
  [41, 22],
  [26, 29],
  [-10, 31],
]);
// a big round head in front of the shell carries the face; two short stalks with knob tips on top
const head = circle(28, 4, 14.5);
// CRITIQUE-2: splayed ±30° and 20 % shorter, so the pair reads as snail stalks, not bunny ears
const stalks = join(capsule(24, -8, 2.6, 19.8, -15.2, 2.5), capsule(33, -8, 2.6, 37.2, -15.2, 2.5));
const knobs = join(circle(19, -16.4, 3.3), circle(38, -16.4, 3.3));

export default defineArt({
  id: 'periwinkle',
  klass: 'snail',
  size: 'XS',
  feature: 'a round spiral shell on a long foot, two eye-stalks',
  personality: ['slow', 'content', 'homebody'],
  palette: { body: '#A8724D', accent: '#F1E2C6', belly: '#F2E4CB' },
  groups: [
    {
      id: 'body',
      parts: [
        { d: foot, role: 'belly' },
        { d: 'M-34 27C-20 25 10 25 28 24', role: 'ink', kind: 'line', w: 1.4, alpha: 0.3 },
      ],
    },
    {
      id: 'shell',
      pivot: [SX, 18],
      parts: [
        { d: shell, role: 'body' },
        { d: spiral, role: 'accent', kind: 'line', w: 3.6 },
      ],
    },
    {
      id: 'stalks',
      pivot: [29, 10],
      parts: [
        { d: stalks, role: 'belly', extra: true },
        { d: knobs, role: 'belly', extra: true },
        { d: head, role: 'belly' },
      ],
    },
  ],
  shineOn: 'shell',
  shine: ellipse(-25, -26, 8, 4, -35),
  face: {
    g: 'stalks',
    eyes: [
      [19.5, 4],
      [36.5, 4],
    ],
    eye: 12.4,
    zone: [13, -12, 32, 30],
    mouth: { at: [28, 12.5], w: 6, shape: 'smile' },
    front: true,
    sweet: true,
    lid: 'belly',
  },
  idle: {
    ambient: [
      { m: 'breathe', amp: 0.015, period: 3.6 },
      { m: 'bob', g: 'stalks', amp: 2, period: 1.4 },
      { m: 'sway', g: 'stalks', amp: 4, period: 2.8, phase: 0.3 },
    ],
    signature: {
      dur: 1.2,
      tracks: [
        {
          g: 'stalks',
          p: 'sy',
          k: [
            [0, 1],
            [0.15, 1.14],
            [0.3, 0.94],
            [0.45, 1.08],
            [0.6, 1],
          ],
        },
        {
          p: 'tx',
          k: [
            [0.45, 0],
            [0.6, 0.4],
            [0.85, 3],
            [1, 3],
          ],
        },
        {
          p: 'sx',
          k: [
            [0.45, 1],
            [0.6, 1.06],
            [0.78, 0.97],
            [0.9, 1],
          ],
        },
        {
          g: 'shell',
          p: 'rot',
          k: [
            [0.55, 0],
            [0.7, 4],
            [0.86, -2],
            [1, 0],
          ],
        },
      ],
      face: [
        [0.1, 0.45, 'surprised'],
        [0.75, 1, 'happy'],
      ],
    },
  },
  catch: {
    dur: 0.5,
    tracks: [
      {
        g: 'stalks',
        p: 'sy',
        k: [
          [0, 1],
          [0.25, 1.2],
          [0.6, 0.9],
          [1, 1],
        ],
      },
      {
        p: 'sy',
        k: [
          [0, 1],
          [0.2, 0.86],
          [0.45, 1.12],
          [1, 1],
        ],
      },
    ],
    face: [[0, 1, 'happy']],
  },
  ground: true,
});
