/**
 * Rules version: identifies the exact game a seed + move log replays into. Leaderboard submissions
 * carry it and the server rejects a mismatch (`426 upgrade_required`), so an old app can never post a
 * log that the server's core would replay differently.
 *
 * Bump it whenever the dealer ramp, scoring, the piece catalog, the teaching tray or the daily salt
 * change. `rulesFingerprint()` hashes all of those plus a few golden replays (catches code changes,
 * not just constants); tests/unit/version.test.ts pins fingerprint ↔ version, so forgetting the bump
 * fails `make check`.
 */
import { DAILY_SALT, dailySeed } from './daily.ts';
import { DEFAULT_RAMP, TEACHING_TRAY } from './dealer.ts';
import { applyMove, legalMoves, newGame } from './game.ts';
import { PIECES } from './pieces.ts';
import { hashSeed } from './rng.ts';
import { CLEAN_REEF_BONUS, STREAK_GRACE } from './scoring.ts';

export const RULES_VERSION = 1;

/** Deterministic hash of the rules' data and of three short golden games (first-legal-move play). */
export function rulesFingerprint(): number {
  const parts: string[] = [
    JSON.stringify(DEFAULT_RAMP),
    JSON.stringify(PIECES.map((p) => [p.id, p.family, p.cells])),
    JSON.stringify(TEACHING_TRAY),
    `${STREAK_GRACE}:${CLEAN_REEF_BONUS}:${DAILY_SALT}`,
  ];
  for (const [seed, teach] of [
    [1, false],
    [2, true],
    [dailySeed('2026-01-01'), false],
  ] as const) {
    let s = newGame(seed, { teach });
    // spread the moves across the board so captures, cascades and the ramp all get exercised
    for (let i = 0; i < 60 && !s.over; i++) {
      const ms = legalMoves(s);
      s = applyMove(s, ms[(i * 7919) % ms.length]!)!.state;
    }
    parts.push(`${s.score}:${s.moves}:${s.rng}:${Array.from(s.board).join('')}`);
  }
  return hashSeed(parts.join('|'));
}
