/** ADR 0012: moment tiers, praise ladder, combo meter, guardrails, and the combo anti-exploit property. */
import { describe, expect, it } from 'vitest';
import {
  LIMITS,
  MomentGuard,
  chimeLayers,
  chimeStep,
  comboChange,
  comboLevel,
  comboMeter,
  comboStyle,
  momentFor,
  wordFor,
  type MomentEvent,
} from '../../src/render/moments.ts';
import { farmerBot, greedyBot } from '../../src/sim/bots.ts';
import { median, playGame } from '../../src/sim/play.ts';
import { STREAK_GRACE, nextStreak } from '../../src/core/scoring.ts';
import { HEAVY_GAP_MS, guardHaptic } from '../../src/platform/haptics.ts';
import { applyMove, newGame } from '../../src/core/game.ts';
import { findPockets } from '../../src/core/rules.ts';
import { BOARDS } from '../e2e/celebrate-boards.ts';

/** A capture with the given pocket sizes per wave. */
const ev = (waves: number[][], o: { clean?: boolean; streak?: number } = {}): MomentEvent => ({
  waves: waves.map((w) => ({ pockets: w.map((n) => ({ cells: Array.from({ length: n }, (_, i) => i) })) })),
  score: { cleanBonus: o.clean ? 300 : 0 },
  streak: o.streak ?? 1,
});
const word = (waves: number[][], o: { clean?: boolean; streak?: number } = {}) =>
  momentFor(ev(waves, o), { prevStreak: (o.streak ?? 1) - 1 });

describe('praise ladder (one word per move, first match wins)', () => {
  const table: [number[][], { clean?: boolean; streak?: number }, number, string | null][] = [
    [[[1]], {}, 0, null],
    [[[2]], { streak: 12 }, 0, null], // a long combo never makes a pinch talk
    [[[3]], {}, 1, 'Nice!'],
    [[[5]], {}, 1, 'Nice!'],
    [[[6]], {}, 2, 'Nice Lagoon!'],
    [[[8]], {}, 2, 'Nice Lagoon!'],
    [[[9]], {}, 2, 'Lovely!'],
    [[[11]], {}, 2, 'Lovely!'],
    [[[1, 1]], {}, 2, 'Twin Lagoons!'],
    [[[12]], {}, 3, 'Atoll!'],
    [[[1, 1, 1]], {}, 3, 'Archipelago!'],
    [[[1], [4]], {}, 3, 'Ripple ×2'],
    [[[1], [1], [2]], {}, 4, 'Riptide!'],
    [[[14], [3]], {}, 4, 'Amazing!'], // two jackpot features at once
    [[[2, 2, 2], [5]], {}, 4, 'Amazing!'],
    [[[4]], { clean: true }, 4, 'Spotless!'],
    [[[12]], { clean: true }, 4, 'Unbelievable!'],
    [[[1], [6]], { clean: true }, 4, 'Unbelievable!'],
  ];
  for (const [w, o, tier, text] of table)
    it(`${JSON.stringify(w)}${o.clean ? ' clean' : ''} → T${tier} ${text}`, () => {
      const m = word(w, o);
      expect(m.tier).toBe(tier);
      expect(m.word).toBe(text);
    });

  it('every word is at most two words and tiers are monotone in the recipe', () => {
    const all = table.map(([w, o]) => word(w, o));
    for (const m of all) if (m.word) expect(m.word.split(' ').length).toBeLessThanOrEqual(2);
    for (const a of all)
      for (const b of all)
        if (a.tier < b.tier) {
          expect(a.visual.burst).toBeLessThan(b.visual.burst);
          expect(a.visual.budget).toBeLessThanOrEqual(b.visual.budget);
          expect(a.visual.shake).toBeLessThanOrEqual(b.visual.shake);
        }
  });

  it('normal moves stay calm: no shake, no sweep, no wash below tier 3', () => {
    for (const w of [[[1]], [[3]], [[7]], [[2, 2]]]) {
      const m = word(w);
      expect(m.tier).toBeLessThan(3);
      expect(m.visual.shake).toBe(0);
      expect(m.visual.sweep).toBe(false);
      expect(m.visual.wash).toBe(false);
      expect(m.sound.whoosh).toBe(false);
    }
  });

  it('guardrails hold for any capture: shake ≤ cap, particles ≤ cap, ≤ 3 haptics', () => {
    for (let waves = 1; waves <= 6; waves++)
      for (const clean of [false, true]) {
        const m = word(
          Array.from({ length: waves }, () => [20, 3, 3]),
          { clean, streak: 30 },
        );
        expect(m.visual.shake).toBeLessThanOrEqual(LIMITS.maxShakePx);
        expect(m.visual.budget).toBeLessThanOrEqual(LIMITS.maxParticlesPerMove);
        expect(m.haptic.length).toBeLessThanOrEqual(LIMITS.maxHapticsPerMove);
      }
  });

  it('wordFor is the same ladder momentFor uses', () => {
    expect(wordFor({ maxArea: 12, pockets: 1, waves: 1, clean: false }).word).toBe('Atoll!');
  });
});

