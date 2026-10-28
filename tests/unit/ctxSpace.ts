/**
 * The enumerated catch-context space the requirement tests sweep (req.test.ts, journalReq.test.ts).
 * Two products, so it stays exhaustive at every threshold the species use and still runs in well
 * under a second:
 *  - pools: every shape × area 1..20 × width × height 1..6, under a handful of conditions;
 *  - conditions: wave × pockets × COMBO × moves × theme × mode × reef tier × reef win × clean, each at
 *    and just below every threshold in creatures.ts, under a set of representative pools.
 * Shapes and sizes are not forced to agree (an "hline" of area 9 in a 2×5 box is in here): the rules
 * must agree on contexts the game never makes too.
 */
import { SPECIES, type CatchContext, type Shape } from '../../src/meta/creatures.ts';

/** COMBO values to sweep: 0, and at and just below every threshold a species uses. */
const STREAKS = [
  ...new Set([0, ...SPECIES.flatMap((s) => (s.req.streak === undefined ? [] : [s.req.streak - 1, s.req.streak]))]),
].sort((a, b) => a - b);

export const SHAPES: readonly Shape[] = [
  'dot',
  'pair',
  'hline',
  'vline',
  'square2',
  'square3',
  'plus',
  'rect',
  'corner',
  'island',
  'blob',
];
const MODES = ['classic', 'daily', 'puzzle'] as const;

const QUIET: Omit<CatchContext, 'area' | 'shape' | 'w' | 'h'> = {
  wave: 1,
  pockets: 1,
  streak: 0,
  moves: 10,
  clean: false,
  night: false,
  mode: 'classic',
};

/** Conditions the pool sweep runs under (each theme × mode, plus a loud one). */
const POOL_CONDITIONS: readonly Omit<CatchContext, 'area' | 'shape' | 'w' | 'h'>[] = [
  ...[false, true].flatMap((night) => MODES.map((mode) => ({ ...QUIET, night, mode }))),
  {
    wave: 3,
    pockets: 3,
    streak: Math.max(...STREAKS),
    moves: 90,
    clean: true,
    night: true,
    mode: 'puzzle',
    tier: 'abyss',
    reefWin: true,
  },
  { wave: 2, pockets: 2, streak: 8, moves: 60, clean: true, night: false, mode: 'daily' },
];

/** Representative pools for the condition sweep: [shape, area, w, h]. */
const POOLS: readonly [Shape, number, number, number][] = [
  ['dot', 1, 1, 1],
  ['pair', 2, 2, 1],
  ['blob', 3, 2, 2],
  ['vline', 4, 1, 4],
  ['rect', 6, 3, 2],
  ['blob', 12, 4, 4],
  ['island', 14, 5, 4],
];

/** Reef tier × reef win: none, a win at each tier that matters, and an Abyss capture that doesn't win. */
const REEF: readonly [string | undefined, boolean][] = [
  [undefined, false],
  ['calm', true],
  ['tricky', true],
  ['deep', true],
  ['abyss', true],
  ['abyss', false],
];

/** One object shape for every context (keeps the sweep monomorphic, so it stays fast). */
function ctx(
  shape: Shape,
  area: number,
  w: number,
  h: number,
  wave: number,
  pockets: number,
  streak: number,
  moves: number,
  night: boolean,
  mode: CatchContext['mode'],
  tier: string | undefined,
  reefWin: boolean,
  clean: boolean,
): CatchContext {
  return { area, shape, w, h, wave, pockets, streak, moves, clean, night, mode, tier, reefWin };
}

/** Calls `fn` for every context in the space (about 0.2 M of them). */
export function forEachContext(fn: (c: CatchContext) => void): void {
  for (const cond of POOL_CONDITIONS)
    for (const shape of SHAPES)
      for (let area = 1; area <= 20; area++)
        for (let w = 1; w <= 6; w++)
          for (let h = 1; h <= 6; h++)
            fn(
              ctx(
                shape,
                area,
                w,
                h,
                cond.wave,
                cond.pockets,
                cond.streak,
                cond.moves,
                cond.night,
                cond.mode,
                cond.tier,
                !!cond.reefWin,
                cond.clean,
              ),
            );
  for (const [shape, area, w, h] of POOLS)
    for (let wave = 1; wave <= 3; wave++)
      for (let pockets = 1; pockets <= 3; pockets++)
        for (const streak of STREAKS)
          for (const moves of [59, 60, 89, 90])
            for (const night of [false, true])
              for (const mode of MODES)
                for (const [tier, reefWin] of REEF)
                  for (const clean of [false, true])
                    fn(ctx(shape, area, w, h, wave, pockets, streak, moves, night, mode, tier, reefWin, clean));
}
