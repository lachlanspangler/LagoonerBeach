import { describe as group, expect, it } from 'vitest';
import { SPECIES, SPECIES_BY_ID } from '../../src/meta/creatures.ts';
import { areaRange, describe, hintFor, sentence } from '../../src/meta/reqText.ts';

const hint = (id: string) => hintFor(SPECIES_BY_ID.get(id)!);

group('describe(req): just the pool size and the combo', () => {
  it('anything goes reads "any pool"', () => {
    expect(describe({})).toEqual(['any pool']);
  });
  it('sizes: digits, inclusive', () => {
    expect(describe({ maxArea: 1 })).toEqual(['1 cell']);
    expect(describe({ maxArea: 2 })).toEqual(['1–2 cells']);
    expect(describe({ minArea: 4, maxArea: 4 })).toEqual(['4 cells']);
    expect(describe({ minArea: 3, maxArea: 5 })).toEqual(['3–5 cells']);
    expect(describe({ minArea: 12 })).toEqual(['12+ cells']);
  });
  it('combo, and the gates', () => {
    expect(describe({ minArea: 12, streak: 5 })).toEqual(['12+ cells', '×5 combo']);
    expect(describe({ streak: 12 })).toEqual(['×12 combo']);
    expect(describe({ minArea: 3, theme: 'night' })).toEqual(['3+ cells', 'at night']);
    expect(describe({ mode: ['puzzle'] })).toEqual(['any pool', 'in Reefs']);
  });
  it('sentence(): capitalised, comma-joined', () => {
    expect(sentence(['3–5 cells', '×6 combo'])).toBe('3–5 cells, ×6 combo');
    expect(sentence(['any pool'])).toBe('Any pool');
    expect(sentence([])).toBe('');
  });
  it('areaRange is the inclusive bounds', () => {
    expect(areaRange({})).toEqual([1, Infinity]);
    expect(areaRange({ minArea: 3, maxArea: 5 })).toEqual([3, 5]);
  });
});

group('species hints are generated from their rules', () => {
  it('every species has a hint, and within a habitat different rules never share one', () => {
    const byHint = new Map<string, string>();
    for (const sp of SPECIES) {
      const h = `${sp.habitat}: ${hintFor(sp)}`;
      expect(hintFor(sp), sp.id).toMatch(/^[A-Z0-9×]/);
      const key = JSON.stringify(sp.req);
      if (byHint.has(h)) expect(byHint.get(h), `${sp.id}: "${h}"`).toBe(key);
      byHint.set(h, key);
    }
  });
  it('short: only cells and combo (the habitat header says Night / Reefs)', () => {
    expect(hint('grouper')).toBe('9–11 cells');
    expect(hint('seahorse')).toBe('3–5 cells, ×20 combo');
    expect(hint('lanternfish')).toBe('1–4 cells');
    expect(hint('butterfly')).toBe('Any pool');
    expect(hint('kraken')).toBe('12+ cells, ×5 combo, at night'); // a legend: Night isn't its habitat
    expect(hint('seadragon')).toBe('×30 combo');
    for (const sp of SPECIES) expect(hintFor(sp), sp.id).not.toMatch(/wave|cascade|island|shape|move|reef/i);
  });
  it('every number in a rule shows up in its hint', () => {
    for (const sp of SPECIES) {
      const h = hintFor(sp);
      if (sp.req.minArea !== undefined) expect(h, sp.id).toContain(`${sp.req.minArea}`);
      if (sp.req.maxArea !== undefined) expect(h, sp.id).toContain(`${sp.req.maxArea}`);
      if (sp.req.streak !== undefined) expect(h, sp.id).toContain(`×${sp.req.streak} combo`);
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
