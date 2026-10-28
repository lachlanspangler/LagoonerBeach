/**
 * Habitat requirements and journal progress: every line the journal shows next to a category is
 * true of the game's own rules (src/meta/req.ts), checked over the enumerated context space.
 */
import { describe, expect, it } from 'vitest';
import { Rng } from '../../src/core/rng.ts';
import { GOLDEN_ODDS, rollCatches } from '../../src/meta/catch.ts';
import { HABITATS, SPECIES, type CatchContext, type Habitat } from '../../src/meta/creatures.ts';
import { EMPTY_JOURNAL, type Journal } from '../../src/meta/journal.ts';
import { journalProgress, RARITIES } from '../../src/meta/journalProgress.ts';
import { matches } from '../../src/meta/req.ts';
import {
  HABITAT_REQ,
  badgesFor,
  describe as describeReq,
  gateOpen,
  habitatLine,
  habitatParts,
  hasFeature,
  membersOf,
} from '../../src/meta/reqText.ts';
import { forEachContext } from './ctxSpace.ts';

const IDS = HABITATS.map((h) => h.id);

describe('habitat gates', () => {
  it('Night and Reef are the gated habitats', () => {
    expect(IDS.filter((h) => HABITAT_REQ[h].gate)).toEqual(['night', 'reef']);
  });
  it('property: a member can only be caught where its habitat gate is open (every context in the space)', () => {
    const gated = SPECIES.filter((s) => HABITAT_REQ[s.habitat].gate);
    expect(gated.length).toBe(10);
    const bad = new Map<string, CatchContext>();
    forEachContext((c) => {
      for (const sp of gated)
        if (matches(sp.req, c) && !matches(HABITAT_REQ[sp.habitat].gate!, c) && !bad.has(sp.id)) bad.set(sp.id, c);
    });
    expect([...bad.entries()]).toEqual([]);
  });
  it('the gate is the tightest one: each gated member is catchable somewhere it is open', () => {
    for (const sp of SPECIES.filter((s) => HABITAT_REQ[s.habitat].gate)) {
      let some = false;
      forEachContext((c) => (some ||= matches(sp.req, c)));
      expect(some, sp.id).toBe(true);
    }
  });
  it('gateOpen reads the theme and mode the player is in now', () => {
    const night = HABITAT_REQ.night.gate;
    const reef = HABITAT_REQ.reef.gate;
    expect(gateOpen(night, { night: true, mode: 'classic' })).toBe(true);
    expect(gateOpen(night, { night: false, mode: 'puzzle' })).toBe(false);
    expect(gateOpen(reef, { night: false, mode: 'puzzle' })).toBe(true);
    expect(gateOpen(reef, { night: true, mode: 'daily' })).toBe(false);
    expect(gateOpen(undefined, { night: false, mode: 'classic' })).toBe(true);
    expect(gateOpen({ notMode: ['puzzle'] }, { night: false, mode: 'puzzle' })).toBe(false);
    expect(gateOpen({ theme: 'day' }, { night: false, mode: 'daily' })).toBe(true);
  });
  it('gateOpen agrees with matches() on the theme and mode of every context', () => {
    for (const h of ['night', 'reef'] as const) {
      const gate = HABITAT_REQ[h].gate!;
      forEachContext((c) => {
        if (gateOpen(gate, c) !== matches(gate, c)) throw new Error(`${h} ${JSON.stringify(c)}`);
      });
    }
  });
});

