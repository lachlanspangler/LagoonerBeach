/**
 * Leaderboard domain (pure; shared by the app, the mock backend and the server): board ids and
 * periods, the wire types, submission checks (shape → name → rules → seed → replay) and an in-memory
 * ranking table used by the mock backend and the server's test store.
 *
 * Boards: `daily:YYYY-MM-DD` (the player's LOCAL date, the same key the Daily seed uses),
 * `endless:all`, `endless:wYYYY-WW` (ISO week, UTC). Ranking: score desc, then earlier `at`, then
 * insertion order. Best score per player per board, except Daily, where the first finish counts.
 */
import { dailySeed } from '../core/daily.ts';
import { MAX_LOG_MOVES } from '../core/movelog.ts';
import { verifyRun } from '../core/verify.ts';
import type { GameState } from '../core/game.ts';
import { NAME_MAX, validateName, sanitizeNameInput } from './names.ts';
import { SPECIES_BY_ID } from './creatures.ts';

export type BoardId = `daily:${string}` | 'endless:all' | `endless:w${string}`;
/** What a client may ask for: a concrete board, or the server's current week. */
export type BoardRef = BoardId | 'endless:week';
export type LbMode = 'daily' | 'endless';

export const ALL_TIME: BoardId = 'endless:all';
export const CURRENT_WEEK: BoardRef = 'endless:week';

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;
const HOUR = 3_600_000;
const DAY = 24 * HOUR;

export const LB_LIMITS = {
  maxMoves: MAX_LOG_MOVES,
  maxBody: 16_384,
  topMax: 100,
  aroundMax: 10,
  /** A Daily date is open from 14 h before its UTC midnight until 14 h after its UTC end (~52 h). */
  dailyEarlyMs: 14 * HOUR,
  dailyLateMs: DAY + 14 * HOUR,
  /** Endless run tokens are single use and live this long. */
  runTokenMs: 72 * HOUR,
  /**
   * Below this average pace, measured from the run's server-recorded start (`POST /v1/runs/:rid/start`,
   * sent at the first move), an Endless run is stored hidden (shadow), not rejected.
   */
  minMsPerMove: 250,
  /** Distinct install ids one (salted) IP hash may use per UTC day, on runs and submissions. */
  idsPerIpDay: 5,
  /** Rows one (salted) IP hash may add to a single Daily board. */
  dailyRowsPerIp: 3,
};

export const isDay = (s: unknown): s is string =>
  typeof s === 'string' && DAY_RE.test(s) && !Number.isNaN(Date.parse(`${s}T00:00:00Z`));

