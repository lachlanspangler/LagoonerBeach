import { CELLS, N } from '../../src/core/grid.ts';
import type { Board } from '../../src/core/rules.ts';

/** Build a board from 8 strings of '.', '#' or digits 1-6. */
export function board(rows: string[]): Board {
  if (rows.length !== N) throw new Error('need 8 rows');
  const b = new Uint8Array(CELLS);
  rows.forEach((r, y) => {
    if (r.length !== N) throw new Error(`row ${y} length`);
    [...r].forEach((ch, x) => (b[y * N + x] = ch === '.' ? 0 : ch === '#' ? 1 : Number(ch)));
  });
  return b;
}

export function show(b: Board): string[] {
  const out: string[] = [];
  for (let y = 0; y < N; y++) out.push(Array.from(b.slice(y * N, y * N + N), (c) => (c ? '#' : '.')).join(''));
  return out;
}
