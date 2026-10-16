/**
 * Leaderboard API as one pure-ish function: `handle(request, deps)`. All I/O goes through the
 * injected `Store`, the clock through `deps.now`, so Vitest drives it with a MemoryStore and no
 * wrangler. Routes (JSON):
 *
 *   GET    /v1/health
 *   POST   /v1/runs                       {installId?, teach?, rules} → 201 RunTicket
 *   POST   /v1/runs/:runId/start          {runToken} → 200 {startedAt}   (sent at the first move)
 *   POST   /v1/scores                     ScoreSubmission → 200 {verifiedScore, boards: Standing[]}
 *   GET    /v1/boards/:board/top?limit=20[&installId=…]   (with an id: rows carry `me`, no-store)
 *   GET    /v1/boards/:board/around?installId=…&above=5&below=5
 *   GET    /v1/boards/:board/me?installId=…
 *   DELETE /v1/players/:installId
 *
 * Errors are `{error: {code, message, retryAfter?}}` with the status from ERROR_STATUS.
 *
 * Abuse limits: every limited route counts per install id (when there is one) AND per salted IP
 * hash, so rotating install ids doesn't escape the address limit. Runs and submissions also cap the
 * distinct install ids one IP hash may use per UTC day, and a Daily board takes at most
 * `LB_LIMITS.dailyRowsPerIp` rows per IP hash. IP addresses are never stored, only salted hashes.
 */
import { RULES_VERSION } from '../../src/core/version.ts';
import {
  ERROR_STATUS,
  INSTALL_ID_RE,
  LB_LIMITS,
  boardsFor,
  checkSubmission,
  parseBoard,
  policyFor,
  resolveBoard,
  utcDay,
  type BoardId,
  type LbErrorCode,
  type RunTicket,
  type Standing,
  type SubmitResponse,
} from '../../src/meta/boards.ts';
import type { Store } from './store.ts';
import { randomHex, randomU32, readRun, runHash, signRun, type RunClaims } from './token.ts';

export interface Deps {
  readonly store: Store;
  /** HMAC secret for run tokens (wrangler secret RUN_TOKEN_SECRET); also salts the IP hashes. */
  readonly secret: string;
  /** Comma-separated allowed origins, or '*'. */
  readonly allowedOrigins?: string;
  readonly now?: () => number;
  /** Seed source for new runs (tests make it deterministic). */
  readonly newSeed?: () => number;
  /** Rules versions this deployment can replay. */
  readonly rules?: number;
}

/** Per install id (`id`) and per salted IP hash (`ip`, shared by every id behind that address). */
export const LIMITS = {
  submit: { windowMs: 60_000, id: 10, ip: 30 },
  runs: { windowMs: 3_600_000, id: 30, ip: 60 },
  start: { windowMs: 3_600_000, id: 0, ip: 120 },
  reads: { windowMs: 60_000, id: 120, ip: 300 },
} as const;
type LimitKind = keyof typeof LIMITS;

const DAY_MS = 86_400_000;

class HttpError extends Error {
  constructor(
    readonly code: LbErrorCode,
    message: string,
    readonly retryAfter?: number,
  ) {
    super(message);
  }
}

function cors(req: Request, allowed = '*'): Record<string, string> {
  const origin = req.headers.get('origin');
  const list = allowed.split(',').map((s) => s.trim());
  const allow = list.includes('*') ? '*' : origin && list.includes(origin) ? origin : '';
  return {
    ...(allow ? { 'access-control-allow-origin': allow } : {}),
    'access-control-allow-methods': 'GET, POST, DELETE, OPTIONS',
    'access-control-allow-headers': 'content-type',
    'access-control-max-age': '86400',
    vary: 'origin',
  };
}

function json(body: unknown, status: number, headers: Record<string, string>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers },
  });
}