describe('combo meter', () => {
  it('shows from ×2, escalates at ×2/×5/×10/×20', () => {
    expect([1, 2, 4, 5, 9, 10, 19, 20, 26].map(comboLevel)).toEqual([0, 1, 1, 2, 2, 3, 3, 4, 4]);
    expect(comboMeter(1, 0).show).toBe(false);
    expect(comboMeter(2, 0).show).toBe(true);
    const sizes = [1, 2, 3, 4].map((l) => comboStyle(l as 1).size);
    expect([...sizes].sort((a, b) => a - b)).toEqual(sizes);
  });

  it('grace shells dim once per dry move and warn on the last one', () => {
    expect(comboMeter(6, 0)).toMatchObject({ lit: 3, warning: false });
    expect(comboMeter(6, 1)).toMatchObject({ lit: 2, warning: false });
    expect(comboMeter(6, 2)).toMatchObject({ lit: 1, warning: true });
  });

  it('follows the real streak rule: survives STREAK_GRACE − 1 dry moves, breaks on the next', () => {
    let s = { streak: 0, dry: 0 };
    const seen: string[] = [];
    for (const cap of [true, true, false, false, true, false, false, false]) {
      const n = nextStreak(s.streak, s.dry, cap);
      seen.push(comboChange(s, n));
      s = n;
    }
    expect(seen).toEqual(['up', 'up', 'dry', 'dry', 'up', 'dry', 'dry', 'break']);
    expect(STREAK_GRACE).toBe(3);
  });

  it('milestones at ×5, ×10, ×20 only', () => {
    const ms = [];
    for (let n = 1; n <= 25; n++)
      if (comboChange({ streak: n - 1, dry: 0 }, { streak: n, dry: 0 }) === 'milestone') ms.push(n);
    expect(ms).toEqual([5, 10, 20]);
  });

  it('chime climbs one pentatonic step per combo, capped at 12, layers at ×5/×10/×20', () => {
    expect([1, 2, 5, 13, 30].map((n) => chimeStep(n, 0))).toEqual([0, 1, 4, 12, 12]);
    expect(chimeStep(12, 3)).toBe(12);
    expect([4, 5, 9, 10, 20].map(chimeLayers)).toEqual([0, 1, 1, 2, 3]);
  });
});

describe('moment guard', () => {
  it('one word on screen: a new word replaces it only if it ranks higher', () => {
    const g = new MomentGuard();
    expect(g.claimWord(2, 0, 900)).toBe(true);
    expect(g.claimWord(2, 400, 900)).toBe(false);
    expect(g.claimWord(1, 400, 900)).toBe(false);
    expect(g.claimWord(3, 500, 900)).toBe(true);
    expect(g.wordEnds).toBe(1400);
    expect(g.claimWord(1, 1401, 700)).toBe(true);
  });
  it('shake is clamped', () => {
    expect(MomentGuard.shake(40)).toBe(LIMITS.maxShakePx);
    expect(MomentGuard.shake(-1)).toBe(0);
  });
});

describe('haptic guard', () => {
  it('at most one heavy per 300 ms; the rest soften to medium', () => {
    expect(HEAVY_GAP_MS).toBe(LIMITS.heavyGapMs);
    expect(guardHaptic('heavy', 100, 0)).toBe('medium');
    expect(guardHaptic('heavy', 300, 0)).toBe('heavy');
    expect(guardHaptic('tick', 1, 0)).toBe('tick');
  });
});

describe('combo anti-exploit (combo-sim, fixed seeds)', () => {
  it('farming cheap pinches to keep the combo alive scores well below playing for lagoons', () => {
    const seeds = Array.from({ length: 10 }, (_, i) => 1000 + i);
    const greedy = seeds.map((s) => playGame(greedyBot, s, 400).summary);
    const farmer = seeds.map((s) => playGame(farmerBot, s, 400).summary);
    const gm = median(greedy.map((g) => g.score));
    const fm = median(farmer.map((g) => g.score));
    // the farmer keeps combos at least as long, and still loses: the combo alone doesn't pay
    expect(median(farmer.map((g) => g.maxStreak))).toBeGreaterThanOrEqual(median(greedy.map((g) => g.maxStreak)) * 0.6);
    expect(fm).toBeLessThan(gm * 0.75);
  }, 20_000);
});

describe('staged celebration boards (filmstrips, baselines, perf) produce their moment', () => {
  for (const [name, b] of Object.entries(BOARDS))
    it(`${name} → ${b.word ?? '(no word)'}`, () => {
      const base = newGame(1);
      const s = {
        ...base,
        board: Uint8Array.from(b.rows.join(''), (ch) => (ch === '.' ? 0 : Number(ch))),
        tray: b.tray.map((id, i) => (id ? { pieceId: id, color: ((i + 3) % 6) + 1 } : null)),
        streak: b.combo ?? 0,
      };
      expect(findPockets(s.board)).toHaveLength(0);
      const r = applyMove(s, b.move);
      expect(r, 'legal move').not.toBeNull();
      const cap = r!.events.find((e) => e.type === 'captured');
      expect(cap).toBeDefined();
      if (cap?.type !== 'captured') return;
      expect(momentFor(cap, { prevStreak: s.streak }).word).toBe(b.word);
    });
});
