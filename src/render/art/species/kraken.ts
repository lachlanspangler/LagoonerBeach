/**
 * Baby Kraken — LEGENDARY, front-facing CHIBI, drawn XL (appendix ★ override).
 * Silhouette: a WIDE squat head (≈ 1.3× the octopus pilot's head relative to its arms) wearing a
 * tiny three-point crown, with all eight arms splayed out sideways like a starburst skirt, the tips
 * curling up and breaking the tile frame (R10: the crown + the splayed arm fan + a stubby brow).
 * The octopus pilot is a tall dome over hanging arms; this is a flat, wide little sea monster.
 * Deep purple lifted to L 0.49 (R16 dark-identity rule) with a pink belly and pink suckers; the
 * crown is a light organ, so it glows gold on Night.
 * Personality: adorable, menacing-ish, babyish. Signature: tries a scary pose (arms up, puffed up,
 * smug), can't hold it, giggles and blushes.
 */
import { blob, circle, defineArt, ellipse, join, tube, xform } from '../kit.ts';

const head = blob([
  [0, -29],
  [20, -27],
  [33, -17],
  [37, -3],
  [32, 10],
  [17, 17],
  [0, 18],
  [-17, 17],
  [-32, 10],
  [-37, -3],
  [-33, -17],
  [-20, -27],
]);
const crown = blob(
  [
    [-11, -24],
    [-12, -36],
    [-6, -31],
    [0, -40],
    [6, -31],
    [12, -36],
    [11, -24],
    [0, -22],
  ],
  0.75,
);
// left arms (right ones mirror). Bases stay inside the body box; the curled tips are `extra` and
// break the frame (R28). Four arms a side, fanned from horizontal-and-up to down-and-out.
const armsBase = join(
  tube([
    [-28, 2, 7],
    [-34, 0, 6],
    [-37, -4, 5],
  ]),
  tube([
    [-26, 10, 7],
    [-32, 14, 6],
    [-37, 15, 5],
  ]),
  tube([
    [-19, 15, 6.8],
    [-26, 24, 5.8],
    [-33, 28, 4.8],
  ]),
);
const armsTips = join(
  tube([
    [-37, -4, 5],
    [-41, -11, 4],
    [-39, -17, 3.2],
    [-35, -16, 2.8],
  ]),
  tube([
    [-37, 15, 5],
    [-44, 13, 4],
    [-46, 6, 3.2],
    [-43, 3, 2.8],
  ]),
  tube([
    [-33, 28, 4.8],
    [-41, 30, 3.8],
    [-45, 25, 3.2],
    [-42, 21, 2.8],
  ]),
);
// the front arm: down and out, tip curling outward (never toward the other one: not clasped hands)
const frontL = tube([
  [-9, 16, 6.6],
  [-14, 27, 5.6],
  [-21, 35, 4.6],
  [-28, 37, 3.6],
  [-31, 33, 3],
]);
const mirror = (d: string) => xform(d, { sx: -1 });
const dots = (pts: readonly (readonly [number, number])[], r = 3.2) => join(...pts.map(([x, y]) => circle(x, y, r)));
const sL: [number, number][] = [
  [-40.5, -10],
  [-44.5, 10],
  [-42, 28.5],
];
const sF: [number, number][] = [
  [-20, 33],
  [-27, 35],
];
const flip = (pts: [number, number][]) => pts.map(([x, y]) => [-x, y] as [number, number]);
// the stubby "menacing" brow: two short thick ink dashes angled down toward the middle
const brow = 'M-15 -14.5L-9 -12.5M15 -14.5L9 -12.5';