async function readJson(req: Request): Promise<unknown> {
  const len = Number(req.headers.get('content-length') ?? 0);
  if (len > LB_LIMITS.maxBody) throw new HttpError('payload_too_large', 'body too large');
  const text = await req.text();
  if (text.length > LB_LIMITS.maxBody) throw new HttpError('payload_too_large', 'body too large');
  try {
    return JSON.parse(text);
  } catch {
    throw new HttpError('bad_request', 'invalid JSON');
  }
}

const clampInt = (v: string | null, lo: number, hi: number, d: number) => {
  const n = v === null ? d : Number.parseInt(v, 10);
  return Number.isFinite(n) ? Math.max(lo, Math.min(hi, n)) : d;
};

/** Per-request context: the clock, and the caller's salted IP hash (computed once, never stored raw). */
interface Ctx {
  readonly deps: Deps;
  readonly now: number;
  readonly rules: number;
  ip(): Promise<string>;
}

function context(req: Request, deps: Deps, now: number, rules: number): Ctx {
  let ip: Promise<string> | null = null;
  return {
    deps,
    now,
    rules,
    ip: () =>
      (ip ??= runHash(`${deps.secret}|ip|${req.headers.get('cf-connecting-ip') ?? 'unknown'}`, 0).then(
        (h) => `ip-${h}`,
      )),
  };
}

/** Count one request against the install id's and the address's windows. */
async function limit(c: Ctx, kind: LimitKind, id: string | undefined, retryAfter: number): Promise<void> {
  const l = LIMITS[kind];
  const s = c.deps.store;
  if (!(await s.hit(`${kind}:${await c.ip()}`, c.now, l.windowMs, l.ip)))
    throw new HttpError('rate_limited', 'slow down', retryAfter);
  if (id && l.id && !(await s.hit(`${kind}:${id}`, c.now, l.windowMs, l.id)))
    throw new HttpError('rate_limited', 'slow down', retryAfter);
}

/** A salted hash of an install id, so the per-address sets never hold the id itself. */
const idTag = (c: Ctx, id: string) => runHash(`${c.deps.secret}|id|${id}`, 0);

/** At most `idsPerIpDay` distinct install ids per address per UTC day (minting ids doesn't help). */
async function admitInstall(c: Ctx, id: string): Promise<void> {
  const ok = await c.deps.store.admit(
    `ids:${utcDay(c.now)}:${await c.ip()}`,
    await idTag(c, id),
    LB_LIMITS.idsPerIpDay,
    c.now + DAY_MS,
    c.now,
  );
  if (!ok) throw new HttpError('rate_limited', 'too many players from this network today', 3600);
}

