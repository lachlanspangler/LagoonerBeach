/**
 * Catching: turn a captured lagoon into beach creatures. Pure and deterministic given its RNG.
 * Independent from the dealer's RNG so catches never change the game itself.
 */
import { N } from '../core/grid.ts';
import { Rng, hashSeed } from '../core/rng.ts';
import { SPECIES, type CatchContext, type Shape, type Species } from './creatures.ts';
import { CHANCE_BY_ID } from './catchTuning.ts';

export interface Catch {
  readonly id: string;
  /** Size in cm, one decimal. */
  readonly size: number;
  /** Rare golden variant (only for species already in the journal). */
  readonly golden: boolean;
}

export interface ShapeInfo {
  readonly shape: Shape;
  readonly area: number;
  readonly w: number;
  readonly h: number;
}

/** Classify a lagoon by its cells (any order). */
export function classify(cells: readonly number[]): ShapeInfo {
  const xs = cells.map((c) => c % N);
  const ys = cells.map((c) => Math.floor(c / N));
  const x0 = Math.min(...xs);
  const y0 = Math.min(...ys);
  const w = Math.max(...xs) - x0 + 1;
  const h = Math.max(...ys) - y0 + 1;
  const area = cells.length;
  const set = new Set(cells.map((c) => (Math.floor(c / N) - y0) * w + (c % N) - x0));
  const at = (x: number, y: number) => set.has(y * w + x);
  const base = { area, w, h };
  if (area === 1) return { shape: 'dot', ...base };
  if (area === 2) return { shape: 'pair', ...base };
  if (h === 1) return { shape: 'hline', ...base };
  if (w === 1) return { shape: 'vline', ...base };
  if (area === w * h) {
    if (w === 2 && h === 2) return { shape: 'square2', ...base };
    if (w === 3 && h === 3) return { shape: 'square3', ...base };
    return { shape: 'rect', ...base };
  }
  if (area === 5 && w === 3 && h === 3 && at(1, 0) && at(0, 1) && at(1, 1) && at(2, 1) && at(1, 2))
    return { shape: 'plus', ...base };
  if (hasIsland(set, w, h)) return { shape: 'island', ...base };
  if (area <= 7 && area === w + h - 1) {
    for (const ry of [0, h - 1])
      for (const cx of [0, w - 1]) {
        let ok = true;
        for (let y = 0; y < h && ok; y++)
          for (let x = 0; x < w && ok; x++) if (at(x, y) !== (y === ry || x === cx)) ok = false;
        if (ok) return { shape: 'corner', ...base };
      }
  }
  return { shape: 'blob', ...base };
}

/** A lagoon with an island: some non-water cell in its bounding box is enclosed by water. */
function hasIsland(water: ReadonlySet<number>, w: number, h: number): boolean {
  const outside = new Uint8Array(w * h);
  const stack: number[] = [];
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++)
      if ((x === 0 || y === 0 || x === w - 1 || y === h - 1) && !water.has(y * w + x)) {
        outside[y * w + x] = 1;
        stack.push(y * w + x);
      }
  while (stack.length) {
    const k = stack.pop()!;
    const x = k % w;
    const y = (k / w) | 0;
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ] as const) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
      const j = ny * w + nx;
      if (!water.has(j) && !outside[j]) {
        outside[j] = 1;
        stack.push(j);
      }
    }
  }
  for (let k = 0; k < w * h; k++) if (!water.has(k) && !outside[k]) return true;
  return false;
}

/** How many creatures a lagoon of this size yields (the extra one at 3–5 is a coin flip). */
export function catchCount(area: number, rng: Rng): number {
  if (area <= 2) return 1;
  if (area <= 11) return rng.next() < 0.3 ? 2 : 1;
  return 2;
}

export interface JournalView {
  has(id: string): boolean;
  /** Captures since the last new species (drives the pity boost). */
  readonly dry: number;
}

/** Seed for a lagoon's catch: stable for a given game, move and pocket. */
export function catchSeed(gameSeed: number, move: number, wave: number, pocket: number): number {
  return hashSeed(`catch:${gameSeed}:${move}:${wave}:${pocket}`);
}

/** Fallback chance per matching lagoon by rarity (per-species tuned values live in catchTuning.ts). */
export const CHANCE: Record<string, number> = { uncommon: 0.07, rare: 0.025, epic: 0.016, legendary: 0.12 };
const ORDER = ['legendary', 'epic', 'rare', 'uncommon'];

/**
 * Roll creatures for one lagoon. Specials whose condition matches each get a rarity-based chance
 * (rarest first); otherwise an everyday creature that fits is caught. Species you haven't found
 * get a pity boost after a long drought without a discovery (capped ×2).
 * Extra creatures from big lagoons come from the everyday pool only.
 */
