/**
 * What the journal says about catch requirements, generated from the same data the game catches by
 * (src/meta/req.ts). Pure; lives in the lazy sheets chunk (only the journal and species pages read
 * it). Nothing is hand-typed per species, so the copy can't drift from the rules
 * (tests/unit/reqText.test.ts, journalReq.test.ts). Kept to what a player can see on screen: how many
 * cells the pool has and the COMBO ×N badge — "3–5 cells", "12+ cells, ×5 combo".
 */
import { SPECIES, type Habitat, type Species } from './creatures.ts';
import type { Mode, Req } from './req.ts';

/** The pool sizes a requirement allows: [lo, hi] cells (hi = Infinity when unbounded). */
export function areaRange(r: Req): readonly [number, number] {
  return [r.minArea ?? 1, r.maxArea ?? Infinity];
}

/** "1 cell", "3–5 cells", "12+ cells". */
export function cells(lo: number, hi: number): string {
  if (hi === Infinity) return `${lo}+ cells`;
  if (lo === hi) return `${lo} ${lo === 1 ? 'cell' : 'cells'}`;
  return `${lo}–${hi} cells`;
}

const MODE_PHRASE: Record<Mode, string> = { classic: 'in Endless', daily: 'in the Daily', puzzle: 'in Reefs' };

/**
 * The requirement as short phrases: the pool size, then the combo, then where (only for gates).
 * `{}` (anything goes) reads ["any pool"]. Lower-case; never names a creature.
 */
export function describe(r: Req): string[] {
  const out: string[] = [];
  if (r.minArea !== undefined || r.maxArea !== undefined) out.push(cells(...areaRange(r)));
  if (r.streak !== undefined) out.push(`×${r.streak} combo`);
  if (!out.length) out.push('any pool');
  if (r.theme) out.push(r.theme === 'night' ? 'at night' : 'by day');
  if (r.mode) out.push(r.mode.map((m) => MODE_PHRASE[m]).join(' or '));
  return out;
}

/** Phrases as one line: capitalised, comma-joined ("3–5 cells, ×6 combo"). */
export function sentence(phrases: readonly string[]): string {
  const s = phrases.join(', ');
  return s ? `${s[0]!.toUpperCase()}${s.slice(1)}` : '';
}

/**
 * The species' hint: its size and combo. The habitat's own gate (Night, Reefs) is said once, in the
 * habitat header, not on every tile.
 */
export function hintFor(sp: Species): string {
  const gate = HABITAT_REQ[sp.habitat].gate;
  const r: Req = {
    ...sp.req,
    ...(gate?.theme ? { theme: undefined } : {}),
    ...(gate?.mode ? { mode: undefined } : {}),
  };
  return sentence(describe(r));
}

// ─────────────────────────────────────────────────────────────────────── habitats
/** A habitat's requirement: a hard `gate` every member's req implies (tested), or none. */
export interface HabitatReq {
  readonly gate?: Req;
}

export const HABITAT_REQ: Record<Habitat, HabitatReq> = {
  shallows: {},
  lagoon: {},
  deep: {},
  night: { gate: { theme: 'night' } },
  reef: { gate: { mode: ['puzzle'] } },
  legend: {},
};

export const membersOf = (h: Habitat): Species[] => SPECIES.filter((s) => s.habitat === h);

/**
 * "Only at night", "Pools of 1–5 cells", "Pools of 3–11 cells, or a ×2+ combo": the habitat's gate,
 * else the pool sizes its members are caught at and the smallest combo any of them needs.
 */
export function habitatLine(h: Habitat): string {
  const gate = HABITAT_REQ[h].gate;
  if (gate) {
    const where = describe(gate).filter((p) => p !== 'any pool');
    return sentence([`only ${where.join(', ')}`]);
  }
  const reqs = membersOf(h).map((s) => s.req);
  const sized = reqs.filter((r) => r.minArea !== undefined || r.maxArea !== undefined);
  const parts: string[] = [];
  if (sized.length) {
    const lo = Math.min(...sized.map((r) => areaRange(r)[0]));
    const hi = Math.max(...sized.map((r) => areaRange(r)[1]));
    parts.push(`pools of ${cells(lo, hi)}`);
  }
  const combos = reqs.filter((r) => r.streak !== undefined).map((r) => r.streak!);
  if (combos.length) parts.push(`combos from ×${Math.min(...combos)}`);
  return sentence([parts.join(' · ')]);
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

/** A theme or mode condition a species has beyond its habitat's gate (the Night-only legend: ☾). */
export function badgesFor(sp: Species): Badge[] {
  const gate = HABITAT_REQ[sp.habitat].gate;
  const out: Badge[] = [];
  const r = sp.req;
  if (r.theme && r.theme !== gate?.theme) out.push(r.theme);
  if (r.mode?.length === 1 && !(gate?.mode?.length === 1 && gate.mode[0] === r.mode[0]))
    out.push(r.mode[0] === 'daily' ? 'daily' : r.mode[0] === 'puzzle' ? 'reef' : 'endless');
  return out;
}