export default defineArt({
  id: 'kraken',
  klass: 'chibi',
  size: 'XL',
  feature: 'wide squat crowned head, all eight arms splayed out like a starburst with curled tips',
  personality: ['adorable', 'menacing-ish', 'babyish'],
  palette: { body: '#714B99', accent: '#F2C14E', belly: '#F2A5CF' },
  nocturnal: true,
  neverSleepy: true, // CRITIQUE-1: the kraken is never sleepy (its brief), on either theme
  groups: [
    {
      id: 'armsL',
      pivot: [-24, 8],
      parts: [
        { d: armsBase, role: 'body' },
        { d: armsTips, role: 'body', extra: true },
        { d: dots(sL), role: 'belly', kind: 'pattern' },
      ],
    },
    {
      id: 'armsR',
      pivot: [24, 8],
      parts: [
        { d: mirror(armsBase), role: 'body' },
        { d: mirror(armsTips), role: 'body', extra: true },
        { d: dots(flip(sL)), role: 'belly', kind: 'pattern' },
      ],
    },
    {
      id: 'armL',
      pivot: [-9, 16],
      parts: [
        { d: frontL, role: 'body' },
        { d: dots(sF, 3), role: 'belly', kind: 'pattern' },
      ],
    },
    {
      id: 'armR',
      pivot: [9, 16],
      parts: [
        { d: mirror(frontL), role: 'body' },
        { d: dots(flip(sF), 3), role: 'belly', kind: 'pattern' },
      ],
    },
    {
      id: 'body',
      parts: [
        { d: crown, role: 'light' },
        { d: head, role: 'body' },
        { d: join(circle(-24, -14, 3.6), circle(25, -15, 3.2), circle(-29, 1, 3)), role: 'belly', kind: 'pattern' },
        { d: brow, role: 'ink', kind: 'line', w: 3.2 },
      ],
    },
  ],
  shine: ellipse(-14, -20, 10, 4.4, -22),
  face: {
    eyes: [
      [-10, -3],
      [10, -3],
    ],
    eye: 11.2,
    zone: [-37, -29, 74, 47],
    mouth: { at: [0, 7], w: 6, shape: 'w' },
    front: true,
  },
  idle: {
    ambient: [
      { m: 'breathe', amp: 0.025, period: 3 },
      { m: 'bob', amp: 1.5, period: 3.2 },
      { m: 'sway', g: 'armsL', amp: 5, period: 2.6 },
      { m: 'sway', g: 'armsR', amp: -5, period: 2.6, phase: 0.15 },
      { m: 'sway', g: ['armL', 'armR'], amp: 5, period: 2, lag: 0.12 },
    ],
    signature: {
      dur: 1.5,
      tracks: [
        {
          g: 'armsL',
          p: 'sx',
          k: [
            [0, 1],
            [0.12, 0.94],
            [0.3, 1.16],
            [0.52, 1.14],
            [0.64, 1],
          ],
        },
        {
          g: 'armsR',
          p: 'sx',
          k: [
            [0, 1],
            [0.12, 0.94],
            [0.3, 1.16],
            [0.52, 1.14],
            [0.64, 1],
          ],
        },
        {
          p: 'ty',
          k: [
            [0, 0],
            [0.12, 2],
            [0.3, -4],
            [0.52, -4],
            [0.64, 0],
          ],
        },
        {
          p: 's',
          k: [
            [0, 1],
            [0.3, 1.05],
            [0.52, 1.05],
            [0.64, 0.97],
            [0.72, 1],
          ],
        },
        {
          p: 'rot',
          k: [
            [0.6, 0],
            [0.68, -5],
            [0.76, 5],
            [0.84, -4],
            [0.92, 3],
            [1, 0],
          ],
        },
      ],
      face: [
        [0.2, 0.55, 'proud'],
        [0.6, 1, 'happy'],
      ],
    },
  },
  deviations: {
    R27: 'appendix ★ override: the Baby Kraken is drawn XL ("baby" by kraken standards)',
    R16: 'dark-identity legendary: body lifted to L 0.49 per the appendix (≥ 0.45) with a pink belly; Night ΔL 0.32 still passes via the brighter rim',
  },
});
