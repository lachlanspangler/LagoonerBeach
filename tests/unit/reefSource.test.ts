import { afterEach, describe, expect, it } from 'vitest';
import pack from '../../src/content/puzzles.json';
import { GENERATOR_VERSION, generateReef } from '../../src/core/endless.ts';
import { CACHE_KEY, ReefSource, validReef, type ReefDef, type WorkerLike } from '../../src/app/reefSource.ts';
import { loadProfile } from '../../src/platform/storage.ts';
import { chapterLabel, noteFirstClear, reefEvents, type ChapterCompleteDetail } from '../../src/app/reefProgress.ts';

const PACK = pack as unknown as ReefDef[];

function memStorage(init: Record<string, string> = {}) {
  const m = new Map(Object.entries(init));
  return {
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => void m.set(k, v),
    removeItem: (k: string) => void m.delete(k),
    map: m,
  };
}
const now = (fn: () => void) => fn(); // run fallback work immediately
const noWorker = () => null;

describe('reef source', () => {
  it('shipped reefs are synchronous; generated ones arrive via the fallback and equal the generator', async () => {
    const s = new ReefSource(PACK, { storage: memStorage(), createWorker: noWorker, defer: now });
    expect(s.get(0)!.id).toBe('R001');
    expect(s.get(359)!.id).toBe('R360');
    expect(s.get(360)).toBeNull();
    const r = await s.ensure(360);
    const g = generateReef(361);
    expect(r).toMatchObject({ id: 'g361', board: g.board, pieces: g.pieces, solution: g.solution, tier: g.tier });
    expect(s.get(360)).toBe(r);
    expect(s.stats).toMatchObject({ worker: false, fallback: 1 });
    await expect(s.ensure(-5)).rejects.toThrow();
  });

  it('caches in storage across sessions, keyed by generator version', async () => {
    const st = memStorage();
    const a = new ReefSource(PACK, { storage: st, createWorker: noWorker, defer: now });
    await a.ensure(400);
    const b = new ReefSource(PACK, { storage: st, createWorker: noWorker, defer: now });
    expect(b.get(400)!.id).toBe('g401');
    expect(b.stats.fromCache).toBe(1);
    // a different generator version invalidates the whole cache
    const f = JSON.parse(st.map.get(CACHE_KEY)!);
    st.setItem(CACHE_KEY, JSON.stringify({ ...f, v: GENERATOR_VERSION + 1 }));
    expect(new ReefSource(PACK, { storage: st, createWorker: noWorker, defer: now }).get(400)).toBeNull();
  });

  it('never trusts a corrupted cache entry', async () => {
    const st = memStorage();
    await new ReefSource(PACK, { storage: st, createWorker: noWorker, defer: now }).ensure(400);
    const f = JSON.parse(st.map.get(CACHE_KEY)!);
    const r = f.reefs['401'];
    f.reefs['401'] = { ...r, solution: [...r.solution].reverse().map((m: { x: number }) => ({ ...m, x: 0 })) };
    st.setItem(CACHE_KEY, JSON.stringify(f));
    expect(new ReefSource(PACK, { storage: st, createWorker: noWorker, defer: now }).get(400)).toBeNull();
    st.setItem(CACHE_KEY, '{not json');
    expect(new ReefSource(PACK, { storage: st, createWorker: noWorker, defer: now }).get(400)).toBeNull();
    expect(validReef(generateReef(401), 402)).toBe(false); // wrong number
  });

  it('cache is bounded (oldest out) and the reef being played is pinned', async () => {
    const st = memStorage();
    const s = new ReefSource(PACK, { storage: st, createWorker: noWorker, defer: now, cacheSize: 5 });
    await s.ensure(360);
    s.pin(360);
    for (let i = 361; i < 370; i++) await s.ensure(i);
    expect(s.cached()).toHaveLength(5);
    expect(s.get(360)).not.toBeNull(); // pinned
    expect(s.get(361)).toBeNull(); // evicted
    const f = JSON.parse(st.map.get(CACHE_KEY)!);
    expect(Object.keys(f.reefs)).toHaveLength(5);
  });

  it('prefetch queues the next reefs ahead', async () => {
    const queued: (() => void)[] = [];
    const s = new ReefSource(PACK, { storage: memStorage(), createWorker: noWorker, defer: (fn) => queued.push(fn) });
    s.prefetch(359, 3);
    while (queued.length) queued.shift()!();
    expect([360, 361, 362].map((i) => s.get(i)?.id)).toEqual(['g361', 'g362', 'g363']);
    expect(s.get(363)).toBeNull();
  });

  describe('worker', () => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    afterEach(() => timers.forEach(clearTimeout));

    /** A fake worker running the real generator asynchronously (or failing to load). */
    function fakeWorker(mode: 'ok' | 'broken' | 'garbage'): WorkerLike & { posted: number } {
      const listeners: Record<string, ((e: { data?: unknown }) => void)[]> = { message: [], error: [] };
      const w = {
        posted: 0,
        postMessage(m: unknown) {
          w.posted++;
          const n = (m as { n: number }).n;
          timers.push(
            setTimeout(() => {
              if (mode === 'broken') listeners.error!.forEach((f) => f({}));
              else {
                const reef = mode === 'ok' ? generateReef(n) : { id: `g${n}`, board: 'x' };
                listeners.message!.forEach((f) => f({ data: { n, reef, ms: 1 } }));
              }
            }, 1),
          );
        },
        addEventListener(t: 'message' | 'error', f: (e: { data?: unknown }) => void) {
          listeners[t]!.push(f);
        },
        terminate() {},
      };
      return w;
    }

    it('generates in the worker when available', async () => {
      const w = fakeWorker('ok');
      const s = new ReefSource(PACK, { storage: memStorage(), createWorker: () => w, defer: now });
      expect((await s.ensure(500)).id).toBe('g501');
      expect(w.posted).toBe(1);
      expect(s.stats).toMatchObject({ worker: true, fallback: 0, generated: 1 });
    });

    it('falls back to synchronous generation when the worker fails to load', async () => {
      const s = new ReefSource(PACK, { storage: memStorage(), createWorker: () => fakeWorker('broken'), defer: now });
      expect((await s.ensure(500)).id).toBe('g501');
      expect(s.stats).toMatchObject({ worker: false, fallback: 1 });
    });

    it('falls back when constructing the worker throws, or when it returns an unverified reef', async () => {
      const a = new ReefSource(PACK, {
        storage: memStorage(),
        createWorker: () => {
          throw new Error('no module workers here');
        },
        defer: now,
      });
      expect((await a.ensure(500)).id).toBe('g501');
      const b = new ReefSource(PACK, { storage: memStorage(), createWorker: () => fakeWorker('garbage'), defer: now });
      const r = await b.ensure(500);
      expect(validReef(r, 501)).toBe(true);
      expect(b.stats.fallback).toBe(1);
    });
  });
});

