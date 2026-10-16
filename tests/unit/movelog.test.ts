import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { MAX_LOG_MOVES, packMove, packMoves, unpackMove, unpackMoves } from '../../src/core/movelog.ts';
import { RULES_VERSION, rulesFingerprint } from '../../src/core/version.ts';
import { verifyRun } from '../../src/core/verify.ts';
import { dailySeed } from '../../src/core/daily.ts';
import { playOut } from './runs.ts';

const move = fc.record({
  slot: fc.integer({ min: 0, max: 2 }),
  x: fc.integer({ min: 0, max: 7 }),
  y: fc.integer({ min: 0, max: 7 }),
});

describe('packed move log', () => {
  it('one byte per move', () => {
    expect(packMove({ slot: 2, x: 7, y: 7 })).toBe(191);
    expect(packMove({ slot: 0, x: 0, y: 0 })).toBe(0);
    expect(unpackMove(255)).toBeNull(); // slot 3
    expect(unpackMove(0b10_011_101)).toEqual({ slot: 2, x: 3, y: 5 });
  });
  it('property: round-trips any log, 4 chars per 3 moves', () => {
    fc.assert(
      fc.property(fc.array(move, { maxLength: 200 }), (ms) => {
        const s = packMoves(ms);
        expect(s).toMatch(/^[A-Za-z0-9_-]*$/);
        expect(s.length).toBe(Math.ceil((ms.length * 4) / 3));
        expect(unpackMoves(s)).toEqual(ms);
      }),
    );
  });
  it('rejects garbage, impossible lengths, slot 3, non-canonical tails and over-long logs', () => {
    expect(unpackMoves('')).toEqual([]);
    expect(unpackMoves('A')).toBeNull();
    expect(unpackMoves('AA+A')).toBeNull();
    expect(unpackMoves('AA=A')).toBeNull();
    expect(unpackMoves('__')).toBeNull(); // 0xFF… is slot 3
    expect(unpackMoves('AB')).toBeNull(); // stray low bits
    const long = packMoves(Array.from({ length: MAX_LOG_MOVES + 1 }, () => ({ slot: 0, x: 0, y: 0 })));
    expect(unpackMoves(long)).toBeNull();
    expect(unpackMoves(long, MAX_LOG_MOVES + 1)).toHaveLength(MAX_LOG_MOVES + 1);
  });
});

describe('rules version', () => {
  it('fingerprint is pinned to RULES_VERSION (rules changed? bump RULES_VERSION and add its fingerprint here)', () => {
    const KNOWN: Record<number, number> = { 1: 325767879 };
    expect(rulesFingerprint()).toBe(KNOWN[RULES_VERSION]);
  });
});

describe('verifyRun', () => {
  const { moves, state } = playOut(5);
  const log = packMoves(moves);

  it('accepts a finished endless run and recomputes its score', () => {
    const v = verifyRun({ mode: 'endless', seed: 5, teach: false, moves: log });
    expect(v.ok && v.state.score).toBe(state.score);
  });
  it('accepts a daily run replayed in daily mode', () => {
    const seed = dailySeed('2026-10-16');
    const d = playOut(seed, { mode: 'daily' });
    const v = verifyRun({ mode: 'daily', seed, teach: false, moves: packMoves(d.moves) });
    expect(v.ok && v.state.score).toBe(d.state.score);
  });
  it('a teaching game only verifies with teach set', () => {
    const t = playOut(9, { teach: true });
    expect(verifyRun({ mode: 'endless', seed: 9, teach: true, moves: packMoves(t.moves) }).ok).toBe(true);
    expect(verifyRun({ mode: 'endless', seed: 9, teach: false, moves: packMoves(t.moves) }).ok).toBe(false);
  });
  it('rejects unfinished, tampered, wrong-seed and garbage logs', () => {
    expect(verifyRun({ mode: 'endless', seed: 5, teach: false, moves: packMoves(moves.slice(0, -1)) })).toEqual({
      ok: false,
      reason: 'not_over',
    });
    const tampered = moves.map((m, i) => (i === 3 ? { ...m, x: (m.x + 1) % 8 } : m));
    expect(verifyRun({ mode: 'endless', seed: 5, teach: false, moves: packMoves(tampered) }).ok).toBe(false);
    expect(verifyRun({ mode: 'endless', seed: 6, teach: false, moves: log }).ok).toBe(false);
    expect(verifyRun({ mode: 'endless', seed: 5, teach: false, moves: '!!' })).toEqual({
      ok: false,
      reason: 'log_invalid',
    });
    // moves after game over are illegal
    expect(verifyRun({ mode: 'endless', seed: 5, teach: false, moves: packMoves([...moves, moves[0]!]) }).ok).toBe(
      false,
    );
  });
});
