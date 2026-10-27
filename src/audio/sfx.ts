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
  /** Live output silenced (automated runs: nothing audible; offline QA renders are unaffected). */
  muteOutput = false;

  /**
   * Create the (suspended) context ahead of time — construction costs ~100+ ms on some devices, too
   * slow to do inside the first touch. Call when idle after boot; unlock() then only resumes.
   */
  prepare(): void {
    if (!this.ctx) this.create();
  }

  /** Call from a user-gesture handler (pointerdown). Safe to call repeatedly. */
  unlock(): void {
    if (!this.ctx) this.create();
    if (this.ctx && this.ctx.state === 'suspended') void this.ctx.resume();
  }

  private create(): void {
    const AC =
      (globalThis as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext })
        .AudioContext ?? (globalThis as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.volume;
    const comp = this.ctx.createDynamicsCompressor();
    const sink = this.ctx.createGain();
    sink.gain.value = this.muteOutput ? 0 : 1;
    this.master.connect(comp).connect(sink).connect(this.ctx.destination);
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

  /** Shared graph for the music engine (null until the context exists). */
  graph(): { ctx: AudioContext | BaseAudioContext; out: AudioNode; noise: AudioBuffer } | null {
    return this.ctx && this.master && this.noise ? { ctx: this.ctx, out: this.master, noise: this.noise } : null;
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

  private hiss(at: number, dur: number, freq: number, q: number, gain: number, sweepTo?: number, attack = 0): void {
    const ctx = this.ready();
    if (!ctx || !this.noise) return;
    const t = ctx.currentTime + at;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.setValueAtTime(freq, t);
    if (sweepTo) f.frequency.exponentialRampToValueAtTime(sweepTo, t + dur);
    f.Q.value = q;
    const g = ctx.createGain();
    if (attack > 0) {
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(gain, t + attack);
    } else g.gain.setValueAtTime(gain, t);
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

  /**
   * Water "bloop" + the combo chime; one call per wave. `step` is the pentatonic step (climbs one
   * per combo, capped at 12 — see moments.chimeStep); `layers` adds voices at ×5 / ×10 / ×20.
   */
  capture(area: number, step: number, wave: number, at = 0, layers = 0): void {
    const base = 300 + Math.min(area, 20) * 6;
    this.tone(base, at, 0.16, 'sine', 0.3, base * 2.1);
    this.hiss(at, 0.22, 900, 1.2, 0.12);
    const deg = Math.min(12, step) + wave * 2;
    this.tone(this.note(deg), at + 0.04, 0.5, 'sine', 0.16);
    this.tone(this.note(deg + 2), at + 0.1, 0.45, 'sine', 0.1);
    if (area >= 6) this.tone(this.note(deg + 4), at + 0.17, 0.6, 'triangle', 0.1);
    // combo layers: a fifth-ish above (×5), an octave shimmer (×10), a high bell (×20)
    if (layers >= 1) this.tone(this.note(deg + 3), at + 0.06, 0.45, 'sine', 0.06);
    if (layers >= 2) this.tone(this.note(deg, 1), at + 0.12, 0.6, 'sine', 0.05);
    if (layers >= 3) this.tone(this.note(deg + 2, 2), at + 0.2, 0.7, 'triangle', 0.035);
    // body: big lagoons land with weight — first wave only, or cascades stack into clipping
    if (area >= 6 && wave === 0) this.tone(120, at, 0.45, 'sine', 0.6, 70);
  }

  /** A new species for the journal: a bright little rising arpeggio with a sparkle on top. */
  discovery(at = 0): void {
    [0, 4, 7, 9].forEach((d, i) => this.tone(this.note(d, 1), at + i * 0.06, 0.4, 'triangle', 0.1));
    this.tone(this.note(2, 2), at + 0.26, 0.6, 'sine', 0.07);
  }

  /** Jackpot (12+ lagoon, cascade, clean reef): a warm low swell under a bright open chord. */
  jackpot(waves = 1, at = 0): void {
    this.tone(98, at, 0.9, 'sine', 0.35, 130);
    const lift = Math.min(3, waves - 1) * 2;
    [0, 2, 4, 7].forEach((d, i) => this.tone(this.note(d + lift, 0), at + 0.05 + i * 0.03, 0.9, 'triangle', 0.07));
    this.hiss(at, 0.5, 600, 0.8, 0.1);
  }

  /** Streak ×5, ×10…: two quick high notes that climb with the streak. */
  streakMilestone(streak: number, at = 0): void {
    const d = Math.min(8, Math.floor(streak / 5) * 2);
    this.tone(this.note(d, 1), at, 0.25, 'sine', 0.09);
    this.tone(this.note(d + 2, 1), at + 0.08, 0.35, 'sine', 0.09);
  }

  /** One sting per moment tier (ADR 0012): the word, in sound. Quiet for "Nice!", big for "Amazing!". */
  sting(kind: string, at = 0): void {
    switch (kind) {
      case 'nice':
        this.tone(this.note(7, 1), at, 0.25, 'sine', 0.06);
        this.tone(this.note(9, 1), at + 0.07, 0.35, 'sine', 0.06);
        break;
      case 'lagoon':
        [0, 2, 4].forEach((d, i) => this.tone(this.note(d + 5, 0), at + i * 0.06, 0.45, 'triangle', 0.07));
        break;
      case 'atoll':
        this.jackpot(1, at);
        break;
      case 'ripple':
        this.jackpot(2, at);
        [0, 2, 4, 5].forEach((d, i) => this.tone(this.note(d + 7, 0), at + 0.05 + i * 0.05, 0.4, 'sine', 0.05));
        break;
      case 'riptide':
        this.jackpot(3, at);
        [0, 2, 4, 5, 7].forEach((d, i) => this.tone(this.note(d + 5, 1), at + 0.04 + i * 0.045, 0.45, 'sine', 0.045));
        break;
      case 'spotless':
        this.tone(130.8, at, 1.0, 'sine', 0.22, 196);
        this.cleanReef(at + 0.05);
        break;
      case 'amazing':
        this.tone(98, at, 1.1, 'sine', 0.3, 147);
        [0, 2, 4, 7, 9].forEach((d, i) => this.tone(this.note(d, 0), at + i * 0.05, 1.0, 'triangle', 0.06));
        [4, 5, 7].forEach((d, i) => this.tone(this.note(d, 1), at + 0.3 + i * 0.08, 0.6, 'sine', 0.07));
        this.hiss(at, 0.4, 700, 0.8, 0.08);
        break;
    }
  }

  /** Air rush for screen-filling moments: band-passed noise sweeping up. */
  whoosh(at = 0): void {
    this.hiss(at, 0.4, 380, 1.4, 0.32, 2600, 0.1);
  }

  /** COMBO ×5 / ×10 / ×20: a bright climb, one more voice per level. */
  comboLevel(level: number, at = 0): void {
    const n = Math.min(4, level + 1);
    for (let i = 0; i < n; i++) this.tone(this.note(4 + i * 2, 1), at + i * 0.06, 0.32, 'sine', 0.08);
    if (level >= 4) this.tone(this.note(2, 3), at + n * 0.06, 0.6, 'triangle', 0.04);
  }

  /** The combo ran out: a soft two-note sigh downward (never a buzzer). */
  comboBreak(at = 0): void {
    this.tone(this.note(2, -1), at, 0.28, 'sine', 0.06, this.note(1, -1));
    this.tone(this.note(0, -1), at + 0.12, 0.35, 'sine', 0.05);
  }

  /** NEW HIGH SCORE at the results: a little fanfare over a warm swell. */
  fanfare(at = 0): void {
    this.tone(98, at, 1.4, 'sine', 0.28, 131);
    [0, 4, 7].forEach((d, i) => this.tone(this.note(d, 0), at + i * 0.11, 0.3, 'triangle', 0.1));
    [0, 2, 4, 7].forEach((d) => this.tone(this.note(d, 0), at + 0.38, 1.1, 'triangle', 0.06));
    this.tone(this.note(0, 1), at + 0.38, 1.1, 'sine', 0.08);
    this.hiss(at + 0.3, 0.5, 5200, 2, 0.05);
  }

  /** A bubble-pearl pops open (discovery reveal). */
  bubblePop(at = 0): void {
    this.tone(520, at, 0.09, 'sine', 0.18, 1400);
    this.hiss(at, 0.06, 3200, 2.5, 0.12);
  }

  /** Discovery sting scaled by rarity: common chime → legendary fanfare. */
  reveal(rarity: string, at = 0): void {
    const r = ['common', 'uncommon', 'rare', 'epic', 'legendary'].indexOf(rarity);
    if (r <= 0) return this.discovery(at);
    this.bubblePop(at);
    this.discovery(at + 0.06);
    if (r >= 2) [9, 11, 12].forEach((d, i) => this.tone(this.note(d, 1), at + 0.3 + i * 0.07, 0.5, 'sine', 0.04));
    if (r >= 3) {
      this.tone(110, at, 1.2, 'sine', 0.22, 165);
      [0, 4, 7].forEach((d) => this.tone(this.note(d, -1), at + 0.1, 1.1, 'triangle', 0.06));
    }
    if (r >= 4) this.fanfare(at + 0.25);
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
