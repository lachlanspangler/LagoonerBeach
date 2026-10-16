/**
 * Cloudflare D1 (SQLite) implementation of the Store. Schema: server/schema.sql. Ranks are exact,
 * via the (board, visible, score DESC, at, seq) index: COUNT of better rows reads O(rank) index
 * entries, fine to ~100k DAU. Past that, see the score-histogram plan in docs/adr/0010.
 *
 * Not exercised by unit tests (no SQLite in the toolchain on Node 20); MemoryStore defines the
 * semantics. Smoke-test with `npx wrangler@4.86 dev` + the curl script in docs/server/DEPLOY.md.
 */
import {
  LB_LIMITS,
  utcDay,
  weekBoard,
  type AroundResponse,
  type BoardEntry,
  type BoardId,
  type Standing,
} from '../../src/meta/boards.ts';
import { RATE_WINDOW_MAX_MS, type RunUse, type ScoreRow, type Store } from './store.ts';

// Minimal D1 types (avoids a dependency on @cloudflare/workers-types).
export interface D1Result<T> {
  results: T[];
  meta: { changes?: number };
}
export interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  all<T = Record<string, unknown>>(): Promise<D1Result<T>>;
  run(): Promise<D1Result<unknown>>;
}
export interface D1Database {
  prepare(sql: string): D1PreparedStatement;
  batch(stmts: D1PreparedStatement[]): Promise<D1Result<unknown>[]>;
}

interface Me {
  score: number;
  at: number;
  seq: number;
  visible: number;
  moves: number;
  name: string;
  avatar: string | null;
}
interface EntryRow {
  name: string;
  avatar: string | null;
  score: number;
  moves: number;
}

const BETTER = `(s.score > ?2 OR (s.score = ?2 AND (s.at < ?3 OR (s.at = ?3 AND s.seq < ?4))))`;
const WORSE = `(s.score < ?2 OR (s.score = ?2 AND (s.at > ?3 OR (s.at = ?3 AND s.seq > ?4))))`;
const ENTRY = `p.name AS name, p.avatar AS avatar, s.score AS score, s.moves AS moves`;
const JOIN = `FROM scores s JOIN players p ON p.id = s.player_id`;

const entry = (r: EntryRow, rank: number, me = false): BoardEntry => ({
  rank,
  name: r.name,
  score: r.score,
  moves: r.moves,
  ...(r.avatar ? { avatar: r.avatar } : {}),
  ...(me ? { me: true } : {}),
});

export class D1Store implements Store {
  constructor(private readonly db: D1Database) {}

  async player(id: string) {
    const r = await this.db
      .prepare('SELECT name, banned FROM players WHERE id = ?1')
      .bind(id)
      .first<{ name: string; banned: number }>();
    return r ? { name: r.name, banned: r.banned === 1 } : null;
  }

  async putPlayer(id: string, name: string, avatar: string | undefined, now: number) {
    await this.db
      .prepare(
        `INSERT INTO players (id, name, avatar, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?4)
         ON CONFLICT (id) DO UPDATE SET name = excluded.name, avatar = excluded.avatar, updated_at = excluded.updated_at`,
      )
      .bind(id, name, avatar ?? null, now)
      .run();
  }

  async submit(board: BoardId, r: ScoreRow, policy: 'first' | 'best') {
    const conflict =
      policy === 'first'
        ? 'ON CONFLICT (board, player_id) DO NOTHING'
        : `ON CONFLICT (board, player_id) DO UPDATE SET score = excluded.score, moves = excluded.moves, at = excluded.at,
             visible = excluded.visible, seed = excluded.seed, rules = excluded.rules, log = excluded.log
           WHERE excluded.score > scores.score`;
    const res = await this.db
      .prepare(
        `INSERT INTO scores (board, player_id, score, moves, at, seq, visible, seed, rules, log)
         VALUES (?1, ?2, ?3, ?4, ?5, (SELECT COALESCE(MAX(seq), 0) + 1 FROM scores WHERE board = ?1), ?6, ?7, ?8, ?9)
         ${conflict}`,
      )
      .bind(board, r.id, r.score, r.moves, r.at, r.visible ? 1 : 0, r.seed, r.rules, r.log)
      .run();
    const improved = (res.meta.changes ?? 0) > 0;
    const best = await this.db
      .prepare('SELECT score FROM scores WHERE board = ?1 AND player_id = ?2')
      .bind(board, r.id)
      .first<{ score: number }>();
    return { improved, best: best?.score ?? r.score };
  }

