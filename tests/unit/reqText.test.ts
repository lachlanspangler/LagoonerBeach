import { describe as group, expect, it } from 'vitest';
import { SPECIES, SPECIES_BY_ID } from '../../src/meta/creatures.ts';
import type { Req } from '../../src/meta/req.ts';
import { areaRange, describe, hintFor, sentence } from '../../src/meta/reqText.ts';

const hint = (id: string) => hintFor(SPECIES_BY_ID.get(id)!);

group('describe(req): short phrases from the data', () => {
  it('anything goes reads "any pool"', () => {
    expect(describe({})).toEqual(['any pool']);
  });
  it('sizes: digits, inclusive, with the band word', () => {
    expect(describe({ maxArea: 2 })).toEqual(['a small pool of 1–2 cells']);
    expect(describe({ minArea: 3, maxArea: 5 })).toEqual(['a small pool of 3–5 cells']);
    expect(describe({ minArea: 3 })).toEqual(['a pool of 3+ cells']);
    expect(describe({ minArea: 6, maxArea: 11 })).toEqual(['a big pool of 6–11 cells']);
    expect(describe({ minArea: 6 })).toEqual(['a big pool of 6+ cells']);
    expect(describe({ minArea: 12 })).toEqual(['a huge pool of 12+ cells']);
    expect(describe({ minArea: 4, maxArea: 4 })).toEqual(['a small pool of 4 cells']);
  });
  it('shapes', () => {
    expect(describe({ shape: ['dot'] })).toEqual(['a one-cell pool']);
    expect(describe({ shape: ['pair'] })).toEqual(['a two-cell pool']);
    expect(describe({ shape: ['hline'], minW: 5 })).toEqual(['a long, flat pool of 5+ cells']);
    expect(describe({ shape: ['vline'], minH: 4 })).toEqual(['a tall, narrow pool of 4+ cells']);
    expect(describe({ shape: ['hline', 'vline'] })).toEqual(['a straight, narrow pool']);
    expect(describe({ shape: ['square2'] })).toEqual(['a 2×2 square pool']);
    expect(describe({ shape: ['square3'] })).toEqual(['a 3×3 square pool']);
    expect(describe({ shape: ['plus'] })).toEqual(['a plus-shaped pool']);
    expect(describe({ shape: ['corner'] })).toEqual(['an L-shaped pool']);
    expect(describe({ shape: ['rect'], wGtH: true })).toEqual(['a wide rectangular pool']);
    expect(describe({ shape: ['rect'], minArea: 12 })).toEqual(['a huge rectangular pool of 12+ cells']);
    expect(describe({ shape: ['island'] })).toEqual(['a pool around an island']);
    expect(describe({ shape: ['island'], minArea: 12 })).toEqual(['a huge pool of 12+ cells around an island']);
    expect(describe({ shape: ['blob'], minArea: 3, maxArea: 5 })).toEqual(['a small, round-ish pool of 3–5 cells']);
    // a mix no species uses still reads as a pool (never drops the shape)
    expect(describe({ shape: ['plus', 'corner'] })).toEqual(['a plus-shaped or L-shaped pool']);
  });
  it('the moment, then where', () => {
    expect(describe({ pockets: 2, theme: 'night' })).toEqual(['2+ pools closed at once', 'in the Night theme']);
    expect(describe({ wave: 3 })).toEqual(["a cascade's 3rd wave or deeper"]);
    expect(describe({ wave: 2, mode: ['puzzle'] })).toEqual(["a cascade's 2nd wave or deeper", 'in Reef puzzles']);
    expect(describe({ minArea: 6, moves: 60 })).toEqual(['a big pool of 6+ cells', 'from move 60']);
    expect(describe({ shape: ['dot'], streak: 6, theme: 'day' })).toEqual([
      'a one-cell pool',
      'on a ×6+ combo',
      'in the Day theme',
    ]);
    expect(describe({ clean: true, notMode: ['puzzle'] })).toEqual(['clearing the whole board', 'not in Reef puzzles']);
    expect(describe({ mode: ['classic', 'daily'] })).toEqual(['any pool', 'in Endless or the Daily']);
  });
  it('reef clears name their tiers and imply the mode', () => {
    expect(describe({ reefWin: true, tier: ['deep', 'abyss'], mode: ['puzzle'] })).toEqual([
      'clearing a Deep or Abyss reef',
    ]);
    expect(describe({ reefWin: true, tier: ['abyss'], mode: ['puzzle'] })).toEqual(['clearing an Abyss reef']);
    expect(describe({ reefWin: true })).toEqual(['clearing a reef']);
    expect(describe({ tier: ['calm'] })).toEqual(['in a Calm reef']);
  });
  it('sentence(): capitalised, comma-joined, a full stop', () => {
    expect(sentence(['a one-cell pool', 'on a ×6+ combo'])).toBe('A one-cell pool, on a ×6+ combo.');
    expect(sentence([])).toBe('');
  });
  it('areaRange folds the shape into the bounds', () => {
    expect(areaRange({})).toEqual([1, Infinity]);
    expect(areaRange({ shape: ['dot'] })).toEqual([1, 1]);
    expect(areaRange({ shape: ['plus'], minArea: 3 })).toEqual([5, 5]);
    expect(areaRange({ shape: ['island'], minArea: 12 })).toEqual([12, 64]);
  });
});

