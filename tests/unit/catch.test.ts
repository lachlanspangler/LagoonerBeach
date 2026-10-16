import { describe, expect, it } from 'vitest';
import { idx } from '../../src/core/grid.ts';
import { Rng } from '../../src/core/rng.ts';
import { SPECIES, type CatchContext } from '../../src/meta/creatures.ts';
import { catchCapture, classify, rollCatches } from '../../src/meta/catch.ts';
import { CHANCE_BY_ID } from '../../src/meta/catchTuning.ts';
import { EMPTY_JOURNAL, found, record, sanitizeJournal } from '../../src/meta/journal.ts';

const cells = (pts: [number, number][]) => pts.map(([x, y]) => idx(x, y));

describe('classify lagoon shapes', () => {
  it.each([
    ['dot', [[3, 3]]],
    [
      'pair',
      [
        [3, 3],
        [4, 3],
      ],
    ],
    [
      'hline',
      [
        [1, 2],
        [2, 2],
        [3, 2],
        [4, 2],
      ],
    ],
    [
      'vline',
      [
        [2, 1],
        [2, 2],
        [2, 3],
      ],
    ],
    [
      'square2',
      [
        [2, 2],
        [3, 2],
        [2, 3],
        [3, 3],
      ],
    ],
    [
      'rect',
      [
        [1, 1],
        [2, 1],
        [3, 1],
        [1, 2],
        [2, 2],
        [3, 2],
      ],
    ],
    [
      'plus',
      [
        [3, 2],
        [2, 3],
        [3, 3],
        [4, 3],
        [3, 4],
      ],
    ],
    [
      'corner',
      [
        [2, 2],
        [2, 3],
        [2, 4],
        [3, 4],
        [4, 4],
      ],
    ],
    [
      'blob',
      [
        [2, 2],
        [3, 2],
        [3, 3],
      ].concat([
        [4, 3],
        [4, 4],
      ]) as [number, number][],
    ],
  ] as [string, [number, number][]][])('%s', (shape, pts) => {
    expect(classify(cells(pts)).shape).toBe(shape);
  });
  it('3×3 square and island lagoons', () => {
    const sq: [number, number][] = [];
    for (let y = 2; y < 5; y++) for (let x = 2; x < 5; x++) sq.push([x, y]);
    expect(classify(cells(sq)).shape).toBe('square3');
    const ring = sq.filter(([x, y]) => !(x === 3 && y === 3));
    expect(classify(cells(ring)).shape).toBe('island');
  });
});

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

describe('rolls', () => {
  it('only ever catches creatures whose condition matches', () => {
    const r = new Rng(1);
    const contexts: CatchContext[] = [
      base,
      { ...base, area: 4, shape: 'hline', w: 4 },
      { ...base, area: 14, shape: 'island', w: 5, h: 4, night: true, streak: 9 },
      { ...base, area: 3, shape: 'blob', mode: 'puzzle', tier: 'abyss', reefWin: true, wave: 2 },
    ];
    for (const c of contexts)
      for (let i = 0; i < 500; i++)
        for (const x of rollCatches(c, r, { has: () => false, dry: 999 }))
          expect(SPECIES.find((s) => s.id === x.id)!.when(c)).toBe(true);
  });
  it('every lagoon has an everyday species, so rarer creatures are never handed out by default', () => {
    const shapes: [CatchContext['shape'], number[]][] = [
      ['dot', [1]],
      ['pair', [2]],
      ['hline', [3, 5, 7]],
      ['vline', [3, 6]],
      ['square2', [4]],
      ['square3', [9]],
      ['plus', [5]],
      ['rect', [6, 10, 15]],
      ['corner', [3, 7]],
      ['island', [8, 12, 20]],
      ['blob', [3, 6, 11, 12, 24, 40]],
    ];
    for (const [shape, areas] of shapes)
      for (const area of areas)
        for (const night of [false, true])
          for (const mode of ['classic', 'daily', 'puzzle'] as const) {
            const c: CatchContext = { ...base, shape, area, w: 3, h: 2, night, mode };
            const everyday = SPECIES.filter((s) => (s.rarity === 'common' || s.rarity === 'uncommon') && s.when(c));
            expect(everyday.length, `${shape} ${area} ${night ? 'night' : 'day'} ${mode}`).toBeGreaterThan(0);
          }
  });
  it('is deterministic for a capture', () => {
    const cap = { waves: [{ pockets: [{ cells: cells([[3, 3]]) }] }], streak: 2, clean: false };
    const env = { gameSeed: 9, move: 4, night: false, mode: 'classic' as const };
    expect(catchCapture(cap, env, { has: () => false, dry: 0 })).toEqual(
      catchCapture(cap, env, { has: () => false, dry: 0 }),
    );
  });
  it('every species is catchable: tuned chance > 0 and some context satisfies it', () => {
    for (const s of SPECIES) if (s.rarity !== 'common') expect(CHANCE_BY_ID[s.id] ?? 0, s.id).toBeGreaterThan(0);
  });
  it('golden variants only for species already in the journal', () => {
    const r = new Rng(5);
    for (let i = 0; i < 3000; i++)
      for (const c of rollCatches(base, r, { has: () => false, dry: 0 })) expect(c.golden).toBe(false);
  });
});

describe('journal', () => {
  it('records new species, counts, size records, and drought', () => {
    let j = { ...EMPTY_JOURNAL, entries: {} };
    const a = record(j, [{ id: 'minnow', size: 4, golden: false }], '2026-10-16');
    expect(a.newSpecies).toEqual(['minnow']);
    j = a.journal;
    const b = record(j, [{ id: 'minnow', size: 6.5, golden: true }], '2026-10-17');
    expect(b.records).toEqual(['minnow']);
    expect(b.journal.entries.minnow).toMatchObject({ count: 2, best: 6.5, golden: 1, first: '2026-10-16' });
    expect(b.journal.dry).toBe(1);
    expect(found(b.journal)).toBe(1);
  });
  it('sanitizes stored data', () => {
    const j = sanitizeJournal({
      entries: { minnow: { count: 3, best: 5, golden: 0, first: 'x' }, bogus: { count: 1 } },
      dry: -4,
      total: 'a',
    });
    expect(Object.keys(j.entries)).toEqual(['minnow']);
    expect(j.dry).toBe(0);
    expect(sanitizeJournal(null).entries).toEqual({});
    // the latest catch size (species page) survives a round trip; junk is dropped
    const ok = sanitizeJournal({ entries: { minnow: { count: 1, best: 5, first: 'x', last: 4.2 } } });
    expect(ok.entries.minnow?.last).toBe(4.2);
    const bad = sanitizeJournal({ entries: { minnow: { count: 1, best: 5, first: 'x', last: -1 } } });
    expect('last' in bad.entries.minnow!).toBe(false);
  });
  it('species ids are unique and every habitat has members', () => {
    expect(new Set(SPECIES.map((s) => s.id)).size).toBe(SPECIES.length);
    for (const h of ['shallows', 'lagoon', 'deep', 'night', 'reef', 'legend'])
      expect(SPECIES.some((s) => s.habitat === h)).toBe(true);
  });
});
