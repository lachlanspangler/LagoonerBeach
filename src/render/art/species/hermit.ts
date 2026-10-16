/**
 * Hermit Crab — pilot exemplar for small CHIBI creatures with a prop-like home (XS).
 * Silhouette: a big round spiral shell (sun yellow, coral stripes) with a crab head peeking out
 * of the opening and one oversized claw in front (R10: the claw, ~2× life).
 * Personality: brave, borrowed, cocky. Signature: ducks into its shell, then pops back out and
 * waves the big claw with a smug face.
 * Groups: the shell (behind), the crab (`body`, shrinks into the opening to hide), the big claw.
 */
import { blob, capsule, defineArt, ellipse, join, waveTrack, within } from '../kit.ts';

const shell = blob([
  [-37, -14],
  [-32, -32],
  [-18, -39],
  [0, -34],
  [11, -20],
  [13, -2],
  [6, 12],
  [-10, 18],
  [-28, 15],
  [-35, 4],
]);
// a coiled whorl line and two coral stripes that follow the coil
const whorl = 'M-6 -6C-8 2 -20 4 -24 -4C-28 -14 -18 -24 -6 -22C6 -20 8 -4 0 6';
const stripes = join(
  'M-38 -24C-28 -40 -8 -40 2 -30L-2 -25C-10 -33 -26 -33 -33 -21Z',
  'M-39 2C-34 14 -16 18 -4 12L-6 7C-16 12 -30 9 -35 -1Z',
);
const crab = blob([
  [-2, -6],
  [12, -8],
  [26, -4],
  [32, 8],
  [28, 20],
  [14, 24],
  [0, 22],
  [-6, 10],
]);
const legs = join(
  capsule(4, 20, 4.4, -2, 30, 3.4),
  capsule(14, 22, 4.4, 12, 32, 3.4),
  capsule(24, 20, 4.2, 28, 30, 3.2),
);
const smallClaw = ellipse(-1, 18, 6, 4.6, -20);
const claw = blob([
  [25, 13],
  [34, 9],
  [42, 14],
  [43, 22],
  [38, 23],
  [40, 28],
  [34, 33],
  [24, 31],
  [21, 23],
]);

export default defineArt({
  id: 'hermit',
  klass: 'chibi',
  size: 'XS',
  feature: 'one oversized claw and a borrowed spiral shell',
  personality: ['brave', 'borrowed', 'cocky'],
  palette: { body: '#E0784E', accent: '#F7D26E' },
  groups: [
    {
      id: 'shell',
      pivot: [-14, 0],
      parts: [
        { d: shell, role: 'accent' },
        { d: stripes, role: 'body', kind: 'pattern' },
        { d: whorl, role: 'ink', kind: 'line', w: 2.4 },
      ],
    },
    {
      id: 'body',
      pivot: [0, 8],
      parts: [
        { d: legs, role: 'body' },
        { d: smallClaw, role: 'body' },
        { d: crab, role: 'body' },
        { d: ellipse(14, 22, 16, 6), role: 'belly', kind: 'pattern' },
      ],
    },
    { id: 'claw', pivot: [24, 21], parts: [{ d: claw, role: 'body' }] },
  ],
  shineOn: 'shell',
  shine: ellipse(-24, -28, 9, 4.5, -25),
  face: {
    eyes: [
      [10, 6],
      [22, 6],
    ],
    eye: 7.2,
    zone: [-2, -11, 34, 30],
    mouth: { at: [16, 13], w: 5, shape: 'smile' },
    front: true,
  },
  idle: {
    ambient: [
      { m: 'breathe', amp: 0.025, period: 3 },
      { m: 'sway', g: 'claw', amp: 6, period: 1.6 },
    ],
    signature: {
      dur: 1.5,
      tracks: [
        {
          g: 'body',
          p: 'tx',
          k: [
            [0, 0],
            [0.16, -6],
            [0.5, -6],
            [0.62, 0],
          ],
        },
        {
          g: 'body',
          p: 's',
          k: [
            [0, 1],
            [0.16, 0.12],
            [0.5, 0.12],
            [0.62, 1.06],
            [0.7, 1],
          ],
        },
        {
          g: 'claw',
          p: 'tx',
          k: [
            [0, 0],
            [0.16, -26],
            [0.5, -26],
            [0.62, 0],
          ],
        },
        {
          g: 'claw',
          p: 's',
          k: [
            [0, 1],
            [0.16, 0.1],
            [0.5, 0.1],
            [0.62, 1],
          ],
        },
        {
          g: 'shell',
          p: 'rot',
          k: [
            [0.16, 0],
            [0.22, -5],
            [0.3, 4],
            [0.38, 0],
          ],
        },
        within(waveTrack('claw', -24, 3), 0.62, 1),
      ],
      face: [[0.62, 1, 'proud']],
    },
  },
  catch: {
    dur: 0.5,
    tracks: [
      {
        g: 'claw',
        p: 'rot',
        k: [
          [0, 0],
          [0.3, -30],
          [0.6, 6],
          [1, 0],
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
});
