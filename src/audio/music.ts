/**
 * Generative beach music, synthesized (original; no samples). A lookahead scheduler places notes on
 * a beat grid: soft pad chords, a round bass, a sparse marimba-like melody walking a pentatonic
 * scale, and filtered-noise waves that swell and recede. Night is lower, slower and sparser.
 * Deterministic per session seed, so it never repeats exactly but is testable.
 */
import { Rng } from '../core/rng.ts';

type Ctx = AudioContext | BaseAudioContext;

// I – vi – IV – V colours (semitones above C3 for each chord's tones)
const PROG: readonly (readonly number[])[] = [
  [0, 7, 11, 14, 16], // Cmaj9
  [-3, 4, 7, 11, 12], // Am9
  [-7, 0, 4, 9, 12], // Fmaj9 (F2-based)
  [-5, 2, 7, 9, 14], // G6/9
];
const PENTA = [0, 2, 4, 7, 9];
const C3 = 130.81;
const hz = (semi: number) => C3 * Math.pow(2, semi / 12);

export class Music {
  private ctx: Ctx | null = null;
  private bus: GainNode | null = null;
  private delay: DelayNode | null = null;
  private noise: AudioBuffer | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private nextBeat = 0;
  private beat = 0;
  private rng = new Rng(1);
  private melodyDeg = 7;
  enabled = true;
  night = false;
  volume = 0.17;

  constructor(private readonly getGraph: () => { ctx: Ctx; out: AudioNode; noise: AudioBuffer } | null) {}

  /** Start (or resume) playback; safe to call often. Needs the audio context to exist. */
  start(seed = 1): void {
    if (!this.enabled) return;
    if (!this.prime(seed)) return;
    if (this.timer) return;
    const t = this.ctx!.currentTime;
    const g = this.bus!.gain;
    const v = g.value; // hold wherever a fade-out left it, so a quick off/on doesn't jump
    g.cancelScheduledValues(t);
    g.setValueAtTime(v, t);
    this.bus!.gain.setTargetAtTime(this.volume, t, 1.2); // fade in
    this.nextBeat = Math.max(this.nextBeat, t + 0.1);
    this.tick();
  }

  /** Build the graph once (no scheduling). Returns false if there's no audio context yet. */
  prime(seed = 1): boolean {
    const gr = this.getGraph();
    if (!gr) return false;
    if (!this.ctx) {
      this.ctx = gr.ctx;
      this.noise = gr.noise;
      this.bus = gr.ctx.createGain();
      this.bus.gain.value = 0;
      // a little space: filtered feedback delay
      this.delay = gr.ctx.createDelay(1);
      this.delay.delayTime.value = 0.42;
      const fb = gr.ctx.createGain();
      fb.gain.value = 0.28;
      const lp = gr.ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 1800;
      this.delay.connect(lp).connect(fb).connect(this.delay);
      const wet = gr.ctx.createGain();
      wet.gain.value = 0.35;
      lp.connect(wet).connect(this.bus);
      this.bus.connect(gr.out);
      this.rng = new Rng(seed);
    }
    return true;
  }

  /** Offline QA: schedule `beats` beats from t=0 at full volume (no timers). */
  renderBeats(beats: number): void {
    if (!this.prime(7)) return;
    this.bus!.gain.value = this.volume;
    const spb = 60 / (this.night ? 58 : 70);
    for (let i = 0; i < beats; i++, this.beat++) this.scheduleBeat(0.05 + i * spb, spb);
  }

