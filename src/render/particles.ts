/**
 * Fixed-size particle pool (struct of arrays, no per-frame allocation). Budget is adjustable at
 * runtime (reduced motion / slow device) without touching gameplay.
 */
export const enum Kind {
  Droplet = 0, // colored chip, falls
  Foam = 1, // white bubble ring, floats up
  Spark = 2, // tiny bright dot
}

export class Particles {
  readonly cap: number;
  count = 0;
  budget = 1;
  private x: Float32Array;
  private y: Float32Array;
  private vx: Float32Array;
  private vy: Float32Array;
  private age: Float32Array;
  private life: Float32Array;
  private size: Float32Array;
  private kind: Uint8Array;
  private color: Uint8Array;

  constructor(cap = 700) {
    this.cap = cap;
    this.x = new Float32Array(cap);
    this.y = new Float32Array(cap);
    this.vx = new Float32Array(cap);
    this.vy = new Float32Array(cap);
    this.age = new Float32Array(cap);
    this.life = new Float32Array(cap);
    this.size = new Float32Array(cap);
    this.kind = new Uint8Array(cap);
    this.color = new Uint8Array(cap);
  }

  /** Spawn n particles (scaled by budget). rand() supplies visual-only randomness. */
  burst(
    n: number,
    x: number,
    y: number,
    kind: Kind,
    color: number,
    speed: number,
    size: number,
    life: number,
    rand: () => number,
  ): void {
    const k = Math.round(n * this.budget);
    for (let i = 0; i < k && this.count < this.cap; i++) {
      const j = this.count++;
      const a = rand() * Math.PI * 2;
      const sp = speed * (0.35 + rand() * 0.65);
      this.x[j] = x + (rand() - 0.5) * size;
      this.y[j] = y + (rand() - 0.5) * size;
      this.vx[j] = Math.cos(a) * sp;
      this.vy[j] = Math.sin(a) * sp - (kind === Kind.Foam ? speed * 0.4 : speed * 0.25);
      this.age[j] = 0;
      this.life[j] = life * (0.7 + rand() * 0.5);
      this.size[j] = size * (0.5 + rand() * 0.6);
      this.kind[j] = kind;
      this.color[j] = color;
    }
  }

  update(dtMs: number): void {
    const dt = Math.min(dtMs, 50) / 1000;
    let i = 0;
    while (i < this.count) {
      this.age[i]! += dtMs;
      if (this.age[i]! >= this.life[i]!) {
        this.swapRemove(i);
        continue;
      }
      const k = this.kind[i]!;
      const drag = k === Kind.Foam ? 0.9 : 0.96;
      this.vx[i]! *= Math.pow(drag, dt * 60);
      this.vy[i]! *= Math.pow(drag, dt * 60);
      this.vy[i]! += (k === Kind.Droplet ? 900 : k === Kind.Foam ? -120 : 200) * dt;
      this.x[i]! += this.vx[i]! * dt;
      this.y[i]! += this.vy[i]! * dt;
      i++;
    }
  }

  private swapRemove(i: number): void {
    const l = --this.count;
    this.x[i] = this.x[l]!;
    this.y[i] = this.y[l]!;
    this.vx[i] = this.vx[l]!;
    this.vy[i] = this.vy[l]!;
    this.age[i] = this.age[l]!;
    this.life[i] = this.life[l]!;
    this.size[i] = this.size[l]!;
    this.kind[i] = this.kind[l]!;
    this.color[i] = this.color[l]!;
  }

  draw(g: CanvasRenderingContext2D, colors: readonly string[], foam: string): void {
    for (let i = 0; i < this.count; i++) {
      const t = this.age[i]! / this.life[i]!;
      const a = 1 - t * t;
      const k = this.kind[i]!;
      const s = this.size[i]! * (k === Kind.Foam ? 0.6 + t * 0.8 : 1 - t * 0.5);
      g.globalAlpha = a;
      if (k === Kind.Foam) {
        g.strokeStyle = foam;
        g.lineWidth = Math.max(1, s * 0.18);
        g.beginPath();
        g.arc(this.x[i]!, this.y[i]!, s * 0.5, 0, Math.PI * 2);
        g.stroke();
      } else {
        g.fillStyle = k === Kind.Spark ? foam : (colors[this.color[i]!] ?? foam);
        const h = s * 0.5;
        g.fillRect(this.x[i]! - h, this.y[i]! - h, s, s);
      }
    }
    g.globalAlpha = 1;
  }

  clear(): void {
    this.count = 0;
  }
}
