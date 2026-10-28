/**
 * What the journal says about catch requirements, generated from the same data the game catches by
 * (src/meta/req.ts). Pure; lives in the lazy sheets chunk (only the journal and species pages read
 * it). Nothing here is hand-typed per species: hints, tile badges and habitat lines all come from
 * `Req`, so the copy can't drift from the rules (tests/unit/reqText.test.ts, journalReq.test.ts).
 *
 * Words follow what the player sees on screen: pools and cells, the COMBO ×N badge, cascades and
 * their waves, the Day / Night theme, Endless / Daily / Reef puzzles.
 */
import { SPECIES, type Habitat, type Shape, type Species } from './creatures.ts';
import type { Mode, Req } from './req.ts';

// ─────────────────────────────────────────────────────────────────────── pool sizes per shape
/** Smallest and largest area a shape can have on the 8×8 board (catch.ts `classify`). */
const SHAPE_AREA: Record<Shape, readonly [number, number]> = {
  dot: [1, 1],
  pair: [2, 2],
  hline: [3, 8],
  vline: [3, 8],
  square2: [4, 4],
  square3: [9, 9],
  plus: [5, 5],
  rect: [6, 64],
  corner: [3, 7],
  island: [8, 64],
  blob: [3, 64],
};

/** The pool sizes a requirement allows: [lo, hi] cells (hi = Infinity when unbounded). */
export function areaRange(r: Req): readonly [number, number] {
  let lo = r.minArea ?? 1;
  let hi = r.maxArea ?? Infinity;
  if (r.shape) {
    lo = Math.max(lo, Math.min(...r.shape.map((s) => SHAPE_AREA[s][0])));
    hi = Math.min(hi, Math.max(...r.shape.map((s) => SHAPE_AREA[s][1])));
  }
  return [lo, hi];
}

// ─────────────────────────────────────────────────────────────────────── describe
const MODE_PHRASE: Record<Mode, string> = { classic: 'in Endless', daily: 'in the Daily', puzzle: 'in Reef puzzles' };
const TIER_NAME: Record<string, string> = { calm: 'Calm', tricky: 'Tricky', deep: 'Deep', abyss: 'Abyss' };
const ord = (n: number) => `${n}${n === 1 ? 'st' : n === 2 ? 'nd' : n === 3 ? 'rd' : 'th'}`;
const an = (w: string) => (/^[aeiouAEIO]/.test(w) ? `an ${w}` : `a ${w}`);
const orList = (xs: readonly string[]) =>
  xs.length <= 1 ? (xs[0] ?? '') : `${xs.slice(0, -1).join(', ')} or ${xs[xs.length - 1]!}`;

const SHAPE_NOUN: Record<Shape, string> = {
  dot: 'one-cell',
  pair: 'two-cell',
  hline: 'long, flat',
  vline: 'tall, narrow',
  square2: '2×2 square',
  square3: '3×3 square',
  plus: 'plus-shaped',
  corner: 'L-shaped',
  rect: 'rectangular',
  island: 'island',
  blob: 'round-ish',
};

/** Size word for a pool size range (the bands the species use). */
function sizeWord(lo: number, hi: number): string {
  if (hi <= 5) return 'small';
  if (lo >= 12) return 'huge';
  if (lo >= 6) return 'big';
  return '';
}

function cells(lo: number, hi: number): string {
  if (hi === Infinity) return `${lo}+ cells`;
  return lo === hi ? `${lo} cells` : `${lo}–${hi} cells`;
}

/** The pool itself: "a long, flat pool of 5+ cells", "a huge pool of 12+ cells around an island". */
function poolPhrase(r: Req): string | null {
  const sized = r.minArea !== undefined || r.maxArea !== undefined;
  const s = r.shape;
  if (!s && !sized) return null;
  const [lo, hi] = areaRange(r);
  const size = sized ? sizeWord(lo, hi) : '';
  // only the bounds the requirement states (a shape's own limits aren't news: "6–64 cells")
  const of = sized ? ` of ${cells(r.minArea ?? 1, r.maxArea ?? Infinity)}` : '';
  const one = s?.length === 1 ? s[0] : undefined;
  if (one === 'dot') return 'a one-cell pool';
  if (one === 'pair') return 'a two-cell pool';
  if (one === 'square2') return 'a 2×2 square pool';
  if (one === 'square3') return 'a 3×3 square pool';
  if (one === 'plus') return 'a plus-shaped pool';
  if (one === 'corner') return 'an L-shaped pool';
  if (one === 'hline') return `a long, flat pool${r.minW ? ` of ${r.minW}+ cells` : of}`;
  if (one === 'vline') return `a tall, narrow pool${r.minH ? ` of ${r.minH}+ cells` : of}`;
  if (s && s.length === 2 && s.includes('hline') && s.includes('vline')) return `a straight, narrow pool${of}`;
  if (one === 'rect') return `${an([size, r.wGtH ? 'wide' : '', 'rectangular'].filter(Boolean).join(' '))} pool${of}`;
  if (one === 'island') return `${an(size ? `${size} pool` : 'pool')}${of} around an island`;
  if (one === 'blob') return `${an([size, 'round-ish'].filter(Boolean).join(', '))} pool${of}`;
  if (s) return `${an(orList(s.map((x) => SHAPE_NOUN[x])))} pool${of}`; // other mixes (none today)
  return `${an(size ? `${size} pool` : 'pool')}${of}`;
}