describe('habitat lines (next to each category)', () => {
  it('are pinned (a change here is a deliberate copy or rules change)', () => {
    expect(Object.fromEntries(IDS.map((h) => [h, habitatLine(h)]))).toEqual({
      shallows: 'Small pools of 1–5 cells · a Daily visitor',
      lagoon: 'Shaped pools: lines, squares, plus, L, rectangles, round · 2+ pools at once · big pools of 6+ cells',
      deep: 'Big pools of 6+ cells · islands · cascades · a Daily visitor',
      night: 'Only in the Night theme',
      reef: 'Only in Reef puzzles',
      legend: 'Cascades 3 waves deep · clearing the whole board · huge pools around an island · ×5+ combos',
    });
  });
  it('gated habitats say their gate, in describe()’s words', () => {
    for (const h of ['night', 'reef'] as const)
      expect(habitatLine(h).toLowerCase()).toBe(
        `only ${describeReq(HABITAT_REQ[h].gate!)
          .filter((p) => p !== 'any pool')
          .join(', ')}`.toLowerCase(),
      );
  });
  it('every keyword is produced by at least one member’s describe()', () => {
    for (const h of IDS) {
      const said = membersOf(h).map((s) => describeReq(s.req).join(', '));
      for (const p of habitatParts(h))
        expect(
          said.some((t) => t.includes(p.key)),
          `${h}: "${p.key}"`,
        ).toBe(true);
    }
  });
  it('every member is covered by the line (a feature it has, or the gate)', () => {
    for (const h of IDS) {
      const hr = HABITAT_REQ[h];
      for (const sp of membersOf(h)) {
        const covered = !!hr.gate || (hr.features ?? []).some((f) => hasFeature(f, sp.req));
        expect(covered, `${h}: ${sp.id}`).toBe(true);
      }
    }
  });
  it('every listed feature is had by some member (no "islands" without an island species)', () => {
    for (const h of IDS)
      for (const f of HABITAT_REQ[h].features ?? [])
        expect(
          membersOf(h).some((s) => hasFeature(f, s.req)),
          `${h}: ${f}`,
        ).toBe(true);
  });
  it('cell counts in a line are the real catchable sizes of the members it speaks for (over the space)', () => {
    let checked = 0;
    for (const h of IDS)
      for (const f of ['small', 'big'] as const) {
        if (!HABITAT_REQ[h].features?.includes(f)) continue;
        const members = membersOf(h).filter((s) => hasFeature(f, s.req));
        const p = habitatParts(h).find((x) => x.key === f)!;
        const m = /of (\d+)(?:–(\d+)|\+) cells/.exec(p.text)!;
        let lo = Infinity;
        let hi = 0;
        forEachContext((c) => {
          if (plausible(c) && members.some((s) => matches(s.req, c))) {
            lo = Math.min(lo, c.area);
            hi = Math.max(hi, c.area);
          }
        });
        expect(lo, `${h}: ${p.text}`).toBe(Number(m[1]));
        // "N+" = unbounded (the space goes up to 20 cells)
        expect(hi, `${h}: ${p.text}`).toBe(m[2] ? Number(m[2]) : 20);
        checked++;
      }
    expect(checked).toBe(3); // Shallows small, Lagoon big, Deep big
  });
});

/** Sizes classify() can give each shape (dot = 1 cell, 2×2 square = 4, rectangle ≥ 2×3, island ring ≥ 8, …). */
function plausible(c: CatchContext): boolean {
  const a = c.area;
  switch (c.shape) {
    case 'dot':
      return a === 1;
    case 'pair':
      return a === 2;
    case 'square2':
      return a === 4;
    case 'square3':
      return a === 9;
    case 'plus':
      return a === 5;
    case 'corner':
      return a >= 3 && a <= 7;
    case 'island':
      return a >= 8;
    case 'rect':
      return a >= 6;
    case 'blob':
      return a >= 4;
    default:
      return a >= 3;
  }
}

const ctx: CatchContext = {
  area: 1,
  shape: 'dot',
  w: 1,
  h: 1,
  wave: 1,
  pockets: 1,
  streak: 0,
  moves: 0,
  clean: false,
  night: false,
  mode: 'classic',
};

describe('tile badges (conditions beyond the habitat)', () => {
  it('exactly the day-only, Night-only and Daily-only species outside their gate', () => {
    const got = Object.fromEntries(SPECIES.filter((s) => badgesFor(s).length).map((s) => [s.id, badgesFor(s)]));
    expect(got).toEqual({
      minnow: ['day'],
      periwinkle: ['day'],
      sanddollar: ['day'],
      parrot: ['day'],
      sunfish: ['daily'],
      otter: ['daily'],
      kraken: ['night'],
    });
  });
  it('a badge means the species really is never catchable outside it', () => {
    for (const sp of SPECIES)
      for (const b of badgesFor(sp)) {
        let outside = false;
        forEachContext((c) => {
          const open =
            b === 'day' ? !c.night : b === 'night' ? c.night : b === 'daily' ? c.mode === 'daily' : c.mode === 'puzzle';
          if (!open && matches(sp.req, c)) outside = true;
        });
        expect(outside, `${sp.id} ${b}`).toBe(false);
      }
  });
});