  private async me(board: BoardId, id: string): Promise<Me | null> {
    return this.db
      .prepare(
        `SELECT s.score, s.at, s.seq, s.visible, s.moves, p.name, p.avatar ${JOIN} WHERE s.board = ?1 AND s.player_id = ?2`,
      )
      .bind(board, id)
      .first<Me>();
  }

  private async count(board: BoardId): Promise<number> {
    const r = await this.db
      .prepare('SELECT COUNT(*) AS n FROM scores WHERE board = ?1 AND visible = 1')
      .bind(board)
      .first<{ n: number }>();
    return r?.n ?? 0;
  }

  private async rankOf(board: BoardId, m: Me): Promise<number> {
    const r = await this.db
      .prepare(`SELECT COUNT(*) AS n FROM scores s WHERE s.board = ?1 AND s.visible = 1 AND ${BETTER}`)
      .bind(board, m.score, m.at, m.seq)
      .first<{ n: number }>();
    return 1 + (r?.n ?? 0);
  }

  private async neighbours(board: BoardId, m: Me, dir: 'above' | 'below', limit: number): Promise<EntryRow[]> {
    if (limit <= 0) return [];
    const sql =
      dir === 'above'
        ? `SELECT ${ENTRY} ${JOIN} WHERE s.board = ?1 AND s.visible = 1 AND ${BETTER} ORDER BY s.score ASC, s.at DESC, s.seq DESC LIMIT ?5`
        : `SELECT ${ENTRY} ${JOIN} WHERE s.board = ?1 AND s.visible = 1 AND ${WORSE} ORDER BY s.score DESC, s.at ASC, s.seq ASC LIMIT ?5`;
    return (await this.db.prepare(sql).bind(board, m.score, m.at, m.seq, limit).all<EntryRow>()).results;
  }

  async standing(board: BoardId, id: string, improved: boolean): Promise<Standing | null> {
    const m = await this.me(board, id);
    if (!m) return null;
    const rank = await this.rankOf(board, m);
    const [above] = await this.neighbours(board, m, 'above', 1);
    const total = (await this.count(board)) + (m.visible ? 0 : 1);
    return { board, rank, total, best: m.score, improved, above: above ? entry(above, rank - 1) : null };
  }

  async top(board: BoardId, limit: number, viewer?: string) {
    // with a viewer: their row is tagged (and their own shadow row shows, like in `around`)
    const rows = await this.db
      .prepare(
        `SELECT ${ENTRY}, (s.player_id = ?3) AS me ${JOIN}
         WHERE s.board = ?1 AND (s.visible = 1 OR s.player_id = ?3)
         ORDER BY s.score DESC, s.at ASC, s.seq ASC LIMIT ?2`,
      )
      .bind(board, limit, viewer ?? '')
      .all<EntryRow & { me: number }>();
    const shadow = viewer ? await this.me(board, viewer) : null;
    return {
      board,
      total: (await this.count(board)) + (shadow && !shadow.visible ? 1 : 0),
      entries: rows.results.map((r, i) => entry(r, i + 1, r.me === 1)),
    };
  }

  async around(board: BoardId, id: string, above: number, below: number): Promise<AroundResponse> {
    const m = await this.me(board, id);
    const total = await this.count(board);
    if (!m) return { board, total, me: null, above: null, entries: [] };
    const rank = await this.rankOf(board, m);
    const up = (await this.neighbours(board, m, 'above', Math.max(1, above))).reverse();
    const down = await this.neighbours(board, m, 'below', below);
    const me = entry(m, rank, true);
    const shownUp = up.slice(Math.max(0, up.length - above));
    return {
      board,
      total: total + (m.visible ? 0 : 1),
      me,
      above: up.length ? entry(up[up.length - 1]!, rank - 1) : null,
      entries: [
        ...shownUp.map((r, i) => entry(r, rank - shownUp.length + i)),
        me,
        ...down.map((r, i) => entry(r, rank + 1 + i)),
      ],
    };
  }

  async useRun(runId: string, playerId: string, hash: string, now: number): Promise<RunUse> {
    const res = await this.db
      .prepare(
        'INSERT INTO used_runs (run_id, player_id, run_hash, used_at) VALUES (?1, ?2, ?3, ?4) ON CONFLICT (run_id) DO NOTHING',
      )
      .bind(runId, playerId, hash, now)
      .run();
    if ((res.meta.changes ?? 0) > 0) return 'ok';
    const u = await this.db
      .prepare('SELECT player_id, run_hash FROM used_runs WHERE run_id = ?1')
      .bind(runId)
      .first<{ player_id: string; run_hash: string }>();
    return u && u.player_id === playerId && u.run_hash === hash ? 'same' : 'used';
  }

