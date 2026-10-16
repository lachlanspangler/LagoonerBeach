/**
 * Candidate mechanics for bot evaluation. Each mechanic is a pure-ish set of functions over State.
 * Throwaway code: optimized for clarity of the rule, not for production.
 */
import { CATALOG, N, Piece, Rng, SIZE, canPlace, filled, fullLines, holes, mobility, stamp } from './core.ts';

export interface Move { slot: number; x: number; y: number; dir?: number }
export interface State {
  board: Uint8Array;
  tray: (Piece | null)[];
  rng: number;
  aux: Int8Array | null;
  moves: number;
  score: number;
}
export interface Result { state: State; points: number; cleared: number; events: number; area?: number }
export interface Opts { noRefill?: boolean }
export interface Mechanic {
  id: string;
  name: string;
  init(seed: number): State;
  moves(s: State): Move[];
  apply(s: State, m: Move, o?: Opts): Result;
  heuristic(s: State): number;
  budget?: number; // if set, game ends after this many moves (no natural fail state)
}

function clone(s: State): State {
  const c = { board: s.board.slice(), tray: s.tray.slice(), rng: s.rng, aux: s.aux ? s.aux.slice() : null, moves: s.moves, score: s.score };
  const cat = catOf.get(s);
  if (cat) catOf.set(c, cat);
  return c;
}
export type Catalog = readonly Piece[] | ((moves: number) => readonly Piece[]);
const catOf = new WeakMap<State, Catalog>();
function deal(s: State, cat: Catalog = catOf.get(s) ?? CATALOG): void {
  const r = new Rng(s.rng);
  const c = typeof cat === 'function' ? cat(s.moves) : cat;
  s.tray = [r.pick(c), r.pick(c), r.pick(c)];
  s.rng = r.s;
}
function baseInit(seed: number, cat: Catalog = CATALOG): State {
  const s: State = { board: new Uint8Array(SIZE), tray: [], rng: seed >>> 0, aux: null, moves: 0, score: 0 };
  catOf.set(s, cat);
  deal(s, cat);
  return s;
}
export const SMALL: Catalog = CATALOG.filter((p) => p.cells.length <= 4);
export const NO_MONO: Catalog = CATALOG.filter((p) => p.cells.length > 1);
/** Heavier: drop monomino and dominoes, double the 5+ cell pieces. */
export const HEAVY: Catalog = [...CATALOG.filter((p) => p.cells.length > 2), ...CATALOG.filter((p) => p.cells.length >= 5)];
function placeMoves(s: State): Move[] {
  const out: Move[] = [];
  s.tray.forEach((p, slot) => {
    if (!p) return;
    for (let y = 0; y <= N - p.h; y++) for (let x = 0; x <= N - p.w; x++) if (canPlace(s.board, p, x, y)) out.push({ slot, x, y });
  });
  return out;
}
function finishTurn(s: State, slot: number, o?: Opts): void {
  s.tray[slot] = null;
  s.moves++;
  if (!o?.noRefill && s.tray.every((t) => !t)) deal(s);
}

// ---------------------------------------------------------------- Lines (Block Blast baseline)
export const lines: Mechanic = {
  id: 'lines',
  name: 'Baseline: line clears (Block-Blast-like)',
  init: baseInit,
  moves: placeMoves,
  apply(s0, m, o) {
    const s = clone(s0);
    const p = s.tray[m.slot]!;
    stamp(s.board, p, m.x, m.y);
    const [n, ...cells] = fullLines(s.board);
    for (const c of cells) s.board[c] = 0;
    const points = p.cells.length + cells.length * n!;
    s.score += points;
    finishTurn(s, m.slot, o);
    return { state: s, points, cleared: cells.length, events: n! };
  },
  heuristic: (s) => mobility(s.board) - 3 * holes(s.board) - 0.4 * filled(s.board),
};

