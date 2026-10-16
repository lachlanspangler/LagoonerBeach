/**
 * Where reefs come from: the shipped pack for reefs 1–360, the endless generator beyond. Generated
 * reefs are built in a Web Worker (synchronous fallback where workers are missing or broken),
 * prefetched a few ahead so "Next reef" is instant, and cached in localStorage (bounded, keyed by
 * reef number + GENERATOR_VERSION). Indices here are 0-based (reef n = index + 1), like GameState.seed.
 */
import { GENERATOR_VERSION, MAX_REEF, SHIPPED_REEFS, generateReef, reefId } from '../core/endless.ts';
import { hasPiece, pieceById } from '../core/pieces.ts';
import { boardFromString } from '../core/puzzlegen.ts';
import { canPlace, findPockets, resolvePlacement } from '../core/rules.ts';
import type { PuzzleMove } from '../core/solver.ts';

export interface ReefDef {
  readonly id: string;
  readonly board: string;
  readonly pieces: readonly string[];
  readonly solution: readonly PuzzleMove[];
  readonly tier?: string;
  readonly lagoons?: number;
}

/** The subset of a Worker we use (lets tests plug in a fake). */
export interface WorkerLike {
  postMessage(m: unknown): void;
  addEventListener(type: 'message' | 'error', fn: (e: { data?: unknown }) => void): void;
  terminate(): void;
}

type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;

export interface ReefSourceOptions {
  storage?: StorageLike | null;
  /** Build the generator worker; null (or throwing) selects the synchronous fallback. */
  createWorker?: () => WorkerLike | null;
  /** Reefs kept in localStorage. */
  cacheSize?: number;
  /** How fallback generation is scheduled (default: a macrotask, never inside an input handler). */
  defer?: (fn: () => void) => void;
  /** The synchronous generator used by the fallback (tests inject a failing one). */
  generate?: (n: number) => ReefDef;
}

export const CACHE_KEY = 'atoll.v1.reefcache';
export const CACHE_SIZE = 50;
/** Reefs generated ahead of the one being played. */
export const PREFETCH_AHEAD = 3;

interface CacheFile {
  v: number;
  order: number[];
  reefs: Record<string, ReefDef>;
}

export function defaultWorker(): WorkerLike | null {
  if (typeof Worker === 'undefined') return null;
  return new Worker(new URL('./reefWorker.ts', import.meta.url), { type: 'module' }) as unknown as WorkerLike;
}

/** A generated reef from storage or a worker is trusted only if it really is reef n and really clears. */
export function validReef(r: unknown, n: number): r is ReefDef {
  if (!r || typeof r !== 'object') return false;
  const o = r as Partial<ReefDef>;
  if (o.id !== reefId(n) || typeof o.board !== 'string' || !/^[0-6]{64}$/.test(o.board)) return false;
  if (!Array.isArray(o.pieces) || o.pieces.length < 1 || o.pieces.length > 3) return false;
  if (!o.pieces.every((p) => typeof p === 'string' && hasPiece(p))) return false;
  if (!Array.isArray(o.solution) || o.solution.length !== o.pieces.length) return false;
  let b = boardFromString(o.board);
  if (findPockets(b).length) return false;
  const used = new Set<number>();
  for (const m of o.solution) {
    if (!m || typeof m !== 'object') return false;
    const { piece, x, y } = m as PuzzleMove;
    if (!Number.isInteger(piece) || piece < 0 || piece >= o.pieces.length || used.has(piece)) return false;
    const pc = pieceById(o.pieces[piece]!);
    if (!Number.isInteger(x) || !Number.isInteger(y) || !canPlace(b, pc, x, y)) return false;
    used.add(piece);
    b = resolvePlacement(b, pc, x, y, 1).board;
  }
  return b.every((c) => c === 0);
}

/** Only what the game needs (drops generator diagnostics), so the cache stays small. */
function compact(r: ReefDef): ReefDef {
  return { id: r.id, board: r.board, pieces: r.pieces, solution: r.solution, tier: r.tier, lagoons: r.lagoons };
}

export class ReefSource {
  readonly stats = { worker: false, generated: 0, fromCache: 0, fallback: 0, failed: 0, lastMs: 0 };
  private readonly mem = new Map<number, ReefDef>();
  private order: number[] = [];
  private readonly waiting = new Map<
    number,
    { promise: Promise<ReefDef>; resolve: (r: ReefDef) => void; reject: (e: unknown) => void }
  >();
  private worker: WorkerLike | null | undefined; // undefined = not created yet
  private fallbackQueue: number[] = [];
  private fallbackBusy = false;
  private pinned = 0;
  private readonly storage: StorageLike | null;
  private readonly cacheSize: number;
  private readonly defer: (fn: () => void) => void;

  constructor(
    private readonly pack: readonly ReefDef[],
    private readonly opts: ReefSourceOptions = {},
  ) {
    this.storage = opts.storage === undefined ? safeStorage() : opts.storage;
    this.cacheSize = opts.cacheSize ?? CACHE_SIZE;
    this.defer = opts.defer ?? ((fn) => setTimeout(fn, 0));
    this.load();
  }

  /** Reef at 0-based index i if it is available right now (shipped, generated or cached). */
  get(i: number): ReefDef | null {
    if (i >= 0 && i < this.pack.length) return this.pack[i]!;
    return this.mem.get(i + 1) ?? null;
  }

