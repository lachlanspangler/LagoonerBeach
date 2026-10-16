/**
 * Nautilus — SNAIL class (profile, facing right), size M.
 * Silhouette: a big round coiled shell with tiger stripes, a hooded head at the opening and a tuft
 * of short tentacles fanning out in front (R10: the tuft and the stripes on a round coil).
 * Personality: ancient, polite, unhurried. Signature: jets backward 6 units, tentacles streaming,
 * with a little bubble trail, then drifts back and settles with a polite blink.
 * Groups (back to front): tentacles, shell, body (hood and head; the face rides on it), bubbles (prop).
 */
import { blob, capsule, circle, defineArt, ellipse, join, tube, xform } from '../kit.ts';

const shell = circle(-12, -2, 28);
// tiger stripes on the back of the coil, fading out before the opening (R18 `bands`, hand placed)
const stripes = join(
  tube([
    [-30, -30, 2.6],
    [-22, -18, 3.4],
    [-18, -4, 2.4],
  ]),
  tube([
    [-14, -38, 2.8],
    [-10, -24, 3.6],
    [-10, -12, 2.4],
  ]),
  tube([
    [2, -38, 2.6],
    [2, -26, 3.2],
    [-1, -16, 2],
  ]),
  tube([
    [-42, -12, 2.6],
    [-32, -4, 3.2],
    [-24, 4, 2.2],
  ]),
  tube([
    [-40, 12, 2.4],
    [-30, 12, 2.8],
    [-22, 14, 2],
  ]),
);
// the coil: a whorl line winding to a small navel
const whorl = 'M14 -16C4 -28 -22 -26 -26 -6C-29 10 -12 18 -4 8C2 0 -4 -8 -10 -6';
const head = blob([
  [8, -6],
  [20, -10],
  [30, -6],
  [33, 6],
  [30, 18],
  [18, 22],
  [8, 16],
]);
// the hood: a striped cap that juts forward over the head, like the real nautilus's leathery hood
const hood = blob([
  [4, -6],
  [12, -14],
  [26, -14],
  [34, -4],
  [30, -1],
  [20, -6],
  [8, -2],
]);
const tentacles = join(
  capsule(28, 2, 3.4, 39, -8, 2.6),
  capsule(29, 8, 3.4, 41, 6, 2.6),
  capsule(27, 14, 3.4, 39, 20, 2.6),
  capsule(22, 18, 3.2, 31, 31, 2.6),
);
// the whole nautilus hangs nose-down by 40°, the way a real one hovers with its opening forward
// and down. It also keeps its silhouette apart from the cuttlefish, hermit crab and turtle (R12).
const R = (d: string) => xform(d, { rot: 40, sx: 0.96, sy: 0.96 });
const bubbles = join(circle(34, 14, 3.4), circle(40, 4, 2.4), circle(36, -4, 1.8));

export default defineArt({
  id: 'nautilus',
  klass: 'snail',
  size: 'M',
  feature: 'a striped round coil with a tentacle tuft at the opening',
  personality: ['ancient', 'polite', 'unhurried'],
  palette: { body: '#E9DCC4', accent: '#B5653A', belly: '#F0C7A8' },
  groups: [
    { id: 'tentacles', pivot: [14, 22], parts: [{ d: R(tentacles), role: 'belly' }] },
    {
      id: 'shell',
      pivot: [-8, -9],
      parts: [
        { d: R(shell), role: 'body' },
        { d: R(stripes), role: 'accent', kind: 'pattern' },
        { d: R(whorl), role: 'ink', kind: 'line', w: 1.8, alpha: 0.5 },
      ],
    },
    {
      id: 'body',
      pivot: [6, 10],
      parts: [
        { d: R(head), role: 'belly' },
        { d: R(hood), role: 'accent', kind: 'pattern' },
      ],
    },
    { id: 'bubbles', pivot: [36, 6], prop: true, parts: [{ d: bubbles, role: 'white' }] },
  ],
  shineOn: 'shell',
  shine: ellipse(-2, -29, 10, 4.4, 5),
  face: {
    eyes: [[7, 14]],
    eye: 8.2,
    zone: [-6, -6, 36, 36],
    mouth: { at: [14, 24], w: 5, shape: 'smile' },
    sweet: true,
  },
  deviations: {
    R7: 'the body hangs nose-down by 40°, so the eye on the head at the shell opening measures 41 % back along the tilted box',
  },
  idle: {
    ambient: [
      { m: 'bob', amp: 2, period: 2.8 },
      { m: 'sway', g: 'tentacles', amp: 6, period: 1.4 },
      { m: 'breathe', g: 'body', amp: 0.02, period: 2.8, phase: 0.25 },
    ],
    signature: {
      dur: 1.4,
      every: [5, 8],
      tracks: [
        {
          p: 'tx',
          k: [
            [0, 0],
            [0.1, 1.5],
            [0.24, -7],
            [0.7, -5],
            [1, 0],
          ],
        },
        {
          p: 'ty',
          k: [
            [0, 0],
            [0.1, 1],
            [0.24, -5],
            [0.7, -3.5],
            [1, 0],
          ],
        },
        {
          g: 'tentacles',
          p: 'sy',
          k: [
            [0, 1],
            [0.1, 1.15],
            [0.24, 0.55],
            [0.6, 0.8],
            [0.9, 1],
          ],
        },
        {
          g: 'tentacles',
          p: 'sx',
          k: [
            [0.1, 1],
            [0.24, 1.2],
            [0.7, 1.05],
            [0.9, 1],
          ],
        },
        {
          g: 'bubbles',
          p: 's',
          k: [
            [0, 0],
            [0.18, 0],
            [0.3, 1],
            [0.7, 0.9],
            [0.86, 0],
          ],
        },
        {
          g: 'bubbles',
          p: 'ty',
          k: [
            [0.18, 6],
            [0.86, -6],
          ],
        },
        {
          p: 'rot',
          k: [
            [0.1, 0],
            [0.24, 5],
            [0.6, 2],
            [0.9, 0],
          ],
        },
      ],
      face: [
        [0.16, 0.6, 'surprised'],
        [0.84, 0.94, 'blink'],
        [0.94, 1, 'happy'],
      ],
    },
  },
  catch: {
    dur: 0.5,
    tracks: [
      {
        g: 'tentacles',
        p: 'rot',
        k: [
          [0, 0],
          [0.25, -18],
          [0.5, 14],
          [0.75, -10],
          [1, 0],
        ],
      },
      {
        p: 'sy',
        k: [
          [0, 1],
          [0.2, 0.92],
          [0.45, 1.06],
          [1, 1],
        ],
      },
    ],
    face: [[0, 1, 'happy']],
  },
  nocturnal: true,
});
