/**
 * Leaderboard Worker, end to end through `handle()` with an in-memory store and a fake clock.
 * Every accepted score here is a real game replayed by the server's copy of src/core.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { handle, type Deps } from '../src/handler.ts';
import { MemoryStore } from '../src/store.ts';
import { signRun, readRun } from '../src/token.ts';
import { dailySeed } from '../../src/core/daily.ts';
import { packMoves } from '../../src/core/movelog.ts';
import { RULES_VERSION } from '../../src/core/version.ts';
import { weekBoard, type BoardEntry, type RunTicket, type Standing } from '../../src/meta/boards.ts';
import { rot13 } from '../../src/meta/names.ts';
import { playOut } from '../../tests/unit/runs.ts';

const DAY = '2026-10-16';
const T0 = Date.parse(`${DAY}T12:00:00Z`);
const id = (n: number) => n.toString(16).padStart(32, '0');

let store: MemoryStore;
let clock: number;
let seeds: number[];
let deps: Deps;

beforeEach(() => {
  store = new MemoryStore();
  clock = T0;
  seeds = [101, 202, 303, 404, 505, 606];
  deps = { store, secret: 'test-secret', now: () => clock, newSeed: () => seeds.shift() ?? 999 };
});

async function call(method: string, path: string, body?: unknown, headers: Record<string, string> = {}) {
  const res = await handle(
    new Request(`https://lb.test${path}`, {
      method,
      headers: { 'content-type': 'application/json', ...headers },
      ...(body === undefined ? {} : { body: typeof body === 'string' ? body : JSON.stringify(body) }),
    }),
    deps,
  );
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : null, headers: res.headers };
}

const dailyRun = (date = DAY, salt = 0, quick = true) => {
  const seed = dailySeed(date);
  const g = playOut(seed, { mode: 'daily', quick, salt });
  return { seed, moves: packMoves(g.moves), score: g.state.score, n: g.moves.length };
};

const daily = (installId: string, name: string, extra: Record<string, unknown> = {}, run = dailyRun()) => ({
  name,
  installId,
  mode: 'daily',
  seed: run.seed,
  date: DAY,
  teach: false,
  rules: RULES_VERSION,
  moves: run.moves,
  score: run.score,
  clientVersion: 'test',
  ...extra,
});

/** Issue a run token, play the issued seed, and advance the clock by a human-ish pace. */
async function endlessRun(installId: string, name: string, salt = 0, pace = 1000) {
  const t = await call('POST', '/v1/runs', { installId, rules: RULES_VERSION });
  expect(t.status).toBe(201);
  const ticket = t.body as RunTicket;
  const g = playOut(ticket.seed, { quick: true, salt });
  clock += g.moves.length * pace;
  return {
    ticket,
    body: {
      name,
      installId,
      mode: 'endless',
      seed: ticket.seed,
      runToken: ticket.runToken,
      teach: false,
      rules: RULES_VERSION,
      moves: packMoves(g.moves),
      score: g.state.score,
      clientVersion: 'test',
    },
  };
}