export async function handle(req: Request, deps: Deps): Promise<Response> {
  const h = cors(req, deps.allowedOrigins);
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: h });
  const now = deps.now?.() ?? Date.now();
  try {
    const url = new URL(req.url);
    const parts = url.pathname.replace(/\/+$/, '').split('/').filter(Boolean);
    if (parts[0] !== 'v1') throw new HttpError('not_found', 'unknown route');
    const route = `${req.method} /${parts.slice(1, 2).join('/')}`;
    const rules = deps.rules ?? RULES_VERSION;
    const c = context(req, deps, now, rules);

    if (route === 'GET /health' && parts.length === 2) return json({ ok: true, rules: [rules] }, 200, h);
    if (route === 'POST /runs' && parts.length === 2) return json(await startRun(c, await readJson(req)), 201, h);
    if (route === 'POST /runs' && parts.length === 4 && parts[3] === 'start')
      return json(await markStart(c, decodeURIComponent(parts[2]!), await readJson(req)), 200, h);
    if (route === 'POST /scores' && parts.length === 2) return json(await submit(c, await readJson(req)), 200, h);
    if (route === 'DELETE /players' && parts.length === 3) {
      const id = parts[2]!;
      if (!INSTALL_ID_RE.test(id)) throw new HttpError('bad_request', 'installId');
      await deps.store.deletePlayer(id);
      return json({ deleted: true }, 200, h);
    }
    if (route === 'GET /boards' && parts.length === 4) {
      const ref = parseBoard(decodeURIComponent(parts[2]!));
      if (!ref) throw new HttpError('not_found', 'unknown board');
      const board = resolveBoard(ref, utcDay(now));
      const q = url.searchParams;
      const qid = q.get('installId');
      if (parts[3] === 'top') {
        // personalised (rows tagged `me`) only when the caller says who they are; never cache those
        const viewer = qid !== null && INSTALL_ID_RE.test(qid) ? qid : undefined;
        if (qid !== null && !viewer) throw new HttpError('bad_request', 'installId');
        await limit(c, 'reads', viewer, 30);
        const r = await deps.store.top(board, clampInt(q.get('limit'), 1, LB_LIMITS.topMax, 20), viewer);
        return json(r, 200, { ...h, 'cache-control': viewer ? 'no-store' : 'public, max-age=30' });
      }
      const id = qid ?? '';
      if (!INSTALL_ID_RE.test(id)) throw new HttpError('bad_request', 'installId');
      await limit(c, 'reads', id, 30);
      if (parts[3] === 'around') {
        const k = LB_LIMITS.aroundMax;
        const r = await deps.store.around(
          board,
          id,
          clampInt(q.get('above'), 0, k, 5),
          clampInt(q.get('below'), 0, k, 5),
        );
        return json(r, 200, h);
      }
      if (parts[3] === 'me') {
        const s = await deps.store.standing(board, id, false);
        if (!s) throw new HttpError('not_ranked', 'no score on this board');
        return json(s, 200, h);
      }
    }
    throw new HttpError('not_found', 'unknown route');
  } catch (e) {
    if (e instanceof HttpError)
      return json(
        { error: { code: e.code, message: e.message, ...(e.retryAfter ? { retryAfter: e.retryAfter } : {}) } },
        ERROR_STATUS[e.code],
        { ...h, ...(e.retryAfter ? { 'retry-after': String(e.retryAfter) } : {}) },
      );
    // D1 under load throws; tell the client to retry later rather than drop the score
    console.error('leaderboard error', e instanceof Error ? e.message : String(e));
    return json({ error: { code: 'overloaded', message: 'try again later', retryAfter: 30 } }, 503, h);
  }
}

/**
 * Issue an Endless seed. The install id is optional: players who haven't opted in yet get unbound
 * tickets (bound to whoever first submits them), so their first ranked game needs no prior post.
 */
async function startRun(c: Ctx, body: unknown): Promise<RunTicket> {
  const { deps, now, rules } = c;
  const o = (body ?? {}) as Record<string, unknown>;
  const pid = o.installId === undefined ? '' : o.installId;
  if (typeof pid !== 'string' || (pid && !INSTALL_ID_RE.test(pid))) throw new HttpError('bad_request', 'installId');
  if (o.rules !== rules) throw new HttpError('upgrade_required', `rules ${String(o.rules)} ≠ ${rules}`);
  if (!deps.secret) throw new HttpError('overloaded', 'run tokens not configured');
  await limit(c, 'runs', pid || undefined, 60);
  if (pid) await admitInstall(c, pid);
  const p = pid ? await deps.store.player(pid) : null;
  if (p?.banned) throw new HttpError('banned', 'leaderboards unavailable');
  const claims: RunClaims = {
    v: 1,
    rid: randomHex(16),
    pid,
    seed: (deps.newSeed ?? randomU32)() >>> 0,
    teach: o.teach === true,
    rules,
    iat: now,
    exp: now + LB_LIMITS.runTokenMs,
  };
  return {
    runId: claims.rid,
    runToken: await signRun(claims, deps.secret),
    seed: claims.seed,
    issuedAt: claims.iat,
    expiresAt: claims.exp,
  };
}

/**
 * The client's first move on a ticket: record the server time (first call wins). The token proves
 * the caller holds the ticket. Runs whose client never calls this (offline starts) are not
 * speed-checked.
 */
