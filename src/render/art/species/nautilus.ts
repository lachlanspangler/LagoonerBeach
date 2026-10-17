/**
 * Nautilus — SNAIL class (profile, side-on, facing right), size M, deep and nocturnal.
 * Silhouette: a big round coiled shell, the opening on the right with a leathery hood over a small
 * head, one big eye in the opening, and a fan of slim tentacles reaching forward (R10: the coil and
 * the tentacle fan). Tiger stripes `#C2603A` on a cream shell, hood `#C98A5E` with pale spots.
 * Personality: ancient, polite, unhurried. Signature: jets backward with a bubble trail, tentacles
 * streaming, then drifts back and settles with a polite blink.
 * Groups (back to front): tentacles, shell, body (head and hood; the face rides on it), bubbles (prop).
 */
import { blob, capsule, circle, defineArt, ellipse, join, tube, xform } from '../kit.ts';

const R = 26,
  SX = -16,
  SY = 0;
const HX = 12,
  HY = 2;

const shell = circle(SX, SY, R);
// tiger stripes on the back two-thirds of the coil, fading before the opening (R18 `bands`, ≥ 4 units)
const band = (a: number, len: number) => {
  const t = (a * Math.PI) / 180;
  const c = Math.cos(t),
    s = Math.sin(t);
  return tube([
    [SX + c * (R + 2), SY + s * (R + 2), 3.2],
    [SX + c * (R - len * 0.5), SY + s * (R - len * 0.5), 3.6],
    [SX + c * (R - len), SY + s * (R - len), 2.2],
  ]);
};
const stripes = join(band(-120, 16), band(-90, 18), band(-60, 15), band(-150, 16), band(180, 14), band(150, 12));
// the coil: a whorl line winding in to a small navel
const whorl = `M${SX + R * 0.62} ${SY - R * 0.5}C${SX + R * 0.1} ${SY - R * 0.9} ${SX - R * 0.75} ${SY - R * 0.6} ${
  SX - R * 0.7
} ${SY + R * 0.05}C${SX - R * 0.62} ${SY + R * 0.6} ${SX + R * 0.05} ${SY + R * 0.62} ${SX + R * 0.25} ${SY + R * 0.2}C${
  SX + R * 0.38
} ${SY - R * 0.08} ${SX + R * 0.1} ${SY - R * 0.3} ${SX - R * 0.05} ${SY - R * 0.15}`;
// the head in the shell opening, and the hood over it
const head = blob([
  [HX - 8, HY - 2],
  [HX + 4, HY - 4],
  [HX + 12, HY - 1],
  [HX + 13, HY + 6],
  [HX + 6, HY + 12],
  [HX - 4, HY + 12],
  [HX - 9, HY + 6],
]);
const hood = blob([
  [HX - 15, HY - 2],
  [HX - 10, HY - 15],
  [HX + 2, HY - 20],
  [HX + 13, HY - 16],
  [HX + 17, HY - 6],
  [HX + 14, HY + 2],
  [HX + 2, HY + 1],
  [HX - 8, HY + 3],
]);
const hoodSpots = join(circle(HX - 7, HY - 9, 3.3), circle(HX + 3, HY - 14, 3.4), circle(HX + 11, HY - 9, 3.2));
const tentacles = join(
  capsule(18, 6, 2.6, 23.7, -15.3, 2.5),
  capsule(18, 6, 2.6, 30.6, -12.0, 2.5),
  capsule(18, 6, 2.6, 36.0, -6.6, 2.5),
  capsule(18, 6, 2.6, 39.3, 0.3, 2.5),
  capsule(18, 6, 2.6, 39.9, 7.9, 2.5),
  capsule(18, 6, 2.6, 37.9, 15.3, 2.5),
  capsule(18, 6, 2.6, 33.6, 21.6, 2.5),
  capsule(18, 6, 2.6, 27.3, 25.9, 2.5),
);
// the whole animal rises nose-up by 12° (unhurried, drifting up); it also keeps the silhouette clear
// of the cuttlefish (oval + arm tuft) and the hermit crab (shell + crab low at the front), R12
const T = (d: string) => xform(d, { rot: -12, sx: 0.97, sy: 0.97 });
const bubbles = join(circle(HX + 4, HY - 24, 3.4), circle(HX + 10, HY - 32, 2.4), circle(HX + 3, HY - 38, 1.8));

export default defineArt({
  id: 'nautilus',
  klass: 'snail',
  size: 'M',
  feature: 'a striped round coil with a hooded head and a fan of slim tentacles',
  personality: ['ancient', 'polite', 'unhurried'],
  palette: { body: '#E9D0A9', accent: '#C2603A', belly: '#C98A5E' },
  nocturnal: true,
  groups: [
    { id: 'tentacles', pivot: [HX + 6, HY + 4], parts: [{ d: T(tentacles), role: 'belly' }] },
    {
      id: 'shell',
      pivot: [SX, SY],
      parts: [
        { d: T(shell), role: 'body' },
        { d: T(stripes), role: 'accent', kind: 'pattern' },
        { d: T(whorl), role: 'ink', kind: 'line', w: 3, alpha: 0.4 },
      ],
    },
    {
      id: 'body',
      pivot: [HX, HY],
      parts: [
        { d: T(head), role: 'accent' },
        { d: T(hood), role: 'belly' },
        { d: T(hoodSpots), role: 'white', kind: 'pattern', alpha: 0.55 },
      ],
    },
    { id: 'bubbles', pivot: [HX + 6, HY - 30], prop: true, parts: [{ d: bubbles, role: 'white' }] },
  ],
  shineOn: 'shell',
  shine: ellipse(SX - R * 0.4, SY - R * 0.62, 10, 4.4, -30),
  face: {
    eyes: [[HX + 4, HY - 3]],
    eye: 10.5,
    zone: [HX - 12, HY - 21, 32, 32],
    mouth: { at: [HX + 10, HY + 4], w: 4.5, shape: 'smile' },
    sweet: true,
  },
  deviations: {
    R7: 'the one big eye sits in the shell opening under the hood, so it measures further back than a fish eye',
    R16S: 'cream shell after the critique’s #F4E7D2, deepened to clear the L 0.90 ceiling and the mint tile; chroma 0.06, the stripes carry it',
  },
  idle: {
    ambient: [
      { m: 'bob', amp: 2, period: 2.8 },
      { m: 'sway', g: 'tentacles', amp: 7, period: 1.4 },
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
});