describe('POST /v1/scores — daily', () => {
  it('accepts a valid daily and ranks it', async () => {
    const r = await call('POST', '/v1/scores', daily(id(1), 'CORAL'));
    expect(r.status).toBe(200);
    expect(r.body.verifiedScore).toBe(dailyRun().score);
    expect(r.body.boards).toEqual([
      { board: `daily:${DAY}`, rank: 1, total: 1, best: dailyRun().score, improved: true, above: null },
    ]);
  });

  it('rejects a forged score', async () => {
    const r = await call('POST', '/v1/scores', daily(id(1), 'CORAL', { score: dailyRun().score + 1 }));
    expect(r.status).toBe(422);
    expect(r.body.error.code).toBe('score_mismatch');
  });

  it('rejects a tampered, truncated or garbage move log', async () => {
    const run = dailyRun();
    const bytes = [...run.moves];
    bytes[2] = bytes[2] === 'A' ? 'B' : 'A';
    for (const moves of [bytes.join(''), run.moves.slice(0, -4), '!!!!']) {
      const r = await call('POST', '/v1/scores', daily(id(1), 'CORAL', { moves }));
      expect(r.status, moves).toBe(422);
      expect(r.body.error.code).toBe('replay_invalid');
    }
  });

  it('rejects the wrong seed for the date, and dates outside the ~52 h window', async () => {
    let r = await call('POST', '/v1/scores', daily(id(1), 'CORAL', { date: '2026-10-15' }));
    expect(r.body.error.code).toBe('seed_mismatch');
    const tomorrow = dailyRun('2026-10-18');
    r = await call('POST', '/v1/scores', daily(id(1), 'CORAL', { date: '2026-10-18' }, tomorrow));
    expect(r.status).toBe(422); // hasn't started anywhere on Earth yet
    clock = Date.parse('2026-10-17T13:59:00Z'); // still open: UTC-12 is finishing the 16th + grace
    expect((await call('POST', '/v1/scores', daily(id(1), 'CORAL'))).status).toBe(200);
    clock = Date.parse('2026-10-17T14:00:00Z');
    r = await call('POST', '/v1/scores', daily(id(2), 'KELP'));
    expect(r.status).toBe(410);
    expect(r.body.error.code).toBe('board_closed');
  });

  it('the first daily finish counts (a replay never replaces it)', async () => {
    const first = dailyRun(DAY, 0);
    const better = [1, 2, 3, 4, 5, 6].map((s) => dailyRun(DAY, s)).find((x) => x.score > first.score)!;
    await call('POST', '/v1/scores', daily(id(1), 'CORAL', {}, first));
    const r = await call('POST', '/v1/scores', daily(id(1), 'CORAL', {}, better));
    expect(r.body.boards[0]).toMatchObject({ best: first.score, improved: false });
  });

  it('rejects bad names (blocked, reserved, digits, too long) and stores names uppercase', async () => {
    for (const name of [rot13('SHPX'), 'ADMIN', 'NEMO1', 'ABCDEFGH', '', 42]) {
      const r = await call('POST', '/v1/scores', daily(id(1), name as string));
      expect(r.status, String(name)).toBe(422);
      expect(r.body.error.code).toBe('name_rejected');
    }
    await call('POST', '/v1/scores', daily(id(1), 'coral'));
    const top = await call('GET', `/v1/boards/daily:${DAY}/top`);
    expect(top.body.entries[0].name).toBe('CORAL');
  });

  it('rejects an old client (rules mismatch) with 426 upgrade_required', async () => {
    const r = await call('POST', '/v1/scores', daily(id(1), 'CORAL', { rules: RULES_VERSION + 1 }));
    expect(r.status).toBe(426);
    expect(r.body.error.code).toBe('upgrade_required');
  });

  it('validates shape: bad JSON, missing fields, oversized bodies', async () => {
    expect((await call('POST', '/v1/scores', '{nope')).body.error.code).toBe('bad_request');
    expect((await call('POST', '/v1/scores', daily('nothex', 'CORAL'))).body.error.code).toBe('bad_request');
    expect((await call('POST', '/v1/scores', daily(id(1), 'CORAL', { mode: 'puzzle' }))).status).toBe(400);
    const huge = await call('POST', '/v1/scores', daily(id(1), 'CORAL', { moves: 'A'.repeat(20_000) }));
    expect(huge.status).toBe(413);
  });

  it('keeps an avatar only if it is a real species', async () => {
    await call('POST', '/v1/scores', daily(id(1), 'CORAL', { avatar: 'hermit' }));
    await call('POST', '/v1/scores', daily(id(2), 'KELP', { avatar: 'dragon' }));
    const e = (await call('GET', `/v1/boards/daily:${DAY}/top`)).body.entries as BoardEntry[];
    expect(e.find((x) => x.name === 'KELP')!.avatar).toBeUndefined();
  });
});

