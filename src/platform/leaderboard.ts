/**
 * Leaderboard client: one interface, two backends, an offline queue.
 *
 *   LeaderboardBackend  — submit / top / around / myRank / startRun / deletePlayer
 *   HttpBackend         — the Cloudflare Worker in server/ (base URL from VITE_LB_URL at build time)
 *   MockBackend         — lbmock.ts: on-device, same checks as the server, seeded with demo players
 *   LeaderboardClient   — what the UI uses: install id + name, posting through a persisted queue
 *                         with retry/backoff, composed board views with an offline cache, erase.
 *
 * Swapping backends is `createBackend()`; nothing above it knows which one it talks to.
 */
import { RULES_VERSION } from '../core/version.ts';
import {
  RETRYABLE,
  type AroundResponse,
  type BoardEntry,
  type BoardId,
  type BoardRef,
  type LbErrorCode,
  type RunTicket,
  type ScoreSubmission,
  type Standing,
  type SubmitResponse,
  type TopResponse,
} from '../meta/boards.ts';
import type { FinishedRun } from './runlog.ts';
import { clearForget, readForget, readTicket, storeTicket } from './runlog.ts';

export type LbFailure = LbErrorCode | 'offline' | 'timeout';

export class LbError extends Error {
  constructor(
    readonly code: LbFailure,
    readonly retryAfter?: number,
  ) {
    super(code);
  }
  get retryable(): boolean {
    return RETRYABLE.has(this.code);
  }
}

export interface LeaderboardBackend {
  readonly kind: 'mock' | 'http';
  /** Endless: a server-signed seed for the next run (null if unsupported or offline). */
  startRun(installId: string | undefined, teach: boolean): Promise<RunTicket | null>;
  submit(entry: ScoreSubmission): Promise<SubmitResponse>;
  top(board: BoardRef, n: number): Promise<TopResponse>;
  /** Your row, `window` rows above and below it, and the row just above you. */
  around(board: BoardRef, installId: string, window: number): Promise<AroundResponse>;
  myRank(board: BoardRef, installId: string): Promise<Standing | null>;
  /** Server-side erase (part of Erase all progress). */
  deletePlayer(installId: string): Promise<void>;
}

// ── HTTP ───────────────────────────────────────────────────────────────────────────────────
type FetchLike = (url: string, init: RequestInit) => Promise<Response>;

export class HttpBackend implements LeaderboardBackend {
  readonly kind = 'http' as const;
  private readonly base: string;

  constructor(
    base: string,
    private readonly fetchImpl: FetchLike = (u, i) => fetch(u, i),
    private readonly timeoutMs = 6000,
  ) {
    this.base = base.replace(/\/+$/, '').replace(/\/v1$/, '') + '/v1';
  }

  private async req<T>(method: string, path: string, body?: unknown): Promise<T> {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), this.timeoutMs);
    let res: Response;
    try {
      res = await this.fetchImpl(this.base + path, {
        method,
        signal: ctl.signal,
        headers: body === undefined ? {} : { 'content-type': 'application/json' },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
    } catch {
      throw new LbError(ctl.signal.aborted ? 'timeout' : 'offline');
    } finally {
      clearTimeout(timer);
    }
    let data: unknown = null;
    try {
      data = await res.json();
    } catch {
      /* empty or non-JSON body */
    }
    if (!res.ok) {
      const e = (data as { error?: { code?: string; retryAfter?: number } } | null)?.error;
      const code = (e?.code ?? (res.status >= 500 ? 'overloaded' : 'bad_request')) as LbFailure;
      throw new LbError(code, e?.retryAfter);
    }
    return data as T;
  }

  async startRun(installId: string | undefined, teach: boolean): Promise<RunTicket | null> {
    try {
      return await this.req<RunTicket>('POST', '/runs', {
        ...(installId ? { installId } : {}),
        teach,
        rules: RULES_VERSION,
      });
    } catch (e) {
      if (e instanceof LbError && e.retryable) return null;
      throw e;
    }
  }
  submit(entry: ScoreSubmission) {
    return this.req<SubmitResponse>('POST', '/scores', entry);
  }
  top(board: BoardRef, n: number) {
    return this.req<TopResponse>('GET', `/boards/${encodeURIComponent(board)}/top?limit=${n}`);
  }
  around(board: BoardRef, installId: string, window: number) {
    return this.req<AroundResponse>(
      'GET',
      `/boards/${encodeURIComponent(board)}/around?installId=${installId}&above=${window}&below=${window}`,
    );
  }
  async myRank(board: BoardRef, installId: string) {
    try {
      return await this.req<Standing>('GET', `/boards/${encodeURIComponent(board)}/me?installId=${installId}`);
    } catch (e) {
      if (e instanceof LbError && e.code === 'not_ranked') return null;
      throw e;
    }
  }
  async deletePlayer(installId: string) {
    await this.req('DELETE', `/players/${installId}`);
  }
}

