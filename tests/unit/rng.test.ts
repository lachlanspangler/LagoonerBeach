import { describe, expect, it } from 'vitest';
import { Rng, hashSeed } from '../../src/core/rng.ts';

describe('Rng', () => {
  it('is deterministic for a seed', () => {
    const a = new Rng(42);
    const b = new Rng(42);
    for (let i = 0; i < 1000; i++) expect(a.nextU32()).toBe(b.nextU32());
  });

  it('matches golden values (guards cross-platform drift)', () => {
    const r = new Rng(1);
    expect([r.nextU32(), r.nextU32(), r.nextU32()]).toMatchInlineSnapshot(`
      [
        2693262067,
        11749833,
        2265367787,
      ]
    `);
  });

  it('int() stays in range and covers it', () => {
    const r = new Rng(7);
    const seen = new Set<number>();
    for (let i = 0; i < 5000; i++) {
      const v = r.int(6);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(6);
      seen.add(v);
    }
    expect(seen.size).toBe(6);
  });

  it('weighted() respects weights roughly and never picks zero weight', () => {
    const r = new Rng(3);
    const counts = [0, 0, 0];
    for (let i = 0; i < 30000; i++) counts[r.weighted([1, 0, 3])]!++;
    expect(counts[1]).toBe(0);
    expect(counts[2]! / counts[0]!).toBeGreaterThan(2.7);
    expect(counts[2]! / counts[0]!).toBeLessThan(3.3);
  });

  it('clone() forks state without sharing', () => {
    const a = new Rng(9);
    a.nextU32();
    const b = a.clone();
    expect(b.nextU32()).toBe(a.nextU32());
  });

  it('hashSeed is stable', () => {
    expect(hashSeed('')).toBe(0x811c9dc5);
    expect(hashSeed('2026-10-16')).toBe(hashSeed('2026-10-16'));
    expect(hashSeed('2026-10-16')).not.toBe(hashSeed('2026-10-17'));
  });
});
