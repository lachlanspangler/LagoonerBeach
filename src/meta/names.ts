/**
 * Leaderboard name rules (pure; shared by the app and the server). A name is 1–7 letters A–Z,
 * stored uppercase. `sanitizeNameInput` runs on every keystroke; `validateName` is the gate the
 * client and the server both apply.
 *
 * The profanity filter works inside A–Z only (digits/symbols can't be typed), so evasion means
 * letter games. Every name is checked in three spellings of the same letters:
 *   L — lookalike families mapped (PH→F, C/Q→K, X→KS, Y→I, V→U) and runs capped at two letters
 *   C — L with every run collapsed (FUUUK → FUK)
 *   reversed L, for the worst roots
 * against a curated list of roots (see nameData.ts, ROT13-encoded), each tagged with the spelling
 * it is safe to match in. Innocent words that contain a root (COCKLE, GRAPE, TORPEDO…) are masked
 * first, the "Scunthorpe problem". Vowel-dropped spellings (FCK, BTCH…) are listed explicitly:
 * matching every root's consonant skeleton blocked CENT, SCENT and FICKLE.
 */
import { ALLOW_ROT13, BLOCK_ROT13 } from './nameData.ts';

export const NAME_MAX = 7;

export type NameReason = 'empty' | 'long' | 'chars' | 'blocked' | 'reserved';
export type NameCheck = { ok: true } | { ok: false; reason: NameReason };

export const NAME_REASON_TEXT: Record<NameReason, string> = {
  empty: 'Type a name, A–Z',
  long: `${NAME_MAX} letters max`,
  chars: 'Letters A–Z only',
  blocked: "That name isn't allowed. Try another",
  reserved: 'That name is reserved. Try another',
};

export const rot13 = (s: string): string =>
  s.replace(/[A-Za-z]/g, (c) => {
    const base = c <= 'Z' ? 65 : 97;
    return String.fromCharCode(((c.charCodeAt(0) - base + 13) % 26) + base);
  });

/**
 * Live input cleanup: folds accents and full-width letters to A–Z (JOSÉ → JOSE), drops everything
 * else (digits, spaces, emoji, other scripts), uppercases, and cuts to 7 letters.
 */
export function sanitizeNameInput(raw: string): string {
  return raw
    .normalize('NFKD')
    .replace(/[^A-Za-z]/g, '')
    .toUpperCase()
    .slice(0, NAME_MAX);
}

/** Lookalike families, applied identically to names and roots so both sides agree. */
function mapLetters(s: string): string {
  return s.replace(/PH/g, 'F').replace(/[CQ]/g, 'K').replace(/X/g, 'KS').replace(/Y/g, 'I').replace(/V/g, 'U');
}
const limitRuns = (s: string) => s.replace(/([A-Z])\1{2,}/g, '$1$1');
const collapseRuns = (s: string) => s.replace(/([A-Z])\1+/g, '$1');
const formL = (s: string) => limitRuns(mapLetters(limitRuns(s)));
const formC = (s: string) => collapseRuns(mapLetters(s));
const reverse = (s: string) => [...s].reverse().join('');

interface Root {
  readonly c?: string; // match in the collapsed spelling
  readonly l?: string; // match in the run-limited spelling
  readonly x?: string; // the whole name (run-limited spelling)
  readonly r?: string; // reversed name contains this (run-limited spelling)
}

const ROOTS: readonly Root[] = BLOCK_ROT13.split(' ').map((e) => {
  const [mode, enc] = e.split(':') as [string, string];
  const w = rot13(enc);
  const r: { c?: string; l?: string; x?: string; r?: string } = {};
  if (mode.includes('c')) r.c = formC(w);
  if (mode.includes('l')) r.l = formL(w);
  if (mode.includes('x')) r.x = formL(w);
  if (mode.includes('r')) r.r = formL(w);
  return r;
});

const ALLOW: readonly string[] = ALLOW_ROT13.split(' ').map(rot13);

/** Reserved: impersonation of staff/the game, and values that look like missing data. */
const RESERVED_ANYWHERE = [
  'ADMIN',
  'MODERAT',
  'SUPPORT',
  'SYSTEM',
  'OFFICIA',
  'OFFICAL',
  'STAFF',
  'LAGOONE',
  'LAGOONR',
];
const RESERVED_EXACT = [
  'MOD',
  'MODS',
  'DEV',
  'DEVS',
  'GM',
  'ROOT',
  'BOT',
  'OWNER',
  'HELP',
  'NULL',
  'NIL',
  'NONE',
  'NAN',
  'UNDEF',
  'UNDEFIN',
  'ANON',
  'ANONYMO',
  'GUEST',
  'YOU',
  'ME',
  'LAGOON',
  'ATOLL',
  'SERVER',
];

/** Replace innocent words that happen to contain a blocked root with '-' so they can't match. */
function maskAllowed(name: string): string {
  let s = name;
  for (const w of ALLOW) if (s.includes(w)) s = s.split(w).join('-'.repeat(w.length));
  return s;
}

/** True if the (A–Z, uppercase) name contains or is an offensive root in any checked spelling. */
export function isBlocked(name: string): boolean {
  const masked = maskAllowed(name);
  // masking splits the name into innocent-free fragments; '-' never matches a root
  const parts = masked.split(/-+/).filter(Boolean);
  const whole = formL(name);
  for (const p of parts) {
    const c = formC(p);
    const l = formL(p);
    const rl = formL(reverse(p));
    for (const r of ROOTS) {
      if (r.c && c.includes(r.c)) return true;
      if (r.l && l.includes(r.l)) return true;
      if (r.r && rl.includes(r.r)) return true;
    }
  }
  for (const r of ROOTS) if (r.x && whole === r.x && !ALLOW.includes(name)) return true;
  return false;
}

export function isReserved(name: string): boolean {
  const l = formL(name);
  return RESERVED_EXACT.some((w) => l === formL(w)) || RESERVED_ANYWHERE.some((w) => l.includes(formL(w)));
}

/** The gate for a submitted name. Lowercase a–z is accepted (and uppercased by the caller). */
export function validateName(name: string): NameCheck {
  if (name.length === 0) return { ok: false, reason: 'empty' };
  if (name.length > NAME_MAX) return { ok: false, reason: 'long' };
  if (!/^[A-Za-z]+$/.test(name)) return { ok: false, reason: 'chars' };
  const up = name.toUpperCase();
  if (isReserved(up)) return { ok: false, reason: 'reserved' };
  if (isBlocked(up)) return { ok: false, reason: 'blocked' };
  return { ok: true };
}
