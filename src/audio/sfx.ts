/**
 * Synthesized sound effects (WebAudio, no asset files). Every sound is a few oscillators/noise
 * bursts through envelopes. Mobile browsers require unlocking on the first user gesture.
 */
const PENTA = [0, 2, 4, 7, 9]; // major pentatonic degrees

export class Sfx {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  enabled = true;
  /** Master gain; tuned with the offline audio QA (tests/e2e/audio.spec.ts → artifacts/audio-levels.json). */
  volume = 2.1;

  /** Call from a user-gesture handler (pointerdown). Safe to call repeatedly. */
  unlock(): void {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      return;
    }
    const AC =
      (globalThis as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext })
        .AudioContext ?? (globalThis as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.volume;
    const comp = this.ctx.createDynamicsCompressor();
    this.master.connect(comp).connect(this.ctx.destination);
    const len = Math.floor(this.ctx.sampleRate * 0.4);
    this.noise = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = this.noise.getChannelData(0);
    let s = 22222;
    for (let i = 0; i < len; i++) {
      s = (s * 1103515245 + 12345) >>> 0;
      d[i] = (s / 2147483648 - 1) * (1 - i / len);
    }
  }

  /**
   * Render one sound offline (for audio QA): returns peak and RMS of the result.
   * Temporarily swaps in an OfflineAudioContext; never call during play.
   */
  async measure(play: (s: Sfx) => void, seconds = 1.2): Promise<{ peak: number; rms: number }> {
    const saved = { ctx: this.ctx, master: this.master, noise: this.noise, enabled: this.enabled };
    const off = new OfflineAudioContext(1, Math.ceil(44100 * seconds), 44100);
    this.ctx = off as unknown as AudioContext;
    this.master = off.createGain();
    this.master.gain.value = this.volume;
    const comp = off.createDynamicsCompressor();
    this.master.connect(comp).connect(off.destination);
    const len = Math.floor(off.sampleRate * 0.4);
    this.noise = off.createBuffer(1, len, off.sampleRate);
    const d = this.noise.getChannelData(0);
    let s = 22222;
    for (let i = 0; i < len; i++) {
      s = (s * 1103515245 + 12345) >>> 0;
      d[i] = (s / 2147483648 - 1) * (1 - i / len);
    }
    this.enabled = true;
    play(this);
    const buf = await off.startRendering();
    Object.assign(this, saved);
    const x = buf.getChannelData(0);
    let peak = 0;
    let sum = 0;
    for (let i = 0; i < x.length; i++) {
      const v = Math.abs(x[i]!);
      if (v > peak) peak = v;
      sum += v * v;
    }
    return { peak, rms: Math.sqrt(sum / x.length) };
  }

  suspend(): void {
    if (this.ctx && this.ctx.state === 'running') void this.ctx.suspend();
  }

  private ready(): AudioContext | null {
    return this.enabled && this.ctx && this.master && this.ctx.state !== 'closed' ? this.ctx : null;
  }

  private tone(freq: number, at: number, dur: number, type: OscillatorType, gain: number, glideTo?: number): void {
    const ctx = this.ready();
    if (!ctx) return;
    const t = ctx.currentTime + at;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (glideTo) o.frequency.exponentialRampToValueAtTime(glideTo, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(this.master!);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  private hiss(at: number, dur: number, freq: number, q: number, gain: number): void {
    const ctx = this.ready();
    if (!ctx || !this.noise) return;
    const t = ctx.currentTime + at;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = freq;
    f.Q.value = q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g).connect(this.master!);
    src.start(t);
    src.stop(t + dur + 0.02);
  }

  private note(degree: number, octave = 0): number {
    const oct = Math.floor(degree / PENTA.length) + octave;
    const semis = PENTA[((degree % PENTA.length) + PENTA.length) % PENTA.length]! + 12 * oct;
    return 523.25 * Math.pow(2, semis / 12); // C5 base
  }

  pick(): void {
    this.tone(660, 0, 0.05, 'sine', 0.12, 880);
  }

  /** Stone "tok": low thump + short filtered tick. Bigger pieces are slightly lower. */
  place(size: number): void {
    const f = 210 - Math.min(size, 9) * 9;
    this.tone(f, 0, 0.09, 'triangle', 0.32, f * 0.6);
    this.hiss(0, 0.04, 2400, 3, 0.18);
  }

  /** Soft water drip when a drag would seal a lagoon; higher for bigger lagoons. */
  seal(area: number): void {
    const f = 900 + Math.min(area, 16) * 40;
    this.tone(f, 0, 0.07, 'sine', 0.16, f * 1.5);
  }

  invalid(): void {
    this.tone(150, 0, 0.12, 'sine', 0.2, 110);
  }

  /** Water "bloop" + chime rising with streak; one call per wave. */
  capture(area: number, streak: number, wave: number, at = 0): void {
    const base = 300 + Math.min(area, 20) * 6;
    this.tone(base, at, 0.16, 'sine', 0.3, base * 2.1);
    this.hiss(at, 0.22, 900, 1.2, 0.12);
    const deg = Math.min(streak, 10) + wave * 2;
    this.tone(this.note(deg), at + 0.04, 0.5, 'sine', 0.16);
    this.tone(this.note(deg + 2), at + 0.1, 0.45, 'sine', 0.1);
    if (area >= 6) this.tone(this.note(deg + 4), at + 0.17, 0.6, 'triangle', 0.1);
    // body: big lagoons land with weight — first wave only, or cascades stack into clipping
    if (area >= 6 && wave === 0) this.tone(120, at, 0.45, 'sine', 0.6, 70);
  }

  cleanReef(at = 0): void {
    [0, 2, 4, 5, 7].forEach((d, i) => this.tone(this.note(d, 1), at + i * 0.07, 0.5, 'sine', 0.12));
  }

  deal(): void {
    this.hiss(0, 0.08, 3200, 1.5, 0.35);
  }

  newBest(): void {
    [0, 2, 4, 7].forEach((d, i) => this.tone(this.note(d), i * 0.09, 0.35, 'triangle', 0.12));
  }

  gameOver(): void {
    [4, 2, 0].forEach((d, i) => this.tone(this.note(d, -1), i * 0.16, 0.5, 'sine', 0.14));
  }

  click(): void {
    this.tone(880, 0, 0.03, 'sine', 0.09);
  }
}
