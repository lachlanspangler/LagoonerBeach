import { describe, expect, it } from 'vitest';
import pack from '../../src/content/puzzles.json';
import { fastGrade } from '../../src/core/bitsolver.ts';
import {
  CHAPTER_SIZE,
  CURVE,
  GENERATOR_VERSION,
  LIMITS,
  MAX_REEF,
  SHIPPED_REEFS,
  chapterCleared,
  chapterName,
  chapterOf,
  chapterPeak,
  curve,
  generateReef,
  generatedNumber,
  log2x16,
  nextUnsolved,
  reefId,
  reefScore,
} from '../../src/core/endless.ts';
import { pieceById } from '../../src/core/pieces.ts';
import { boardFromString } from '../../src/core/puzzlegen.ts';
import { hashSeed } from '../../src/core/rng.ts';
import { canPlace, findPockets, resolvePlacement } from '../../src/core/rules.ts';
import { solve } from '../../src/core/solver.ts';

type P = (typeof pack)[number];

describe('bitboard grader', () => {
  it('agrees exactly with the exhaustive grader and solver on every shipped reef', () => {
    for (const p of pack as P[]) {
      const g = fastGrade(boardFromString(p.board), p.pieces);
      expect(g.truncated, p.id).toBe(false);
      expect(
        {
          solutions: g.solutions,
          firstMoves: g.firstMoves,
          winningFirst: g.winningFirst,
          cascade: g.cascade,
          first: g.first,
        },
        p.id,
      ).toEqual({
        solutions: p.grade.solutions,
        firstMoves: p.grade.firstMoves,
        winningFirst: p.grade.winningFirst,
        cascade: p.grade.cascade,
        first: p.solution,
      });
    }
  });

  it('integer score tracks the float score of the pack (rounding only)', () => {
    for (const p of (pack as P[]).slice(0, 120)) {
      const g = fastGrade(boardFromString(p.board), p.pieces);
      // the pack's score uses the first solution's cascade; ours uses "every solution cascades"
      const s = reefScore({ ...g, cascadeRequired: g.cascade }, p.pieces.length);
      expect(Math.abs(s - p.grade.score), p.id).toBeLessThanOrEqual(1);
    }
  });

  it('rejects unsolvable boards and reports truncation under a tiny budget', () => {
    const cup = boardFromString(['00000000', '00000000', '00303000', '00333000'].join('') + '0'.repeat(32));
    expect(fastGrade(cup, ['tri-h']).solvable).toBe(true);
    expect(fastGrade(cup, ['tri-h', 'dot']).solvable).toBe(false);
    expect(fastGrade(cup, ['dot']).first).toEqual([{ piece: 0, x: 3, y: 1 }]);
    const last = (pack as P[])[pack.length - 1]!;
    const t = fastGrade(boardFromString(last.board), last.pieces, { nodeLimit: 3 });
    expect(t.truncated).toBe(true);
    expect(t.solvable).toBe(false);
  });

  it('log2x16 is floor(16·log2 n), exactly', () => {
    for (let n = 1; n <= 4096; n++) {
      const v = log2x16(n);
      expect(2 ** (v / 16) <= n * (1 + 1e-12), String(n)).toBe(true);
      expect(2 ** ((v + 1) / 16) > n * (1 - 1e-12), String(n)).toBe(true);
    }
  });
});