  stop(): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    if (this.ctx && this.bus) this.bus.gain.setTargetAtTime(0, this.ctx.currentTime, 0.4);
  }

  get playing(): boolean {
    return this.timer !== null;
  }

  private tick = (): void => {
    const ctx = this.ctx!;
    const spb = 60 / (this.night ? 58 : 70); // seconds per beat
    while (this.nextBeat < ctx.currentTime + 0.35) {
      this.scheduleBeat(this.nextBeat, spb);
      this.nextBeat += spb;
      this.beat++;
    }
    this.timer = setTimeout(this.tick, 120);
  };

  /** Everything that happens on one beat. 4 beats per bar, one chord per bar, 16-bar arc. */
  scheduleBeat(t: number, spb: number): void {
    const bar = Math.floor(this.beat / 4);
    const inBar = this.beat % 4;
    const chord = PROG[bar % PROG.length]!;
    const low = this.night ? -12 : 0;
    if (inBar === 0) {
      for (const n of chord.slice(1)) this.pad(hz(n + low), t, spb * 4);
      this.bass(hz(chord[0]! - 12 + low), t, spb * 2);
      if (bar % 2 === 1) this.bass(hz(chord[0]! - 12 + low + 7), t + spb * 2, spb * 1.5);
    }
    if (bar % 4 === 0 && inBar === 0) this.wave(t, spb * 16);
    // melody: eighth notes, sparse, a random walk on the pentatonic, resting more at night
    for (const half of [0, 0.5]) {
      if (this.rng.next() > (this.night ? 0.22 : 0.34)) continue;
      this.melodyDeg = Math.max(0, Math.min(14, this.melodyDeg + [-2, -1, -1, 0, 1, 1, 2][this.rng.int(7)]!));
      const d = this.melodyDeg;
      const semi = PENTA[d % 5]! + 12 * Math.floor(d / 5) + 12 + low;
      this.pluck(hz(semi), t + half * spb, spb * 1.6);
    }
  }

  private env(t: number, a: number, peak: number, hold: number, r: number): GainNode {
    const g = this.ctx!.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + a);
    g.gain.setValueAtTime(peak, t + a + hold);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + hold + r);
    return g;
  }

  private pad(f: number, t: number, dur: number): void {
    const ctx = this.ctx!;
    const g = this.env(t, 1.2, 0.035, Math.max(0, dur - 1.6), 2.2);
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = this.night ? 700 : 1100;
    for (const det of [-6, 6]) {
      const o = ctx.createOscillator();
      o.type = 'triangle';
      o.frequency.value = f;
      o.detune.value = det;
      o.connect(lp);
      o.start(t);
      o.stop(t + dur + 2.5);
    }
    lp.connect(g).connect(this.bus!);
  }

  private bass(f: number, t: number, dur: number): void {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.value = f;
    const g = this.env(t, 0.04, 0.12, dur * 0.4, dur * 0.8);
    o.connect(g).connect(this.bus!);
    o.start(t);
    o.stop(t + dur * 1.3);
  }

  /** Marimba-ish: sine + a quiet 4th harmonic, quick decay, into the delay. */
  private pluck(f: number, t: number, dur: number): void {
    const ctx = this.ctx!;
    const g = this.env(t, 0.006, 0.07, 0, dur);
    for (const [mul, amp] of [
      [1, 1],
      [4, 0.12],
    ] as const) {
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.value = f * mul;
      const a = ctx.createGain();
      a.gain.value = amp;
      o.connect(a).connect(g);
      o.start(t);
      o.stop(t + dur + 0.1);
    }
    g.connect(this.bus!);
    g.connect(this.delay!);
  }

  /** A wave: band-passed noise swelling in and drawing back over a few seconds. */
  private wave(t: number, dur: number): void {
    const ctx = this.ctx!;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    src.loop = true;
    const bp = ctx.createBiquadFilter();
    bp.type = 'lowpass';
    bp.frequency.setValueAtTime(300, t);
    bp.frequency.linearRampToValueAtTime(1400, t + dur * 0.35);
    bp.frequency.linearRampToValueAtTime(250, t + dur * 0.9);
    const g = this.env(t, dur * 0.35, 0.05, dur * 0.1, dur * 0.5);
    src.connect(bp).connect(g).connect(this.bus!);
    src.start(t);
    src.stop(t + dur);
  }
}