  /** Reef at index i, generating it if needed. */
  ensure(i: number): Promise<ReefDef> {
    const ready = this.get(i);
    if (ready) return Promise.resolve(ready);
    const n = i + 1;
    if (!Number.isInteger(n) || n <= SHIPPED_REEFS || n > MAX_REEF) return Promise.reject(new Error(`no reef ${n}`));
    const w = this.waiting.get(n);
    if (w) return w.promise;
    let resolve!: (r: ReefDef) => void;
    let reject!: (e: unknown) => void;
    const promise = new Promise<ReefDef>((res, rej) => ((resolve = res), (reject = rej)));
    this.waiting.set(n, { promise, resolve, reject });
    this.request(n);
    return promise;
  }

  /** Keep the reef being played in memory even if prefetching pushes it out of the cache. */
  pin(i: number): void {
    this.pinned = i + 1;
  }

  /** Make sure the next `count` reefs after index i are on their way. */
  prefetch(i: number, count = PREFETCH_AHEAD): void {
    for (let k = 1; k <= count; k++) {
      const j = i + k;
      if (j + 1 > MAX_REEF) break;
      if (!this.get(j)) this.ensure(j).catch(() => undefined); // a failed prefetch is retried on demand
    }
  }

  // ── generation ───────────────────────────────────────────────────────────────────────────

  private request(n: number): void {
    const w = this.getWorker();
    if (w) w.postMessage({ n });
    else this.enqueueFallback(n);
  }

  private getWorker(): WorkerLike | null {
    if (this.worker !== undefined) return this.worker;
    try {
      this.worker = (this.opts.createWorker ?? defaultWorker)();
    } catch {
      this.worker = null;
    }
    const w = this.worker;
    if (!w) return null;
    this.stats.worker = true;
    w.addEventListener('message', (e) => this.onWorkerMessage(e.data));
    // a worker that can't load (old WebView, CSP) fails here: everything still waiting goes sync
    w.addEventListener('error', () => this.workerFailed());
    return w;
  }

  private onWorkerMessage(data: unknown): void {
    const m = data as { n?: number; reef?: unknown; ms?: number; error?: string } | null;
    if (!m || typeof m.n !== 'number') return;
    if (m.reef !== undefined && validReef(m.reef, m.n)) {
      this.stats.generated++;
      this.stats.lastMs = m.ms ?? 0;
      this.store(m.n, m.reef);
    } else this.enqueueFallback(m.n); // never show a reef we haven't verified
  }

  private workerFailed(): void {
    this.worker?.terminate();
    this.worker = null;
    this.stats.worker = false;
    for (const n of this.waiting.keys()) this.enqueueFallback(n);
  }

  private enqueueFallback(n: number): void {
    if (!this.fallbackQueue.includes(n)) this.fallbackQueue.push(n);
    this.pumpFallback();
  }

  private pumpFallback(): void {
    if (this.fallbackBusy) return;
    this.fallbackBusy = true;
    this.defer(() => {
      this.fallbackBusy = false;
      const n = this.fallbackQueue.shift();
      if (n === undefined) return;
      try {
        if (!this.mem.has(n)) {
          const t0 = typeof performance !== 'undefined' ? performance.now() : 0;
          const r = (this.opts.generate ?? generateReef)(n);
          this.stats.fallback++;
          this.stats.generated++;
          this.stats.lastMs = (typeof performance !== 'undefined' ? performance.now() : 0) - t0;
          this.store(n, r);
        }
      } catch (e) {
        // the last resort failed too: settle the waiter (the UI offers a retry) instead of hanging
        this.stats.failed++;
        this.fail(n, e);
      } finally {
        if (this.fallbackQueue.length) this.pumpFallback();
      }
    });
  }

  private fail(n: number, e: unknown): void {
    const w = this.waiting.get(n);
    if (!w) return;
    this.waiting.delete(n); // a later ensure() asks again
    w.reject(e instanceof Error ? e : new Error(`reef ${n} failed`));
  }

  // ── cache ────────────────────────────────────────────────────────────────────────────────

  private store(n: number, r: ReefDef): void {
    const reef = compact(r);
    this.mem.set(n, reef);
    this.order = this.order.filter((k) => k !== n);
    this.order.push(n);
    while (this.order.length > this.cacheSize) {
      const old = this.order.shift()!;
      if (old === this.pinned) this.order.push(old);
      else this.mem.delete(old);
      if (this.order.length <= 1) break;
    }
    this.save();
    const w = this.waiting.get(n);
    if (w) {
      this.waiting.delete(n);
      w.resolve(reef);
    }
  }

  private load(): void {
    try {
      const raw = this.storage?.getItem(CACHE_KEY);
      if (!raw) return;
      const f = JSON.parse(raw) as Partial<CacheFile>;
      if (f.v !== GENERATOR_VERSION || !Array.isArray(f.order) || !f.reefs || typeof f.reefs !== 'object') return;
      for (const n of f.order.slice(-this.cacheSize)) {
        const r = (f.reefs as Record<string, unknown>)[String(n)];
        if (typeof n === 'number' && n > SHIPPED_REEFS && validReef(r, n) && !this.mem.has(n)) {
          this.mem.set(n, compact(r));
          this.order.push(n);
          this.stats.fromCache++;
        }
      }
    } catch {
      /* a bad cache is just an empty cache */
    }
  }

  private save(): void {
    const reefs: Record<string, ReefDef> = {};
    for (const n of this.order) reefs[String(n)] = this.mem.get(n)!;
    const f: CacheFile = { v: GENERATOR_VERSION, order: this.order, reefs };
    try {
      this.storage?.setItem(CACHE_KEY, JSON.stringify(f));
    } catch {
      /* quota: the cache is best-effort */
    }
  }

  /** Reef numbers currently cached (oldest first). For tests and the debug API. */
  cached(): number[] {
    return [...this.order];
  }
}

function safeStorage(): StorageLike | null {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}
