/**
 * Leaderboard client: the mock backend's ranking/partitioning, the offline queue, the HTTP backend
 * against a fake fetch (and against the real Worker handler), the run log, and erase.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import {
  HttpBackend,
  LbError,
  LeaderboardClient,
  K_QUEUE,
  type Kv,
  type LeaderboardBackend,
} from '../../src/platform/leaderboard.ts';
import { DEMO_NAMES, K_MOCK, MockBackend } from '../../src/platform/lbmock.ts';
import {
  RunLog,
  hasPendingLbWork,
  markForget,
  readForget,
  readTicket,
  storeTicket,
} from '../../src/platform/runlog.ts';
import { dailySeed } from '../../src/core/daily.ts';
import { applyMove, newGame, type GameState } from '../../src/core/game.ts';
import { packMoves } from '../../src/core/movelog.ts';
import { RULES_VERSION } from '../../src/core/version.ts';
import { validateName } from '../../src/meta/names.ts';
import { weekBoard, type ScoreSubmission } from '../../src/meta/boards.ts';
import { handle } from '../../server/src/handler.ts';
import { MemoryStore } from '../../server/src/store.ts';
import { signRun } from '../../server/src/token.ts';
import { playOut } from './runs.ts';
import { freshLocalStorage } from './memstorage.ts';

const DAY = '2026-10-16';
const T0 = Date.parse(`${DAY}T12:00:00Z`);

class MapKv implements Kv {
  m = new Map<string, string>();
  get = (k: string) => this.m.get(k) ?? null;
  set = (k: string, v: string) => void this.m.set(k, v);
  del = (k: string) => void this.m.delete(k);
}

function dailyFinished(salt = 0) {
  const seed = dailySeed(DAY);
  const g = playOut(seed, { mode: 'daily', quick: true, salt });
  return {
    mode: 'daily' as const,
    seed,
    date: DAY,
    teach: false,
    moves: packMoves(g.moves),
    score: g.state.score,
    moveCount: g.moves.length,
  };
}

function endlessFinished(seed = 31, salt = 0) {
  const g = playOut(seed, { quick: true, salt });
  return {
    mode: 'endless' as const,
    seed,
    teach: false,
    moves: packMoves(g.moves),
    score: g.state.score,
    moveCount: g.moves.length,
  };
}

let clock: number;
let kv: MapKv;
let lb: { installId?: string; name?: string };
let timers: { fn: () => void; ms: number }[];

function client(
  backend: LeaderboardBackend = new MockBackend({ kv, now: () => clock, today: () => DAY, latencyMs: 0 }),
) {
  return new LeaderboardClient({
    backend,
    kv,
    lb: () => lb,
    save: () => undefined,
    avatar: () => 'hermit',
    clientVersion: 'test',
    now: () => clock,
    random: () => 0.5,
    schedule: (fn, ms) => timers.push({ fn, ms }),
  });
}

beforeEach(() => {
  clock = T0;
  kv = new MapKv();
  lb = {};
  timers = [];
  freshLocalStorage();
});

describe('MockBackend', () => {
  it('demo players are deterministic, plausible and all have allowed names', async () => {
    const a = await new MockBackend({ kv: new MapKv(), latencyMs: 0, today: () => DAY }).top(`daily:${DAY}`, 50);
    const b = await new MockBackend({ kv: new MapKv(), latencyMs: 0, today: () => DAY }).top(`daily:${DAY}`, 50);
    expect(a).toEqual(b);
    expect(a.total).toBeGreaterThanOrEqual(24);
    expect(a.entries[0]!.score).toBeGreaterThan(a.entries.at(-1)!.score);
    for (const n of DEMO_NAMES) expect(validateName(n), n).toEqual({ ok: true });
  });

  it('posting ranks you among them; around shows your window and who is just above', async () => {
    const c = client();
    const out = await c.post(dailyFinished(), 'NEMOX');
    expect(out.status).toBe('posted');
    const v = await c.view(`daily:${DAY}`);
    expect(v.demo).toBe(true);
    expect(v.me).toMatchObject({ name: 'NEMOX', me: true, avatar: 'hermit' });
    expect(v.total).toBeGreaterThan(24);
    if (v.me!.rank > 1) expect(v.above!.score).toBeGreaterThanOrEqual(v.me!.score);
    const rows = v.window.length ? v.window : v.top;
    expect(rows.some((e) => e.me)).toBe(true);
    expect(lb.installId).toMatch(/^[0-9a-f]{32}$/);
    expect(lb.name).toBe('NEMOX');
  });

  it('partitions by day and week, and keeps your rows across restarts', async () => {
    const c = client();
    await c.post(endlessFinished(31), 'TIDE');
    const week = weekBoard(DAY);
    expect((await c.view('endless:week')).board).toBe(week);
    expect((await c.view(week)).me?.name).toBe('TIDE');
    expect((await c.view('endless:all')).me?.name).toBe('TIDE');
    expect((await c.view(`daily:${DAY}`)).me).toBeNull(); // an endless run never lands on the daily
    // a fresh backend instance (app restart) reads the persisted rows
    const later = new MockBackend({ kv, now: () => clock, today: () => '2026-10-26', latencyMs: 0 });
    expect((await later.around('endless:all', lb.installId!, 2)).me?.name).toBe('TIDE');
    expect((await later.around('endless:week', lb.installId!, 2)).me).toBeNull(); // next week
    expect(JSON.parse(kv.get(K_MOCK)!)['endless:all'].every((r: { id: string }) => !r.id.startsWith('demo:'))).toBe(
      true,
    );
  });

  it('rejects what the server would reject', async () => {
    const c = client();
    const forged = { ...dailyFinished(), score: dailyFinished().score + 1 };
    expect(await c.post(forged, 'CORAL')).toEqual({ status: 'rejected', reason: 'score_mismatch' });
    expect(await c.post(dailyFinished(), 'ADMIN')).toEqual({ status: 'rejected', reason: 'name_rejected' });
    expect(kv.get(K_QUEUE)).toBeNull(); // rejected runs never linger in the queue
    await expect(new MockBackend({ kv, latencyMs: 0 }).top('nope' as never, 3)).rejects.toThrow(LbError);
  });

  it('deletePlayer removes you', async () => {
    const c = client();
    await c.post(dailyFinished(), 'CORAL');
    await c.backend.deletePlayer(lb.installId!);
    expect((await c.view(`daily:${DAY}`)).me).toBeNull();
    expect(await c.backend.myRank(`daily:${DAY}`, lb.installId!)).toBeNull();
    expect(await c.backend.startRun(undefined, false)).toBeNull();
  });
});

describe('offline queue', () => {
  it('queues while offline, backs off, and posts when back', async () => {
    let offline = true;
    const backend = new MockBackend({ kv, now: () => clock, today: () => DAY, latencyMs: 0, offline: () => offline });
    const c = client(backend);
    const posted: unknown[] = [];
    c.onPosted = (s) => posted.push(...s);
    expect(await c.post(dailyFinished(), 'CORAL')).toEqual({ status: 'queued', reason: 'offline' });
    expect(c.pending()).toHaveLength(1);
    expect(timers.at(-1)!.ms).toBe(2000); // first retry ≈ 2 s (jitter fixed at 1.0 here)
    clock += 2000;
    await c.flush(); // still offline
    expect(c.pending()).toHaveLength(1);
    const q = JSON.parse(kv.get(K_QUEUE)!);
    expect(q[0].attempts).toBe(2);
    expect(q[0].nextAt - clock).toBe(4000); // exponential
    // survives an app restart: a new client reads the same queue
    offline = false;
    clock += 4000;
    const c2 = client(backend);
    c2.onPosted = (s) => posted.push(...s);
    await c2.flush();
    expect(c2.pending()).toHaveLength(0);
    expect(posted).toHaveLength(1);
    expect(hasPendingLbWork()).toBe(false);
  });

  it('drops runs older than two weeks and never duplicates a run', async () => {
    const backend = new MockBackend({ kv, now: () => clock, latencyMs: 0, offline: () => true });
    const c = client(backend);
    const run = dailyFinished();
    await c.post(run, 'CORAL');
    await c.post(run, 'CORAL');
    expect(c.pending()).toHaveLength(1);
    clock += 15 * 86_400_000;
    await c.flush();
    expect(c.pending()).toHaveLength(0);
  });

  it('serves the last good board when offline (stale), and errors when there is none', async () => {
    let offline = false;
    const c = client(new MockBackend({ kv, today: () => DAY, latencyMs: 0, offline: () => offline }));
    const fresh = await c.view('endless:all');
    offline = true;
    expect(await c.view('endless:all')).toEqual({ ...fresh, stale: true });
    await expect(c.view(`daily:${DAY}`)).rejects.toMatchObject({ code: 'offline' });
  });
});

describe('HttpBackend', () => {
  it('maps network failures, timeouts and error bodies to LbError codes', async () => {
    const down = new HttpBackend('https://lb.test/v1', () => Promise.reject(new TypeError('Failed to fetch')));
    await expect(down.top('endless:all', 5)).rejects.toMatchObject({ code: 'offline', retryable: true });
    const hang = new HttpBackend(
      'https://lb.test',
      (_u, i) => new Promise((_r, rej) => i.signal!.addEventListener('abort', () => rej(new Error('aborted')))),
      20,
    );
    await expect(hang.top('endless:all', 5)).rejects.toMatchObject({ code: 'timeout' });
    const err = new HttpBackend(
      'https://lb.test',
      async () => new Response(JSON.stringify({ error: { code: 'rate_limited', retryAfter: 9 } }), { status: 429 }),
    );
    await expect(err.top('endless:all', 5)).rejects.toMatchObject({ code: 'rate_limited', retryAfter: 9 });
    const html = new HttpBackend('https://lb.test', async () => new Response('<html>', { status: 502 }));
    await expect(html.top('endless:all', 5)).rejects.toMatchObject({ code: 'overloaded' });
    expect(await down.startRun(undefined, false)).toBeNull(); // offline: play unranked, no error
  });

  it('builds the documented URLs', async () => {
    const seen: string[] = [];
    const b = new HttpBackend('https://lb.test/', async (u, i) => {
      seen.push(`${i.method} ${u}`);
      return new Response(JSON.stringify({ board: 'endless:all', total: 0, entries: [] }));
    });
    await b.top('endless:all', 13);
    await b.around(`daily:${DAY}`, 'f'.repeat(32), 5);
    await b.deletePlayer('f'.repeat(32));
    expect(seen).toEqual([
      'GET https://lb.test/v1/boards/endless%3Aall/top?limit=13',
      `GET https://lb.test/v1/boards/daily%3A${DAY}/around?installId=${'f'.repeat(32)}&above=5&below=5`,
      `DELETE https://lb.test/v1/players/${'f'.repeat(32)}`,
    ]);
  });

  it('end to end against the real Worker handler: ticket → ranked endless run → erase', async () => {
    const store = new MemoryStore();
    const deps = { store, secret: 's3cret', now: () => clock };
    const http = new HttpBackend('https://lb.test', (u, i) => handle(new Request(u, i), deps));
    const c = client(http);
    // an unbound ticket before opting in, stored for the next classic game
    await c.prefetchTicket();
    const t = readTicket(clock)!;
    expect(t.seed).toBeTypeOf('number');
    const log = new RunLog();
    expect(log.ticketSeed(clock)).toBe(t.seed);
    expect(readTicket(clock)).toBeNull(); // consumed
    // play the issued seed through the run log, like main.ts does
    let s: GameState = newGame(t.seed);
    const g = playOut(t.seed, { quick: true });
    for (const m of g.moves) {
      log.record(s, m, 'classic', DAY);
      s = applyMove(s, m)!.state;
    }
    const run = log.finish(s, 'classic')!;
    expect(run.runToken).toBe(t.runToken);
    clock += g.moves.length * 1000;
    const out = await c.post(run, 'TIDE');
    expect(out.status).toBe('posted');
    const v = await c.view('endless:week');
    expect(v).toMatchObject({ demo: false, total: 1, me: { name: 'TIDE', rank: 1 } });
    expect(await http.myRank('endless:all', lb.installId!)).toMatchObject({ rank: 1 });
    // erase: tombstone → DELETE → gone
    markForget(lb.installId!);
    c.forgetQueue();
    await c.processForget();
    expect(readForget()).toEqual([]);
    expect(await http.myRank('endless:all', lb.installId!)).toBeNull();
    expect((await http.top('endless:all', 5)).total).toBe(0);
  });

  it('an old app version is told to update and the run is not retried forever', async () => {
    const http = new HttpBackend('https://lb.test', (u, i) =>
      handle(new Request(u, i), { store: new MemoryStore(), secret: 'x', now: () => clock, rules: RULES_VERSION + 1 }),
    );
    const c = client(http);
    expect(await c.post(dailyFinished(), 'CORAL')).toEqual({ status: 'rejected', reason: 'upgrade_required' });
    expect(c.upgradeRequired).toBe(true);
    expect(c.pending()).toHaveLength(0);
  });
});

describe('RunLog', () => {
  it('records a game, survives a resume, and verifies the finished run', () => {
    const log = new RunLog();
    const g = playOut(5, { quick: true });
    let s = newGame(5);
    for (const m of g.moves.slice(0, 10)) {
      log.record(s, m, 'classic', DAY);
      s = applyMove(s, m)!.state;
    }
    const rec = log.get('classic')!;
    expect(rec.moves).toBe(packMoves(g.moves.slice(0, 10)));
    // app restart: a new log adopts the saved record
    const log2 = new RunLog();
    log2.resume('classic', s, rec);
    for (const m of g.moves.slice(10)) {
      log2.record(s, m, 'classic', DAY);
      s = applyMove(s, m)!.state;
    }
    expect(log2.finish(s, 'classic')).toMatchObject({ mode: 'endless', seed: 5, score: g.state.score, teach: false });
  });

  it('detects the teaching game, drops logs that do not line up, refuses unverifiable runs', () => {
    const log = new RunLog();
    const t = playOut(8, { teach: true, quick: true });
    let s = newGame(8, { teach: true });
    for (const m of t.moves) {
      log.record(s, m, 'classic', DAY);
      s = applyMove(s, m)!.state;
    }
    expect(log.finish(s, 'classic')?.teach).toBe(true);
    // a resumed save without a log can't be posted
    const mid = playOut(9, { quick: true });
    let r = newGame(9);
    for (const m of mid.moves.slice(0, 3)) r = applyMove(r, m)!.state;
    const log2 = new RunLog();
    log2.resume('classic', r, null);
    for (const m of mid.moves.slice(3)) {
      log2.record(r, m, 'classic', DAY);
      r = applyMove(r, m)!.state;
    }
    expect(log2.finish(r, 'classic')).toBeNull();
    // a doctored final state (e.g. a debug-staged score) doesn't verify
    expect(log.finish({ ...s, score: s.score + 5 }, 'classic')).toBeNull();
    expect(log.resume('daily', null, null)).toBeNull();
  });

  it('daily logs are tied to their date', () => {
    const log = new RunLog();
    const seed = dailySeed(DAY);
    const d = playOut(seed, { mode: 'daily', quick: true });
    let s = newGame(seed, { mode: 'daily' });
    log.record(s, d.moves[0]!, 'daily', DAY);
    s = applyMove(s, d.moves[0]!)!.state;
    log.record(s, d.moves[1]!, 'daily', '2026-10-17'); // the date changed under a stale tab
    expect(log.get('daily')).toBeNull();
  });

  it('tickets expire; tombstones are deduplicated', () => {
    storeTicket({ seed: 1, runToken: 't', expiresAt: T0 + 3_600_000 });
    expect(readTicket(T0)).toBeNull(); // under the 6 h margin
    markForget('a'.repeat(32));
    markForget('a'.repeat(32));
    expect(readForget()).toEqual(['a'.repeat(32)]);
    expect(hasPendingLbWork()).toBe(true);
  });
});

describe('submission shape', () => {
  it('the client sends what the server expects', async () => {
    const sent: ScoreSubmission[] = [];
    const c = client(
      new HttpBackend('https://lb.test', async (_u, i) => {
        sent.push(JSON.parse(String(i.body)));
        return new Response(JSON.stringify({ verifiedScore: 1, boards: [] }));
      }),
    );
    const run = dailyFinished();
    await c.post(run, 'CORAL');
    expect(sent[0]).toEqual({
      name: 'CORAL',
      installId: lb.installId,
      mode: 'daily',
      seed: run.seed,
      date: DAY,
      teach: false,
      rules: RULES_VERSION,
      moves: run.moves,
      score: run.score,
      clientVersion: 'test',
      avatar: 'hermit',
    });
  });
});

describe('review fixes (client)', () => {
  /** An Endless run on a token signed with the given expiry. */
  async function ticketed(exp: number, seed = 41) {
    const runToken = await signRun(
      { v: 1, rid: 'r'.repeat(32), pid: '', seed, teach: false, rules: RULES_VERSION, iat: exp - 72 * 3_600_000, exp },
      's',
    );
    return { ...endlessFinished(seed), runToken };
  }
  const fakeBackend = (over: Partial<LeaderboardBackend>): LeaderboardBackend => ({
    kind: 'http',
    startRun: async () => null,
    markStarted: async () => undefined,
    submit: async () => ({ verifiedScore: 0, boards: [] }),
    top: async (b) => ({ board: b as 'endless:all', total: 0, entries: [] }),
    around: async (b) => ({ board: b as 'endless:all', total: 0, me: null, above: null, entries: [] }),
    myRank: async () => null,
    deletePlayer: async () => undefined,
    ...over,
  });

  it('"You" is the row the backend tagged, never the row that happens to share my rank', async () => {
    lb.installId = 'a'.repeat(32);
    // a cached/stale top where rank 2 is someone else; around (fresh) says I'm #2
    const c = client(
      fakeBackend({
        top: async () => ({
          board: 'endless:all',
          total: 3,
          entries: [
            { rank: 1, name: 'CORAL', score: 900, moves: 40 },
            { rank: 2, name: 'KELP', score: 800, moves: 40 },
            { rank: 3, name: 'TIDE', score: 700, moves: 40, me: true },
          ],
        }),
        around: async () => ({
          board: 'endless:all',
          total: 3,
          me: { rank: 2, name: 'TIDE', score: 850, moves: 40, me: true },
          above: null,
          entries: [],
        }),
      }),
    );
    const v = await c.view('endless:all');
    expect(v.top.filter((e) => e.me).map((e) => e.name)).toEqual(['TIDE']);
    // and against the real Worker: the personalised top tags exactly my row, even in a tie
    const store = new MemoryStore();
    const http = new HttpBackend('https://lb.test', (u, i) =>
      handle(new Request(u, i), { store, secret: 's', now: () => clock }),
    );
    const run = dailyFinished();
    lb.installId = undefined;
    await client(http).post(run, 'CORAL');
    const first = lb.installId!;
    lb.installId = undefined;
    clock += 1000;
    const c2 = client(http);
    await c2.post(run, 'KELP'); // same score: ranks below CORAL
    const v2 = await c2.view(`daily:${DAY}`);
    expect(v2.top.map((e) => [e.name, !!e.me])).toEqual([
      ['CORAL', false],
      ['KELP', true],
    ]);
    expect(first).not.toBe(lb.installId);
  });

  it('a run whose ticket expired is never queued; queued ones that expire are dropped with a count', async () => {
    const offline = fakeBackend({
      submit: async () => {
        throw new LbError('offline');
      },
    });
    const c = client(offline);
    expect(await c.post(await ticketed(T0 - 1), 'TIDE')).toEqual({ status: 'rejected', reason: 'token_expired' });
    expect(c.pending()).toHaveLength(0);
    expect((await c.post(await ticketed(T0 + 3_600_000), 'TIDE')).status).toBe('queued');
    expect(c.pending()).toHaveLength(1);
    clock += 2 * 3_600_000; // still offline when the ticket runs out
    await c.flush();
    expect(c.pending()).toHaveLength(0);
    expect(c.takeExpiredDrops()).toBe(1); // shown once on the next board…
    expect(c.takeExpiredDrops()).toBe(0); // …then forgotten
    expect(c.expired(dailyFinished())).toBe(false);
  });

  it('fresh tickets and the run start reach the server (the speed clock starts at the first move)', async () => {
    const store = new MemoryStore();
    const http = new HttpBackend('https://lb.test', (u, i) =>
      handle(new Request(u, i), { store, secret: 's', now: () => clock }),
    );
    const c = client(http);
    const t = (await c.freshTicket())!;
    expect(t.seed).toBeTypeOf('number');
    expect(readTicket(clock)).toBeNull(); // used now, not stored as the spare
    await c.markStarted(t.runToken);
    expect([...store.starts.values()]).toEqual([clock]);
    expect(await client(new MockBackend({ kv, latencyMs: 0 })).freshTicket()).toBeNull();
  });

  it('a ticket taken for a new game is saved with it, so a reload before the first move stays ranked', () => {
    storeTicket({ seed: 77, runToken: 'tok.sig', expiresAt: T0 + 72 * 3_600_000 });
    const log = new RunLog();
    const seed = log.ticketSeed(T0)!;
    const s0 = newGame(seed);
    const rec = log.get('classic', s0)!;
    expect(rec).toEqual({ moves: '', teach: false, runToken: 'tok.sig' });
    // reload: a new RunLog adopts the saved record, and the first move keeps the token
    const log2 = new RunLog();
    log2.resume('classic', s0, rec);
    const g = playOut(seed, { quick: true });
    let s = s0;
    for (const m of g.moves) {
      log2.record(s, m, 'classic', DAY);
      s = applyMove(s, m)!.state;
    }
    expect(log2.finish(s, 'classic')?.runToken).toBe('tok.sig');
    // a fresh ticket from the server is used the same way
    const log3 = new RunLog();
    expect(log3.useTicket({ seed: 5, runToken: 'fresh' })).toBe(5);
    expect(log3.get('classic', newGame(5))?.runToken).toBe('fresh');
    expect(log3.get('classic', newGame(6))).toBeNull();
  });
});