/**
 * The requirement as short phrases, most important first: the pool, then the moment (cascade wave,
 * pools at once, COMBO, move, clears), then where (theme, mode). Lower-case; never names a creature.
 * `{}` (anything goes) describes as ["any pool"].
 */
export function describe(r: Req): string[] {
  const out: string[] = [];
  const pool = poolPhrase(r);
  if (pool) out.push(pool);
  if (r.pockets !== undefined) out.push(`${r.pockets}+ pools closed at once`);
  if (r.wave !== undefined && r.wave >= 2) out.push(`a cascade's ${ord(r.wave)} wave or deeper`);
  if (r.reefWin) {
    const tiers = (r.tier ?? []).map((t) => TIER_NAME[t] ?? t);
    out.push(tiers.length ? `clearing ${an(orList(tiers))} reef` : 'clearing a reef');
  } else if (r.tier) out.push(`in ${an(orList(r.tier.map((t) => TIER_NAME[t] ?? t)))} reef`);
  if (r.clean) out.push('clearing the whole board');
  if (!out.length) out.push('any pool');
  if (r.streak !== undefined) out.push(`on a ×${r.streak}+ combo`);
  if (r.moves !== undefined) out.push(`from move ${r.moves}`);
  if (r.theme) out.push(r.theme === 'night' ? 'in the Night theme' : 'in the Day theme');
  // a reef clear already says "reef"
  if (r.mode && !(r.reefWin && r.mode.length === 1 && r.mode[0] === 'puzzle'))
    out.push(orList(r.mode.map((m) => MODE_PHRASE[m])).replace(/ or in /g, ' or '));
  if (r.notMode) out.push(`not ${orList(r.notMode.map((m) => MODE_PHRASE[m])).replace(/ or in /g, ' or ')}`);
  return out;
}

/** Phrases as one sentence: capitalised, comma-joined, a full stop. */
export function sentence(phrases: readonly string[]): string {
  const s = phrases.join(', ');
  return s ? `${s[0]!.toUpperCase()}${s.slice(1)}.` : '';
}

/** The species' hint, generated from its requirement ("A one-cell pool, on a ×6+ combo."). */
export const hintFor = (sp: Species): string => sentence(describe(sp.req));

// ─────────────────────────────────────────────────────────────────────── habitats
/**
 * A habitat's requirement: either a hard `gate` every member's req implies (proved by
 * tests/unit/journalReq.test.ts), or a list of `features` that together cover every member.
 */
export interface HabitatReq {
  readonly gate?: Req;
  readonly features?: readonly FeatureId[];
}

export const HABITAT_REQ: Record<Habitat, HabitatReq> = {
  shallows: { features: ['small', 'daily'] },
  lagoon: { features: ['shapes', 'pools', 'big'] },
  deep: { features: ['big', 'island', 'cascade', 'daily'] },
  night: { gate: { theme: 'night' } },
  reef: { gate: { mode: ['puzzle'] } },
  legend: { features: ['cascade', 'clean', 'island', 'combo'] },
};

/**
 * One part of a habitat line: its text, a word some member's describe() really says (`key`), and
 * whether it continues the previous part's list (`cont`: "shaped pools: lines, squares, …").
 */
export interface Part {
  readonly text: string;
  readonly key: string;
  readonly cont?: true;
}

/** A trait a requirement can have, and how to say it for a set of members that have it. */
interface Feature {
  has(r: Req): boolean;
  parts(rs: readonly Req[]): Part[];
}

const SHAPE_WORD: readonly [Shape, string, string][] = [
  // [shape, the word in a habitat line, the word describe() uses for it]
  ['hline', 'lines', 'flat'],
  ['vline', 'lines', 'narrow'],
  ['square2', 'squares', 'square'],
  ['square3', 'squares', 'square'],
  ['plus', 'plus', 'plus'],
  ['corner', 'L', 'L-shaped'],
  ['rect', 'rectangles', 'rectangular'],
  ['blob', 'round', 'round-ish'],
];
const SIZE_SHAPES: readonly Shape[] = ['dot', 'pair', 'island'];