group('species hints are generated from their rules', () => {
  it('every species has a hint, and different rules never share one', () => {
    const byHint = new Map<string, string>();
    for (const sp of SPECIES) {
      const h = hintFor(sp);
      expect(h, sp.id).toMatch(/^[A-Z0-9].*\.$/);
      const key = JSON.stringify(sp.req);
      if (byHint.has(h)) expect(byHint.get(h), `${sp.id}: "${h}"`).toBe(key);
      byHint.set(h, key);
    }
  });
  it('the drift the research found is fixed by construction', () => {
    // grouper (6–11) and parrot (6+, by day) no longer share "a big pool, six cells or more"
    expect(hint('grouper')).toBe('A big pool of 6–11 cells.');
    expect(hint('parrot')).toBe('A big pool of 6+ cells, in the Day theme.');
    // the day-only species say so
    for (const id of ['minnow', 'periwinkle', 'sanddollar', 'parrot']) expect(hint(id), id).toContain('Day theme');
    // "small" means the same thing everywhere: at most 5 cells
    expect(hint('shrimp')).toBe('A small pool of 1–4 cells.');
    expect(hint('lanternfish')).toBe('A small pool of 1–4 cells, in the Night theme.');
    expect(hint('barracuda')).toBe('A big pool of 6+ cells, from move 60.');
  });
  it('size words agree with the sizes they describe', () => {
    for (const sp of SPECIES) {
      const h = hintFor(sp);
      const [lo, hi] = areaRange(sp.req);
      if (/\bsmall\b/.test(h)) expect(hi, sp.id).toBeLessThanOrEqual(5);
      if (/\bbig\b/.test(h)) expect([lo >= 6, lo < 12], sp.id).toEqual([true, true]);
      if (/\bhuge\b/.test(h)) expect(lo, sp.id).toBeGreaterThanOrEqual(12);
    }
  });
  it('every condition in a rule shows up in its hint', () => {
    for (const sp of SPECIES) {
      const r: Req = sp.req;
      const h = hintFor(sp);
      const need: string[] = [];
      if (r.minArea !== undefined) need.push(`${r.minArea}`);
      if (r.maxArea !== undefined) need.push(`${r.maxArea}`);
      if (r.minW !== undefined) need.push(`${r.minW}+`);
      if (r.minH !== undefined) need.push(`${r.minH}+`);
      if (r.wGtH) need.push('wide');
      if (r.pockets !== undefined) need.push(`${r.pockets}+ pools`);
      if (r.wave !== undefined) need.push('cascade');
      if (r.streak !== undefined) need.push(`×${r.streak}+ combo`);
      if (r.moves !== undefined) need.push(`move ${r.moves}`);
      if (r.theme) need.push(r.theme === 'night' ? 'Night theme' : 'Day theme');
      if (r.mode?.includes('daily')) need.push('Daily');
      if (r.mode?.includes('puzzle') || r.notMode?.includes('puzzle')) need.push('eef');
      if (r.tier) for (const t of r.tier) need.push(t[0]!.toUpperCase() + t.slice(1));
      if (r.reefWin) need.push('clearing');
      if (r.clean) need.push('whole board');
      if (r.notMode) need.push('not ');
      for (const w of need) expect(h.toLowerCase(), `${sp.id}: ${w}`).toContain(w.toLowerCase());
    }
  });
  it('hints describe the pool, never the creature', () => {
    for (const sp of SPECIES) {
      const h = hintFor(sp).toLowerCase();
      for (const w of sp.name.toLowerCase().split(/[\s-]+/))
        if (w.length >= 4) expect(h, `${sp.id}: ${w}`).not.toContain(w);
    }
  });
});
