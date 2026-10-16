/**
 * Pose solver (pure): given a species' idle spec, an expression and a time, compute the transform
 * of the whole creature (`root`) and of each animation group, plus the face state. No canvas here,
 * so the vocabulary is unit-testable and cheap (a few sines per frame, no allocation in the hot path
 * beyond the reused pose object).
 */
import {
  AMP,
  DEFAULT_CATCH,
  DEFAULT_RELEASE,
  PERIOD,
  SQUASH,
  type Expression,
  type FaceOverride,
  type Motion,
  type SpeciesArt,
  type Track,
} from './kit.ts';

export interface Xf {
  tx: number;
  ty: number;
  /** radians */
  rot: number;
  sx: number;
  sy: number;
}
export interface FaceState {
  expr: Expression;
  /** One eye closed (the back one for profile species, the viewer's right for front-facing). */
  wink: boolean;
}
export interface Pose {
  root: Xf;
  groups: Map<string, Xf>;
  face: FaceState;
  /** Prop groups a performance is animating this frame (the only time props are drawn). */
  shown: Set<string>;
  /** Colour-cycle step for `Part.cycle` (0 at rest). */
  cycle: number;
}

export interface PoseOpts {
  /** Seconds; undefined = the static rest pose (no idle, no blink). */
  readonly t?: number;
  readonly expression?: Expression;
  /** Blinks only, no ambient/signature motion (reduced motion, R37). */
  readonly still?: boolean;
  /** Force the signature performance at progress u (0–1) — review sheets and the "present". */
  readonly signatureAt?: number;
  /** A one-shot hook at progress u: the leap's catch, or release. */
  readonly action?: { readonly kind: 'catch' | 'release'; readonly u: number };
  /** Ambient loop only: never start the scheduled signature (leaps, review strips). */
  readonly noSignature?: boolean;
  /** Desynchronises creatures of the same species (default: hash of the id). */
  readonly seed?: number;
}

const TAU = Math.PI * 2;
const DEG = Math.PI / 180;

export const ident = (): Xf => ({ tx: 0, ty: 0, rot: 0, sx: 1, sy: 1 });

