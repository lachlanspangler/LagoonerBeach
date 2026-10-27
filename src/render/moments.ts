/**
 * Moment tiers (ADR 0012): how big a capture *feels*. Pure and deterministic — no DOM, no clock —
 * so the whole celebration ladder is unit-tested. fx.ts turns a Moment into choreography.
 *
 *   tier 0  pinch (1–2 cells)                  calm: +N only, a soft pop
 *   tier 1  pool (3–5)                         "Nice!" small, no shake
 *   tier 2  lagoon (6–11) · two lagoons        "Nice Lagoon!" / "Lovely!" / "Twin Lagoons!"
 *   tier 3  atoll (12+) · 3+ lagoons · 2 waves "Atoll!" / "Archipelago!" / "Ripple ×2" + sweep
 *   tier 4  3+ waves · board clear · combined  "Riptide!" / "Spotless!" / "Amazing!" / "Unbelievable!"
 *
 * The COMBO is the existing streak (consecutive capturing moves, survives STREAK_GRACE − 1 dry
 * moves). It is shown as its own badge ("COMBO ×N") from ×2 up, never as a board word.
 */
import { STREAK_GRACE } from '../core/scoring.ts';

export type Tier = 0 | 1 | 2 | 3 | 4;
/** Gradient family of the display text (UI_DESIGN §7.1). */
export type WordStyle = 'warm' | 'water' | 'gold';
export type Sting = 'none' | 'nice' | 'lagoon' | 'atoll' | 'ripple' | 'riptide' | 'spotless' | 'amazing';
export type Buzz = 'tick' | 'medium' | 'heavy';

/** What one capture looks like, as far as celebration goes (a subset of the `captured` event). */
export interface MomentEvent {
  readonly waves: readonly { readonly pockets: readonly { readonly cells: readonly unknown[] }[] }[];
  readonly score: { readonly cleanBonus: number };
  /** Combo after this move. */
  readonly streak: number;
}

export interface MomentContext {
  /** Combo before this move (0 after a break). */
  readonly prevStreak: number;
}

export interface Moment {
  readonly tier: Tier;
  /** One word at most per move (null = the number speaks alone). */
  readonly word: string | null;
  readonly style: WordStyle;
  readonly sound: {
    readonly sting: Sting;
    /** Air rush for the screen-filling moments (tier 4 only). */
    readonly whoosh: boolean;
  };
  /** Haptic per wave (first entry for wave 1, last entry repeats). */
  readonly haptic: readonly Buzz[];
  readonly visual: {
    /** Ring burst strength: speed/spin multiplier for the pebble scatter. */
    readonly burst: number;
    /** Foam droplets per popped pebble and the per-move droplet budget. */
    readonly perPebble: number;
    readonly budget: number;
    /** Screen shake amplitude in px (0 = none). Capped at MAX_SHAKE_PX. */
    readonly shake: number;
    /** One soft light sweep over the board. */
    readonly sweep: boolean;
    /** Full-board tide wash (Spotless and other tier-4 moments). */
    readonly wash: boolean;
    /** Sparks out of the water. */
    readonly sparks: boolean;
  };
}

/** Guardrails (ADR 0012 / HUNGRY_STUDIO §5.6). */
export const LIMITS = {
  maxShakePx: 6,
  /** Foam/droplet particles spawned by one move. */
  maxParticlesPerMove: 48,
  /** Pebble burst pieces alive at once (the rest pop in place). */
  maxBurstPieces: 72,
  /** Minimum gap between two heavy haptics. */
  heavyGapMs: 300,
  /** Haptic events per move. */
  maxHapticsPerMove: 3,
  /** Text overshoot on scale-in. */
  maxOvershoot: 1.08,
  /** Mean luminance change of any sweep/wash, relative (below WCAG's 10% "flash"). */
  maxSweepDeltaL: 0.08,
  /** Every non-game-over move is visually settled by then (≤ 3 waves). */
  settleMs: 1300,
} as const;

interface Features {
  readonly maxArea: number;
  readonly pockets: number;
  readonly waves: number;
  readonly clean: boolean;
}

