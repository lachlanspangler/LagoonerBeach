/**
 * Endless reefs (ADR 0009). Reefs 1–360 ship in `content/puzzles.json`; reef N > 360 is generated
 * from N alone — the same reef for everyone, forever — and solver-verified before it is shown.
 *
 * Pure and integer-only: the difficulty curve, recipe choice, sub-seeds, grading score and work
 * caps are all integer functions of N, so every device builds bit-identical reefs.
 * Changing anything that alters a generated reef MUST bump GENERATOR_VERSION (the golden test in
 * tests/unit/endless.test.ts pins reefs 361–370 and fails first).
 */
import { fastGrade, type FastGrade } from './bitsolver.ts';
import { hashSeed } from './rng.ts';
import { boardToString, constructPuzzle, type GenParams } from './puzzlegen.ts';
import type { PuzzleMove, Tier } from './solver.ts';

export const GENERATOR_VERSION = 1;
/** Reefs shipped in the pack (ids R001…R360). Generated reefs start after these. */
export const SHIPPED_REEFS = 360;
export const CHAPTER_SIZE = 20;
/** Highest reef number we accept (far beyond anyone's reach; keeps ids and seeds sane). */
export const MAX_REEF = 9_999_999;

/** Stable save id of reef number n (1-based). Shipped reefs keep their pack ids. */
export function reefId(n: number): string {
  return n <= SHIPPED_REEFS ? `R${String(n).padStart(3, '0')}` : `g${n}`;
}

/** Reef number from a generated id ('g361' → 361), or null. */
export function generatedNumber(id: string): number | null {
  const m = /^g(\d{3,7})$/.exec(id);
  if (!m) return null;
  const n = Number(m[1]);
  return n > SHIPPED_REEFS && n <= MAX_REEF ? n : null;
}

// ── chapters ────────────────────────────────────────────────────────────────────────────────

export interface ChapterPos {
  /** 1-based chapter number. */
  readonly chapter: number;
  /** 1-based position within the chapter (1…CHAPTER_SIZE). */
  readonly pos: number;
  /** First and last reef numbers of the chapter. */
  readonly first: number;
  readonly last: number;
}

export function chapterOf(n: number): ChapterPos {
  const chapter = Math.floor((n - 1) / CHAPTER_SIZE) + 1;
  const first = (chapter - 1) * CHAPTER_SIZE + 1;
  return { chapter, pos: n - first + 1, first, last: first + CHAPTER_SIZE - 1 };
}

const PLACE_A = [
  'Driftglass',
  'Kelp',
  'Moonsnail',
  'Sandpiper',
  'Seafoam',
  'Brine',
  'Cowrie',
  'Starfish',
  'Urchin',
  'Anemone',
  'Samphire',
  'Marram',
  'Sunbleach',
  'Gullwing',
  'Heron',
  'Spindrift',
  'Saltspray',
  'Ebbtide',
  'Lantern',
  'Amber',
  'Cobalt',
  'Jade',
  'Opal',
  'Turtle',
  'Periwinkle',
  'Barnacle',
  'Cuttle',
  'Nautilus',
  'Mangrove',
  'Coconut',
  'Hushwater',
  'Silverside',
  'Driftwood',
  'Limpet',
  'Pelican',
  'Seaglass',
  'Whelk',
  'Tern',
  'Glimmer',
  'Sunken',
] as const;
const PLACE_B = [
  'Shoals',
  'Hollow',
  'Cove',
  'Shallows',
  'Narrows',
  'Flats',
  'Sound',
  'Bight',
  'Spit',
  'Strand',
  'Tidepools',
  'Banks',
  'Ledge',
  'Deeps',
  'Reach',
  'Basin',
  'Inlet',
  'Grotto',
  'Key',
  'Bar',
  'Point',
  'Rocks',
  'Gardens',
  'Terrace',
  'Run',
  'Sands',
  'Drop',
  'Cay',
  'Channel',
  'Haven',
] as const;
const ROMAN = ['', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];