const FEATURES = {
  small: {
    has: (r) => areaRange(r)[1] <= 5,
    parts: (rs) => {
      const lo = Math.min(...rs.map((r) => areaRange(r)[0]));
      const hi = Math.max(...rs.map((r) => areaRange(r)[1]));
      return [{ text: `small pools of ${cells(lo, hi)}`, key: 'small' }];
    },
  },
  shapes: {
    has: (r) => !!r.shape?.some((s) => !SIZE_SHAPES.includes(s)),
    parts: (rs) => {
      const words: Part[] = [];
      for (const [shape, text, key] of SHAPE_WORD)
        if (rs.some((r) => r.shape?.includes(shape)) && !words.some((w) => w.text === text)) words.push({ text, key });
      return words.map((w, i) => (i === 0 ? { ...w, text: `shaped pools: ${w.text}` } : { ...w, cont: true }));
    },
  },
  pools: {
    has: (r) => r.pockets !== undefined,
    parts: (rs) => [{ text: `${Math.min(...rs.map((r) => r.pockets!))}+ pools at once`, key: 'at once' }],
  },
  big: {
    has: (r) => areaRange(r)[0] >= 6,
    parts: (rs) => [{ text: `big pools of ${Math.min(...rs.map((r) => areaRange(r)[0]))}+ cells`, key: 'big' }],
  },
  island: {
    has: (r) => !!r.shape?.includes('island'),
    parts: (rs) => [
      { text: rs.every((r) => areaRange(r)[0] >= 12) ? 'huge pools around an island' : 'islands', key: 'island' },
    ],
  },
  cascade: {
    has: (r) => (r.wave ?? 1) >= 2,
    parts: (rs) => {
      const n = Math.min(...rs.map((r) => r.wave!));
      return [{ text: n >= 3 ? `cascades ${n} waves deep` : 'cascades', key: 'cascade' }];
    },
  },
  clean: { has: (r) => !!r.clean, parts: () => [{ text: 'clearing the whole board', key: 'whole board' }] },
  combo: {
    has: (r) => r.streak !== undefined,
    parts: (rs) => [{ text: `×${Math.min(...rs.map((r) => r.streak!))}+ combos`, key: 'combo' }],
  },
  daily: {
    has: (r) => !!r.mode?.includes('daily'),
    parts: (rs) => [{ text: rs.length === 1 ? 'a Daily visitor' : 'Daily visitors', key: 'Daily' }],
  },
} satisfies Record<string, Feature>;

export type FeatureId = keyof typeof FEATURES;

/** Does a requirement have this feature? (Tests check every habitat member is covered.) */
export const hasFeature = (id: FeatureId, r: Req): boolean => FEATURES[id].has(r);

export const membersOf = (h: Habitat): Species[] => SPECIES.filter((s) => s.habitat === h);

/** The parts of a habitat's line, each derived from the members that have the feature. */
export function habitatParts(h: Habitat): Part[] {
  const hr = HABITAT_REQ[h];
  if (hr.gate)
    return describe(hr.gate)
      .filter((p) => p !== 'any pool')
      .map((p, i) => ({ text: i === 0 ? `only ${p}` : p, key: p }));
  const reqs = membersOf(h).map((s) => s.req);
  return (hr.features ?? []).flatMap((f) => {
    const with_ = reqs.filter((r) => FEATURES[f].has(r));
    return with_.length ? FEATURES[f].parts(with_) : [];
  });
}

/** "Only in the Night theme", "Small pools of 1–5 cells · a Daily visitor". */
export function habitatLine(h: Habitat): string {
  const s = habitatParts(h)
    .map((p, i) => (i === 0 ? p.text : `${p.cont ? ', ' : ' · '}${p.text}`))
    .join('');
  return s ? `${s[0]!.toUpperCase()}${s.slice(1)}` : '';
}

// ─────────────────────────────────────────────────────────────────────── gates and badges
export interface Now {
  readonly night: boolean;
  readonly mode: Mode;
}

/** Is a gate (theme / mode only) open right now? `undefined` gate: always. */
export function gateOpen(gate: Req | undefined, now: Now): boolean {
  if (!gate) return true;
  if (gate.theme !== undefined && now.night !== (gate.theme === 'night')) return false;
  if (gate.mode && !gate.mode.includes(now.mode)) return false;
  if (gate.notMode && gate.notMode.includes(now.mode)) return false;
  return true;
}

export type Badge = 'day' | 'night' | 'daily' | 'reef' | 'endless';
export const BADGE_LABEL: Record<Badge, string> = {
  day: 'Day theme only',
  night: 'Night theme only',
  daily: 'Daily only',
  reef: 'Reef puzzles only',
  endless: 'Endless only',
};

/**
 * Theme and mode conditions a species has on top of its habitat's gate: the day-only Shallows and
 * Lagoon species (☀), the Night-only legend (☾), the Daily visitors. Shown as a small tile badge.
 */
export function badgesFor(sp: Species): Badge[] {
  const gate = HABITAT_REQ[sp.habitat].gate;
  const out: Badge[] = [];
  const r = sp.req;
  if (r.theme && r.theme !== gate?.theme) out.push(r.theme);
  if (r.mode?.length === 1 && !(gate?.mode?.length === 1 && gate.mode[0] === r.mode[0]))
    out.push(r.mode[0] === 'daily' ? 'daily' : r.mode[0] === 'puzzle' ? 'reef' : 'endless');
  return out;
}