describe('POST /v1/runs + endless submissions', () => {
  it('accepts a run played on an issued seed, onto all-time and this week', async () => {
    const { body } = await endlessRun(id(1), 'TIDE');
    const r = await call('POST', '/v1/scores', body);
    expect(r.status).toBe(200);
    expect(r.body.boards.map((b: Standing) => b.board)).toEqual(['endless:all', weekBoard(DAY)]);
  });

  it('a retried identical submission is idempotent; any other reuse of the token is rejected', async () => {
    const { body } = await endlessRun(id(1), 'TIDE');
    expect((await call('POST', '/v1/scores', body)).status).toBe(200);
    expect((await call('POST', '/v1/scores', body)).status).toBe(200);
    const other = playOut(body.seed, { quick: true, salt: 77 });
    const reuse = await call('POST', '/v1/scores', {
      ...body,
      moves: packMoves(other.moves),
      score: other.state.score,
    });
    expect(reuse.status).toBe(409);
    expect(reuse.body.error.code).toBe('duplicate_run');
  });

  it('rejects forged, foreign, missing and expired tokens, and seeds that differ from the token', async () => {
    const { body } = await endlessRun(id(1), 'TIDE');
    const forged = body.runToken.slice(0, -2) + (body.runToken.endsWith('AA') ? 'BB' : 'AA');
    expect((await call('POST', '/v1/scores', { ...body, runToken: forged })).body.error.code).toBe('token_invalid');
    const claims = (await readRun(body.runToken, 'test-secret'))!;
    const selfSigned = await signRun({ ...claims, rid: 'x' }, 'wrong-secret');
    expect((await call('POST', '/v1/scores', { ...body, runToken: selfSigned })).body.error.code).toBe('token_invalid');
    const foreign = { ...body, installId: id(2) };
    expect((await call('POST', '/v1/scores', foreign)).body.error.code).toBe('token_invalid');
    const { runToken: _t, ...missing } = body;
    expect((await call('POST', '/v1/scores', missing)).body.error.code).toBe('token_invalid');
    // a seed of the attacker's choosing, signed for another seed
    const g = playOut(12345, { quick: true });
    const shopped = { ...body, seed: 12345, moves: packMoves(g.moves), score: g.state.score };
    expect((await call('POST', '/v1/scores', shopped)).body.error.code).toBe('seed_mismatch');
    clock += 73 * 3_600_000;
    expect((await call('POST', '/v1/scores', body)).body.error.code).toBe('token_expired');
  });

  it('endless keeps the best score; a lower later run does not replace it', async () => {
    const runs = [];
    for (const salt of [1, 2, 3]) {
      const { body } = await endlessRun(id(1), 'TIDE', salt);
      runs.push(body);
      await call('POST', '/v1/scores', body);
    }
    const best = Math.max(...runs.map((r) => r.score));
    const me = await call('GET', `/v1/boards/endless:all/me?installId=${id(1)}`);
    expect(me.body.best).toBe(best);
  });

  it('implausibly fast runs are kept as shadow rows: only their owner sees them', async () => {
    const honest = await endlessRun(id(1), 'TIDE');
    await call('POST', '/v1/scores', honest.body);
    const bot = await endlessRun(id(2), 'ROBO', 5, 10); // 10 ms per move
    const r = await call('POST', '/v1/scores', bot.body);
    expect(r.status).toBe(200); // the cheater learns nothing
    const top = await call('GET', '/v1/boards/endless:all/top');
    expect(top.body.entries.map((e: BoardEntry) => e.name)).toEqual(['TIDE']);
    const self = await call('GET', `/v1/boards/endless:all/around?installId=${id(2)}`);
    expect(self.body.me.name).toBe('ROBO');
  });

  it('runs need a well-formed install id and the current rules', async () => {
    expect((await call('POST', '/v1/runs', { installId: 'x', rules: RULES_VERSION })).status).toBe(400);
    expect((await call('POST', '/v1/runs', { installId: id(1), rules: 0 })).status).toBe(426);
  });
});