/**
 * Evocative, original place name for a chapter. Unique for the first 1200 chapters (24 000 reefs;
 * neighbours never share either word), then the cycle repeats with a numeral ("Kelp Hollow II").
 */
export function chapterName(chapter: number): string {
  const i = Math.max(0, Math.floor(chapter) - 1);
  const A = PLACE_A.length;
  const B = PLACE_B.length;
  const r = i % A;
  const q = Math.floor(i / A) % B;
  const cycle = Math.floor(i / (A * B));
  const name = `${PLACE_A[(r * 17) % A]} ${PLACE_B[(q + 7 * r) % B]}`;
  return cycle === 0 ? name : `${name} ${ROMAN[cycle] ?? String(cycle + 1)}`;
}

// ── difficulty curve ────────────────────────────────────────────────────────────────────────

export type Role = 'breather' | 'climb' | 'cascade' | 'signature';

export interface CurveTarget {
  /** Target solver score (same scale as the shipped pack's `grade.score`). */
  readonly score: number;
  /** Accepted band around the target. */
  readonly band: number;
  readonly role: Role;
}

/** First generated chapter's peak, the slow ceiling, and how many chapters to get halfway there. */
export const CURVE = { start: 186, ceiling: 196, half: 30, dip: 16 } as const;
const FIRST_GEN_CHAPTER = SHIPPED_REEFS / CHAPTER_SIZE + 1; // 19

/** Chapter peak: rises from `start` toward `ceiling` hyperbolically (never reaches it). */
export function chapterPeak(chapter: number): number {
  const k = Math.max(0, chapter - FIRST_GEN_CHAPTER);
  const { start, ceiling, half } = CURVE;
  return ceiling - Math.ceil(((ceiling - start) * half) / (half + k));
}

/**
 * Target difficulty of reef n (> 360): a gentle sawtooth — every chapter opens with a breather
 * `dip` points under its peak and climbs linearly to the peak — riding a curve that approaches the
 * ceiling slowly. Every 10th reef is a signature showpiece; cascades come in a fixed rhythm.
 */
export function curve(n: number): CurveTarget {
  const { chapter, pos } = chapterOf(n);
  const peak = chapterPeak(chapter);
  const score = peak - Math.floor((CURVE.dip * (CHAPTER_SIZE - pos)) / (CHAPTER_SIZE - 1));
  // cascades: 4 per chapter at first, 6 from chapter 40 on
  const later = chapter >= 40;
  const role: Role =
    pos % 10 === 0
      ? 'signature'
      : pos <= 3
        ? 'breather'
        : pos % 5 === 4 || (later && (pos === 7 || pos === 17))
          ? 'cascade'
          : 'climb';
  return { score, band: role === 'signature' ? 7 : 4, role };
}

// ── grading score (integer) ─────────────────────────────────────────────────────────────────

/** floor(16·log2(n)) for integer n ≥ 1, exactly, with integer arithmetic only. */
export function log2x16(n: number): number {
  let y = 0;
  while (2 ** (y + 1) <= n) y++;
  const ONE = 2 ** 20;
  let m = Math.floor((n * ONE) / 2 ** y); // in [1, 2) scaled
  let r = y * 16;
  for (let bit = 8; bit >= 1; bit >>= 1) {
    m = Math.floor((m * m) / ONE);
    if (m >= 2 * ONE) {
      m = Math.floor(m / 2);
      r += bit;
    }
  }
  return r;
}

/**
 * The pack's difficulty score in integers: 100·(1 − safeFirst) + 10·log2(1 + 200/solutions) +
 * 8·pieces + 12 if every solution needs a cascade.
 */
