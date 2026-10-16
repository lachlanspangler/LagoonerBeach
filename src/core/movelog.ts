/**
 * Compact move log for leaderboard submissions and saves: one byte per move (`slot<<6 | x<<3 | y`),
 * base64url without padding. 80 moves ≈ 107 chars; the 4,000-move cap ≈ 5.3 KB.
 */
import type { Move } from './game.ts';

export const MAX_LOG_MOVES = 4000;

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
const INDEX = new Map([...ALPHABET].map((c, i) => [c, i] as const));

export function packMove(m: Move): number {
  return ((m.slot & 3) << 6) | ((m.x & 7) << 3) | (m.y & 7);
}

export function unpackMove(b: number): Move | null {
  const slot = b >> 6;
  if (slot > 2 || b < 0 || b > 255) return null;
  return { slot, x: (b >> 3) & 7, y: b & 7 };
}

export function packMoves(moves: readonly Move[]): string {
  let out = '';
  for (let i = 0; i < moves.length; i += 3) {
    const a = packMove(moves[i]!);
    const b = i + 1 < moves.length ? packMove(moves[i + 1]!) : 0;
    const c = i + 2 < moves.length ? packMove(moves[i + 2]!) : 0;
    const n = (a << 16) | (b << 8) | c;
    const left = moves.length - i;
    out += ALPHABET[(n >> 18) & 63]! + ALPHABET[(n >> 12) & 63]!;
    if (left > 1) out += ALPHABET[(n >> 6) & 63]!;
    if (left > 2) out += ALPHABET[n & 63]!;
  }
  return out;
}

/** Decode a packed log; null if it isn't one (bad characters, impossible length, slot 3, too long). */
export function unpackMoves(s: string, max = MAX_LOG_MOVES): Move[] | null {
  if (typeof s !== 'string' || s.length % 4 === 1) return null;
  const count = Math.floor(s.length / 4) * 3 + (s.length % 4 === 0 ? 0 : (s.length % 4) - 1);
  if (count > max) return null;
  const out: Move[] = [];
  for (let i = 0; i < s.length; i += 4) {
    let n = 0;
    const chunk = s.slice(i, i + 4);
    for (let k = 0; k < 4; k++) {
      const v = k < chunk.length ? INDEX.get(chunk[k]!) : 0;
      if (v === undefined) return null;
      n = (n << 6) | v;
    }
    const bytes = [(n >> 16) & 255, (n >> 8) & 255, n & 255].slice(0, chunk.length - 1);
    // canonical encoding only: unused low bits of a short final chunk must be zero
    if (chunk.length < 4 && (n & (chunk.length === 2 ? 0xffff : 0xff)) !== 0) return null;
    for (const b of bytes) {
      const m = unpackMove(b);
      if (!m) return null;
      out.push(m);
    }
  }
  return out;
}