// ---------------------------------------------------------------- Hollow (enclosure clears)
/** Empty cells not 4-connected (through empty cells) to the board border. */
export function pockets(b: Uint8Array): number[][] {
  const outside = new Uint8Array(SIZE);
  const stack: number[] = [];
  for (let i = 0; i < N; i++)
    for (const c of [i, (N - 1) * N + i, i * N, i * N + N - 1]) if (!b[c] && !outside[c]) { outside[c] = 1; stack.push(c); }
  flood(b, outside, stack);
  const seen = new Uint8Array(SIZE);
  const comps: number[][] = [];
  for (let c = 0; c < SIZE; c++) {
    if (b[c] || outside[c] || seen[c]) continue;
    const comp: number[] = [];
    const st = [c];
    seen[c] = 1;
    while (st.length) {
      const k = st.pop()!;
      comp.push(k);
      for (const nb of nbrs4(k)) if (!b[nb] && !seen[nb]) { seen[nb] = 1; st.push(nb); }
    }
    comps.push(comp);
  }
  return comps;
}
function flood(b: Uint8Array, mark: Uint8Array, stack: number[]) {
  while (stack.length) {
    const k = stack.pop()!;
    for (const nb of nbrs4(k)) if (!b[nb] && !mark[nb]) { mark[nb] = 1; stack.push(nb); }
  }
}
function nbrs4(k: number): number[] {
  const x = k % N, y = (k / N) | 0, o: number[] = [];
  if (x > 0) o.push(k - 1);
  if (x < N - 1) o.push(k + 1);
  if (y > 0) o.push(k - N);
  if (y < N - 1) o.push(k + N);
  return o;
}
function nbrs8(k: number): number[] {
  const x = k % N, y = (k / N) | 0, o: number[] = [];
  for (let dy = -1; dy <= 1; dy++)
    for (let dx = -1; dx <= 1; dx++) {
      if (!dx && !dy) continue;
      const xx = x + dx, yy = y + dy;
      if (xx >= 0 && yy >= 0 && xx < N && yy < N) o.push(yy * N + xx);
    }
  return o;
}
/** Empty components when edges count as walls: all but the largest are "sealed off". */
function moatPockets(b: Uint8Array): number[][] {
  const seen = new Uint8Array(SIZE);
  const comps: number[][] = [];
  for (let c = 0; c < SIZE; c++) {
    if (b[c] || seen[c]) continue;
    const comp: number[] = [];
    const st = [c];
    seen[c] = 1;
    while (st.length) {
      const k = st.pop()!;
      comp.push(k);
      for (const nb of nbrs4(k)) if (!b[nb] && !seen[nb]) { seen[nb] = 1; st.push(nb); }
    }
    comps.push(comp);
  }
  if (comps.length <= 1) return [];
  comps.sort((a, b2) => b2.length - a.length);
  return comps.slice(1);
}

/** Heuristic helper: empty cells with ≥3 filled/wall orthogonal neighbors (loop "potential"). */
function nearPockets(b: Uint8Array): number {
  let k = 0;
  for (let c = 0; c < SIZE; c++) {
    if (b[c]) continue;
    const x = c % N, y = (c / N) | 0;
    if (x === 0 || y === 0 || x === N - 1 || y === N - 1) continue;
    let f = 0;
    for (const nb of nbrs4(c)) f += b[nb]!;
    if (f === 3) k++;
  }
  return k;
}