describe('chapter milestones', () => {
  it("'chapterComplete' fires once, on the clear that finishes all 20 reefs of a chapter", () => {
    const got: ChapterCompleteDetail[] = [];
    const on = (e: Event) => got.push((e as CustomEvent<ChapterCompleteDetail>).detail);
    reefEvents.addEventListener('chapterComplete', on);
    const ids = Array.from({ length: 19 }, (_, k) => `g${362 + k}`); // 362…380
    expect(noteFirstClear(380, ids)).toBeNull(); // 361 still missing
    expect(noteFirstClear(361, [...ids, 'g361'])).toMatchObject({ chapter: 19, first: 361, last: 380, reef: 361 });
    expect(noteFirstClear(5, ['R005'])).toBeNull();
    reefEvents.removeEventListener('chapterComplete', on);
    expect(got).toHaveLength(1);
    expect(got[0]!.name).toBe(chapterLabel(361).split(' · ')[1]);
    expect(chapterLabel(447)).toMatch(/^Chapter 23 · .+ · 7\/20$/);
  });
});

describe('profile migration', () => {
  const g = globalThis as { localStorage?: unknown };
  afterEach(() => delete g.localStorage);

  it('an old save with only index/solved (and the old 360 clamp) loads cleanly', () => {
    g.localStorage = memStorage({
      'atoll.v1.profile': JSON.stringify({ v: 1, best: 120, puzzle: { index: 359, solved: ['R001', 'R002', 7] } }),
    });
    const p = loadProfile();
    expect(p.puzzle).toEqual({ index: 359, solved: ['R001', 'R002'], pure: [], hinted: [], dailyDone: [] });
    expect(p.best).toBe(120);
  });

  it('generated ids and indices past the pack survive; nonsense indices are clamped', () => {
    g.localStorage = memStorage({
      'atoll.v1.profile': JSON.stringify({
        v: 1,
        puzzle: { index: 447, solved: ['R360', 'g361', 'g447'], pure: ['g361'], hinted: ['g447'] },
      }),
    });
    expect(loadProfile().puzzle).toMatchObject({ index: 447, solved: ['R360', 'g361', 'g447'], pure: ['g361'] });
    g.localStorage = memStorage({ 'atoll.v1.profile': JSON.stringify({ v: 1, puzzle: { index: 1e12, solved: 'x' } }) });
    expect(loadProfile().puzzle.index).toBeLessThan(10_000_000);
    expect(loadProfile().puzzle.solved).toEqual([]);
    g.localStorage = memStorage({ 'atoll.v1.profile': JSON.stringify({ v: 1, puzzle: { index: -3 } }) });
    expect(loadProfile().puzzle.index).toBe(0);
  });
});