export function featuresOf(e: MomentEvent): Features {
  let maxArea = 0;
  let pockets = 0;
  for (const w of e.waves) {
    // lagoons sealed *at once* (one wave); cascade depth is counted separately
    pockets = Math.max(pockets, w.pockets.length);
    for (const p of w.pockets) if (p.cells.length > maxArea) maxArea = p.cells.length;
  }
  return { maxArea, pockets, waves: e.waves.length, clean: e.score.cleanBonus > 0 };
}

/** The praise ladder. First match wins; one word per move at most. */
export function wordFor(f: Features): { tier: Tier; word: string | null; style: WordStyle } {
  const big = f.maxArea >= 12;
  const archi = f.pockets >= 3;
  const cascade = f.waves >= 2;
  // the combo has its own badge; the top words need two jackpot features in one move
  const combined = (big ? 1 : 0) + (archi ? 1 : 0) + (cascade ? 1 : 0);
  if (f.clean) return combined >= 1 ? T(4, 'Unbelievable!', 'gold') : T(4, 'Spotless!', 'water');
  if (combined >= 2) return T(4, 'Amazing!', 'gold');
  if (f.waves >= 3) return T(4, 'Riptide!', 'water');
  if (cascade) return T(3, `Ripple ×${f.waves}`, 'water');
  if (archi) return T(3, 'Archipelago!', 'warm');
  if (big) return T(3, 'Atoll!', 'warm');
  if (f.pockets === 2) return T(2, 'Twin Lagoons!', 'warm');
  if (f.maxArea >= 9) return T(2, 'Lovely!', 'warm');
  if (f.maxArea >= 6) return T(2, 'Nice Lagoon!', 'warm');
  if (f.maxArea >= 3) return T(1, 'Nice!', 'warm');
  return T(0, null, 'warm');
}
const T = (tier: Tier, word: string | null, style: WordStyle) => ({ tier, word, style });

/** The peak words (tier 3–4) with their tier and style — prewarmed so a first jackpot is cheap. */
export const PEAK_WORDS: readonly (readonly [string, Tier, WordStyle])[] = [
  ['Atoll!', 3, 'warm'],
  ['Archipelago!', 3, 'warm'],
  ['Ripple ×2', 3, 'water'],
  ['Riptide!', 4, 'water'],
  ['Spotless!', 4, 'water'],
  ['Amazing!', 4, 'gold'],
  ['Unbelievable!', 4, 'gold'],
];

const STING: Record<string, Sting> = {
  'Nice!': 'nice',
  'Nice Lagoon!': 'lagoon',
  'Lovely!': 'lagoon',
  'Twin Lagoons!': 'lagoon',
  'Atoll!': 'atoll',
  'Archipelago!': 'atoll',
  'Riptide!': 'riptide',
  'Spotless!': 'spotless',
  'Amazing!': 'amazing',
  'Unbelievable!': 'amazing',
};

/** Pure: a capture event + combo context → tier, word and the sound/haptic/visual recipe. */
export function momentFor(e: MomentEvent, _ctx: MomentContext): Moment {
  const f = featuresOf(e);
  const w = wordFor(f);
  const tier = w.tier;
  const sting: Sting = w.word ? (STING[w.word] ?? (w.word.startsWith('Ripple') ? 'ripple' : 'none')) : 'none';
  const haptic: Buzz[] =
    tier >= 3 ? ['heavy', 'heavy', 'heavy'] : tier === 2 ? ['medium', 'heavy'] : e.streak >= 5 ? ['medium'] : ['tick'];
  return {
    tier,
    word: w.word,
    style: w.style,
    sound: { sting, whoosh: tier === 4 },
    haptic,
    visual: {
      burst: [0.8, 0.95, 1.1, 1.25, 1.4][tier]!,
      perPebble: [2, 2, 3, 3, 3][tier]!,
      budget: [12, 18, 26, 36, LIMITS.maxParticlesPerMove][tier]!,
      shake: tier >= 3 ? Math.min(LIMITS.maxShakePx, 2 + f.waves * 1.2 + (tier === 4 ? 1.5 : 0)) : 0,
      sweep: tier >= 3,
      wash: tier === 4,
      sparks: tier >= 3,
    },
  };
}