describe('ranking queries', () => {
  async function fill() {
    // eight players, eight distinct daily games (random bot with different salts)
    const runs = Array.from({ length: 12 }, (_, s) => dailyRun(DAY, s * 13 + 1)).filter(
      (r, i, a) => a.findIndex((x) => x.score === r.score) === i,
    );
    const names = ['CORAL', 'KELP', 'TIDE', 'PEARL', 'SANDY', 'FINN', 'ISLA', 'JUNO', 'MAYA', 'NOOR', 'KAI', 'ZOE'];
    for (let i = 0; i < runs.length; i++) {
      clock += 1000;
      await call('POST', '/v1/scores', daily(id(i + 1), names[i]!, {}, runs[i]));
    }
    return runs
      .map((r, i) => ({ run: r, score: r.score, id: id(i + 1), name: names[i]! }))
      .sort((a, b) => b.score - a.score);
  }

  it('top is sorted by score; ties go to the earlier submission', async () => {
    const order = await fill();
    // a late player who exactly ties the leader ranks below them
    clock += 1000;
    await call('POST', '/v1/scores', daily(id(99), 'LATE', {}, order[0]!.run));
    const top = await call('GET', `/v1/boards/daily:${DAY}/top?limit=3`);
    expect(top.body.total).toBe(order.length + 1);
    expect(top.body.entries.map((e: BoardEntry) => e.name)).toEqual([order[0]!.name, 'LATE', order[1]!.name]);
    expect(top.body.entries.map((e: BoardEntry) => e.rank)).toEqual([1, 2, 3]);
    expect(top.headers.get('cache-control')).toContain('max-age');
  });

  it('around me: the window, my rank, and who is just above', async () => {
    const order = await fill();
    const mine = order[4]!;
    const a = await call('GET', `/v1/boards/daily:${DAY}/around?installId=${mine.id}&above=2&below=1`);
    expect(a.body.me).toMatchObject({ rank: 5, name: mine.name, score: mine.score, me: true });
    expect(a.body.above).toMatchObject({ rank: 4, name: order[3]!.name, score: order[3]!.score });
    expect(a.body.entries.map((e: BoardEntry) => e.rank)).toEqual([3, 4, 5, 6]);
    const s = await call('GET', `/v1/boards/daily:${DAY}/me?installId=${mine.id}`);
    expect(s.body).toMatchObject({ rank: 5, total: order.length, best: mine.score });
    const none = await call('GET', `/v1/boards/daily:${DAY}/me?installId=${id(500)}`);
    expect(none.status).toBe(404);
    expect(none.body.error.code).toBe('not_ranked');
    const noneAround = await call('GET', `/v1/boards/daily:${DAY}/around?installId=${id(500)}`);
    expect(noneAround.body.me).toBeNull();
  });

  it('daily boards are per date, endless weeks are per ISO week, all-time spans both', async () => {
    await call('POST', '/v1/scores', daily(id(1), 'CORAL'));
    clock = Date.parse('2026-10-17T12:00:00Z');
    const d2 = dailyRun('2026-10-17');
    await call('POST', '/v1/scores', daily(id(2), 'KELP', { date: '2026-10-17' }, d2));
    expect((await call('GET', `/v1/boards/daily:${DAY}/top`)).body.total).toBe(1);
    expect((await call('GET', '/v1/boards/daily:2026-10-17/top')).body.entries[0].name).toBe('KELP');

    clock = T0;
    const w1 = await endlessRun(id(1), 'CORAL', 1);
    await call('POST', '/v1/scores', w1.body);
    clock = T0 + 7 * 86_400_000;
    const w2 = await endlessRun(id(2), 'KELP', 2);
    await call('POST', '/v1/scores', w2.body);
    const wk1 = await call('GET', `/v1/boards/${weekBoard(DAY)}/top`);
    const wk2 = await call('GET', `/v1/boards/${weekBoard('2026-10-23')}/top`);
    expect(wk1.body.entries.map((e: BoardEntry) => e.name)).toEqual(['CORAL']);
    expect(wk2.body.entries.map((e: BoardEntry) => e.name)).toEqual(['KELP']);
    expect((await call('GET', '/v1/boards/endless:all/top')).body.total).toBe(2);
    // the alias resolves to the server's current week
    expect((await call('GET', '/v1/boards/endless:week/top')).body.board).toBe(weekBoard('2026-10-23'));
  });

  it('unknown boards and routes are 404; read endpoints need an install id', async () => {
    expect((await call('GET', '/v1/boards/daily:2026-13-40/top')).status).toBe(404);
    expect((await call('GET', '/v1/boards/weekly/top')).status).toBe(404);
    expect((await call('GET', '/v1/nope')).status).toBe(404);
    expect((await call('GET', '/nope')).status).toBe(404);
    expect((await call('GET', `/v1/boards/daily:${DAY}/around`)).status).toBe(400);
    expect((await call('GET', '/v1/health')).body).toEqual({ ok: true, rules: [RULES_VERSION] });
  });
});

