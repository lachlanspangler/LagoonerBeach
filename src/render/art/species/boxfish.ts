/**
 * Yellow Boxfish — FISH class (profile), size M.
 * Silhouette: a near-cube rounded square (R4: rounded square = sturdy) with tiny fins and a small
 * fan tail on a short stalk (R10: the box, exaggerated square). Pout lips at the snout.
 * Personality: earnest, chunky, polite. Signature: its tiny fins whir furiously while the big
 * box body barely moves, then a satisfied little nod.
 * Groups (back to front): tail, dorsal, anal fin, body. No pectoral: beside the low eye it read as a beak.
 */
import { blob, capsule, defineArt, ellipse, join, rrect, type Track } from '../kit.ts';

const box = rrect(-22, -30, 54, 58, 10);
const tail = join(
  capsule(-20, 0, 4.6, -34, 0, 3.4),
  blob([
    [-33, -2],
    [-39, -14],
    [-45, -14],
    [-47, 0],
    [-45, 14],
    [-39, 14],
    [-33, 2],
  ]),
);
const dorsal = blob([
  [-2, -28],
  [-6, -38],
  [-12, -39],
  [-14, -29],
]);
const anal = blob([
  [-2, 26],
  [-6, 36],
  [-12, 37],
  [-14, 27],
]);
// four hand-placed polka dots in the body's own dark gold (R18), all behind the face zone
const dots = join(
  ellipse(-14, -14, 4.4, 4.4),
  ellipse(-5, -22, 3.6, 3.6),
  ellipse(-17, 6, 4, 4),
  ellipse(-7, 19, 3.8, 3.8),
);

/** A fast ±deg whir between u0 and u1 (the signature's furious little fins). */
const whir = (g: string, deg: number, u0: number, u1: number, n = 10): Track => {
  const k: [number, number][] = [[u0, 0]];
  for (let i = 1; i < n; i++) k.push([u0 + ((u1 - u0) * i) / n, i % 2 ? deg : -deg]);
  k.push([u1, 0]);
  return { g, p: 'rot', k };
};

export default defineArt({
  id: 'boxfish',
  klass: 'fish',
  size: 'M',
  feature: 'a near-cube rounded-square body with tiny fins',
  personality: ['earnest', 'chunky', 'polite'],
  palette: { body: '#F2D43B', accent: '#B08A1E', belly: '#FBEFA6' },
  groups: [
    { id: 'tail', pivot: [-23, 0], parts: [{ d: tail, role: 'body' }] },
    { id: 'dorsal', pivot: [-8, -28], parts: [{ d: dorsal, role: 'body' }] },
    { id: 'anal', pivot: [-8, 26], parts: [{ d: anal, role: 'body' }] },
    {
      id: 'body',
      parts: [
        { d: box, role: 'body' },
        { d: rrect(-24, 13, 56, 16, 6), role: 'belly', kind: 'pattern' },
        { d: dots, role: 'accent', kind: 'pattern' },
      ],
    },
  ],
  shine: ellipse(14, -19, 10, 4, -12),
  face: {
    eyes: [[9, 4]],
    eye: 12.3,
    zone: [-4, -29, 36, 56],
    mouth: { at: [16, 11.5], w: 7, shape: 'pout' },
    sweet: true,
  },
  idle: {
    ambient: [
      { m: 'bob', amp: 2, period: 2.4 },
      { m: 'wag', g: 'tail', amp: 8, period: 0.8 },
      { m: 'flutter', g: 'anal', amp: 10, period: 0.45 },
      { m: 'flutter', g: 'dorsal', amp: 10, period: 0.45, phase: 0.5 },
    ],
    signature: {
      dur: 1.3,
      tracks: [
        whir('anal', 26, 0.08, 0.72, 12),
        whir('dorsal', 24, 0.08, 0.72, 12),
        whir('tail', 16, 0.08, 0.72, 8),
        {
          p: 'tx',
          k: [
            [0, 0],
            [0.12, -1],
            [0.72, 3],
            [1, 0],
          ],
        },
        {
          p: 'rot',
          k: [
            [0.72, 0],
            [0.82, 6],
            [0.92, -2],
            [1, 0],
          ],
        },
      ],
      face: [
        [0.1, 0.72, 'surprised'],
        [0.74, 1, 'happy'],
      ],
    },
  },
  catch: {
    dur: 0.5,
    tracks: [
      whir('anal', 26, 0, 1, 8),
      whir('dorsal', 24, 0, 1, 8),
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
