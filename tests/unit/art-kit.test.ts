/**
 * Kit-level rules from the art director's CRITIQUE-1 (docs/art/CRITIQUE-1.md): resting faces, the
 * new sleepy, Night blush, the eye floor, tilt, frame-break and the contrast-waiver split.
 */
import { describe, expect, it } from 'vitest';
import { SPECIES_BY_ID } from '../../src/meta/creatures.ts';
import { ART } from '../../src/render/art/species/index.ts';
import { metrics, validateArt } from '../../src/render/art/validate.ts';
import { restingFace, spanFor } from '../../src/render/art/creature-art.ts';
import { blushStyle, mouthFor, NIGHT_BLUSH } from '../../src/render/art/face.ts';
import { restTilt } from '../../src/render/art/silhouette.ts';
import { eyeFloorUnits, TILE_FILL, TILE_SCALE, tileScaleOf, xform } from '../../src/render/art/kit.ts';
import { pose } from '../../src/render/art/motion.ts';

const fish = ART.get('clownfish')!;
const sp = (id: string) => SPECIES_BY_ID.get(id)!;

describe('CRITIQUE-1 kit rules', () => {
  it('resting face: sleepy off-theme, the rest expression when awake, neverSleepy always awake', () => {
    expect(restingFace(fish, sp('clownfish'), true)).toBe('sleepy');
    expect(restingFace(fish, sp('clownfish'), false)).toBe('idle');
    expect(restingFace({ ...fish, restExpression: 'drowsy' }, sp('clownfish'), false)).toBe('drowsy');
    expect(restingFace({ ...fish, neverSleepy: true }, sp('clownfish'), true)).toBe('idle');
    expect(restingFace(ART.get('kraken')!, sp('kraken'), false)).not.toBe('sleepy');
    expect(restingFace(ART.get('kraken')!, sp('kraken'), true)).not.toBe('sleepy');
  });
  it('sleepy is contented: blush capped at 0.25 and a soft mouth; the flat line is drowsy only', () => {
    const [, a] = blushStyle(fish.face, 'sleepy', { night: false, bodyL: 0.7 });
    expect(a).toBeLessThanOrEqual(0.25);
    expect(a).toBeGreaterThan(0);
    expect(mouthFor('sleepy', 'smile')).toBe('smile');
    expect(mouthFor('sleepy', 'flat')).toBe('smile');
    // CRITIQUE-2 NEW 1: drowsy keeps the species' own mouth (a row of flat lines read grumpy)
    expect(mouthFor('drowsy', 'smile')).toBe('smile');
    expect(mouthFor('drowsy', 'pout')).toBe('pout');
  });
  it('CRITIQUE-2 NEW 1: off-theme tiles doze drowsy (eyes half-open), sleepy is the detail view only', () => {
    expect(restingFace(fish, sp('clownfish'), true, 'tile')).toBe('drowsy');
    expect(restingFace(fish, sp('clownfish'), true, 'detail')).toBe('sleepy');
    expect(restingFace(fish, sp('clownfish'), false, 'tile')).toBe('idle');
    // the rest expression still applies when awake; neverSleepy never dozes
    expect(restingFace({ ...fish, restExpression: 'shy' }, sp('clownfish'), false, 'tile')).toBe('shy');
    expect(restingFace(ART.get('grouper')!, sp('grouper'), false, 'tile')).toBe('drowsy');
    expect(restingFace({ ...fish, neverSleepy: true }, sp('clownfish'), true, 'tile')).toBe('idle');
    for (const night of [false, true]) {
      expect(['idle', 'proud', 'shy']).toContain(restingFace(ART.get('kraken')!, sp('kraken'), night, 'tile'));
    }
    // a closed-eyed rest face (e.g. proud) is the detail view's; the tile is eyes-open
    const proudRest = { ...fish, restExpression: 'proud' as const };
    expect(restingFace(proudRest, sp('clownfish'), false, 'tile')).toBe('idle');
    expect(restingFace(proudRest, sp('clownfish'), false, 'detail')).toBe('proud');
    // CRITIQUE-3: the seadragon now rests eyes open in its detail view too (proud is a signature beat)
    expect(restingFace(ART.get('seadragon')!, sp('seadragon'), false, 'detail')).toBe('idle');
    // no journal tile rests eyes-closed on either theme
    for (const night of [false, true])
      for (const [id, art] of ART) {
        const f = restingFace(art, sp(id), night, 'tile');
        expect(['sleepy', 'proud', 'happy', 'blink'], `${id} night=${night}`).not.toContain(f);
      }
  });
  it('Night blush is brighter on darker bodies; a per-species override wins', () => {
    expect(blushStyle(fish.face, 'happy', { night: true, bodyL: 0.5 })[0]).toBe(NIGHT_BLUSH.color);
    expect(blushStyle(fish.face, 'happy', { night: true, bodyL: 0.8 })[0]).not.toBe(NIGHT_BLUSH.color);
    const sun = { ...fish.face, blush: { color: '#FFB3A0', alpha: 0.5, always: true } };
    expect(blushStyle(sun, 'idle', { night: false, bodyL: 0.8 })).toEqual(['#FFB3A0', 0.5]);
  });
  it('eye floor: ≥ 4 CSS px in a 54 px tile and ≥ 9 % of the body-box height', () => {
    const u = eyeFloorUnits('S', 84, 60);
    expect(u * ((TILE_FILL.S * 54) / 84)).toBeCloseTo(4, 5);
    expect(eyeFloorUnits('XL', 84, 84)).toBeGreaterThanOrEqual(0.09 * 84);
  });
  it('tileScale (CRITIQUE-4): clamped to 0.85–1.3, scales tile + detail only, out of range is an error', () => {
    expect(TILE_SCALE).toEqual([0.85, 1.3]);
    expect(tileScaleOf({})).toBe(1);
    expect(tileScaleOf({ tileScale: 2 })).toBe(1.3);
    expect(tileScaleOf({ tileScale: 0.5 })).toBe(0.85);
    const big = { ...fish, tileScale: 1.2 };
    expect(spanFor(big, 54, 'tile')).toBeCloseTo(spanFor(fish, 54, 'tile') * 1.2, 6);
    expect(spanFor(big, 200, 'detail')).toBeCloseTo(spanFor(fish, 200, 'detail') * 1.2, 6);
    expect(spanFor(big, 40, 'leap')).toBe(spanFor(fish, 40, 'leap'));
    expect(spanFor(big, 40, 'avatar')).toBe(spanFor(fish, 40, 'avatar'));
    expect(validateArt(big).some((i) => i.rule === 'R27S')).toBe(false);
    expect(validateArt({ ...fish, tileScale: 1.4 }).some((i) => i.rule === 'R27S' && i.level === 'error')).toBe(true);
    expect(validateArt({ ...fish, tileScale: 0.8 }).some((i) => i.rule === 'R27S')).toBe(true);
    expect(validateArt({ ...fish, size: 'XL', tileScale: 1 }).some((i) => i.rule === 'R27S')).toBe(true);
    expect(ART.get('seadragon')!.tileScale).toBe(1.25);
    for (const a of ART.values()) if (a.size === 'XL' || a.size === 'XXL') expect(a.tileScale).toBeUndefined();
  });
  it('tilt: a level fish measures < 10°, the same fish rotated 30° is flagged', () => {
    expect(restTilt(fish)).toBeLessThan(10);
    const rot = {
      ...fish,
      groups: fish.groups.map((g) => ({
        ...g,
        parts: g.parts.map((p) => ({ ...p, d: xform(p.d, { sx: 1.8, rot: 30 }) })),
      })),
    };
    expect(restTilt(rot)).toBeGreaterThan(22);
    expect(validateArt(rot).some((i) => i.rule === 'R5T' && i.level === 'warn')).toBe(true);
  });
  it('frame-break is measured past the 54 px art box and flagged for XL outside 2–4 px', () => {
    const xl = { ...fish, size: 'XL' as const };
    const m = metrics(xl);
    expect(validateArt(xl).some((i) => i.rule === 'R28')).toBe(m.overhang < 1.75 || m.overhang > 4.25);
  });
  it('a dark-identity deviation (R16) allows L ≥ 0.45 but never waives L < 0.45 or contrast (R16K)', () => {
    const tooDark = { ...fish, palette: { body: '#3B3240' }, deviations: { R16: 'dark identity' } };
    expect(validateArt(tooDark).some((i) => i.rule === 'R16L' && i.level === 'error')).toBe(true);
    const lifted = { ...fish, palette: { body: '#6A5A7A' }, deviations: { R16: 'dark identity' } };
    expect(validateArt(lifted).some((i) => i.rule === 'R16L')).toBe(false);
  });
  it('colour cycles step only while the signature plays when `during: signature`', () => {
    const art = { ...fish, cycle: { rate: 6, during: 'signature' as const } };
    expect(pose(art, { t: 0.5, noSignature: true }).cycle).toBe(0);
    expect(pose(art, { t: 0.001, signatureAt: 0.5 }).cycle).toBeGreaterThan(0);
    expect(pose({ ...fish, cycle: { rate: 4 } }, { t: 2 }).cycle).toBe(8);
  });
});