export function makeHollow(opt: { ring: 4 | 8; withLines?: boolean; moat?: boolean; minArea?: number; cat?: Catalog; id: string; name: string }): Mechanic {
  return {
    id: opt.id,
    name: opt.name,
    init: (seed) => baseInit(seed, opt.cat),
    moves: placeMoves,
    apply(s0, m, o) {
      const s = clone(s0);
      const p = s.tray[m.slot]!;
      stamp(s.board, p, m.x, m.y);
      const pk = (opt.moat ? moatPockets(s.board) : pockets(s.board)).filter((c) => c.length >= (opt.minArea ?? 1));
      const clear = new Set<number>();
      let points = p.cells.length;
      for (const comp of pk) {
        const ring = new Set<number>();
        for (const c of comp) for (const nb of opt.ring === 8 ? nbrs8(c) : nbrs4(c)) if (s.board[nb]) ring.add(nb);
        ring.forEach((c) => clear.add(c));
        points += comp.length * ring.size; // area × fence
      }
      let events = pk.length;
      const area = pk.reduce((a, c) => a + c.length, 0);
      if (opt.withLines) {
        const [n, ...cells] = fullLines(s.board);
        cells.forEach((c) => clear.add(c));
        events += n!;
        points += cells.length * n!;
      }
      if (events > 1) points *= events;
      clear.forEach((c) => (s.board[c] = 0));
      s.score += points;
      finishTurn(s, m.slot, o);
      return { state: s, points, cleared: clear.size, events, area };
    },
    heuristic: (s) => mobility(s.board) - 0.4 * filled(s.board) + 2 * nearPockets(s.board),
  };
}
export const hollow8 = makeHollow({ ring: 8, id: 'hollow8', name: 'Hollow: enclosed space pops with its 8-ring' });
export const hollow4 = makeHollow({ ring: 4, id: 'hollow4', name: 'Hollow: enclosed space pops with its 4-ring' });
export const hollowLines = makeHollow({ ring: 8, withLines: true, id: 'hollow+lines', name: 'Hollow + line clears (hybrid)' });
export const moat = makeHollow({ ring: 8, moat: true, id: 'moat', name: 'Moat: edges count; all but largest empty region pop' });

// ---------------------------------------------------------------- Skid (slide in from an edge)
const DIRS = [
  [0, -1], // enters from bottom, moves up
  [0, 1], // enters from top, moves down
  [-1, 0], // enters from right, moves left
  [1, 0], // enters from left, moves right
] as const;
function fitsPartial(b: Uint8Array, p: Piece, x: number, y: number): boolean {
  for (const [dx, dy] of p.cells) {
    const xx = x + dx, yy = y + dy;
    if (xx < 0 || yy < 0 || xx >= N || yy >= N) continue; // off-board cells are allowed during entry
    if (b[yy * N + xx]) return false;
  }
  return true;
}
function onBoard(p: Piece, x: number, y: number) {
  return x >= 0 && y >= 0 && x + p.w <= N && y + p.h <= N;
}
export function skidLanding(b: Uint8Array, p: Piece, dir: number, lane: number): [number, number] | null {
  const [vx, vy] = DIRS[dir]!;
  let x: number, y: number;
  if (vy !== 0) { x = lane; y = vy < 0 ? N : -p.h; if (x < 0 || x + p.w > N) return null; }
  else { y = lane; x = vx < 0 ? N : -p.w; if (y < 0 || y + p.h > N) return null; }
  let last: [number, number] | null = null;
  for (;;) {
    const nx = x + vx, ny = y + vy;
    if (vy < 0 && ny < 0) break;
    if (vy > 0 && ny + p.h > N) break;
    if (vx < 0 && nx < 0) break;
    if (vx > 0 && nx + p.w > N) break;
    if (!fitsPartial(b, p, nx, ny)) break;
    x = nx; y = ny;
    if (onBoard(p, x, y)) last = [x, y];
  }
  return last && last[0] === x && last[1] === y ? last : null;
}
export const skid: Mechanic = {
  id: 'skid',
  name: 'Skid: pieces slide in from an edge until they hit something',
  init: baseInit,
  moves(s) {
    const out: Move[] = [];
    s.tray.forEach((p, slot) => {
      if (!p) return;
      const seen = new Set<number>();
      for (let dir = 0; dir < 4; dir++)
        for (let lane = 0; lane < N; lane++) {
          const l = skidLanding(s.board, p, dir, lane);
          if (!l) continue;
          const key = l[1] * N + l[0];
          if (seen.has(key)) continue;
          seen.add(key);
          out.push({ slot, x: l[0], y: l[1], dir });
        }
    });
    return out;
  },
  apply: (s, m, o) => lines.apply(s, m, o),
  heuristic: (s) => lines.heuristic(s),
};

