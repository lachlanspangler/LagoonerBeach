/** Board geometry. Cells are indexed row-major: i = y * N + x. */
export const N = 8;
export const CELLS = N * N;

export const xOf = (i: number): number => i % N;
export const yOf = (i: number): number => (i / N) | 0;
export const idx = (x: number, y: number): number => y * N + x;
export const isBorder = (i: number): boolean => {
  const x = i % N;
  const y = (i / N) | 0;
  return x === 0 || y === 0 || x === N - 1 || y === N - 1;
};

function buildNeighbors(diagonal: boolean): number[][] {
  const out: number[][] = [];
  for (let i = 0; i < CELLS; i++) {
    const x = xOf(i);
    const y = yOf(i);
    const list: number[] = [];
    for (let dy = -1; dy <= 1; dy++)
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        if (!diagonal && dx !== 0 && dy !== 0) continue;
        const nx = x + dx;
        const ny = y + dy;
        if (nx >= 0 && ny >= 0 && nx < N && ny < N) list.push(idx(nx, ny));
      }
    out.push(list);
  }
  return out;
}

/** Orthogonal neighbors of each cell. */
export const NB4: readonly (readonly number[])[] = buildNeighbors(false);
/** Orthogonal + diagonal neighbors of each cell. */
export const NB8: readonly (readonly number[])[] = buildNeighbors(true);
/** Border cells in a fixed order. */
export const BORDER: readonly number[] = Array.from({ length: CELLS }, (_, i) => i).filter(isBorder);
