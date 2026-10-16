/**
 * Baby Kraken — LEGENDARY, front-facing CHIBI, drawn XL (appendix ★ override).
 * Silhouette: a wide round head wearing a tiny three-point crown, eight arms that splay out
 * sideways and curl UP at the tips like a sea monster flexing (R10: the crown + the up-curled
 * arm fan; the octopus pilot's arms hang down and curl out, this one's spread and rise).
 * Deep purple, lifted to L 0.49 (R16 dark-identity rule) with a pink belly and pink suckers; the
 * crown is a light organ, so it glows gold on Night.
 * Personality: adorable, menacing-ish, babyish. Signature: tries a scary pose (arms up, puffed
 * up, smug), can't hold it, giggles and blushes.
 */
import { blob, circle, defineArt, ellipse, join, tube, xform } from '../kit.ts';

const head = blob([
  [0, -31],
  [16, -28],
  [25, -16],
  [27, 0],
  [22, 13],
  [11, 19],
  [0, 20],
  [-11, 19],
  [-22, 13],
  [-27, 0],
  [-25, -16],
  [-16, -28],
]);
const crown = blob(
  [
    [-12, -26],
    [-14, -40],
    [-7, -34],
    [0, -44.5],
    [7, -34],
    [14, -40],
    [12, -26],
    [0, -24],
  ],
  0.75,
);
// left arms (right ones mirror): two big outer arms that rise and curl up, a mid and a front arm
const upL = tube([
  [-21, 8, 6.6],
  [-31, 4, 5.6],
  [-36, -8, 4.8],
  [-36, -22, 4],
  [-31, -33, 3.4],
  [-26, -32, 2.8],
]);
const lowL = tube([
  [-19, 14, 6.6],
  [-29, 23, 5.6],
  [-36, 22, 4.6],
  [-37, 15, 3.8],
  [-33, 12, 3],
]);
const midL = tube([
  [-12, 18, 6.4],
  [-18, 28, 5.4],
  [-25, 34, 4.4],
  [-31, 32, 3.6],
  [-30, 27, 3],
]);
const frontL = tube([
  [-6.5, 19, 6.2],
  [-8, 29, 5.2],
  [-12, 35, 4.2],
  [-17, 34, 3.4],
  [-17, 30, 2.8],
]);
const mirror = (d: string) => xform(d, { sx: -1 });
const suckers = (pts: readonly (readonly [number, number])[]) => join(...pts.map(([x, y]) => circle(x, y, 2.2)));
const sL: [number, number][] = [
  [-36.5, -14],
  [-35, -24],
  [-36.5, 18],
  [-30, 31],
  [-24, 35],
];
const sF: [number, number][] = [
  [-9, 32],
  [-14, 36],
];
const flip = (pts: [number, number][]) => pts.map(([x, y]) => [-x, y] as [number, number]);

export default defineArt({
  id: 'kraken',
  klass: 'chibi',
  size: 'XL',
  feature: 'tiny crown on a wide round head, eight arms splayed wide and curled up at the tips',
  personality: ['adorable', 'menacing-ish', 'babyish'],
  palette: { body: '#714B99', accent: '#F2C14E', belly: '#F2A5CF' },
  nocturnal: true,
  groups: [
    {
      id: 'armsL',
      pivot: [-18, 8],
      parts: [
        { d: upL, role: 'body' },
        { d: lowL, role: 'body' },
        { d: midL, role: 'body' },
        { d: suckers(sL), role: 'belly', kind: 'pattern' },
      ],
    },
    {
      id: 'armsR',
      pivot: [18, 8],
      parts: [
        { d: mirror(upL), role: 'body' },
        { d: mirror(lowL), role: 'body' },
        { d: mirror(midL), role: 'body' },
        { d: suckers(flip(sL)), role: 'belly', kind: 'pattern' },
      ],
    },
    {
      id: 'body',
      parts: [
        { d: crown, role: 'light' },
        { d: head, role: 'body' },
        { d: join(circle(-18, -18, 3.6), circle(-23, -8, 2.4), circle(19, -19, 2.8)), role: 'belly', kind: 'pattern' },
        { d: ellipse(0, 18, 24, 6), role: 'belly', kind: 'pattern', alpha: 0.8 },
      ],
    },
    {
      id: 'armL',
      pivot: [-6.5, 18],
      parts: [
        { d: frontL, role: 'body' },
        { d: suckers(sF), role: 'belly', kind: 'pattern' },
      ],
    },
    {
      id: 'armR',
      pivot: [6.5, 18],
      parts: [
        { d: mirror(frontL), role: 'body' },
        { d: suckers(flip(sF)), role: 'belly', kind: 'pattern' },
      ],
    },
  ],
  shine: ellipse(-12, -21, 9, 4.6, -30),
  face: {
    eyes: [
      [-10, -2],
      [10, -2],
    ],
    eye: 11.6,
    zone: [-27, -31, 54, 51],
    mouth: { at: [0, 7], w: 6, shape: 'smile' },
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
          p: 'rot',
          k: [
            [0, 0],
            [0.12, 6],
            [0.3, -18],
            [0.5, -16],
            [0.62, 0],
          ],
        },
        {
          g: 'armsR',
          p: 'rot',
          k: [
            [0, 0],
            [0.12, -6],
            [0.3, 18],
            [0.5, 16],
            [0.62, 0],
          ],
        },
        {
          g: 'armL',
          p: 'rot',
          k: [
            [0, 0],
            [0.3, 100],
            [0.5, 96],
            [0.64, 0],
          ],
        },
        {
          g: 'armR',
          p: 'rot',
          k: [
            [0, 0],
            [0.3, -100],
            [0.5, -96],
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