// ---------------------------------------------------------------- Flip (XOR stamp)
export const flip: Mechanic = {
  id: 'flip',
  name: 'Flip: pieces toggle the cells they cover; full lines clear (60-move budget)',
  budget: 60,
  init: baseInit,
  moves(s) {
    const out: Move[] = [];
    s.tray.forEach((p, slot) => {
      if (!p) return;
      for (let y = 0; y <= N - p.h; y++) for (let x = 0; x <= N - p.w; x++) out.push({ slot, x, y });
    });
    return out;
  },
  apply(s0, m, o) {
    const s = clone(s0);
    const p = s.tray[m.slot]!;
    for (const [dx, dy] of p.cells) s.board[(m.y + dy) * N + m.x + dx] ^= 1;
    const [n, ...cells] = fullLines(s.board);
    for (const c of cells) s.board[c] = 0;
    const points = cells.length * n!;
    s.score += points;
    finishTurn(s, m.slot, o);
    return { state: s, points, cleared: cells.length, events: n! };
  },
  heuristic(s) {
    let h = 0;
    for (let y = 0; y < N; y++) { let c = 0; for (let x = 0; x < N; x++) c += s.board[y * N + x]!; h += c * c; }
    for (let x = 0; x < N; x++) { let c = 0; for (let y = 0; y < N; y++) c += s.board[y * N + x]!; h += c * c; }
    return h / 16;
  },
};

// ---------------------------------------------------------------- Exact Count
function rollTarget(r: Rng, aux?: Int8Array | null) { return aux && aux.length > 2 * N ? aux[2 * N]! + r.int(aux[2 * N + 1]!) : 3 + r.int(4); } // default 3..6
function lineCount(b: Uint8Array, i: number): number {
  let c = 0;
  if (i < N) for (let x = 0; x < N; x++) c += b[i * N + x]!;
  else for (let y = 0; y < N; y++) c += b[y * N + (i - N)]!;
  return c;
}
export const exact: Mechanic = {
  id: 'exact',
  name: 'Exact Count: a row/column clears when it holds exactly its number',
  init(seed) {
    const s = baseInit(seed);
    const r = new Rng(s.rng);
    s.aux = new Int8Array(2 * N);
    for (let i = 0; i < 2 * N; i++) s.aux[i] = rollTarget(r);
    s.rng = r.s;
    return s;
  },
  moves: placeMoves,
  apply(s0, m, o) {
    const s = clone(s0);
    const p = s.tray[m.slot]!;
    stamp(s.board, p, m.x, m.y);
    let points = p.cells.length, cleared = 0, events = 0;
    const r = new Rng(s.rng);
    for (let guard = 0; guard < 8; guard++) {
      const hit: number[] = [];
      for (let i = 0; i < 2 * N; i++) if (lineCount(s.board, i) === s.aux![i]) hit.push(i);
      if (!hit.length) break;
      const cells = new Set<number>();
      for (const i of hit) {
        if (i < N) for (let x = 0; x < N; x++) { if (s.board[i * N + x]) cells.add(i * N + x); }
        else for (let y = 0; y < N; y++) { if (s.board[y * N + i - N]) cells.add(y * N + i - N); }
        s.aux![i] = rollTarget(r, s.aux);
      }
      cells.forEach((c) => (s.board[c] = 0));
      events += hit.length;
      cleared += cells.size;
      points += cells.size * hit.length;
    }
    s.rng = r.s;
    s.score += points;
    finishTurn(s, m.slot, o);
    return { state: s, points, cleared, events };
  },
  heuristic(s) {
    let over = 0;
    for (let i = 0; i < 2 * N; i++) over += Math.max(0, lineCount(s.board, i) - s.aux![i]!);
    return mobility(s.board) - 3 * over - 0.3 * filled(s.board);
  },
};