export function reefScore(g: FastGrade, pieces: number): number {
  const fm = Math.max(1, g.firstMoves);
  const unsafe = Math.floor((200 * (fm - g.winningFirst) + fm) / (2 * fm));
  const sol = Math.max(1, g.solutions);
  // 10·log2((sol + 200) / sol), rounded
  const lg = Math.floor((10 * (log2x16(sol + 200) - log2x16(sol)) + 8) / 16);
  return unsafe + lg + 8 * pieces + (g.cascadeRequired ? 12 : 0);
}

export function tierForScore(score: number): Tier {
  return score < 154 ? 'calm' : score < 170 ? 'tricky' : score < 182 ? 'deep' : 'abyss';
}

// ── generator ───────────────────────────────────────────────────────────────────────────────

interface Recipe {
  readonly params: GenParams;
  /** Highest score this recipe reaches with reasonable odds (measured, see ADR 0009). */
  readonly reach: number;
}
const R = {
  oneTwo: { params: { lagoons: 1, pieces: 2, minPebbles: 6 }, reach: 178 },
  oneThree: { params: { lagoons: 1, pieces: 3, minPebbles: 6 }, reach: 171 },
  twoTwo: { params: { lagoons: 2, pieces: 2, minPebbles: 6 }, reach: 190 },
  twoTwoWide: { params: { lagoons: 2, pieces: 2, minPebbles: 10 }, reach: 190 },
  twoThree: { params: { lagoons: 2, pieces: 3, minPebbles: 8 }, reach: 186 },
  threeThree: { params: { lagoons: 3, pieces: 3, minPebbles: 6 }, reach: 198 },
  thickTwo: { params: { lagoons: 1, pieces: 2, thick: true, minPebbles: 8 }, reach: 202 },
  thickThree: { params: { lagoons: 1, pieces: 3, thick: true, minPebbles: 8 }, reach: 199 },
  bigThree: { params: { lagoons: 3, pieces: 3, minPebbles: 12 }, reach: 198 },
  bigThick: { params: { lagoons: 1, pieces: 3, thick: true, minPebbles: 12 }, reach: 199 },
} satisfies Record<string, Recipe>;
const RECIPES: Record<Role, readonly Recipe[]> = {
  breather: [R.oneThree, R.twoThree, R.oneTwo, R.twoTwo],
  climb: [R.twoThree, R.twoTwo, R.threeThree, R.oneTwo, R.twoTwoWide],
  cascade: [R.thickThree, R.thickTwo, R.bigThick],
  signature: [R.bigThree, R.bigThick],
};

/** Hard caps on solver work (deterministic: counted in expanded placements, never in time). */
export const LIMITS = {
  /** Per candidate: over this the candidate is dropped and the next sub-seed is tried. */
  nodesPerCandidate: 200_000,
  /** Per reef: after this, the closest verified candidate so far is taken. */
  nodesPerReef: 6_000_000,
  /** Per reef: verified candidates to consider before settling for the closest. */
  candidates: 120,
} as const;

export interface EndlessReef {
  readonly id: string;
  /** Reef number (1-based, > 360). */
  readonly n: number;
  readonly board: string;
  readonly pieces: readonly string[];
  readonly solution: readonly PuzzleMove[];
  readonly lagoons: number;
  readonly tier: Tier;
  readonly role: Role;
  readonly target: number;
  readonly grade: {
    readonly score: number;
    readonly safeFirst: number;
    readonly firstMoves: number;
    readonly winningFirst: number;
    readonly solutions: number;
    readonly cascade: boolean;
  };
  /** Generation cost: sub-seeds tried and solver placements expanded. */
  readonly attempts: number;
  readonly nodes: number;
  readonly v: number;
}

/** Sub-seed k of reef n. */
export function subSeed(n: number, k: number): number {
  return hashSeed(`reef:${n}:${k}`);
}

/**
 * Reef n (> 360), deterministic. Tries sub-seeds in order; every candidate is constructed, then
 * solved and graded (bounded); the first one inside the target band wins, else the closest
 * verified one once the caps are reached.
 */