export function utcDay(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

/** ISO 8601 week of a calendar date: `2026-W42` → board `endless:w2026-42`. */
export function isoWeek(day: string): { year: number; week: number } {
  const [y, m, d] = day.split('-').map(Number) as [number, number, number];
  const t = Date.UTC(y, m - 1, d);
  const dow = (new Date(t).getUTCDay() + 6) % 7; // Monday = 0
  const thursday = t + (3 - dow) * DAY;
  const year = new Date(thursday).getUTCFullYear();
  const week = 1 + Math.floor((thursday - Date.UTC(year, 0, 1)) / (7 * DAY));
  return { year, week };
}

export const dailyBoard = (day: string): BoardId => `daily:${day}`;
export function weekBoard(day: string): BoardId {
  const { year, week } = isoWeek(day);
  return `endless:w${year}-${String(week).padStart(2, '0')}`;
}

/** Validate a board id from a URL or storage. */
export function parseBoard(s: string): BoardRef | null {
  if (s === ALL_TIME || s === CURRENT_WEEK) return s;
  if (s.startsWith('daily:') && isDay(s.slice(6))) return s as BoardId;
  const w = /^endless:w(\d{4})-(\d{2})$/.exec(s);
  if (w && Number(w[2]) >= 1 && Number(w[2]) <= 53) return s as BoardId;
  return null;
}

/** `endless:week` → this week's board, by the given day (server: UTC; mock: local). */
export const resolveBoard = (b: BoardRef, day: string): BoardId => (b === CURRENT_WEEK ? weekBoard(day) : b);

export type DailyWindow = 'early' | 'open' | 'closed';
export function dailyWindow(day: string, now: number): DailyWindow {
  const start = Date.parse(`${day}T00:00:00Z`);
  if (now < start - LB_LIMITS.dailyEarlyMs) return 'early';
  if (now >= start + LB_LIMITS.dailyLateMs) return 'closed';
  return 'open';
}

// ── wire types ─────────────────────────────────────────────────────────────────────────────
export interface BoardEntry {
  readonly rank: number;
  readonly name: string;
  readonly score: number;
  readonly moves: number;
  /** Species id shown as the player's avatar (their chosen journal creature). */
  readonly avatar?: string;
  readonly me?: boolean;
}

export interface Standing {
  readonly board: BoardId;
  readonly rank: number;
  readonly total: number;
  readonly best: number;
  /** This submission raised your best on the board. */
  readonly improved: boolean;
  readonly above: BoardEntry | null;
}

export interface TopResponse {
  readonly board: BoardId;
  readonly total: number;
  readonly entries: readonly BoardEntry[];
}

export interface AroundResponse extends TopResponse {
  readonly me: BoardEntry | null;
  readonly above: BoardEntry | null;
}

export interface ScoreSubmission {
  readonly name: string;
  readonly installId: string;
  readonly mode: LbMode;
  readonly seed: number;
  /** Daily: the local date that produced the seed. */
  readonly date?: string;
  /** Endless: the server-issued run token. */
  readonly runToken?: string;
  readonly teach: boolean;
  readonly rules: number;
  /** Packed move log (core/movelog.ts). */
  readonly moves: string;
  readonly score: number;
  readonly clientVersion: string;
  /** Optional avatar: a Beach Journal species id. */
  readonly avatar?: string;
}

export interface SubmitResponse {
  readonly verifiedScore: number;
  readonly boards: readonly Standing[];
}

export interface RunTicket {
  /** The run id inside the token (for `POST /v1/runs/:runId/start`). */
  readonly runId: string;
  readonly runToken: string;
  readonly seed: number;
  readonly issuedAt: number;
  readonly expiresAt: number;
}

export type LbErrorCode =
  | 'bad_request'
  | 'banned'
  | 'not_found'
  | 'not_ranked'
  | 'duplicate_run'
  | 'board_closed'
  | 'payload_too_large'
  | 'replay_invalid'
  | 'score_mismatch'
  | 'name_rejected'
  | 'token_invalid'
  | 'token_expired'
  | 'seed_mismatch'
  | 'upgrade_required'
  | 'rate_limited'
  | 'board_limit'
  | 'overloaded';

export const ERROR_STATUS: Record<LbErrorCode, number> = {
  bad_request: 400,
  banned: 403,
  not_found: 404,
  not_ranked: 404,
  duplicate_run: 409,
  board_closed: 410,
  payload_too_large: 413,
  replay_invalid: 422,
  score_mismatch: 422,
  name_rejected: 422,
  token_invalid: 422,
  token_expired: 422,
  seed_mismatch: 422,
  upgrade_required: 426,
  rate_limited: 429,
  /** Not retryable: this network already has its share of rows on that Daily board. */
  board_limit: 429,
  overloaded: 503,
};

/** Errors worth retrying later (everything else drops the queued submission). */
export const RETRYABLE: ReadonlySet<string> = new Set([
  'offline',
  'timeout',
  'rate_limited',
  'overloaded',
  'upgrade_required',
]);

export const INSTALL_ID_RE = /^[0-9a-f]{32}$/;

/**
 * The public claims of a run token (`base64url(JSON).signature`), read WITHOUT checking the
 * signature: the client uses it to know a run's id and expiry (the server verifies for real).
 */
export function peekRunToken(token: string | undefined): { rid: string; iat: number; exp: number } | null {
  const body = token?.split('.')[0];
  if (!body || !/^[A-Za-z0-9_-]+$/.test(body)) return null;
  try {
    const c = JSON.parse(
      atob(body.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (body.length % 4)) % 4)),
    ) as Record<string, unknown>;
    return typeof c.rid === 'string' && typeof c.iat === 'number' && typeof c.exp === 'number'
      ? { rid: c.rid, iat: c.iat, exp: c.exp }
      : null;
  } catch {
    return null;
  }
}

// ── submission checks ──────────────────────────────────────────────────────────────────────
export type Checked =
  { ok: true; sub: ScoreSubmission; state: GameState } | { ok: false; code: LbErrorCode; message: string };

const fail = (code: LbErrorCode, message: string): Checked => ({ ok: false, code, message });
const isUint32 = (n: unknown): n is number => typeof n === 'number' && Number.isInteger(n) && n >= 0 && n <= 0xffffffff;

/**
 * Everything about a submission that needs no storage or secrets: shape, name, rules version, the
 * Daily seed and date window, and the replay (score must match, game must be over). Endless run
 * tokens are checked by the caller (server) after this.
 */
