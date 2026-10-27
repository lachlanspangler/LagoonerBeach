/**
 * The generative music lives in its own chunk (music.ts): nothing can play before the first
 * gesture unlocks audio, so the first frame doesn't need it. This proxy has the slice of Music's
 * API main.ts uses; `start()` loads the chunk (and main prefetches it at idle when music is on).
 * A failed load isn't cached: the next start() (the next gesture) tries again.
 */
import type { Music } from './music.ts';
import { retryable } from '../platform/lazy.ts';

const load = retryable(() => import('./music.ts'));

export class LazyMusic {
  private impl: Music | null = null;
  /** A start() that's waiting for the chunk (cleared by stop()). */
  private pending: number | null = null;
  private on = true;
  private nite = false;

  constructor(private readonly getGraph: ConstructorParameters<typeof Music>[0]) {}

  get enabled(): boolean {
    return this.on;
  }
  set enabled(v: boolean) {
    this.on = v;
    if (this.impl) this.impl.enabled = v;
  }
  get night(): boolean {
    return this.nite;
  }
  set night(v: boolean) {
    this.nite = v;
    if (this.impl) this.impl.night = v;
  }
  get playing(): boolean {
    return this.impl?.playing ?? false;
  }

  /** Fetch the chunk ahead of the first gesture. */
  prefetch(): void {
    void this.ensure().catch(() => undefined);
  }

  private ensure(): Promise<Music> {
    return load().then((m) => {
      if (!this.impl) {
        this.impl = new m.Music(this.getGraph);
        this.impl.enabled = this.on;
        this.impl.night = this.nite;
      }
      return this.impl;
    });
  }

  start(seed = 1): void {
    if (!this.on) return;
    if (this.impl) return this.impl.start(seed);
    this.pending = seed;
    this.ensure().then(
      (m) => {
        const s = this.pending;
        this.pending = null;
        if (s !== null && !document.hidden) m.start(s);
      },
      () => undefined,
    );
  }

  stop(): void {
    this.pending = null;
    this.impl?.stop();
  }
}
