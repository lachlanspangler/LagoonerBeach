import { describe, expect, it } from 'vitest';
import { SPECIES, type CatchContext } from '../../src/meta/creatures.ts';
import { matches, type Req } from '../../src/meta/req.ts';
import { forEachContext } from './ctxSpace.ts';

const base: CatchContext = {
  area: 1,
  shape: 'dot',
  w: 1,
  h: 1,
  wave: 1,
  pockets: 1,
  streak: 0,
  moves: 10,
  clean: false,
  night: false,
  mode: 'classic',
};
const at = (o: Partial<CatchContext>): CatchContext => ({ ...base, ...o });

describe('matches(req, ctx): pool size and combo, plus the Night / Reef gates', () => {
  it('an empty requirement matches everything', () => {
    expect(matches({}, base)).toBe(true);
    expect(matches({}, at({ area: 40, shape: 'blob', night: true, mode: 'puzzle' }))).toBe(true);
  });
  it('area bounds are inclusive', () => {
    const r: Req = { minArea: 3, maxArea: 5 };
    expect([2, 3, 4, 5, 6].map((area) => matches(r, at({ area })))).toEqual([false, true, true, true, false]);
  });
  it('combo is a lower bound', () => {
    expect([3, 4, 9].map((streak) => matches({ streak: 4 }, at({ streak })))).toEqual([false, true, true]);
  });
  it('shape, waves, islands, moves and clears play no part any more', () => {
    const r: Req = { minArea: 6, maxArea: 11 };
    for (const shape of ['hline', 'island', 'rect', 'blob'] as const)
      expect(matches(r, at({ area: 8, shape, wave: 3, pockets: 3, moves: 0, clean: true }))).toBe(true);
  });
  it('theme reads the night flag both ways; mode is an allow list', () => {
    expect(matches({ theme: 'night' }, at({ night: true }))).toBe(true);
    expect(matches({ theme: 'night' }, at({ night: false }))).toBe(false);
    expect(matches({ mode: ['puzzle'] }, at({ mode: 'puzzle' }))).toBe(true);
    expect(matches({ mode: ['puzzle'] }, at({ mode: 'daily' }))).toBe(false);
  });
  it('every condition must hold', () => {
    const shark = SPECIES.find((s) => s.id === 'whaleshark')!.req; // 8+ cells on a ×20 combo
    expect(matches(shark, at({ area: 8, streak: 20 }))).toBe(true);
    expect(matches(shark, at({ area: 7, streak: 20 }))).toBe(false);
    expect(matches(shark, at({ area: 8, streak: 19 }))).toBe(false);
    const kraken = SPECIES.find((s) => s.id === 'kraken')!.req; // ×20 at night
    expect(matches(kraken, at({ streak: 20, night: true }))).toBe(true);
    expect(matches(kraken, at({ streak: 20, night: false }))).toBe(false);
  });
  it('when() is derived from req (the catch roll and the journal read the same data)', () => {
    let k = 0;
    forEachContext((c) => {
      if (k++ % 37) return;
      for (const sp of SPECIES) if (sp.when(c) !== matches(sp.req, c)) throw new Error(`${sp.id} ${JSON.stringify(c)}`);
    });
  });
});