/** Small integer hash → [0, 1). */
export function hash01(a: number, b = 0): number {
  let h = (Math.imul(a ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(b + 0x632be5ab, 0xc2b2ae35)) >>> 0;
  h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d) >>> 0;
  h = Math.imul(h ^ (h >>> 12), 0x297a2d39) >>> 0;
  return ((h ^ (h >>> 15)) >>> 0) / 4294967296;
}
export function seedOf(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** R19 blink: 120 ms, every 2.5–6 s with seeded jitter. Stateless: segment n has one blink. */
export function blinking(t: number, seed: number): boolean {
  const SEG = 4.25;
  const n = Math.floor(t / SEG);
  const start = n * SEG + hash01(seed, n) * 1.75;
  return t >= start && t < start + 0.12;
}

/** Progress (0–1) of the signature performance at time t, or -1 when none is playing. */
export function signatureProgress(
  t: number,
  seed: number,
  dur: number,
  every: readonly [number, number] = [4, 8],
): number {
  const seg = (every[0] + every[1]) / 2;
  const jitter = (every[1] - every[0]) / 2;
  // the first performance waits a beat so a freshly opened page starts calm
  const n = Math.floor((t - 1.5) / seg);
  if (n < 0) return -1;
  const start = 1.5 + n * seg + hash01(seed ^ 0x51, n) * jitter;
  const u = (t - start) / dur;
  return u >= 0 && u < 1 ? u : -1;
}

const smooth = (x: number) => x * x * (3 - 2 * x);

/** Keyframe value at u (eased in-out between keys). */
export function sample(k: readonly (readonly [number, number])[], u: number): number {
  if (!k.length) return 0;
  if (u <= k[0]![0]) return k[0]![1];
  for (let i = 1; i < k.length; i++) {
    const [u1, v1] = k[i]!;
    if (u <= u1) {
      const [u0, v0] = k[i - 1]!;
      const x = u1 > u0 ? (u - u0) / (u1 - u0) : 1;
      return v0 + (v1 - v0) * smooth(x);
    }
  }
  return k[k.length - 1]![1];
}

function applyTrack(xf: Xf, tr: Track, u: number): void {
  const v = sample(tr.k, u);
  switch (tr.p) {
    case 'tx':
      xf.tx += v;
      break;
    case 'ty':
      xf.ty += v;
      break;
    case 'rot':
      xf.rot += v * DEG;
      break;
    case 's':
      xf.sx *= v;
      xf.sy *= v;
      break;
    case 'sx':
      xf.sx *= v;
      break;
    case 'sy':
      xf.sy *= v;
      break;
  }
}

function faceAt(m: Motion, u: number): FaceOverride | undefined {
  for (const [a, b, e] of m.face ?? []) if (u >= a && u < b) return e;
  return undefined;
}

export function pose(art: SpeciesArt, o: PoseOpts = {}): Pose {
  const root = ident();
  const groups = new Map<string, Xf>();
  for (const g of art.groups) groups.set(g.id, ident());
  const at = (id: string | undefined) => (id && id !== 'root' ? groups.get(id) : root);
  let expr: Expression = o.expression ?? 'idle';
  let wink = false;
  const seed = o.seed ?? seedOf(art.id);
  const t = o.t;
  const pm = PERIOD[art.size] * (expr === 'sleepy' ? 1.6 : 1);
  const am = AMP[art.size];
  const sq = SQUASH[art.size] / 0.1; // 1 at M/L

  if (t !== undefined && !o.still) {
    for (const ch of art.idle.ambient) {
      const ids = ch.g === undefined ? ['root'] : typeof ch.g === 'string' ? [ch.g] : ch.g;
      const period = ch.period * pm;
      ids.forEach((id, i) => {
        const xf = at(id);
        if (!xf) return;
        const ph = TAU * ((t - i * (ch.lag ?? 0)) / period + (ch.phase ?? 0));
        const s = Math.sin(ph);
        const a = ch.amp * am;
        switch (ch.m) {
          case 'bob':
            xf.ty += s * a * (expr === 'sleepy' ? 0.5 : 1);
            break;
          case 'glide':
            xf.tx += s * a;
            break;
          case 'breathe':
            xf.sx *= 1 + s * ch.amp;
            xf.sy *= 1 + s * ch.amp;
            break;
          case 'pulse':
            xf.sx *= 1 - s * ch.amp;
            xf.sy *= 1 + s * ch.amp;
            break;
          default: // wag | flutter | sway | paddle | wave: rotation about the group's pivot
            xf.rot += s * a * DEG;
        }
      });
    }
  }

  // one-shot performances: an action hook wins over the scheduled signature
  let perf: Motion | undefined;
  let u = -1;
  if (o.action) {
    perf = o.action.kind === 'catch' ? (art.catch ?? DEFAULT_CATCH) : (art.release ?? DEFAULT_RELEASE);
    u = Math.max(0, Math.min(1, o.action.u));
  } else if (o.signatureAt !== undefined) {
    perf = art.idle.signature;
    u = o.signatureAt;
  } else if (
    t !== undefined &&
    !o.still &&
    !o.noSignature &&
    (expr === 'idle' || expr === 'shy' || expr === 'drowsy')
  ) {
    perf = art.idle.signature;
    u = signatureProgress(t, seed, perf.dur, art.idle.signature.every);
  }
  const shown = new Set<string>();
  if (perf && u >= 0) {
    for (const tr of perf.tracks) {
      const xf = at(tr.g);
      if (!xf) continue;
      applyTrack(xf, tr, u);
      if (tr.g && art.groups.some((g) => g.prop && g.id === tr.g)) shown.add(tr.g);
    }
    const fo = faceAt(perf, u);
    if (fo === 'wink') wink = true;
    else if (fo) expr = fo;
  }

  // R19 body column: expressions change only a body transform (never the silhouette)
  const live = t !== undefined && !o.still;
  switch (expr) {
    case 'happy': {
      const b = live ? Math.abs(Math.sin((Math.PI * t!) / 0.5)) : 0.5;
      root.ty -= 2 * b * am;
      root.sx *= 1 + 0.05 * sq * (0.5 - b);
      root.sy *= 1 - 0.05 * sq * (0.5 - b);
      break;
    }
    case 'surprised':
      root.sx *= 1 - 0.05 * sq;
      root.sy *= 1 + 0.07 * sq;
      root.ty -= 1.5;
      break;
    case 'proud':
      root.rot -= 8 * DEG;
      root.sx *= 1.04;
      root.sy *= 1.04;
      break;
    case 'sleepy':
      root.ty += 1;
      break;
  }
  if (t !== undefined && (expr === 'idle' || expr === 'shy' || expr === 'drowsy') && blinking(t, seed)) expr = 'blink';
  // colour cycles (Part.cycle): integer step, always or only while the signature plays
  let cycle = 0;
  if (art.cycle && t !== undefined && !o.still) {
    const sig = perf === art.idle.signature && u >= 0;
    if ((art.cycle.during ?? 'always') === 'always') cycle = Math.floor(t * art.cycle.rate);
    else if (sig) cycle = Math.floor(u * perf!.dur * art.cycle.rate) + 1;
  }
  return { root, groups, face: { expr, wink }, shown, cycle };
}
