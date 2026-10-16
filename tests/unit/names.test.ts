/**
 * Leaderboard name rules. Offensive test inputs are written in ROT13 (decoded with `r`) so this file
 * stays readable; every family of evasion gets its own case.
 */
import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { NAME_MAX, isBlocked, rot13, sanitizeNameInput, validateName } from '../../src/meta/names.ts';
import { ALLOW_ROT13 } from '../../src/meta/nameData.ts';

const r = (s: string) => rot13(s);
const blocked = (name: string) => expect(validateName(name), name).toEqual({ ok: false, reason: 'blocked' });
const ok = (name: string) => expect(validateName(name), name).toEqual({ ok: true });

describe('sanitizeNameInput (live while typing)', () => {
  it('uppercases and keeps only A–Z', () => {
    expect(sanitizeNameInput('nemo')).toBe('NEMO');
    expect(sanitizeNameInput('n3m0!x')).toBe('NMX');
    expect(sanitizeNameInput('ne mo_9')).toBe('NEMO');
    expect(sanitizeNameInput('🐠fish🐟')).toBe('FISH');
  });
  it('folds accents and full-width letters, drops other scripts', () => {
    expect(sanitizeNameInput('José')).toBe('JOSE');
    expect(sanitizeNameInput('Zoë')).toBe('ZOE');
    expect(sanitizeNameInput('ＫＡＩ')).toBe('KAI');
    expect(sanitizeNameInput('ﬁn')).toBe('FIN');
    expect(sanitizeNameInput('Παύλος')).toBe('');
    expect(sanitizeNameInput('Сергей')).toBe('');
  });
  it('cuts to 7 letters', () => {
    expect(sanitizeNameInput('abcdefghij')).toBe('ABCDEFG');
    expect(NAME_MAX).toBe(7);
  });
  it('property: output always passes the length and character rules', () => {
    fc.assert(
      fc.property(fc.string({ unit: 'binary', maxLength: 40 }), (raw) => {
        const s = sanitizeNameInput(raw);
        expect(s).toMatch(/^[A-Z]{0,7}$/);
        const v = validateName(s);
        if (!v.ok) expect(['empty', 'blocked', 'reserved']).toContain(v.reason);
      }),
      { numRuns: 2000 },
    );
  });
  it('property: sanitizing is idempotent', () => {
    fc.assert(
      fc.property(
        fc.string({ maxLength: 20 }),
        (raw) => sanitizeNameInput(sanitizeNameInput(raw)) === sanitizeNameInput(raw),
      ),
    );
  });
});

describe('validateName: shape', () => {
  it('rejects empty, long and non-letters', () => {
    expect(validateName('')).toEqual({ ok: false, reason: 'empty' });
    expect(validateName('ABCDEFGH')).toEqual({ ok: false, reason: 'long' });
    expect(validateName('NEMO1')).toEqual({ ok: false, reason: 'chars' });
    expect(validateName('NE MO')).toEqual({ ok: false, reason: 'chars' });
    expect(validateName('JOSÉ')).toEqual({ ok: false, reason: 'chars' });
    expect(validateName('🐠')).toEqual({ ok: false, reason: 'chars' });
  });
  it('accepts lowercase (callers store it uppercased)', () => ok('coral'));
  it('allows ordinary names and beach words', () => {
    for (const n of [
      'A',
      'KAI',
      'NEMO',
      'CORAL',
      'MARLIN',
      'SANDY',
      'SHELLY',
      'PEARL',
      'ISLA',
      'FINN',
      'JUNO',
      'MAYA',
      'NOOR',
      'ZOE',
      'BOB',
      'COCO',
      'ASH',
      'SPLASH',
      'CLASSIC',
      'BASSIST',
      'PASSION',
      'ASSUME',
      'MASSIVE',
      'SCENT',
      'CENTRE',
      'KICKER',
      'RAPPER',
      'COKE',
      'DICE',
      'PRICE',
      'NASIR',
      'CANCER',
      'GEORGIA',
      'FISTFUL',
      'ANGRY',
      'ESSEX',
      'SEXTANT',
      'CUMIN',
      'CANAL',
      'JANUS',
      'TITAN',
      'SKUNK',
      'HELLO',
      'COCOA',
    ])
      ok(n);
  });
});