// ---------------------------------------------------------------- Overgrowth (skipped pieces grow)
function grow(p: Piece, r: Rng): Piece {
  if (p.cells.length >= 6) return p;
  const occ = new Set(p.cells.map(([x, y]) => `${x},${y}`));
  const cand: [number, number][] = [];
  for (const [x, y] of p.cells)
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      const nx = x + dx, ny = y + dy;
      if (!occ.has(`${nx},${ny}`)) cand.push([nx, ny]);
    }
  const [ax, ay] = r.pick(cand);
  let cells = [...p.cells.map(([x, y]) => [x, y] as [number, number]), [ax, ay] as [number, number]];
  const minX = Math.min(...cells.map((c) => c[0])), minY = Math.min(...cells.map((c) => c[1]));
  cells = cells.map(([x, y]) => [x - minX, y - minY]);
  const w = Math.max(...cells.map((c) => c[0])) + 1, h = Math.max(...cells.map((c) => c[1])) + 1;
  if (w > 4 || h > 4) return p;
  return { id: p.id + '+', cells, w, h };
}
export const overgrowth: Mechanic = {
  id: 'overgrowth',
  name: 'Overgrowth: tray refills one at a time; pieces you skip grow a cell',
  init: baseInit,
  moves: placeMoves,
  apply(s0, m, o) {
    const s = clone(s0);
    const p = s.tray[m.slot]!;
    stamp(s.board, p, m.x, m.y);
    const [n, ...cells] = fullLines(s.board);
    for (const c of cells) s.board[c] = 0;
    const points = p.cells.length + cells.length * n!;
    s.score += points;
    s.moves++;
    const r = new Rng(s.rng);
    s.tray = s.tray.map((t, i) => (i === m.slot ? (o?.noRefill ? null : r.pick(CATALOG)) : t ? grow(t, r) : t));
    s.rng = r.s;
    return { state: s, points, cleared: cells.length, events: n! };
  },
  heuristic: (s) => lines.heuristic(s),
};

const BIG = CATALOG.filter((p) => p.cells.length >= 5);
const MID = CATALOG.filter((p) => p.cells.length >= 3);
/** Ramp: from the full catalog toward big pieces as the game goes on. */
export function ramp(start: number, full: number): (moves: number) => readonly Piece[] {
  const cache = new Map<number, Piece[]>();
  return (moves) => {
    const t = Math.max(0, Math.min(1, (moves - start) / (full - start)));
    const k = Math.round(t * 10);
    if (!cache.has(k)) {
      // mix: NO_MONO plus k copies of MID-big weighting
      const arr: Piece[] = [...(k > 3 ? MID : NO_MONO)];
      for (let i = 0; i < k; i++) arr.push(...BIG);
      cache.set(k, arr);
    }
    return cache.get(k)!;
  };
}
export const hollowRamp = makeHollow({ ring: 8, cat: ramp(20, 200), id: 'hollow8-ramp', name: 'Hollow (8-ring), ramp 20→200 moves' });
export const hollowRampFast = makeHollow({ ring: 8, cat: ramp(10, 100), id: 'hollow8-ramp2', name: 'Hollow (8-ring), ramp 10→100 moves' });
export const hollowNoMono = makeHollow({ ring: 8, cat: NO_MONO, id: 'hollow8-nomono', name: 'Hollow (8-ring), no monomino' });
export const hollowHeavy = makeHollow({ ring: 8, cat: HEAVY, id: 'hollow8-heavy', name: 'Hollow (8-ring), heavy catalog' });
export const hollowMin2 = makeHollow({ ring: 8, minArea: 2, id: 'hollow8-min2', name: 'Hollow (8-ring), pockets must be ≥2 cells' });
export const linesHeavy: Mechanic = { ...lines, id: 'lines-heavy', name: 'Baseline lines, heavy catalog', init: (seed) => baseInit(seed, HEAVY) };
export const skidSmall: Mechanic = { ...skid, id: 'skid-small', name: 'Skid with ≤4-cell pieces', init: (seed) => baseInit(seed, SMALL) };
export const exactHard: Mechanic = {
  ...exact,
  id: 'exact-hard',
  name: 'Exact Count, targets 5..7',
  init(seed) {
    const s = baseInit(seed);
    const r = new Rng(s.rng);
    s.aux = new Int8Array(2 * N + 2);
    s.aux[2 * N] = 5;
    s.aux[2 * N + 1] = 3;
    for (let i = 0; i < 2 * N; i++) s.aux[i] = rollTarget(r, s.aux);
    s.rng = r.s;
    return s;
  },
};

export const ALL: Mechanic[] = [lines, linesHeavy, hollow8, hollow4, hollowLines, moat, hollowNoMono, hollowHeavy, hollowMin2, hollowRamp, hollowRampFast, skid, skidSmall, flip, exact, exactHard, overgrowth];
