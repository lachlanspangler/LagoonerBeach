/**
 * Bots that play the real core. Used by tests (regression bands), the tuning CLI and the
 * in-browser autoplay used by e2e/perf tests. Deterministic given their RNG.
 */
import { applyMove, legalMoves, type GameState, type Move } from '../core/game.ts';
import { CELLS, N, NB4, isBorder } from '../core/grid.ts';
import { pieceById } from '../core/pieces.ts';
import { canPlace, countFilled, type Board } from '../core/rules.ts';
import type { Rng } from '../core/rng.ts';

export type Bot = (s: GameState, rng: Rng) => Move | null;

const PROBES = ['dot', 'tri-h', 'tri-v', 'square', 'bend-a', 'ell-a', 'cup-up', 'pent-h', 'pent-v', 'block'].map(
  pieceById,
);

/** Board quality: room for many shapes, few filled cells, and "almost pockets". */
export function evaluate(b: Board): number {
  let mob = 0;
  for (const p of PROBES) {
    let k = 0;
    for (let y = 0; y <= N - p.h && k < 10; y++)
      for (let x = 0; x <= N - p.w && k < 10; x++) if (canPlace(b, p, x, y)) k++;
    mob += k > 0 ? 3 + k : -14;
  }
  let near = 0;
  for (let c = 0; c < CELLS; c++) {
    if (b[c] !== 0 || isBorder(c)) continue;
    let f = 0;
    for (const nb of NB4[c]!) if (b[nb] !== 0) f++;
    if (f === 3) near++;
  }
  return mob - 0.4 * countFilled(b) + 2 * near;
}

export const randomBot: Bot = (s, rng) => {
  const ms = legalMoves(s);
  return ms.length ? ms[rng.int(ms.length)]! : null;
};

export const firstFitBot: Bot = (s) => legalMoves(s)[0] ?? null;

export const greedyBot: Bot = (s) => {
  let best: Move | null = null;
  let bv = -Infinity;
  for (const m of legalMoves(s)) {
    const r = applyMove(s, m, { noRefill: true })!;
    const v = r.state.score - s.score + evaluate(r.state.board);
    if (v > bv) {
      bv = v;
      best = m;
    }
  }
  return best;
};

function key(s: GameState): string {
  return String.fromCharCode(...s.board) + s.tray.map((t) => (t ? t.pieceId : '_')).join();
}

/** Beam search through the current tray (no peeking at future trays). */
export function makeSearchBot(beam = 10): Bot {
  return (s) => {
    type Node = { s: GameState; first: Move; v: number };
    let best: Node | null = null;
    let frontier: Node[] = [];
    for (const m of legalMoves(s)) {
      const r = applyMove(s, m, { noRefill: true })!;
      frontier.push({ s: r.state, first: m, v: r.state.score - s.score + evaluate(r.state.board) });
    }
    for (let depth = 1; frontier.length; depth++) {
      frontier.sort((a, b) => b.v - a.v);
      const seen = new Set<string>();
      const keep: Node[] = [];
      for (const n of frontier) {
        const k = key(n.s);
        if (seen.has(k)) continue;
        seen.add(k);
        if (depth >= 3 || n.s.tray.every((t) => t === null)) {
          if (!best || n.v > best.v) best = n;
          continue;
        }
        keep.push(n);
        if (keep.length >= beam) break;
      }
      const next: Node[] = [];
      for (const n of keep) {
        const ms = legalMoves(n.s);
        if (!ms.length) {
          const dead = { ...n, v: n.v - 1000 };
          if (!best || dead.v > best.v) best = dead;
          continue;
        }
        for (const m of ms) {
          const r = applyMove(n.s, m, { noRefill: true })!;
          next.push({ s: r.state, first: n.first, v: r.state.score - s.score + evaluate(r.state.board) });
        }
      }
      frontier = next;
    }
    return best?.first ?? legalMoves(s)[0] ?? null;
  };
}

export const searchBot: Bot = makeSearchBot(10);

export const BOTS = { random: randomBot, firstFit: firstFitBot, greedy: greedyBot, search: searchBot } as const;
export type BotName = keyof typeof BOTS;
