/**
 * Move logs of the current Classic and Daily games, kept so a finished game can be posted to a
 * leaderboard (the server replays it). Small and eager; the leaderboard client itself loads lazily.
 *
 * Also holds the prefetched Endless run ticket (a server-issued seed) and the "forget me" tombstone
 * written by Erase all progress, because both must be readable synchronously.
 */
import { newGame, type GameState, type Move } from '../core/game.ts';
import { packMoves, unpackMoves } from '../core/movelog.ts';
import { verifyRun } from '../core/verify.ts';
import type { RunRecord } from './storage.ts';

type LogMode = 'classic' | 'daily';

/** A finished, locally verified run, ready to submit. */
export interface FinishedRun {
  readonly mode: 'daily' | 'endless';
  readonly seed: number;
  /** Daily: the local date of the seed. */
  readonly date?: string;
  readonly teach: boolean;
  readonly runToken?: string;
  readonly moves: string;
  readonly score: number;
  readonly moveCount: number;
}

interface Live {
  seed: number;
  date?: string;
  teach: boolean;
  runToken?: string;
  moves: Move[];
}

const K_TICKET = 'atoll.v1.lbticket';
const K_FORGET = 'atoll.v1.lbforget';

function ls(): Storage | null {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

const sameTray = (a: GameState, b: GameState) =>
  a.tray.every((t, i) => t?.pieceId === b.tray[i]?.pieceId && t?.color === b.tray[i]?.color);

export class RunLog {
  private live: Partial<Record<LogMode, Live | null>> = {};
  /** The ticket handed out for the next new classic game (bound when its first move is made). */
  private pending: { seed: number; runToken: string } | null = null;

  /** Adopt a resumed save's log. Returns the state (for `?? newGame(...)` chains). */
  resume(mode: LogMode, s: GameState | null, rec: RunRecord | null, date?: string): GameState | null {
    if (!s) return null;
    const moves = rec ? unpackMoves(rec.moves) : null;
    this.live[mode] =
      rec && moves && moves.length === s.moves
        ? {
            seed: s.seed,
            ...(date ? { date } : {}),
            teach: rec.teach,
            moves,
            ...(rec.runToken ? { runToken: rec.runToken } : {}),
          }
        : null;
    return s;
  }

  /** Call with the state *before* a committed move. */
  record(before: GameState, m: Move, mode: LogMode, date: string): void {
    if (before.moves === 0) {
      const teach =
        mode === 'classic' &&
        sameTray(before, newGame(before.seed, { teach: true })) &&
        !sameTray(before, newGame(before.seed));
      // the ticket handed out for this game, or (after a reload before the first move) the one saved with it
      const prev = this.live[mode];
      const tok =
        mode !== 'classic'
          ? undefined
          : this.pending?.seed === before.seed
            ? this.pending.runToken
            : prev && prev.seed === before.seed && prev.moves.length === 0
              ? prev.runToken
              : undefined;
      if (this.pending?.seed === before.seed) this.pending = null;
      this.live[mode] = {
        seed: before.seed,
        ...(mode === 'daily' ? { date } : {}),
        teach,
        moves: [],
        ...(tok ? { runToken: tok } : {}),
      };
    }
    const l = this.live[mode];
    // a log that doesn't line up with the game (e.g. a save from before leaderboards) is dropped
    if (!l || l.seed !== before.seed || l.moves.length !== before.moves || (mode === 'daily' && l.date !== date)) {
      this.live[mode] = null;
      return;
    }
    l.moves.push(m);
  }

  /**
   * The record to save alongside the game `s`. A new classic game on a ticket has no moves yet, but
   * its ticket is saved with it, so a reload before the first move keeps the game ranked.
   */
  get(mode: LogMode, s?: Pick<GameState, 'seed' | 'moves'>): RunRecord | null {
    const l = this.live[mode];
    if (l) return { moves: packMoves(l.moves), teach: l.teach, ...(l.runToken ? { runToken: l.runToken } : {}) };
    if (mode === 'classic' && this.pending && s && s.moves === 0 && s.seed === this.pending.seed)
      return { moves: '', teach: false, runToken: this.pending.runToken };
    return null;
  }

  /** Use a just-issued ticket for the next classic game (instead of the stored spare). */
  useTicket(t: { seed: number; runToken: string }): number {
    this.pending = { seed: t.seed, runToken: t.runToken };
    return t.seed;
  }

  /** The finished run, if its log replays to exactly this final state. */
  finish(s: GameState, mode: LogMode): FinishedRun | null {
    const l = this.live[mode];
    if (!l || !s.over || l.seed !== s.seed || l.moves.length !== s.moves) return null;
    const run: FinishedRun = {
      mode: mode === 'daily' ? 'daily' : 'endless',
      seed: s.seed,
      ...(l.date ? { date: l.date } : {}),
      teach: l.teach,
      ...(l.runToken ? { runToken: l.runToken } : {}),
      moves: packMoves(l.moves),
      score: s.score,
      moveCount: s.moves,
    };
    const v = verifyRun(run);
    return v.ok && v.state.score === s.score ? run : null;
  }

  /** A prefetched server seed for a new classic game, if one is stored and still fresh. */
  ticketSeed(now = Date.now()): number | null {
    const t = readTicket(now);
    if (!t) return null;
    ls()?.removeItem(K_TICKET);
    this.pending = t;
    return t.seed;
  }
}

export interface StoredTicket {
  seed: number;
  runToken: string;
  expiresAt: number;
}

export function readTicket(now = Date.now()): StoredTicket | null {
  try {
    const t = JSON.parse(ls()?.getItem(K_TICKET) ?? 'null') as StoredTicket | null;
    // leave a margin so a game started now can still be finished and posted
    if (!t || typeof t.seed !== 'number' || typeof t.runToken !== 'string' || t.expiresAt - now < 6 * 3_600_000)
      return null;
    return t;
  } catch {
    return null;
  }
}

export function storeTicket(t: StoredTicket): void {
  try {
    ls()?.setItem(K_TICKET, JSON.stringify(t));
  } catch {
    /* best-effort */
  }
}

/** Erase all progress: remember the old install id (only) until the server confirms deletion. */
export function markForget(installId: string): void {
  try {
    const ids = readForget();
    if (!ids.includes(installId)) ids.push(installId);
    ls()?.setItem(K_FORGET, JSON.stringify(ids.slice(-5)));
  } catch {
    /* best-effort */
  }
}

export function readForget(): string[] {
  try {
    const v = JSON.parse(ls()?.getItem(K_FORGET) ?? '[]') as unknown;
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string' && /^[0-9a-f]{32}$/.test(x)) : [];
  } catch {
    return [];
  }
}

export function clearForget(installId: string): void {
  try {
    const left = readForget().filter((x) => x !== installId);
    if (left.length) ls()?.setItem(K_FORGET, JSON.stringify(left));
    else ls()?.removeItem(K_FORGET);
  } catch {
    /* best-effort */
  }
}

/** Leaderboard work waiting from a previous session (queued scores or a pending deletion). */
export function hasPendingLbWork(): boolean {
  const s = ls();
  return !!s && (s.getItem('atoll.v1.lbqueue') !== null || s.getItem(K_FORGET) !== null);
}