// ------------------------------------------------------------------------------------ combo

/** Escalation steps of the COMBO badge (size/colour/weight change at ×2, ×5, ×10, ×20). */
export type ComboLevel = 0 | 1 | 2 | 3 | 4;
export function comboLevel(n: number): ComboLevel {
  return n >= 20 ? 4 : n >= 10 ? 3 : n >= 5 ? 2 : n >= 2 ? 1 : 0;
}

export interface ComboStyle {
  /** Badge text height as a share of a board cell. */
  readonly size: number;
  readonly style: WordStyle;
  /** Display weight: 600 or 900. */
  readonly weight: 600 | 900;
  /** Soft halo behind the badge. */
  readonly glow: boolean;
}
export function comboStyle(level: ComboLevel): ComboStyle {
  return [
    { size: 0, style: 'water', weight: 600, glow: false },
    { size: 0.5, style: 'water', weight: 900, glow: false },
    { size: 0.56, style: 'water', weight: 900, glow: false },
    { size: 0.62, style: 'warm', weight: 900, glow: true },
    { size: 0.68, style: 'gold', weight: 900, glow: true },
  ][level] as ComboStyle;
}

/** The combo meter under the score: badge + three grace shells. */
export interface ComboMeter {
  readonly n: number;
  readonly show: boolean;
  /** Grace shells still lit (3 = safe … 1 = the next dry move ends it). */
  readonly lit: number;
  readonly warning: boolean;
  readonly level: ComboLevel;
}
export function comboMeter(streak: number, dry: number): ComboMeter {
  const lit = Math.max(0, STREAK_GRACE - dry);
  return { n: streak, show: streak >= 2, lit, warning: streak >= 2 && lit === 1, level: comboLevel(streak) };
}

export type ComboChange = 'none' | 'up' | 'milestone' | 'dry' | 'break';
/** What changed between two moves (drives the tick-up punch, shell dimming and the deflate). */
export function comboChange(prev: { streak: number; dry: number }, next: { streak: number; dry: number }): ComboChange {
  if (next.streak > prev.streak)
    return comboLevel(next.streak) > comboLevel(prev.streak) && next.streak >= 5 ? 'milestone' : 'up';
  if (prev.streak >= 2 && next.streak === 0) return 'break';
  if (next.dry > prev.dry && next.streak >= 2) return 'dry';
  return 'none';
}

/** Pentatonic step of the capture chime: climbs one step per combo, capped at 12 (= the ×4 cap). */
export function chimeStep(streak: number, wave: number): number {
  return Math.min(12, Math.max(0, streak - 1) + wave);
}
/** Extra chime layers at ×5 / ×10 / ×20. */
export function chimeLayers(streak: number): 0 | 1 | 2 | 3 {
  return streak >= 20 ? 3 : streak >= 10 ? 2 : streak >= 5 ? 1 : 0;
}

// ------------------------------------------------------------------------------------ guard

/**
 * Runtime limiter so the board never says two things at once: one word on screen (a new one
 * replaces it only if it ranks higher), and the shake cap. Clock is passed in (pure, testable).
 */
export class MomentGuard {
  private wordUntil = -Infinity;
  private wordTier = -1;

  /** May a word of this tier show at `now` for `life` ms? Claims the slot if so. */
  claimWord(tier: Tier, now: number, life: number): boolean {
    if (now < this.wordUntil && tier <= this.wordTier) return false;
    this.wordUntil = now + life;
    this.wordTier = tier;
    return true;
  }

  /** End of the current word (for queueing chips/banners behind it). */
  get wordEnds(): number {
    return this.wordUntil;
  }

  reset(): void {
    this.wordUntil = -Infinity;
    this.wordTier = -1;
  }

  static shake(px: number): number {
    return Math.max(0, Math.min(LIMITS.maxShakePx, px));
  }
}