const journalOf = (ids: readonly string[], golden: readonly string[] = []): Journal => ({
  ...EMPTY_JOURNAL,
  entries: Object.fromEntries(
    ids.map((id) => [id, { count: 2, best: 5, golden: golden.includes(id) ? 1 : 0, first: '2026-10-01' }]),
  ),
});

describe('journal progress', () => {
  it('empty journal: nothing found, nothing complete, totals add up to the catalogue', () => {
    const p = journalProgress(EMPTY_JOURNAL);
    expect([p.got, p.total, p.golden, p.complete]).toEqual([0, SPECIES.length, 0, false]);
    expect(p.habitats.map((h) => h.id)).toEqual(IDS);
    expect(p.habitats.reduce((a, h) => a + h.total, 0)).toBe(SPECIES.length);
    expect(p.rarities.map((r) => r.rarity)).toEqual(RARITIES);
    expect(p.rarities.reduce((a, r) => a + r.total, 0)).toBe(SPECIES.length);
    expect(p.rarities.map((r) => r.total)).toEqual([9, 13, 15, 6, 4]);
    expect(p.habitats.map((h) => [h.id, h.total])).toEqual([
      ['shallows', 10],
      ['lagoon', 15],
      ['deep', 8],
      ['night', 6],
      ['reef', 4],
      ['legend', 4],
    ]);
  });
  it('per habitat: found, complete, golden; per rarity; golden overall', () => {
    const reef = SPECIES.filter((s) => s.habitat === 'reef').map((s) => s.id);
    const p = journalProgress(journalOf([...reef, 'minnow', 'kraken'], ['butterfly', 'minnow']));
    const by = (h: Habitat) => p.habitats.find((x) => x.id === h)!;
    expect(by('reef')).toMatchObject({ got: 4, total: 4, complete: true, golden: 1 });
    expect(by('shallows')).toMatchObject({ got: 1, total: 10, complete: false, golden: 1 });
    expect(by('legend')).toMatchObject({ got: 1, complete: false, golden: 0 });
    expect(by('night')).toMatchObject({ got: 0, complete: false });
    expect(p.got).toBe(6);
    expect(p.golden).toBe(2);
    const r = Object.fromEntries(p.rarities.map((x) => [x.rarity, x.got]));
    // butterfly, minnow common; wrasse uncommon; lionfish rare; giantclam epic; kraken legendary
    expect(r).toEqual({ common: 2, uncommon: 1, rare: 1, epic: 1, legendary: 1 });
  });
  it('a full journal is complete everywhere', () => {
    const p = journalProgress(journalOf(SPECIES.map((s) => s.id)));
    expect(p.complete).toBe(true);
    expect(p.habitats.every((h) => h.complete)).toBe(true);
    expect(p.rarities.every((r) => r.complete)).toBe(true);
  });
  it('golden counts species with a golden catch, not golden catches', () => {
    const j = journalOf(['minnow']);
    j.entries.minnow!.golden = 5;
    expect(journalProgress(j).golden).toBe(1);
  });
});

describe('golden odds shown in the journal are the game’s', () => {
  it('a known species is golden about 1 time in GOLDEN_ODDS', () => {
    expect(GOLDEN_ODDS).toBe(64);
    const r = new Rng(11);
    let n = 0;
    let g = 0;
    const known = { has: () => true, dry: 0 };
    while (n < 64_000)
      for (const c of rollCatches(ctx, r, known)) {
        n++;
        if (c.golden) g++;
      }
    expect(g / n).toBeGreaterThan(0.85 / GOLDEN_ODDS);
    expect(g / n).toBeLessThan(1.15 / GOLDEN_ODDS);
  });
});
