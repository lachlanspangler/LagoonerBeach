/**
 * Leaderboard API as one pure-ish function: `handle(request, deps)`. All I/O goes through the
 * injected `Store`, the clock through `deps.now`, so Vitest drives it with a MemoryStore and no
 * wrangler. Routes (JSON):
 *
 *   GET    /v1/health
 *   POST   /v1/runs                       {installId, teach?, rules} → 201 RunTicket
 *   POST   /v1/scores                     ScoreSubmission → 200 {verifiedScore, boards: Standing[]}
 *   GET    /v1/boards/:board/top?limit=20
 *   GET    /v1/boards/:board/around?installId=…&above=5&below=5
 *   GET    /v1/boards/:board/me?installId=…
 *   DELETE /v1/players/:installId
 *
 * Errors are `{error: {code, message, retryAfter?}}` with the status from ERROR_STATUS.
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
  type LbErrorCode,
  type RunTicket,
  type Standing,
  type SubmitResponse,
} from '../../src/meta/boards.ts';
import type { Store } from './store.ts';
import { randomHex, randomU32, readRun, runHash, signRun, type RunClaims } from './token.ts';

export interface Deps {
  readonly store: Store;
  /** HMAC secret for run tokens (wrangler secret RUN_TOKEN_SECRET). */
  readonly secret: string;
  /** Comma-separated allowed origins, or '*'. */
  readonly allowedOrigins?: string;
  readonly now?: () => number;
  /** Seed source for new runs (tests make it deterministic). */
  readonly newSeed?: () => number;
  /** Rules versions this deployment can replay. */
  readonly rules?: number;
}

const LIMITS = {
  submit: { windowMs: 60_000, n: 10 },
  runs: { windowMs: 3_600_000, n: 30 },
  reads: { windowMs: 60_000, n: 120 },
};

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

    if (route === 'GET /health' && parts.length === 2) return json({ ok: true, rules: [rules] }, 200, h);
    if (route === 'POST /runs' && parts.length === 2)
      return json(await startRun(deps, await readJson(req), now, rules), 201, h);
    if (route === 'POST /scores' && parts.length === 2)
      return json(await submit(deps, await readJson(req), now, rules), 200, h);
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
      if (parts[3] === 'top') {
        const r = await deps.store.top(board, clampInt(q.get('limit'), 1, LB_LIMITS.topMax, 20));
        return json(r, 200, { ...h, 'cache-control': 'public, max-age=30' });
      }
      const id = q.get('installId') ?? '';
      if (!INSTALL_ID_RE.test(id)) throw new HttpError('bad_request', 'installId');
      if (!(await deps.store.hit(`reads:${id}`, now, LIMITS.reads.windowMs, LIMITS.reads.n)))
        throw new HttpError('rate_limited', 'slow down', 30);
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

async function startRun(deps: Deps, body: unknown, now: number, rules: number): Promise<RunTicket> {
  const o = (body ?? {}) as Record<string, unknown>;
  if (typeof o.installId !== 'string' || !INSTALL_ID_RE.test(o.installId))
    throw new HttpError('bad_request', 'installId');
  if (o.rules !== rules) throw new HttpError('upgrade_required', `rules ${String(o.rules)} ≠ ${rules}`);
  if (!deps.secret) throw new HttpError('overloaded', 'run tokens not configured');
  if (!(await deps.store.hit(`runs:${o.installId}`, now, LIMITS.runs.windowMs, LIMITS.runs.n)))
    throw new HttpError('rate_limited', 'too many runs', 60);
  const p = await deps.store.player(o.installId);
  if (p?.banned) throw new HttpError('banned', 'leaderboards unavailable');
  const claims: RunClaims = {
    v: 1,
    rid: randomHex(16),
    pid: o.installId,
    seed: (deps.newSeed ?? randomU32)() >>> 0,
    teach: o.teach === true,
    rules,
    iat: now,
    exp: now + LB_LIMITS.runTokenMs,
  };
  return {
    runToken: await signRun(claims, deps.secret),
    seed: claims.seed,
    issuedAt: claims.iat,
    expiresAt: claims.exp,
  };
}

async function submit(deps: Deps, body: unknown, now: number, rules: number): Promise<SubmitResponse> {
  const id = (body as { installId?: unknown } | null)?.installId;
  if (typeof id === 'string' && INSTALL_ID_RE.test(id))
    if (!(await deps.store.hit(`submit:${id}`, now, LIMITS.submit.windowMs, LIMITS.submit.n)))
      throw new HttpError('rate_limited', 'too many submissions', 60);
  const c = checkSubmission(body, now, rules);
  if (!c.ok) throw new HttpError(c.code, c.message);
  const { sub, state } = c;
  const player = await deps.store.player(sub.installId);
  if (player?.banned) throw new HttpError('banned', 'leaderboards unavailable');

  let weekDay = utcDay(now);
  let visible = true;
  if (sub.mode === 'endless') {
    if (!sub.runToken) throw new HttpError('token_invalid', 'endless runs need a run token');
    const t = deps.secret ? await readRun(sub.runToken, deps.secret) : null;
    if (!t || t.pid !== sub.installId || t.rules !== sub.rules) throw new HttpError('token_invalid', 'bad run token');
    if (t.seed !== sub.seed || t.teach !== sub.teach) throw new HttpError('seed_mismatch', 'not the issued seed');
    if (now > t.exp) throw new HttpError('token_expired', 'run token expired');
    const use = await deps.store.useRun(t.rid, sub.installId, await runHash(sub.moves, sub.score), now);
    if (use === 'used') throw new HttpError('duplicate_run', 'run token already used');
    weekDay = utcDay(t.iat); // the week the run started in
    // too fast for a person: keep it, but only its owner sees it (cheaters don't learn the threshold)
    visible = now - t.iat >= state.moves * LB_LIMITS.minMsPerMove;
  }

  await deps.store.putPlayer(sub.installId, sub.name, sub.avatar, now);
  const out: Standing[] = [];
  for (const board of boardsFor(sub, weekDay)) {
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
