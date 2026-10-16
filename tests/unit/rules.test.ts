import { describe, expect, it } from 'vitest';
import { idx } from '../../src/core/grid.ts';
import { pieceById } from '../../src/core/pieces.ts';
import { canPlace, findPockets, resolvePlacement } from '../../src/core/rules.ts';
import { board, show } from './helpers.ts';

describe('findPockets', () => {
  it('empty board has no pockets', () => {
    expect(findPockets(board(Array(8).fill('........')))).toEqual([]);
  });

  it('a single enclosed cell is a pocket; diagonals need not be filled', () => {
    const b = board(['........', '..#.....', '.#.#....', '..#.....', '........', '........', '........', '........']);
    const p = findPockets(b);
    expect(p).toHaveLength(1);
    expect(p[0]!.cells).toEqual([idx(2, 2)]);
    expect(p[0]!.ring).toEqual([idx(2, 1), idx(1, 2), idx(3, 2), idx(2, 3)]);
  });

  it('the ring includes diagonal blocks', () => {
    const b = board(['........', '.###....', '.#.#....', '.###....', '........', '........', '........', '........']);
    expect(findPockets(b)[0]!.ring).toHaveLength(8);
  });

  it('a hole on the border is not a pocket (edges are not walls)', () => {
    const b = board(['#.#.....', '###.....', '........', '........', '........', '........', '........', '........']);
    expect(findPockets(b)).toEqual([]);
  });

  it('a gap through to the border leaks', () => {
    const b = board(['........', '.###....', '.#.#....', '.#.#....', '........', '........', '........', '........']);
    expect(findPockets(b)).toEqual([]);
  });

  it('finds multiple separate pockets', () => {
    const b = board(['........', '.###.###', '.#.#.#.#', '.###.###', '........', '........', '........', '........']);
    expect(findPockets(b)).toHaveLength(2);
  });

  it('a large lagoon is one pocket', () => {
    const b = board(['########', '#......#', '#......#', '#......#', '#......#', '#......#', '#......#', '########']);
    const p = findPockets(b);
    expect(p).toHaveLength(1);
    expect(p[0]!.cells).toHaveLength(36);
    expect(p[0]!.ring).toHaveLength(28);
  });

  it('an island inside a lagoon is in the ring if adjacent', () => {
    const b = board(['........', '.#####..', '.#...#..', '.#.#.#..', '.#...#..', '.#####..', '........', '........']);
    const p = findPockets(b);
    expect(p).toHaveLength(1);
    expect(p[0]!.cells).toHaveLength(8);
    expect(p[0]!.ring).toContain(idx(3, 3));
  });
});

describe('resolvePlacement', () => {
  it('closing a loop clears the ring and the placed piece', () => {
    // a cup waiting for a lid
    const b = board(['........', '........', '..#.#...', '..###...', '........', '........', '........', '........']);
    const lid = pieceById('tri-h');
    expect(canPlace(b, lid, 2, 1)).toBe(true);
    const r = resolvePlacement(b, lid, 2, 1, 3);
    expect(r.pockets).toHaveLength(1);
    expect(r.cleared).toHaveLength(8);
    expect(show(r.board)).toEqual(Array(8).fill('........'));
  });

  it('shared ring cells are cleared once', () => {
    // two cups sharing the middle wall; one bar seals both at once
    const b = board(['........', '.#####..', '.#.#.#..', '.#...#..', '........', '........', '........', '........']);
    expect(findPockets(b)).toEqual([]);
    const r = resolvePlacement(b, pieceById('tri-h'), 2, 3, 1);
    expect(r.pockets).toHaveLength(2);
    expect(new Set(r.cleared).size).toBe(r.cleared.length);
    expect(r.cleared).toContain(idx(3, 2));
  });

  it('corner cells can be cleared (8-ring reaches them)', () => {
    const b = board(['##......', '#.#.....', '........', '........', '........', '........', '........', '........']);
    expect(findPockets(b)).toEqual([]);
    const r = resolvePlacement(b, pieceById('dot'), 1, 2, 2);
    expect(r.pockets).toHaveLength(1);
    expect(r.cleared).toContain(idx(0, 0));
  });

  it('never clears cells that were empty', () => {
    const b = board(['........', '..#.....', '.#......', '..#.....', '........', '........', '........', '........']);
    const r = resolvePlacement(b, pieceById('dot'), 3, 2, 1);
    for (const c of r.cleared) expect(b[c] !== 0 || r.placed.includes(c)).toBe(true);
  });

  it('does not mutate the input board', () => {
    const b = board(Array(8).fill('........'));
    resolvePlacement(b, pieceById('block'), 0, 0, 1);
    expect(b.every((c) => c === 0)).toBe(true);
  });
});

describe('cascades', () => {
  it('a thick wall collapses in waves', () => {
    const b = board(['........', '.##.##..', '.##.##..', '.##.##..', '.#####..', '.#####..', '........', '........']);
    expect(findPockets(b)).toEqual([]);
    const r = resolvePlacement(b, pieceById('tri-v'), 3, 0, 1); // plug the channel; (3,3) is sealed
    expect(r.waves).toHaveLength(2);
    expect(r.waves[0]!.pockets[0]!.cells).toEqual([idx(3, 3)]);
    expect(r.waves[1]!.pockets[0]!.cells).toHaveLength(9);
    expect(findPockets(r.board)).toEqual([]);
    expect(show(r.board)[0]).toBe('...#....');
  });
});

describe('canPlace', () => {
  it('rejects out of bounds and overlaps', () => {
    const b = board(['#.......', '........', '........', '........', '........', '........', '........', '........']);
    const p = pieceById('pent-h');
    expect(canPlace(b, p, 4, 0)).toBe(false);
    expect(canPlace(b, p, 3, 1)).toBe(true);
    expect(canPlace(b, p, 0, 0)).toBe(false);
    expect(canPlace(b, p, -1, 1)).toBe(false);
    expect(canPlace(b, pieceById('pent-v'), 0, 4)).toBe(false);
  });
});
