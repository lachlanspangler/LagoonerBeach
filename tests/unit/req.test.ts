import { describe, expect, it } from 'vitest';
import { SPECIES, type CatchContext } from '../../src/meta/creatures.ts';
import { matches, type Req } from '../../src/meta/req.ts';
import { forEachContext } from './ctxSpace.ts';
import { LEGACY_WHEN } from './fixtures/legacyWhen.ts';

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

describe('matches(req, ctx)', () => {
  it('an empty requirement matches everything', () => {
    expect(matches({}, base)).toBe(true);
    expect(matches({}, at({ area: 40, shape: 'blob', night: true, mode: 'puzzle' }))).toBe(true);
  });
  it('area bounds are inclusive', () => {
    const r: Req = { minArea: 3, maxArea: 5 };
    expect([2, 3, 4, 5, 6].map((area) => matches(r, at({ area })))).toEqual([false, true, true, true, false]);
  });
  it('shape is one of a list', () => {
    const r: Req = { shape: ['hline', 'vline'] };
    expect(matches(r, at({ shape: 'hline' }))).toBe(true);
    expect(matches(r, at({ shape: 'vline' }))).toBe(true);
    expect(matches(r, at({ shape: 'rect' }))).toBe(false);
  });
  it('width, height and wider-than-tall', () => {
    expect(matches({ minW: 5 }, at({ w: 4 }))).toBe(false);
    expect(matches({ minW: 5 }, at({ w: 5 }))).toBe(true);
    expect(matches({ minH: 4 }, at({ h: 3 }))).toBe(false);
    expect(matches({ minH: 4 }, at({ h: 4 }))).toBe(true);
    expect(matches({ wGtH: true }, at({ w: 3, h: 3 }))).toBe(false);
    expect(matches({ wGtH: true }, at({ w: 3, h: 2 }))).toBe(true);
  });
  it('lower bounds: pockets, wave, combo, moves', () => {
    for (const [k, v] of [
      ['pockets', 2],
      ['wave', 3],
      ['streak', 6],
      ['moves', 60],
    ] as const) {
      expect(matches({ [k]: v }, at({ [k]: v - 1 })), `${k} below`).toBe(false);
      expect(matches({ [k]: v }, at({ [k]: v })), `${k} at`).toBe(true);
    }
  });
  it('theme reads the night flag both ways', () => {
    expect(matches({ theme: 'night' }, at({ night: true }))).toBe(true);
    expect(matches({ theme: 'night' }, at({ night: false }))).toBe(false);
    expect(matches({ theme: 'day' }, at({ night: false }))).toBe(true);
    expect(matches({ theme: 'day' }, at({ night: true }))).toBe(false);
  });
  it('mode allow and deny lists', () => {
    expect(matches({ mode: ['daily'] }, at({ mode: 'daily' }))).toBe(true);
    expect(matches({ mode: ['daily'] }, at({ mode: 'classic' }))).toBe(false);
    expect(matches({ notMode: ['puzzle'] }, at({ mode: 'puzzle' }))).toBe(false);
    expect(matches({ notMode: ['puzzle'] }, at({ mode: 'daily' }))).toBe(true);
  });
  it('reef tier, reef win and clean board', () => {
    expect(matches({ tier: ['abyss'] }, at({ tier: undefined }))).toBe(false);
    expect(matches({ tier: ['deep', 'abyss'] }, at({ tier: 'deep' }))).toBe(true);
    expect(matches({ tier: ['deep', 'abyss'] }, at({ tier: 'calm' }))).toBe(false);
    expect(matches({ reefWin: true }, at({}))).toBe(false);
    expect(matches({ reefWin: true }, at({ reefWin: true }))).toBe(true);
    expect(matches({ clean: true }, at({ clean: false }))).toBe(false);
    expect(matches({ clean: true }, at({ clean: true }))).toBe(true);
  });
  it('every condition must hold', () => {
    const kraken: Req = { minArea: 12, streak: 5, theme: 'night' };
    expect(matches(kraken, at({ area: 12, streak: 5, night: true }))).toBe(true);
    expect(matches(kraken, at({ area: 12, streak: 5, night: false }))).toBe(false);
    expect(matches(kraken, at({ area: 12, streak: 4, night: true }))).toBe(false);
    expect(matches(kraken, at({ area: 11, streak: 5, night: true }))).toBe(false);
  });
});

describe('species requirements (data) say exactly what the old code said', () => {
  it('all 47 species are pinned', () => {
    expect(Object.keys(LEGACY_WHEN).sort()).toEqual(SPECIES.map((s) => s.id).sort());
  });
  it('req and the frozen lambdas agree on every context in the space', () => {
    const bad = new Map<string, CatchContext>();
    const pairs = SPECIES.map((sp) => [sp, LEGACY_WHEN[sp.id]!] as const);
    let n = 0;
    forEachContext((c) => {
      n++;
      for (const [sp, old] of pairs) if (matches(sp.req, c) !== old(c) && !bad.has(sp.id)) bad.set(sp.id, c);
    });
    expect(n).toBeGreaterThan(150_000);
    expect([...bad.entries()]).toEqual([]);
  });
});