export function generateReef(n: number): EndlessReef {
  if (!Number.isInteger(n) || n <= SHIPPED_REEFS || n > MAX_REEF) throw new Error(`not a generated reef: ${n}`);
  const t = curve(n);
  const all = RECIPES[t.role];
  const usable = all.filter((r) => r.reach >= t.score);
  const recipes = usable.length ? usable : all;
  const rot = hashSeed(`recipe:${n}`);
  let best: { c: NonNullable<ReturnType<typeof constructPuzzle>>; g: FastGrade; score: number } | null = null;
  let nodes = 0;
  let verified = 0;
  let k = 0;
  for (; ; k++) {
    const capped = nodes >= LIMITS.nodesPerReef || verified >= LIMITS.candidates;
    if (capped && best) break;
    // past the caps with nothing verified (never seen in practice): fall back to the easiest recipe
    const recipe = capped ? RECIPES.breather[0]! : recipes[(rot + k) % recipes.length]!;
    const c = constructPuzzle(subSeed(n, k), recipe.params);
    if (!c) continue;
    const g = fastGrade(c.board, c.pieces, { nodeLimit: LIMITS.nodesPerCandidate });
    nodes += g.nodes;
    if (g.truncated || !g.solvable || !g.first) continue;
    verified++;
    const score = reefScore(g, c.pieces.length);
    const roleOk = t.role !== 'cascade' || g.cascadeRequired;
    const dist = Math.abs(score - t.score);
    if (roleOk && dist <= t.band) {
      best = { c, g, score };
      break;
    }
    const bestDist = best ? Math.abs(best.score - t.score) + (bestRoleOk(best.g, t.role) ? 0 : 1000) : Infinity;
    if (dist + (roleOk ? 0 : 1000) < bestDist) best = { c, g, score };
  }
  const { c, g, score } = best!;
  const fm = Math.max(1, g.firstMoves);
  return {
    id: reefId(n),
    n,
    board: boardToString(c.board),
    pieces: c.pieces,
    solution: g.first!,
    lagoons: c.lagoons,
    tier: tierForScore(score),
    role: t.role,
    target: t.score,
    grade: {
      score,
      // a ratio for display only; selection above used integers
      safeFirst: g.winningFirst / fm,
      firstMoves: g.firstMoves,
      winningFirst: g.winningFirst,
      solutions: g.solutions,
      cascade: g.cascadeRequired,
    },
    attempts: k + 1,
    nodes,
    v: GENERATOR_VERSION,
  };
}

function bestRoleOk(g: FastGrade, role: Role): boolean {
  return role !== 'cascade' || g.cascadeRequired;
}

// ── progress ────────────────────────────────────────────────────────────────────────────────

/** First reef number (1-based) not yet cleared: the shipped pack first, then on into the endless reefs. */
export function nextUnsolved(solved: ReadonlySet<string>): number {
  for (let n = 1; n <= SHIPPED_REEFS; n++) if (!solved.has(reefId(n))) return n;
  let n = SHIPPED_REEFS + 1;
  while (n < MAX_REEF && solved.has(reefId(n))) n++;
  return n;
}

/** Reefs cleared in a chapter (0…CHAPTER_SIZE). */
export function chapterCleared(solved: ReadonlySet<string>, chapter: number): number {
  const first = (chapter - 1) * CHAPTER_SIZE + 1;
  let k = 0;
  for (let n = first; n < first + CHAPTER_SIZE; n++) if (solved.has(reefId(n))) k++;
  return k;
}

/** Deepest chapter with a cleared reef (0 if none): the depth meter. */
export function deepestChapter(solved: Iterable<string>): number {
  let deepest = 0;
  for (const id of solved) {
    const n = generatedNumber(id) ?? (/^R(\d{3})$/.test(id) ? Number(id.slice(1)) : 0);
    if (n > 0) deepest = Math.max(deepest, chapterOf(n).chapter);
  }
  return deepest;
}
