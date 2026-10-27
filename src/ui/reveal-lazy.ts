/**
 * The discovery reveal lives in its own chunk (reveal.ts + share card + its CSS), so the first
 * paint doesn't pay for it. This proxy has the same API; it loads the chunk — and the creature art
 * chunk, so a reveal never shows legacy art when new art exists — on first use or when idle.
 */
import type { Reveal, RevealDeps, RevealItem } from './reveal.ts';
import { loadCreatureArt } from '../render/creatures.ts';
import { showRetry } from './retry.ts';

export class LazyReveal {
  private impl: Reveal | null = null;
  private loading: Promise<Reveal> | null = null;
  /** Enqueues waiting for the chunk. */
  private inFlight = 0;
  private idleFns: (() => void)[] = [];
  /** Bumped by clear(): enqueues from before it are dropped when the chunk arrives. */
  private gen = 0;
  /** endGame() was called in this generation: late-arriving enqueues are folded the same way. */
  private endedGen = -1;

  constructor(
    private readonly root: HTMLElement,
    private readonly deps: RevealDeps,
  ) {}

  /** Fetch the chunk ahead of time (idle after boot). */
  prefetch(): void {
    void this.load().catch(() => undefined);
  }

  /** A failed chunk fetch isn't cached: the next load() tries the network again. */
  private load(): Promise<Reveal> {
    if (this.loading) return this.loading;
    const p = Promise.all([import('./reveal.ts'), loadCreatureArt().catch(() => null)]).then(([m]) => {
      this.impl ??= new m.Reveal(this.root, this.deps);
      return this.impl;
    });
    p.catch(() => this.loading === p && (this.loading = null));
    return (this.loading = p);
  }

  get blocking(): boolean {
    return this.impl?.blocking ?? false;
  }

  get idle(): boolean {
    return this.inFlight === 0 && (this.impl?.idle ?? true);
  }

  enqueue(items: readonly RevealItem[], at: number): void {
    const gen = this.gen;
    this.inFlight++;
    void this.load().then(
      (r) => {
        this.inFlight--;
        if (gen === this.gen) r.enqueue(items, at);
        if (gen === this.gen && this.endedGen === this.gen) r.endGame();
        this.flush();
      },
      () => {
        this.inFlight--;
        this.flush();
        // the discovery is already in the journal; offer to show it once the chunk can load
        if (gen === this.gen) showRetry(() => gen === this.gen && this.enqueue(items, performance.now()));
      },
    );
  }

  whenIdle(fn: () => void): void {
    if (this.idle) fn();
    else if (this.inFlight === 0 && this.impl) this.impl.whenIdle(fn);
    else this.idleFns.push(fn);
  }

  private flush(): void {
    if (this.inFlight) return;
    const fns = this.idleFns;
    this.idleFns = [];
    for (const f of fns) {
      if (this.impl) this.impl.whenIdle(f);
      else f();
    }
  }

  /** The game ended: fold pending commons into the results, keep at most one modal (Reveal.endGame). */
  endGame(): void {
    this.endedGen = this.gen;
    this.impl?.endGame();
  }

  clear(): void {
    this.gen++;
    this.impl?.clear();
  }

  current(): ReturnType<Reveal['current']> {
    return this.impl?.current() ?? null;
  }

  /** A modal card opened less than the grace period before `t` (see Reveal.inGrace). */
  inGrace(t: number): boolean {
    return this.impl?.inGrace(t) ?? false;
  }

  freeze(t: number): boolean {
    return this.impl?.freeze(t) ?? false;
  }

  skip(): void {
    this.impl?.skip();
  }
}