export function rollCatches(ctx: CatchContext, rng: Rng, journal: JournalView): Catch[] {
  const eligible = SPECIES.filter((s) => s.when(ctx));
  if (!eligible.length) return [];
  const n = catchCount(ctx.area, rng);
  // pity only after a real drought (~a day of captures with nothing new), then ramps to ×2
  const pity = Math.min(2, 1 + Math.max(0, journal.dry - 150) / 150);
  const commons = eligible.filter((s) => s.rarity === 'common');
  const everyday = commons.length ? commons : eligible.filter((s) => s.rarity === 'uncommon');
  // every lagoon shape has an everyday species (tested); never hand out a rare by default
  const pool = everyday;
  const specials = eligible
    .filter((s) => s.rarity !== 'common')
    .sort((x, y) => ORDER.indexOf(x.rarity) - ORDER.indexOf(y.rarity));
  const out: Catch[] = [];
  let first: Species | null = null;
  for (const s of specials) {
    const p = (CHANCE_BY_ID[s.id] ?? CHANCE[s.rarity]!) * (journal.has(s.id) ? 1 : pity);
    if (rng.next() < p) {
      first = s;
      break;
    }
  }
  for (let i = 0; i < n; i++) {
    if (!(i === 0 && first) && !pool.length) break;
    const sp =
      i === 0 && first
        ? first
        : pool[rng.weighted(pool.map((s) => s.weight * (out.some((o) => o.id === s.id) ? 0.4 : 1)))]!;
    out.push({ id: sp.id, size: sizeFor(sp, rng), golden: journal.has(sp.id) && rng.next() < 1 / 64 });
  }
  return out;
}

function sizeFor(sp: Species, rng: Rng): number {
  const [lo, hi] = sp.size;
  // most catches are ordinary; record-breakers are rare
  return Math.round((lo + (hi - lo) * Math.pow(rng.next(), 1.8)) * 10) / 10;
}

export interface CaptureInfo {
  readonly waves: readonly { pockets: readonly { cells: readonly number[] }[] }[];
  readonly streak: number;
  readonly clean: boolean;
}

export interface CatchEnv {
  readonly gameSeed: number;
  readonly move: number;
  readonly night: boolean;
  readonly mode: 'classic' | 'daily' | 'puzzle';
  readonly tier?: string;
  readonly reefWin?: boolean;
}

export interface LagoonCatch {
  readonly wave: number;
  readonly pocket: number;
  readonly cells: readonly number[];
  readonly catches: readonly Catch[];
}

/** The catch context of every lagoon in a capture (for rolls and for tuning tools). */
export function contextsFor(cap: CaptureInfo, env: CatchEnv): CatchContext[] {
  const out: CatchContext[] = [];
  cap.waves.forEach((w, k) => {
    const last = k === cap.waves.length - 1;
    for (const p of w.pockets)
      out.push({
        ...classify(p.cells),
        wave: k + 1,
        pockets: w.pockets.length,
        streak: cap.streak,
        moves: env.move,
        clean: cap.clean && last,
        night: env.night,
        mode: env.mode,
        tier: env.tier,
        reefWin: env.reefWin && last,
      });
  });
  return out;
}

/** All catches for one capture event, lagoon by lagoon. */
export function catchCapture(cap: CaptureInfo, env: CatchEnv, journal: JournalView): LagoonCatch[] {
  const out: LagoonCatch[] = [];
  let dry = journal.dry;
  const seen = new Set<string>();
  const view: JournalView = {
    has: (id) => seen.has(id) || journal.has(id),
    get dry() {
      return dry;
    },
  };
  cap.waves.forEach((w, k) => {
    const last = k === cap.waves.length - 1;
    w.pockets.forEach((p, i) => {
      const info = classify(p.cells);
      const ctx: CatchContext = {
        ...info,
        wave: k + 1,
        pockets: w.pockets.length,
        streak: cap.streak,
        moves: env.move,
        clean: cap.clean && last,
        night: env.night,
        mode: env.mode,
        tier: env.tier,
        reefWin: env.reefWin && last,
      };
      const catches = rollCatches(ctx, new Rng(catchSeed(env.gameSeed, env.move, k, i)), view);
      // same bookkeeping as journal.record, lagoon by lagoon
      const fresh = catches.some((c) => !view.has(c.id));
      for (const c of catches) seen.add(c.id);
      if (fresh) dry = 0;
      else if (catches.length) dry++;
      out.push({ wave: k + 1, pocket: i, cells: p.cells, catches });
    });
  });
  return out;
}