// ── client ─────────────────────────────────────────────────────────────────────────────────
export interface Kv {
  get(k: string): string | null;
  set(k: string, v: string): void;
  del(k: string): void;
}

export const localKv: Kv = {
  get: (k) => {
    try {
      return globalThis.localStorage?.getItem(k) ?? null;
    } catch {
      return null;
    }
  },
  set: (k, v) => {
    try {
      globalThis.localStorage?.setItem(k, v);
    } catch {
      /* quota / privacy mode */
    }
  },
  del: (k) => {
    try {
      globalThis.localStorage?.removeItem(k);
    } catch {
      /* ignore */
    }
  },
};

export const K_QUEUE = 'atoll.v1.lbqueue';

interface Queued {
  sub: ScoreSubmission;
  attempts: number;
  nextAt: number;
  addedAt: number;
}

export type PostOutcome =
  | { status: 'posted'; standings: readonly Standing[] }
  | { status: 'queued'; reason: LbFailure }
  | { status: 'rejected'; reason: LbFailure };

export interface BoardView {
  readonly board: BoardId | BoardRef;
  readonly total: number;
  /** The first rows of the board (up to TOP_ROWS). */
  readonly top: readonly BoardEntry[];
  /** Rows around you when you're below the top rows (else empty). */
  readonly window: readonly BoardEntry[];
  readonly me: BoardEntry | null;
  readonly above: BoardEntry | null;
  readonly demo: boolean;
  /** Served from the cache because the backend couldn't be reached. */
  readonly stale: boolean;
}

export const TOP_ROWS = 13;
export const WINDOW = 5;
const MAX_QUEUE = 20;
const MAX_AGE_MS = 14 * 86_400_000;

export interface ClientDeps {
  backend: LeaderboardBackend;
  kv?: Kv;
  /** The profile's leaderboard fields (mutated in place) and how to persist them. */
  lb: () => { installId?: string; name?: string };
  save: () => void;
  avatar?: () => string | undefined;
  clientVersion?: string;
  now?: () => number;
  random?: () => number;
  /** Timer for retries (tests pass a fake). */
  schedule?: (fn: () => void, ms: number) => unknown;
}

export class LeaderboardClient {
  readonly backend: LeaderboardBackend;
  private readonly kv: Kv;
  private readonly now: () => number;
  private readonly random: () => number;
  private flushing: Promise<void> | null = null;
  private timer: unknown = null;
  private cache = new Map<string, BoardView>();
  /** Set when the server says this app version is too old to post. */
  upgradeRequired = false;
  /** Called after queued scores post in the background (the UI refreshes). */
  onPosted: ((s: readonly Standing[]) => void) | null = null;

  constructor(private readonly d: ClientDeps) {
    this.backend = d.backend;
    this.kv = d.kv ?? localKv;
    this.now = d.now ?? (() => Date.now());
    this.random = d.random ?? Math.random;
  }

  get demo(): boolean {
    return this.backend.kind === 'mock';
  }

  get name(): string | undefined {
    return this.d.lb().name;
  }

  setName(name: string): void {
    this.d.lb().name = name;
    this.d.save();
  }

  /** The random install id, created on first need (only when the player posts). */
  installId(create = false): string | undefined {
    const lb = this.d.lb();
    if (!lb.installId && create) {
      const a = new Uint8Array(16);
      crypto.getRandomValues(a);
      lb.installId = [...a].map((b) => b.toString(16).padStart(2, '0')).join('');
      this.d.save();
    }
    return lb.installId;
  }

  private queue(): Queued[] {
    try {
      const q = JSON.parse(this.kv.get(K_QUEUE) ?? '[]') as Queued[];
      return Array.isArray(q)
        ? q.filter((x) => x && typeof x === 'object' && x.sub && typeof x.nextAt === 'number')
        : [];
    } catch {
      return [];
    }
  }

  private setQueue(q: Queued[]): void {
    if (q.length) this.kv.set(K_QUEUE, JSON.stringify(q.slice(-MAX_QUEUE)));
    else this.kv.del(K_QUEUE);
  }

  /** Queued submissions (for "posting when you're back online" rows). */
  pending(): readonly ScoreSubmission[] {
    return this.queue().map((q) => q.sub);
  }

  /** Post a finished run under `name` (and remember the name). Never throws. */
  async post(run: FinishedRun, name: string): Promise<PostOutcome> {
    const installId = this.installId(true)!;
    if (name !== this.name) this.setName(name);
    const avatar = this.d.avatar?.();
    const sub: ScoreSubmission = {
      name,
      installId,
      mode: run.mode,
      seed: run.seed,
      ...(run.date ? { date: run.date } : {}),
      ...(run.runToken ? { runToken: run.runToken } : {}),
      teach: run.teach,
      rules: RULES_VERSION,
      moves: run.moves,
      score: run.score,
      clientVersion: this.d.clientVersion ?? 'dev',
      ...(avatar ? { avatar } : {}),
    };
    const q = this.queue().filter((x) => x.sub.moves !== sub.moves || x.sub.seed !== sub.seed);
    q.push({ sub, attempts: 0, nextAt: 0, addedAt: this.now() });
    this.setQueue(q);
    return this.send(sub);
  }

