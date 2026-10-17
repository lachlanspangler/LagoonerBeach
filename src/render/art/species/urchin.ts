/**
 * Sea Urchin — OBJECT class (front-facing, the whole ball is the face), size S.
 * Silhouette: a round ball with 12 long radiating spines, every one with a fat rounded tip (R3:
 * nothing sharp, even here). R10: the spine halo, ~2× life length.
 * Dark identity: the purple is lifted to L 0.58 (the guide's lightening rule; the validator's body
 * floor is 0.55) with a pale lavender face patch so the eyes read on both themes.
 * Personality: prickly, shy, huggable. Signature: the spines ripple in a wave around the ring
 * (three interleaved spine sets swell one after another), then a shy happy face.
 * Groups (back to front): spinesA, spinesB, spinesC (every third spine each), body.
 */
import { capsule, circle, defineArt, ellipse, join, type Track } from '../kit.ts';

const R = 23;
const spine = (a: number) => {
  const r = (a * Math.PI) / 180,
    c = Math.cos(r),
    s = Math.sin(r);
  return capsule(c * (R - 6), s * (R - 6), 3.2, c * 38, s * 38, 2.6);
};
const tip = (a: number) => {
  const r = (a * Math.PI) / 180;
  return circle(Math.cos(r) * 38, Math.sin(r) * 38, 3.6);
};
const ANG = [...Array(12).keys()].map((i) => -75 + i * 30);
const set = (k: number) => ANG.filter((_, i) => i % 3 === k);
const spineGroup = (k: number) => ({
  id: `spines${'ABC'[k]}`,
  pivot: [0, 0] as const,
  parts: [
    { d: join(...set(k).map(spine)), role: 'body' as const },
    { d: join(...set(k).map(tip)), role: 'accent' as const, kind: 'pattern' as const },
  ],
});

/** One spine set swells (1 → 1.14) around u. */
const swell = (g: string, u: number): Track => ({
  g,
  p: 's',
  k: [
    [Math.max(0, u - 0.14), 1],
    [u, 1.14],
    [Math.min(1, u + 0.16), 1],
  ],
});

export default defineArt({
  id: 'urchin',
  klass: 'object',
  size: 'S',
  feature: 'a halo of 12 long spines with round tips',
  personality: ['prickly', 'shy', 'huggable'],
  palette: { body: '#8A68AE', accent: '#C8ACE9', belly: '#B9A0D6' },
  groups: [
    spineGroup(0),
    spineGroup(1),
    spineGroup(2),
    {
      id: 'body',
      parts: [
        { d: circle(0, 0, R), role: 'body' },
        // the pale face patch (belly role): low and wide, so the low-set eyes sit on it
        { d: ellipse(0, 7, 19, 14), role: 'belly', kind: 'pattern' },
        // little spine bases (tubercles) on the crown, hand placed
        {
          d: join(circle(-11, -13, 3.1), circle(0, -17.5, 3.2), circle(11, -13, 3.1)),
          role: 'accent',
          kind: 'pattern',
          alpha: 0.8,
        },
      ],
    },
  ],
  shine: ellipse(-9, -13, 7, 3.6, -30),
  face: {
    eyes: [
      [-8.5, 4],
      [8.5, 4],
    ],
    eye: 10,
    zone: [-23, -23, 46, 46],
    mouth: { at: [0, 11.5], w: 5, shape: 'smile' },
    front: true,
    sweet: true,
  },
  idle: {
    ambient: [
      { m: 'breathe', amp: 0.015, period: 3.6 },
      { m: 'sway', g: ['spinesA', 'spinesB', 'spinesC'], amp: 3, period: 2.4, lag: 0.25 },
    ],
    signature: {
      dur: 1.3,
      tracks: [
        swell('spinesA', 0.16),
        swell('spinesB', 0.3),
        swell('spinesC', 0.44),
        swell('spinesA', 0.58),
        swell('spinesB', 0.72),
        swell('spinesC', 0.84),
        {
          p: 's',
          k: [
            [0, 1],
            [0.1, 0.96],
            [0.3, 1.03],
            [0.86, 1],
            [0.94, 0.97],
            [1, 1],
          ],
        },
      ],
      face: [
        [0.1, 0.6, 'surprised'],
        [0.7, 1, 'shy'],
      ],
    },
  },
  catch: {
    dur: 0.5,
    tracks: [
      {
        g: 'spinesA',
        p: 's',
        k: [
          [0, 1],
          [0.3, 1.14],
          [1, 1],
        ],
      },
      {
        g: 'spinesB',
        p: 's',
        k: [
          [0, 1],
          [0.45, 1.14],
          [1, 1],
        ],
      },
      {
        g: 'spinesC',
        p: 's',
        k: [
          [0, 1],
          [0.6, 1.14],
          [1, 1],
        ],
      },
      {
        p: 'sy',
        k: [
          [0, 1],
          [0.2, 0.88],
          [0.45, 1.1],
          [1, 1],
        ],
      },
    ],
    face: [[0, 1, 'happy']],
  },
});