export function checkSubmission(raw: unknown, now: number, rules: number): Checked {
  if (!raw || typeof raw !== 'object') return fail('bad_request', 'body must be an object');
  const o = raw as Record<string, unknown>;
  if (o.mode !== 'daily' && o.mode !== 'endless') return fail('bad_request', 'mode');
  if (typeof o.installId !== 'string' || !INSTALL_ID_RE.test(o.installId)) return fail('bad_request', 'installId');
  if (!isUint32(o.seed)) return fail('bad_request', 'seed');
  if (!isUint32(o.score)) return fail('bad_request', 'score');
  if (!isUint32(o.rules)) return fail('bad_request', 'rules');
  if (typeof o.moves !== 'string' || o.moves.length > Math.ceil((LB_LIMITS.maxMoves * 4) / 3))
    return fail('bad_request', 'moves');
  if (o.teach !== undefined && typeof o.teach !== 'boolean') return fail('bad_request', 'teach');
  const cv = typeof o.clientVersion === 'string' ? o.clientVersion.slice(0, 24) : '';
  if (typeof o.name !== 'string' || o.name.length > NAME_MAX * 2) return fail('name_rejected', 'name');
  const name = o.name.toUpperCase();
  if (!validateName(name).ok) return fail('name_rejected', 'name');
  if (o.rules !== rules) return fail('upgrade_required', `rules ${o.rules} ≠ ${rules}`);
  const teach = o.mode === 'endless' && o.teach === true;

  let date: string | undefined;
  if (o.mode === 'daily') {
    if (!isDay(o.date)) return fail('bad_request', 'date');
    date = o.date;
    const w = dailyWindow(date, now);
    if (w === 'closed') return fail('board_closed', `daily ${date} is final`);
    if (w === 'early') return fail('seed_mismatch', `daily ${date} hasn't started anywhere yet`);
    if (o.seed !== dailySeed(date)) return fail('seed_mismatch', 'not the seed for that date');
  }
  const v = verifyRun({ mode: o.mode, seed: o.seed, teach, moves: o.moves });
  if (!v.ok) return fail('replay_invalid', v.reason);
  if (v.state.score !== o.score) return fail('score_mismatch', `replayed ${v.state.score}`);

  const avatar = typeof o.avatar === 'string' && SPECIES_BY_ID.has(o.avatar) ? o.avatar : undefined;
  const sub: ScoreSubmission = {
    name,
    installId: o.installId,
    mode: o.mode,
    seed: o.seed,
    teach,
    rules: o.rules,
    moves: o.moves,
    score: o.score,
    clientVersion: cv,
    ...(date ? { date } : {}),
    ...(avatar ? { avatar } : {}),
    ...(typeof o.runToken === 'string' ? { runToken: o.runToken.slice(0, 1024) } : {}),
  };
  return { ok: true, sub, state: v.state };
}

/**
 * The boards a verified submission lands on. Endless weeks come from `weekDay`: the day the server
 * received the submission (never the ticket's issue time, which can be days earlier).
 */
export function boardsFor(sub: Pick<ScoreSubmission, 'mode' | 'date'>, weekDay: string): BoardId[] {
  return sub.mode === 'daily' ? [dailyBoard(sub.date!)] : [ALL_TIME, weekBoard(weekDay)];
}

/** Daily: the first finish counts (no grinding a public seed). Endless: best score. */
export const policyFor = (b: BoardId): 'first' | 'best' => (b.startsWith('daily:') ? 'first' : 'best');

// ── in-memory ranking table (mock backend + server test store) ─────────────────────────────
export interface Row {
  id: string;
  name: string;
  score: number;
  moves: number;
  at: number;
  seq: number;
  visible: boolean;
  avatar?: string;
}

/** a ranks above b */
export const ranksAbove = (a: Row, b: Row): boolean =>
  a.score !== b.score ? a.score > b.score : a.at !== b.at ? a.at < b.at : a.seq < b.seq;

export class BoardTable {
  private boards = new Map<string, Map<string, Row>>();
  private seq = 0;

  /** Insert or improve `row.id`'s entry. Returns whether it changed and the stored best. */
  put(board: BoardId, r: Omit<Row, 'seq'>, policy: 'first' | 'best'): { improved: boolean; best: number } {
    let b = this.boards.get(board);
    if (!b) this.boards.set(board, (b = new Map()));
    const old = b.get(r.id);
    if (old && (policy === 'first' || r.score <= old.score)) {
      old.name = r.name;
      old.avatar = r.avatar;
      return { improved: false, best: old.score };
    }
    b.set(r.id, { ...r, seq: old?.seq ?? this.seq++ });
    return { improved: true, best: r.score };
  }