describe('players, limits, CORS', () => {
  it('DELETE /v1/players/:id removes every row, log, token and name', async () => {
    await call('POST', '/v1/scores', daily(id(1), 'CORAL'));
    await call('POST', '/v1/scores', daily(id(2), 'KELP'));
    const { body } = await endlessRun(id(1), 'CORAL');
    await call('POST', '/v1/scores', body);
    const r = await call('DELETE', `/v1/players/${id(1)}`);
    expect(r.body).toEqual({ deleted: true });
    expect((await call('GET', `/v1/boards/daily:${DAY}/top`)).body.entries.map((e: BoardEntry) => e.name)).toEqual([
      'KELP',
    ]);
    expect((await call('GET', '/v1/boards/endless:all/top')).body.total).toBe(0);
    expect(store.players.has(id(1))).toBe(false);
    expect([...store.logs.keys()].some((k) => k.endsWith(id(1)))).toBe(false);
    expect([...store.runs.values()].some((v) => v.playerId === id(1))).toBe(false);
    expect((await call('DELETE', '/v1/players/bogus')).status).toBe(400);
  });

  it('banned players are refused', async () => {
    await call('POST', '/v1/scores', daily(id(1), 'CORAL'));
    store.players.get(id(1))!.banned = true;
    expect((await call('POST', '/v1/scores', daily(id(1), 'CORAL'))).status).toBe(403);
    expect((await call('POST', '/v1/runs', { installId: id(1), rules: RULES_VERSION })).status).toBe(403);
  });

  it('rate-limits submissions per install id', async () => {
    const statuses = [];
    for (let i = 0; i < 12; i++) statuses.push((await call('POST', '/v1/scores', daily(id(1), 'CORAL'))).status);
    expect(statuses.slice(0, 10).every((s) => s === 200)).toBe(true);
    expect(statuses[10]).toBe(429);
    clock += 61_000;
    expect((await call('POST', '/v1/scores', daily(id(1), 'CORAL'))).status).toBe(200);
  });

  it('answers CORS preflights and honours the allowed-origin list', async () => {
    const pre = await handle(new Request('https://lb.test/v1/scores', { method: 'OPTIONS' }), deps);
    expect(pre.status).toBe(204);
    expect(pre.headers.get('access-control-allow-origin')).toBe('*');
    deps = { ...deps, allowedOrigins: 'capacitor://localhost, https://localhost' };
    const ok = await call('GET', '/v1/health', undefined, { origin: 'capacitor://localhost' });
    expect(ok.headers.get('access-control-allow-origin')).toBe('capacitor://localhost');
    const bad = await call('GET', '/v1/health', undefined, { origin: 'https://evil.example' });
    expect(bad.headers.get('access-control-allow-origin')).toBeNull();
  });

  it('a storage failure becomes a retryable 503, never a dropped score', async () => {
    const broken = Object.assign(Object.create(store) as MemoryStore, {
      player: () => Promise.reject(new Error('D1 overloaded')),
    });
    deps = { ...deps, store: broken };
    const r = await call('POST', '/v1/scores', daily(id(1), 'CORAL'));
    expect(r.status).toBe(503);
    expect(r.body.error.code).toBe('overloaded');
  });

  it('cleanup forgets spent run tokens after 72 h', async () => {
    const { body } = await endlessRun(id(1), 'TIDE');
    await call('POST', '/v1/scores', body);
    await store.cleanup(clock + 73 * 3_600_000);
    expect(store.runs.size).toBe(0);
  });
});