describe('validateName: reserved names', () => {
  it('blocks staff, system and game names', () => {
    for (const n of [
      'ADMIN',
      'XADMINX',
      'MOD',
      'MODS',
      'STAFF',
      'SUPPORT',
      'SYSTEM',
      'OFFICIA',
      'NULL',
      'UNDEFIN',
      'ANON',
      'LAGOON',
      'LAGOONE',
      'ATOLL',
      'ROOT',
      'YOU',
    ])
      expect(validateName(n), n).toEqual({ ok: false, reason: 'reserved' });
  });
  it('keeps innocent words that merely start like one', () => {
    ok('MODEL');
    ok('MODERN');
    ok('DEVON');
    ok('NONET');
  });
});

describe('profanity filter: evasion families', () => {
  it('plain roots, anywhere in the name', () => {
    for (const w of ['SHPX', 'FUVG', 'PHAG', 'OVGPU', 'JUBER', 'FYHG', 'AVTTRE', 'SNTTBG', 'ANMV', 'UVGYRE', 'CBEA'])
      blocked(r(w));
    blocked(r('OVTSHPX')); // BIGF…
    blocked(r('FUVGUC'));
  });
  it('letter-substitution families: PH→F, C/Q→K, V→U, Y→I, X→KS', () => {
    blocked(r('CUHX')); // PH for F
    blocked(r('SHD')); // Q for CK
    blocked(r('SHXX'));
    blocked(r('SIPX')); // V for U
    blocked(r('PIAG'));
    blocked(r('FULG')); // Y for I
    blocked(r('XHAG')); // K for C
    blocked(r('QVK')); // X for CKS
  });
  it('repeated letters collapse', () => {
    blocked(r('SHHHHPX'));
    blocked(r('FUUVVVG'));
    blocked(r('OVVVGPU'));
    blocked(r('NFFFFF')); // runs cap at two for the double-letter roots
  });
  it('deliberate misspellings and vowel-dropped forms', () => {
    for (const w of ['SHX', 'SPX', 'CUHX', 'FUVGR', 'OVPU', 'OGPU', 'PAG', 'FUG', 'CFFL', 'ATTE', 'ATTN', 'QPX', 'STG'])
      blocked(r(w));
  });
  it('reversed spellings of the worst roots', () => {
    for (const w of ['XPHS', 'GVUF', 'GAHP', 'ERTTVA', 'GBTTNS', 'XPBP']) blocked(r(w));
  });
  it('exact-only short words do not leak into longer innocent ones', () => {
    blocked(r('NFF'));
    blocked(r('NMM'));
    blocked(r('GVGF'));
    ok('BASS');
    ok('TITLE');
    ok('PASSES');
  });
  it('other languages', () => {
    for (const w of ['CHGN', 'ZREQR', 'OYLNG', 'XHEJN', 'FPURVFF', 'PNMMB', 'ZVREQN', 'SBGMR']) blocked(r(w));
  });
  it('folded input is still filtered (accents, full-width, mixed scripts)', () => {
    const w = r('SHPX');
    blocked(sanitizeNameInput(`${w[0]}Ü${w.slice(2)}`)); // accent folded back to U
    blocked(sanitizeNameInput([...w].map((c) => String.fromCharCode(c.charCodeAt(0) + 0xfee0)).join(''))); // full-width
    blocked(sanitizeNameInput(`${w[0]} . ${w.slice(1, 3)} ${w[3]}`)); // spaced out
    blocked(sanitizeNameInput(`${w.slice(0, 2)}С${w[3]}`)); // a Cyrillic lookalike is dropped, the rest still matches
  });
});

describe('Scunthorpe allowlist', () => {
  it('every allowlisted word passes on its own', () => {
    for (const w of ALLOW_ROT13.split(' ').map(rot13)) expect(w.length <= NAME_MAX && validateName(w).ok, w).toBe(true);
  });
  it('innocent words containing a root are allowed', () => {
    for (const w of [
      'COCKLE',
      'PEACOCK',
      'GRAPE',
      'GRAPES',
      'DRAPE',
      'SCRAPE',
      'TORPEDO',
      'THORNY',
      'PARSE',
      'ARSENAL',
      'HEARSE',
      'RACCOON',
      'TYCOON',
      'COCOON',
      'SHIITE',
      'STURDY',
      'REGINA',
      'NAZIM',
      'FUCHSIA',
      'DICKENS',
    ])
      ok(w);
  });
  it('an allowlisted word does not launder a root next to it', () => {
    blocked('DICE' + r('SHX'));
    blocked(r('SHX') + 'DICE');
  });
  it('the isBlocked helper agrees with validateName', () => {
    expect(isBlocked(r('SHPX'))).toBe(true);
    expect(isBlocked('CORAL')).toBe(false);
  });
});