  /** A player's display name/avatar changes on every board at once. */
  rename(id: string, name: string, avatar?: string): void {
    for (const b of this.boards.values()) {
      const r = b.get(id);
      if (r) {
        r.name = name;
        r.avatar = avatar;
      }
    }
  }

  /** Rows visible to `viewer` (shadow rows are only visible to their owner), best first. */
  private sorted(board: BoardId, viewer?: string): Row[] {
    const rows = [...(this.boards.get(board)?.values() ?? [])].filter((r) => r.visible || r.id === viewer);
    return rows.sort((a, b) => (ranksAbove(a, b) ? -1 : ranksAbove(b, a) ? 1 : 0));
  }

  private entry(r: Row, i: number, viewer?: string): BoardEntry {
    return {
      rank: i + 1,
      name: r.name,
      score: r.score,
      moves: r.moves,
      ...(r.avatar ? { avatar: r.avatar } : {}),
      ...(r.id === viewer ? { me: true } : {}),
    };
  }

  top(board: BoardId, limit: number, viewer?: string): TopResponse {
    const rows = this.sorted(board, viewer);
    return { board, total: rows.length, entries: rows.slice(0, limit).map((r, i) => this.entry(r, i, viewer)) };
  }

  around(board: BoardId, id: string, above: number, below: number): AroundResponse {
    const rows = this.sorted(board, id);
    const i = rows.findIndex((r) => r.id === id);
    if (i < 0) return { board, total: rows.length, me: null, above: null, entries: [] };
    const lo = Math.max(0, i - above);
    const entries = rows.slice(lo, i + below + 1).map((r, k) => this.entry(r, lo + k, id));
    return {
      board,
      total: rows.length,
      me: this.entry(rows[i]!, i, id),
      above: i > 0 ? this.entry(rows[i - 1]!, i - 1) : null,
      entries,
    };
  }

  standing(board: BoardId, id: string, improved: boolean): Standing | null {
    const a = this.around(board, id, 0, 0);
    if (!a.me) return null;
    return { board, rank: a.me.rank, total: a.total, best: a.me.score, improved, above: a.above };
  }

  deletePlayer(id: string): void {
    for (const b of this.boards.values()) b.delete(id);
  }

  /** Persistable rows (mock backend). */
  dump(): Record<string, Row[]> {
    return Object.fromEntries([...this.boards].map(([k, m]) => [k, [...m.values()]]));
  }

  load(d: unknown, keep: (r: Row) => boolean = () => true): void {
    if (!d || typeof d !== 'object') return;
    for (const [board, rows] of Object.entries(d as Record<string, unknown>)) {
      if (!parseBoard(board) || !Array.isArray(rows)) continue;
      for (const x of rows as Partial<Row>[]) {
        if (!x || typeof x.id !== 'string' || !isUint32(x.score) || typeof x.at !== 'number') continue;
        const name = sanitizeNameInput(String(x.name ?? ''));
        const r: Row = {
          id: x.id,
          name: name || 'PLAYER',
          score: x.score,
          moves: isUint32(x.moves) ? x.moves : 0,
          at: x.at,
          seq: isUint32(x.seq) ? x.seq : this.seq,
          visible: x.visible !== false,
          ...(typeof x.avatar === 'string' && SPECIES_BY_ID.has(x.avatar) ? { avatar: x.avatar } : {}),
        };
        if (!keep(r)) continue;
        this.seq = Math.max(this.seq, r.seq + 1);
        let b = this.boards.get(board);
        if (!b) this.boards.set(board, (b = new Map()));
        b.set(r.id, r);
      }
    }
  }
}

/**
 * "Resets in 2d 4h": the Daily starts over at local midnight, the week board at Monday 00:00 UTC
 * (ISO weeks, as the server files them).
 */
export function resetsIn(kind: 'daily' | 'week', now: Date): string {
  let end: number;
  if (kind === 'daily') end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getTime();
  else {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const toMonday = (8 - d.getUTCDay()) % 7 || 7; // Sunday → 1, Monday → 7
    end = d.getTime() + toMonday * 86_400_000;
  }
  const m = Math.max(1, Math.ceil((end - now.getTime()) / 60_000));
  const dd = Math.floor(m / 1440);
  const hh = Math.floor((m % 1440) / 60);
  const mm = m % 60;
  return `Resets in ${dd ? `${dd}d ${hh}h` : hh ? `${hh}h ${mm}m` : `${mm}m`}`;
}