async function markStart(c: Ctx, rid: string, body: unknown): Promise<{ startedAt: number }> {
  await limit(c, 'start', undefined, 60);
  const tok = (body as { runToken?: unknown } | null)?.runToken;
  const t = typeof tok === 'string' && c.deps.secret ? await readRun(tok, c.deps.secret) : null;
  if (!t || t.rid !== rid) throw new HttpError('token_invalid', 'bad run token');
  if (c.now > t.exp) throw new HttpError('token_expired', 'run token expired');
  return { startedAt: await c.deps.store.startRun(t.rid, c.now) };
}

async function submit(c: Ctx, body: unknown): Promise<SubmitResponse> {
  const { deps, now, rules } = c;
  const raw = (body as { installId?: unknown } | null)?.installId;
  const rawId = typeof raw === 'string' && INSTALL_ID_RE.test(raw) ? raw : undefined;
  await limit(c, 'submit', rawId, 60);
  const ch = checkSubmission(body, now, rules);
  if (!ch.ok) throw new HttpError(ch.code, ch.message);
  const { sub, state } = ch;
  await admitInstall(c, sub.installId);
  const player = await deps.store.player(sub.installId);
  if (player?.banned) throw new HttpError('banned', 'leaderboards unavailable');

  let visible = true;
  if (sub.mode === 'endless') {
    if (!sub.runToken) throw new HttpError('token_invalid', 'endless runs need a run token');
    const t = deps.secret ? await readRun(sub.runToken, deps.secret) : null;
    if (!t || (t.pid && t.pid !== sub.installId) || t.rules !== sub.rules)
      throw new HttpError('token_invalid', 'bad run token');
    if (t.seed !== sub.seed || t.teach !== sub.teach) throw new HttpError('seed_mismatch', 'not the issued seed');
    if (now > t.exp) throw new HttpError('token_expired', 'run token expired');
    const use = await deps.store.useRun(t.rid, sub.installId, await runHash(sub.moves, sub.score), now);
    if (use === 'used') throw new HttpError('duplicate_run', 'run token already used');
    // too fast for a person: keep it, but only its owner sees it (cheaters don't learn the threshold).
    // Measured from the server-recorded first move, never from the ticket's issue time (tickets are
    // prefetched hours ahead). No recorded start = an offline start: not speed-checked.
    const started = await deps.store.runStart(t.rid);
    visible = started === null || now - started >= state.moves * LB_LIMITS.minMsPerMove;
  }

  // the week is the server's week at submission, so "#N this week" is the board the UI shows
  const boards: BoardId[] = boardsFor(sub, utcDay(now));
  for (const board of boards)
    if (board.startsWith('daily:')) {
      // first finish counts, and one network can't fill a Daily by minting install ids
      const close = Date.parse(`${board.slice(6)}T00:00:00Z`) + LB_LIMITS.dailyLateMs;
      const ok = await deps.store.admit(
        `${board}:${await c.ip()}`,
        await idTag(c, sub.installId),
        LB_LIMITS.dailyRowsPerIp,
        close,
        now,
      );
      if (!ok) throw new HttpError('board_limit', 'this network has posted enough Dailies today');
    }

  await deps.store.putPlayer(sub.installId, sub.name, sub.avatar, now);
  const out: Standing[] = [];
  for (const board of boards) {
    const r = await deps.store.submit(
      board,
      {
        id: sub.installId,
        name: sub.name,
        ...(sub.avatar ? { avatar: sub.avatar } : {}),
        score: state.score,
        moves: state.moves,
        at: now,
        visible,
        seed: sub.seed,
        rules: sub.rules,
        log: sub.moves,
      },
      policyFor(board),
    );
    const s = await deps.store.standing(board, sub.installId, r.improved);
    if (s) out.push(s);
  }
  return { verifiedScore: state.score, boards: out };
}
