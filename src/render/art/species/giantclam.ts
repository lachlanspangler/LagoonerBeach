/**
 * Giant Clam — OBJECT class (front view), size L, epic.
 * Silhouette: a huge wide shell with a fluted, scalloped rim, its two valves parted like lips around
 * a teal mantle (R10: the scalloped rim and the open lips, exaggerated). Notches where the valves
 * meet at the sides keep it from reading as a coin.
 * Personality: wise, sleepy, ancient. Eyes peek from the mantle in the shell gap (R6).
 * Signature: the lid slowly lifts to reveal a pearl, then closes with a satisfied, smug smile.
 * Groups (back to front): mantle (the face rides on it), base valve, lid valve, pearl (prop).
 */
import { blob, circle, defineArt, ellipse, join } from '../kit.ts';

// top valve: a dome with a waved lower lip, crowned by five fluted lobes
const lid = join(
  blob([
    [-41, -10],
    [-38, -24],
    [-26, -30],
    [0, -32],
    [26, -30],
    [38, -24],
    [41, -10],
    [33, -15],
    [16, -20],
    [0, -22],
    [-16, -20],
    [-33, -15],
  ]),
  // the fluted rim: five round lobes (R3: scallops, never points)
  circle(-30, -27, 7),
  circle(-15, -32, 8),
  circle(0, -34, 8.5),
  circle(15, -32, 8),
  circle(30, -27, 7),
);
// bottom valve: a deep bowl, flat-ish base, the lower lip waved to match
const base = blob(
  [
    [-41, 10],
    [-33, 15],
    [-16, 17],
    [0, 18],
    [16, 17],
    [33, 15],
    [41, 10],
    [40, 22],
    [30, 31],
    [14, 35],
    [0, 36],
    [-14, 35],
    [-30, 31],
    [-40, 22],
  ],
  0.9,
);
// the mantle fills the gap, bulging a little past the lips
const mantle = ellipse(0, -1, 27, 21);
// fluted ridges: four radial lines per valve (R18: ribs as 3–5 ridges)
const lidRibs = 'M-25 -16L-25 -28M-8 -20L-8 -33M8 -20L8 -33M25 -16L25 -28';
const baseRibs = 'M-24 15L-25 30M-8 18L-7 34M8 18L7 34M24 15L25 30';
// blue mantle spots, hand placed clear of the face
const spots = join(
  circle(-24, -2, 3.4),
  circle(24, -2, 3.4),
  circle(-17, 10, 2.8),
  circle(17, 10, 2.8),
  circle(-14, -12, 2.6),
  circle(14, -12, 2.6),
);

export default defineArt({
  id: 'giantclam',
  klass: 'object',
  size: 'L',
  feature: 'a huge scalloped shell parted like lips around a teal mantle',
  personality: ['wise', 'sleepy', 'ancient'],
  palette: { body: '#3BC9A0', accent: '#2E6FD8', belly: '#F2E6C8' },
  groups: [
    {
      id: 'mantle',
      parts: [
        { d: mantle, role: 'body' },
        { d: spots, role: 'accent', kind: 'pattern' },
      ],
    },
    {
      id: 'body',
      pivot: [0, 20],
      parts: [
        { d: base, role: 'belly' },
        { d: baseRibs, role: 'ink', kind: 'line', w: 1.6, alpha: 0.4 },
        { d: ellipse(0, 36, 40, 7), role: 'ink', kind: 'pattern', alpha: 0.1 },
      ],
    },
    {
      id: 'lid',
      pivot: [0, -8],
      parts: [
        { d: lid, role: 'belly' },
        { d: lidRibs, role: 'ink', kind: 'line', w: 1.6, alpha: 0.4 },
      ],
    },
    {
      id: 'pearl',
      pivot: [21, 4],
      prop: true,
      parts: [
        { d: circle(21, 4, 5.4), role: 'white' },
        { d: circle(19.4, 2.4, 1.6), role: 'accent', kind: 'pattern', alpha: 0.25 },
      ],
    },
  ],
  shineOn: 'lid',
  shine: ellipse(-16, -28, 10, 3.6, -14),
  face: {
    g: 'mantle',
    eyes: [
      [-7.5, 2],
      [7.5, 2],
    ],
    eye: 8.6,
    zone: [-28, -19, 56, 36],
    mouth: { at: [0, 10], w: 6, shape: 'smile' },
    front: true,
    sweet: true,
  },
  idle: {
    ambient: [
      { m: 'breathe', amp: 0.015, period: 3.6 },
      { m: 'bob', g: 'lid', amp: 1.2, period: 3.6 },
    ],
    signature: {
      dur: 1.5,
      every: [6, 8],
      tracks: [
        {
          g: 'lid',
          p: 'ty',
          k: [
            [0, 0],
            [0.1, 1.5],
            [0.36, -11],
            [0.66, -11],
            [0.86, 1],
            [0.94, 0],
          ],
        },
        {
          g: 'lid',
          p: 'rot',
          k: [
            [0.1, 0],
            [0.36, -4],
            [0.66, -4],
            [0.86, 0],
          ],
        },
        {
          g: 'pearl',
          p: 's',
          k: [
            [0, 0],
            [0.3, 0],
            [0.42, 1.12],
            [0.5, 1],
            [0.66, 1],
            [0.8, 0],
          ],
        },
        {
          p: 'sy',
          k: [
            [0.84, 1],
            [0.9, 0.97],
            [1, 1],
          ],
        },
      ],
      face: [
        [0.36, 0.7, 'happy'],
        [0.86, 1, 'proud'],
      ],
    },
  },
  catch: {
    dur: 0.5,
    tracks: [
      {
        g: 'lid',
        p: 'ty',
        k: [
          [0, 0],
          [0.3, -8],
          [0.6, -8],
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