describe('ids and chapters', () => {
  it('ids are stable strings; shipped ids match the pack', () => {
    expect(reefId(1)).toBe((pack as P[])[0]!.id);
    expect(reefId(360)).toBe((pack as P[])[359]!.id);
    expect(reefId(361)).toBe('g361');
    expect(generatedNumber('g361')).toBe(361);
    expect(generatedNumber('g360')).toBeNull();
    expect(generatedNumber('R001')).toBeNull();
    expect(generatedNumber(`g${MAX_REEF + 1}`)).toBeNull();
  });

  it('chapters are 20 reefs; shipped reefs fill chapters 1–18', () => {
    expect(chapterOf(1)).toEqual({ chapter: 1, pos: 1, first: 1, last: 20 });
    expect(chapterOf(360)).toEqual({ chapter: 18, pos: 20, first: 341, last: 360 });
    expect(chapterOf(361)).toEqual({ chapter: 19, pos: 1, first: 361, last: 380 });
    expect(chapterOf(447).pos).toBe(7);
  });

  it('chapter names: deterministic, unique for 1200 chapters, neighbours share no word', () => {
    expect(chapterName(23)).toBe(chapterName(23));
    expect([1, 2, 19, 23].map(chapterName)).toMatchInlineSnapshot(`
      [
        "Driftglass Shoals",
        "Ebbtide Bight",
        "Cuttle Sound",
        "Heron Narrows",
      ]
    `);
    const names = Array.from({ length: 1200 }, (_, i) => chapterName(i + 1));
    expect(new Set(names).size).toBe(1200);
    for (let i = 1; i < names.length; i++) {
      const [a1, b1] = names[i - 1]!.split(' ');
      const [a2, b2] = names[i]!.split(' ');
      expect(a1 === a2 || b1 === b2, `${names[i - 1]} / ${names[i]}`).toBe(false);
    }
    expect(chapterName(1201)).toBe(`${chapterName(1)} II`);
    for (const n of names) expect(n.length).toBeLessThanOrEqual(22);
  });

  it('progress helpers: next unsolved continues into generated reefs; chapter counts', () => {
    const all = new Set(Array.from({ length: SHIPPED_REEFS }, (_, i) => reefId(i + 1)));
    expect(nextUnsolved(new Set())).toBe(1);
    expect(nextUnsolved(new Set(['R001', 'R002']))).toBe(3);
    expect(nextUnsolved(all)).toBe(361);
    expect(nextUnsolved(new Set([...all, 'g361', 'g362']))).toBe(363);
    expect(chapterCleared(all, 18)).toBe(20);
    expect(chapterCleared(new Set(['g361', 'g380', 'g381']), 19)).toBe(2);
  });
});

describe('difficulty curve', () => {
  const N = 4000;
  const ns = Array.from({ length: N }, (_, i) => SHIPPED_REEFS + 1 + i);

  it('bounded: every target sits between the breather floor and the ceiling', () => {
    for (const n of ns) {
      const t = curve(n).score;
      expect(t).toBeGreaterThanOrEqual(CURVE.start - CURVE.dip);
      expect(t).toBeLessThan(CURVE.ceiling);
    }
    expect(curve(MAX_REEF).score).toBeLessThan(CURVE.ceiling);
  });

  it('monotone trend: chapter peaks and chapter means never fall, and keep rising', () => {
    let prevPeak = 0;
    let prevMean = 0;
    for (let c = SHIPPED_REEFS / CHAPTER_SIZE + 1; c < 200; c++) {
      const peak = chapterPeak(c);
      expect(peak).toBeGreaterThanOrEqual(prevPeak);
      const first = (c - 1) * CHAPTER_SIZE + 1;
      const mean = Array.from({ length: CHAPTER_SIZE }, (_, k) => curve(first + k).score).reduce((a, b) => a + b) / 20;
      expect(mean).toBeGreaterThanOrEqual(prevMean);
      prevPeak = peak;
      prevMean = mean;
    }
    expect(chapterPeak(200)).toBeGreaterThan(chapterPeak(19) + 6);
  });

  it('sawtooth: each chapter climbs, and opens with a breather below the last chapter end', () => {
    for (let c = 19; c < 120; c++) {
      const first = (c - 1) * CHAPTER_SIZE + 1;
      const ts = Array.from({ length: CHAPTER_SIZE }, (_, k) => curve(first + k).score);
      for (let k = 1; k < ts.length; k++) expect(ts[k]!).toBeGreaterThanOrEqual(ts[k - 1]!);
      expect(ts[CHAPTER_SIZE - 1]! - ts[0]!).toBeGreaterThanOrEqual(CURVE.dip - 1);
      if (c > 19) expect(ts[0]!).toBeLessThan(curve(first - 1).score);
      // smooth inside the chapter: no step above 2 points
      for (let k = 1; k < ts.length; k++) expect(ts[k]! - ts[k - 1]!).toBeLessThanOrEqual(2);
    }
  });

  it('roles: every 10th reef is a signature, cascades in rhythm, breathers open chapters', () => {
    expect(curve(370).role).toBe('signature');
    expect(curve(380).role).toBe('signature');
    expect(curve(361).role).toBe('breather');
    const roles = Array.from({ length: 20 }, (_, k) => curve(361 + k).role);
    expect(roles.filter((r) => r === 'cascade').length).toBe(4);
    expect(roles.filter((r) => r === 'signature').length).toBe(2);
  });
});