  /** Send one queued submission now; on a retryable failure it stays queued with backoff. */
  private async send(sub: ScoreSubmission): Promise<PostOutcome> {
    try {
      const r = await this.backend.submit(sub);
      this.drop(sub);
      this.cache.clear();
      return { status: 'posted', standings: r.boards };
    } catch (e) {
      const err = e instanceof LbError ? e : new LbError('offline');
      if (err.code === 'upgrade_required') this.upgradeRequired = true;
      if (err.retryable && err.code !== 'upgrade_required') {
        this.backoff(sub, err.retryAfter);
        return { status: 'queued', reason: err.code };
      }
      this.drop(sub);
      return { status: 'rejected', reason: err.code };
    }
  }

  private drop(sub: ScoreSubmission): void {
    this.setQueue(this.queue().filter((x) => !(x.sub.moves === sub.moves && x.sub.seed === sub.seed)));
  }

  private backoff(sub: ScoreSubmission, retryAfterS?: number): void {
    const q = this.queue();
    const it = q.find((x) => x.sub.moves === sub.moves && x.sub.seed === sub.seed);
    if (!it) return;
    it.attempts++;
    const base = Math.min(5 * 60_000, 2000 * 2 ** (it.attempts - 1));
    const wait = Math.max((retryAfterS ?? 0) * 1000, base * (0.75 + 0.5 * this.random()));
    it.nextAt = this.now() + Math.round(wait);
    this.setQueue(q);
    this.arm();
  }

  private arm(): void {
    const q = this.queue();
    if (!q.length || this.timer !== null) return;
    const next = Math.min(...q.map((x) => x.nextAt));
    const schedule = this.d.schedule ?? ((fn: () => void, ms: number) => setTimeout(fn, ms));
    this.timer = schedule(
      () => {
        this.timer = null;
        void this.flush();
      },
      Math.max(0, next - this.now()),
    );
  }

  /** Send every due queued submission (also drops stale ones). Safe to call any time. */
  flush(): Promise<void> {
    this.flushing ??= (async () => {
      try {
        const now = this.now();
        this.setQueue(this.queue().filter((x) => now - x.addedAt < MAX_AGE_MS));
        const posted: Standing[] = [];
        for (const it of this.queue()) {
          if (it.nextAt > now) continue;
          const r = await this.send(it.sub);
          if (r.status === 'posted') posted.push(...r.standings);
          else if (r.status === 'queued' && (r.reason === 'offline' || r.reason === 'timeout')) break; // still offline
        }
        if (posted.length) this.onPosted?.(posted);
      } finally {
        this.flushing = null;
        this.arm();
      }
    })();
    return this.flushing;
  }

  /** A board as the UI shows it: top rows, your window, who's just above you. Cached for offline. */
  async view(board: BoardRef): Promise<BoardView> {
    const id = this.installId();
    try {
      const [top, around] = await Promise.all([
        this.backend.top(board, TOP_ROWS),
        id ? this.backend.around(board, id, WINDOW) : Promise.resolve(null),
      ]);
      const me = around?.me ?? null;
      const inTop = me ? me.rank <= TOP_ROWS : false;
      const v: BoardView = {
        board: top.board,
        total: Math.max(top.total, around?.total ?? 0),
        top: top.entries.map((e) => (me && inTop && e.rank === me.rank ? { ...e, me: true } : e)),
        window: me && !inTop ? (around?.entries ?? []) : [],
        me,
        above: around?.above ?? null,
        demo: this.demo,
        stale: false,
      };
      this.cache.set(board, v);
      return v;
    } catch (e) {
      const c = this.cache.get(board);
      if (c && e instanceof LbError && e.retryable) return { ...c, stale: true };
      throw e;
    }
  }

  /** Erase all progress: forget queued scores and ask the server to delete this player. */
  forgetQueue(): void {
    this.kv.del(K_QUEUE);
    this.cache.clear();
  }

  /** Delete players recorded by Erase all progress (tombstones survive a reload until confirmed). */
  async processForget(): Promise<void> {
    for (const id of readForget()) {
      try {
        await this.backend.deletePlayer(id);
        clearForget(id);
      } catch (e) {
        if (!(e instanceof LbError) || !e.retryable) clearForget(id);
      }
    }
  }

  /**
   * Keep one spare Endless ticket so the next classic game can be ranked (HTTP only). Sends the
   * install id only if the player has opted in; otherwise the ticket is unbound (no identifier).
   */
  async prefetchTicket(): Promise<void> {
    if (this.backend.kind !== 'http' || readTicket(this.now())) return;
    try {
      const t = await this.backend.startRun(this.installId(), false);
      if (t) storeTicket({ seed: t.seed, runToken: t.runToken, expiresAt: t.expiresAt });
    } catch {
      /* not now */
    }
  }
}
