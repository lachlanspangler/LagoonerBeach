import { Rng } from './core.ts';
import type { Mechanic, Move, State } from './mechanics.ts';

export type Bot = (m: Mechanic, s: State, r: Rng) => Move;

export const random: Bot = (m, s, r) => r.pick(m.moves(s));
export const firstFit: Bot = (m, s) => m.moves(s)[0]!;
export const greedy: Bot = (m, s) => {
  let best: Move | null = null, bv = -Infinity;
  for (const mv of m.moves(s)) {
    const res = m.apply(s, mv, { noRefill: true });
    const v = res.points + m.heuristic(res.state);
    if (v > bv) { bv = v; best = mv; }
  }
  return best!;
};

function boardKey(s: State): string {
  let k = '';
  for (let i = 0; i < s.board.length; i += 8) {
    let v = 0;
    for (let j = 0; j < 8; j++) v = (v << 1) | s.board[i + j]!;
    k += String.fromCharCode(65 + (v >> 4), 65 + (v & 15));
  }
  return k + s.tray.map((t) => (t ? t.id : '_')).join(',');
}

/** Beam search through the remaining tray (no refill), pick the first move of the best leaf. */
export function makeSearch(beam = 10, maxDepth = 3): Bot {
  return (m, s) => {
    type Node = { s: State; acc: number; first: Move; v: number };
    let frontier: Node[] = [];
    let best: Node | null = null;
    const leaf = (n: Node) => { if (!best || n.v > best.v) best = n; };
    for (const mv of m.moves(s)) {
      const r = m.apply(s, mv, { noRefill: true });
      frontier.push({ s: r.state, acc: r.points, first: mv, v: r.points + m.heuristic(r.state) });
    }
    for (let depth = 1; frontier.length; depth++) {
      frontier.sort((a, b) => b.v - a.v);
      const seen = new Set<string>();
      const keep: Node[] = [];
      for (const n of frontier) {
        const k = boardKey(n.s);
        if (seen.has(k)) continue;
        seen.add(k);
        if (depth >= maxDepth || !n.s.tray.some(Boolean)) { leaf(n); continue; }
        keep.push(n);
        if (keep.length >= beam) break;
      }
      const next: Node[] = [];
      for (const n of keep) {
        const ms = m.moves(n.s);
        if (!ms.length) { leaf({ ...n, v: n.acc - 1000 }); continue; } // dead end inside the tray
        for (const mv of ms) {
          const r = m.apply(n.s, mv, { noRefill: true });
          const acc = n.acc + r.points;
          next.push({ s: r.state, acc, first: n.first, v: acc + m.heuristic(r.state) });
        }
      }
      frontier = next;
    }
    return (best as Node | null)?.first ?? m.moves(s)[0]!;
  };
}
export const search = makeSearch(10);
export const BOTS: Record<string, Bot> = { random, firstFit, greedy, search };
