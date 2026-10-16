/**
 * Clownfish — pilot exemplar for the FISH class (profile view).
 * Silhouette: plump rounded body, rounded fan tail, two-lobed rounded dorsal (R10: the three
 * ink-trimmed white bars, exaggerated wide, are the signature trait).
 * Personality: chatty, cheerful, clingy. Signature: wiggles into a tiny anemone and back out.
 */
import { blob, capsule, defineArt, ellipse, join, tube, wiggleTrack, within } from '../kit.ts';

// body: snout at +36, tail root at −32, belly a little deeper than the back (plump, R5 ≈ 1.5 : 1)
const body = blob([
  [37, 2],
  [32.5, -12.5],
  [21, -20],
  [4, -23],
  [-14, -20],
  [-27, -11],
  [-33, -5],
  [-33, 5],
  [-26, 13],
  [-12, 21],
  [6, 23],
  [24, 18],
  [33.5, 12],
]);
const dorsal = blob([
  [14, -18],
  [9, -27],
  [1, -30],
  [-5, -27],
  [-10, -33],
  [-20, -32],
  [-27, -22],
  [-22, -14],
  [0, -18],
]);
const anal = blob([
  [-6, 18],
  [-10, 28],
  [-19, 29],
  [-25, 20],
  [-18, 14],
]);
const tail = blob([
  [-30, -7],
  [-38, -16],
  [-45, -15],
  [-47, -5],
  [-47, 5],
  [-45, 15],
  [-38, 16],
  [-30, 7],
]);
const pectoral = ellipse(-9, 11, 7.5, 4.4, 24);
// the bars follow the body's curve; widths exaggerated (R10) so all three survive at 54 px
const headBar = tube([
  [3, -27, 4.2],
  [0, -12, 4.8],
  [0, 4, 4.8],
  [4, 25, 4.2],
]);
const midBar = tube([
  [-12, -36, 4.6],
  [-16, -16, 5.2],
  [-16, 4, 5.2],
  [-12, 32, 4.6],
]);
const tailBar = tube([
  [-30, -12, 3],
  [-32, 0, 3.4],
  [-30, 12, 3],
]);
// dark fin tips: one ink crescent per fin
const finTips = join(ellipse(-14, -36, 14, 6, -8), ellipse(-16, 31, 9, 4, 10));

// the anemone prop (accent): three plump tentacles and a base, below and behind the fish
const anemone = join(
  capsule(-30, 44, 5, -38, 26, 3.4),
  capsule(-20, 44, 5, -20, 22, 3.6),
  capsule(-10, 44, 5, -2, 27, 3.4),
  ellipse(-20, 44, 16, 5),
);

export default defineArt({
  id: 'clownfish',
  klass: 'fish',
  size: 'S',
  feature: 'three wide white bars with ink trim on a round orange body',
  personality: ['chatty', 'cheerful', 'clingy'],
  palette: { body: '#F2792E', accent: '#C77DD6' },
  groups: [
    {
      id: 'tail',
      pivot: [-31, 0],
      parts: [
        { d: tail, role: 'body' },
        { d: ellipse(-48, 0, 6, 17), role: 'ink', kind: 'pattern', alpha: 0.55 },
      ],
    },
    {
      id: 'body',
      parts: [
        { d: dorsal, role: 'body' },
        { d: anal, role: 'body' },
        { d: body, role: 'body' },
        { d: ellipse(4, 24, 30, 9), role: 'belly', kind: 'pattern' },
        { d: finTips, role: 'ink', kind: 'pattern', alpha: 0.55 },
        { d: headBar, role: 'white', kind: 'pattern' },
        { d: midBar, role: 'white', kind: 'pattern' },
        { d: tailBar, role: 'white', kind: 'pattern' },
        { d: join(headBar, midBar, tailBar), role: 'ink', kind: 'line', w: 3 },
      ],
    },
    { id: 'finA', pivot: [-3, 8], parts: [{ d: pectoral, role: 'body' }] },
    { id: 'anemone', pivot: [-20, 44], prop: true, parts: [{ d: anemone, role: 'accent' }] },
  ],
  shine: ellipse(22, -11, 8, 3.6, -24),
  face: {
    eyes: [[12, 2]],
    eye: 10.5,
    zone: [6, -22, 31, 44],
    mouth: { at: [31, 9], w: 7, shape: 'smile' },
    sweet: true,
  },
  idle: {
    ambient: [
      { m: 'bob', amp: 2.5, period: 2.4 },
      { m: 'wag', g: 'tail', amp: 10, period: 0.8 },
      { m: 'flutter', g: 'finA', amp: 16, period: 0.45 },
    ],
    signature: {
      dur: 1.5,
      every: [5, 8],
      tracks: [
        {
          g: 'anemone',
          p: 's',
          k: [
            [0, 0],
            [0.16, 1.08],
            [0.24, 1],
            [0.8, 1],
            [1, 0],
          ],
        },
        {
          p: 'tx',
          k: [
            [0, 0],
            [0.2, 2],
            [0.4, -10],
            [0.68, -10],
            [0.86, 2],
            [1, 0],
          ],
        },
        {
          p: 'ty',
          k: [
            [0, 0],
            [0.2, -2],
            [0.4, 12],
            [0.68, 12],
            [0.86, -3],
            [1, 0],
          ],
        },
        within(wiggleTrack(9, 6), 0.3, 0.75),
        {
          g: 'tail',
          p: 'rot',
          k: [
            [0, 0],
            [0.35, 18],
            [0.45, -18],
            [0.55, 18],
            [0.65, -14],
            [0.75, 0],
          ],
        },
      ],
      face: [
        [0.36, 0.74, 'happy'],
        [0.74, 0.95, 'wink'],
      ],
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
          [0.25, 22],
          [0.5, -22],
          [0.75, 16],
          [1, 0],
        ],
      },
      {
        g: 'finA',
        p: 'rot',
        k: [
          [0, 0],
          [0.3, -30],
          [0.7, 20],
          [1, 0],
        ],
      },
      {
        p: 'sy',
        k: [
          [0, 1],
          [0.2, 0.9],
          [0.45, 1.08],
          [1, 1],
        ],
      },
    ],
    face: [[0, 1, 'happy']],
  },
});