  async startRun(runId: string, now: number) {
    const r = await this.db
      .prepare(
        `INSERT INTO started_runs (run_id, started_at) VALUES (?1, ?2)
         ON CONFLICT (run_id) DO UPDATE SET started_at = started_runs.started_at
         RETURNING started_at`,
      )
      .bind(runId, now)
      .first<{ started_at: number }>();
    return r?.started_at ?? now;
  }

  async runStart(runId: string) {
    const r = await this.db
      .prepare('SELECT started_at FROM started_runs WHERE run_id = ?1')
      .bind(runId)
      .first<{ started_at: number }>();
    return r?.started_at ?? null;
  }

  async admit(scope: string, member: string, max: number, expiresAt: number, now: number) {
    // insert only while the scope has room; an existing member is always admitted
    await this.db
      .prepare(
        `INSERT INTO ip_sets (scope, member, expires_at)
         SELECT ?1, ?2, ?4 WHERE (SELECT COUNT(*) FROM ip_sets WHERE scope = ?1 AND expires_at > ?5) < ?3
         ON CONFLICT (scope, member) DO NOTHING`,
      )
      .bind(scope, member, max, expiresAt, now)
      .run();
    const r = await this.db
      .prepare('SELECT 1 AS ok FROM ip_sets WHERE scope = ?1 AND member = ?2')
      .bind(scope, member)
      .first<{ ok: number }>();
    return !!r;
  }

  async hit(key: string, now: number, windowMs: number, limit: number) {
    const r = await this.db
      .prepare(
        `INSERT INTO rate (key, window_start, n) VALUES (?1, ?2, 1)
         ON CONFLICT (key) DO UPDATE SET
           n = CASE WHEN rate.window_start <= ?2 - ?3 THEN 1 ELSE rate.n + 1 END,
           window_start = CASE WHEN rate.window_start <= ?2 - ?3 THEN ?2 ELSE rate.window_start END
         RETURNING n`,
      )
      .bind(key, now, windowMs)
      .first<{ n: number }>();
    return (r?.n ?? 1) <= limit;
  }

  async deletePlayer(id: string) {
    await this.db.batch([
      this.db.prepare('DELETE FROM scores WHERE player_id = ?1').bind(id),
      this.db.prepare('DELETE FROM used_runs WHERE player_id = ?1').bind(id),
      this.db.prepare("DELETE FROM rate WHERE key IN ('submit:' || ?1, 'runs:' || ?1, 'reads:' || ?1)").bind(id),
      this.db.prepare('DELETE FROM players WHERE id = ?1').bind(id),
    ]);
  }

  async cleanup(now: number) {
    await this.db.batch([
      // dailies are final ~2 days after their date; keep 30 days of history
      this.db
        .prepare("DELETE FROM scores WHERE board LIKE 'daily:%' AND board < ?1")
        .bind(`daily:${utcDay(now - 30 * 86_400_000)}`),
      // weekly boards: keep 8 weeks (board ids sort by year-week)
      this.db
        .prepare("DELETE FROM scores WHERE board LIKE 'endless:w%' AND board < ?1")
        .bind(weekBoard(utcDay(now - 8 * 7 * 86_400_000))),
      // a spent token is useless once it has expired (it was issued before it was used)
      this.db.prepare('DELETE FROM used_runs WHERE used_at < ?1').bind(now - LB_LIMITS.runTokenMs),
      this.db.prepare('DELETE FROM started_runs WHERE started_at < ?1').bind(now - LB_LIMITS.runTokenMs),
      // counters outlive their window by at most one cron period (hourly, wrangler.toml)
      this.db.prepare('DELETE FROM rate WHERE window_start < ?1').bind(now - RATE_WINDOW_MAX_MS),
      this.db.prepare('DELETE FROM ip_sets WHERE expires_at <= ?1').bind(now),
      // players with no rows left (e.g. only old dailies) are forgotten too
      this.db.prepare('DELETE FROM players WHERE banned = 0 AND id NOT IN (SELECT DISTINCT player_id FROM scores)'),
    ]);
  }
}
