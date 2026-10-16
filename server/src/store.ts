/**
 * Storage seam for the leaderboard Worker. `D1Store` (d1.ts) is production; `MemoryStore` backs the
 * unit tests (and documents the semantics the SQL must match).
 */
import {
  BoardTable,
  LB_LIMITS,
  type AroundResponse,
  type BoardId,
  type Standing,
  type TopResponse,
} from '../../src/meta/boards.ts';

export interface ScoreRow {
  readonly id: string;
  readonly name: string;
  readonly avatar?: string;
  readonly score: number;
  readonly moves: number;
  readonly at: number;
  readonly visible: boolean;
  readonly seed: number;
  readonly rules: number;
  /** Packed move log, kept for audit / re-verification after a core fix. */
  readonly log: string;
}

export type RunUse = 'ok' | 'same' | 'used';

export interface Store {
  player(id: string): Promise<{ name: string; banned: boolean } | null>;
  /** Create or update a player's public name and avatar (applies to all their rows). */
  putPlayer(id: string, name: string, avatar: string | undefined, now: number): Promise<void>;
  /** Insert or improve a player's row ('first': never replace; 'best': replace only if higher). */
  submit(board: BoardId, row: ScoreRow, policy: 'first' | 'best'): Promise<{ improved: boolean; best: number }>;
  standing(board: BoardId, id: string, improved: boolean): Promise<Standing | null>;
  /** The first rows. With a `viewer`, their row carries `me` (and their shadow row is included). */
  top(board: BoardId, limit: number, viewer?: string): Promise<TopResponse>;
  around(board: BoardId, id: string, above: number, below: number): Promise<AroundResponse>;
  /** Mark a run token used. 'same' = this player already used it for this exact run (a retry). */
  useRun(runId: string, playerId: string, runHash: string, now: number): Promise<RunUse>;
  /** Record when a run's first move was made (the first call wins); returns the recorded time. */
  startRun(runId: string, now: number): Promise<number>;
  /** When the run started (server time), or null if the client never said (an offline start). */
  runStart(runId: string): Promise<number | null>;
  /** Fixed-window counter; false once `limit` is exceeded within `windowMs`. */
  hit(key: string, now: number, windowMs: number, limit: number): Promise<boolean>;
  /**
   * Bounded set membership: add `member` to `scope` (kept until `expiresAt`) unless the scope already
   * holds `max` live members. True if the member is (now) in the set. Used for per-IP-hash caps.
   */
  admit(scope: string, member: string, max: number, expiresAt: number, now: number): Promise<boolean>;
  deletePlayer(id: string): Promise<void>;
  /** Retention: old dailies/weeks, spent tokens and run starts, stale rate counters and IP sets. */
  cleanup(now: number): Promise<void>;
}

/** Longest rate-limit window (counters older than this are dead and pruned). */
export const RATE_WINDOW_MAX_MS = 3_600_000;

export class MemoryStore implements Store {
  readonly table = new BoardTable();
  readonly players = new Map<string, { name: string; avatar?: string; banned: boolean; createdAt: number }>();
  readonly logs = new Map<string, ScoreRow>();
  readonly runs = new Map<string, { playerId: string; hash: string; at: number }>();
  readonly rate = new Map<string, { start: number; n: number }>();
  readonly starts = new Map<string, number>();
  readonly sets = new Map<string, Map<string, number>>();

  async player(id: string) {
    const p = this.players.get(id);
    return p ? { name: p.name, banned: p.banned } : null;
  }

  async putPlayer(id: string, name: string, avatar: string | undefined, now: number) {
    const p = this.players.get(id);
    this.players.set(id, { name, avatar, banned: p?.banned ?? false, createdAt: p?.createdAt ?? now });
    this.table.rename(id, name, avatar);
  }

  async submit(board: BoardId, row: ScoreRow, policy: 'first' | 'best') {
    const r = this.table.put(
      board,
      {
        id: row.id,
        name: row.name,
        score: row.score,
        moves: row.moves,
        at: row.at,
        visible: row.visible,
        ...(row.avatar ? { avatar: row.avatar } : {}),
      },
      policy,
    );
    if (r.improved) this.logs.set(`${board}|${row.id}`, row);
    return r;
  }

  async standing(board: BoardId, id: string, improved: boolean) {
    return this.table.standing(board, id, improved);
  }

  async top(board: BoardId, limit: number, viewer?: string) {
    return this.table.top(board, limit, viewer);
  }

  async around(board: BoardId, id: string, above: number, below: number) {
    return this.table.around(board, id, above, below);
  }

  async useRun(runId: string, playerId: string, hash: string, now: number): Promise<RunUse> {
    const u = this.runs.get(runId);
    if (!u) {
      this.runs.set(runId, { playerId, hash, at: now });
      return 'ok';
    }
    return u.playerId === playerId && u.hash === hash ? 'same' : 'used';
  }

  async startRun(runId: string, now: number) {
    const t = this.starts.get(runId);
    if (t !== undefined) return t;
    this.starts.set(runId, now);
    return now;
  }

  async runStart(runId: string) {
    return this.starts.get(runId) ?? null;
  }

  async admit(scope: string, member: string, max: number, expiresAt: number, now: number) {
    let s = this.sets.get(scope);
    if (!s) this.sets.set(scope, (s = new Map()));
    for (const [m, exp] of s) if (exp <= now) s.delete(m);
    if (s.has(member)) return true;
    if (s.size >= max) return false;
    s.set(member, expiresAt);
    return true;
  }

  async hit(key: string, now: number, windowMs: number, limit: number) {
    const c = this.rate.get(key);
    if (!c || now - c.start >= windowMs) {
      this.rate.set(key, { start: now, n: 1 });
      return 1 <= limit;
    }
    c.n++;
    return c.n <= limit;
  }

  async deletePlayer(id: string) {
    this.table.deletePlayer(id);
    this.players.delete(id);
    for (const k of [...this.logs.keys()]) if (k.endsWith(`|${id}`)) this.logs.delete(k);
    for (const [k, v] of this.runs) if (v.playerId === id) this.runs.delete(k);
    for (const k of [...this.rate.keys()]) if (k.endsWith(`:${id}`)) this.rate.delete(k);
  }

  async cleanup(now: number) {
    for (const [k, v] of this.runs) if (now - v.at > LB_LIMITS.runTokenMs) this.runs.delete(k);
    for (const [k, at] of this.starts) if (now - at > LB_LIMITS.runTokenMs) this.starts.delete(k);
    for (const [k, v] of this.rate) if (now - v.start > RATE_WINDOW_MAX_MS) this.rate.delete(k);
    for (const [k, s] of this.sets) {
      for (const [m, exp] of s) if (exp <= now) s.delete(m);
      if (!s.size) this.sets.delete(k);
    }
  }
}