/** Replay a reef's stored solution; true if every move is legal and the board ends empty. */
function replays(r: {
  board: string;
  pieces: readonly string[];
  solution: readonly { piece: number; x: number; y: number }[];
}) {
  let b = boardFromString(r.board);
  const used = new Set<number>();
  for (const m of r.solution) {
    const pc = pieceById(r.pieces[m.piece]!);
    if (!canPlace(b, pc, m.x, m.y)) return false;
    used.add(m.piece);
    b = resolvePlacement(b, pc, m.x, m.y, 1).board;
  }
  return used.size === r.pieces.length && b.every((c) => c === 0);
}

const digest = (r: ReturnType<typeof generateReef>) =>
  hashSeed(JSON.stringify([r.id, r.board, r.pieces, r.solution, r.grade.score])).toString(16);

describe('generated reefs', () => {
  it(`golden: reefs 361–370 are pinned (bump GENERATOR_VERSION, now ${GENERATOR_VERSION}, when this changes)`, () => {
    const got = Array.from({ length: 10 }, (_, i) => digest(generateReef(361 + i)));
    expect({ version: GENERATOR_VERSION, got }).toMatchInlineSnapshot(`
      {
        "got": [
          "2490636",
          "5b2c9b5",
          "9f2e1028",
          "8822e9b7",
          "8ec29d47",
          "249790e3",
          "7a202e6d",
          "ebe45278",
          "cec51af",
          "4c0b6116",
        ],
        "version": 1,
      }
    `);
  });

  it('deterministic: the same index gives the same reef, in any order', () => {
    const a = [1000, 361, 77777].map((n) => digest(generateReef(n)));
    const b = [77777, 1000, 361].map((n) => digest(generateReef(n)));
    expect(b).toEqual([a[2], a[0], a[1]]);
    expect(generateReef(1000)).toEqual(generateReef(1000));
  });

  it('only generated numbers are accepted', () => {
    expect(() => generateReef(360)).toThrow();
    expect(() => generateReef(MAX_REEF + 1)).toThrow();
    expect(() => generateReef(400.5)).toThrow();
  });

  it('solvable: 200+ reefs across 361–100000, no starting pocket, stored solution clears, solver agrees', () => {
    const sample: number[] = [];
    for (let n = 361; n <= 460; n++) sample.push(n); // the first five chapters densely
    for (let n = 461; sample.length < 210; n = Math.floor(n * 1.035) + 7) sample.push(Math.min(n, 100_000));
    sample.push(100_000);
    for (const n of sample) {
      const r = generateReef(n);
      expect(r.id).toBe(`g${n}`);
      expect(r.pieces.length).toBeGreaterThanOrEqual(2);
      expect(r.pieces.length).toBeLessThanOrEqual(3);
      expect(findPockets(boardFromString(r.board)), r.id).toHaveLength(0);
      expect(replays(r), r.id).toBe(true);
      expect(solve(boardFromString(r.board), r.pieces).solvable, r.id).toBe(true);
      expect(r.nodes).toBeLessThanOrEqual(LIMITS.nodesPerReef + LIMITS.nodesPerCandidate);
    }
  }, 120_000);

  it('hits the target band for nearly every reef, and cascade reefs need a cascade', () => {
    let inBand = 0;
    const ns = Array.from({ length: 60 }, (_, i) => 361 + i);
    for (const n of ns) {
      const r = generateReef(n);
      const t = curve(n);
      if (Math.abs(r.grade.score - t.score) <= t.band) inBand++;
      if (t.role === 'cascade') expect(r.grade.cascade, r.id).toBe(true);
    }
    expect(inBand / ns.length).toBeGreaterThanOrEqual(0.95);
  });
});
