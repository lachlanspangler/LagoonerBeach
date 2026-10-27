/**
 * Creature art pipeline (ADR 0011): every registered species validates against the machine-checkable
 * Creature Style Guide rules, silhouettes stay distinguishable (R12), and the kit's pure parts behave.
 * Grows automatically as fleet artists add `src/render/art/species/<id>.ts`.
 */
import { describe, expect, it } from 'vitest';
import { SPECIES, SPECIES_BY_ID } from '../../src/meta/creatures.ts';
import { ART } from '../../src/render/art/species/index.ts';
import {
  CAST_LINT_AS_ERRORS,
  castOf,
  failing,
  LINT_AS_ERRORS,
  validateArt,
  validateCast,
} from '../../src/render/art/validate.ts';
import { pairScores, silhouetteMask } from '../../src/render/art/silhouette.ts';
import { boundsOf, flatten, iou, parsePath, polyArea } from '../../src/render/art/path.ts';
import {
  blob,
  capsule,
  circle,
  ellipse,
  rrect,
  tube,
  xform,
  sizeClassFor,
  EXPRESSIONS,
} from '../../src/render/art/kit.ts';
import {
  cielab,
  deltaE2000,
  deriveInk,
  fromOklch,
  GOLDEN_DEEP,
  goldenKind,
  oklch,
} from '../../src/render/art/palette.ts';
import { blinking, pose, sample, signatureProgress } from '../../src/render/art/motion.ts';

const arts = [...ART.values()];
const STRICT = LINT_AS_ERRORS || process.env.ART_LINT_STRICT === '1';

describe('species art registry', () => {
  it('has the five pilot species', () => {
    for (const id of ['clownfish', 'octopus', 'sanddollar', 'hermit', 'turtle']) expect(ART.has(id), id).toBe(true);
  });
  it('every art module belongs to a real species', () => {
    for (const a of arts) expect(SPECIES_BY_ID.has(a.id), a.id).toBe(true);
  });
  it.each(arts.map((a) => [a.id, a] as const))('%s passes the style-guide checks', (_id, a) => {
    // errors always fail; CRITIQUE-1 warnings fail only in strict mode (docs/art/LINT.md lists them)
    expect(failing(validateArt(a, SPECIES_BY_ID.get(a.id)), STRICT)).toEqual([]);
  });
});

describe('R12 silhouettes (24 px fill-only masks, centroid-aligned)', () => {
  it('every pair differs (IoU < 0.80; < 0.70 within a body class)', () => {
    const scores = pairScores(arts);
    const worst = [...scores].sort((a, b) => b.iou - a.iou).slice(0, 5);
    console.log('closest silhouettes:', worst.map((s) => `${s.a}/${s.b} ${s.iou.toFixed(2)}`).join(', '));
    for (const s of scores) expect(s.iou, `${s.a} vs ${s.b}`).toBeLessThan(s.limit);
  });
  it('masks are non-trivial (each fills a real share of its box)', () => {
    for (const a of arts) {
      const m = silhouetteMask(a);
      const area = m.reduce((x, v) => x + v, 0);
      expect(area, a.id).toBeGreaterThan(50); // low enough for true needles (sand eel 84 × 20)
    }
  });
  it('the metric itself: identical shapes score 1, disjoint 0', () => {
    const m = silhouetteMask(arts[0]!);
    expect(iou(m, m)).toBeCloseTo(1, 6);
    expect(iou(m, new Float32Array(m.length))).toBe(0);
  });
});

describe('path toolkit', () => {
  it('parses absolute, relative, implicit and arc commands', () => {
    const p = parsePath(
      'M0 0 L10 0 l0 10 h-10 v-10 Z M20 20 c5 0 5 5 5 5 s0 5 -5 5 q-5 0 -5 -5 t0 -5 A5 5 0 0 1 30 20 Z',
    );
    expect(p.segs[0]).toEqual({ c: 'M', p: [0, 0] });
    expect(p.drawCount).toBe(9);
    expect(p.maxSubpath).toBe(5);
    const b = boundsOf(flatten(p));
    expect(b.x).toBeCloseTo(0, 6);
    expect(b.w).toBeGreaterThanOrEqual(25);
  });
  it('rejects malformed data', () => {
    expect(() => parsePath('L0 0')).toThrow();
    expect(() => parsePath('M0 0 X1')).toThrow();
    expect(() => parsePath('M0')).toThrow();
  });
  it('helpers produce closed shapes with the expected bounds', () => {
    const near = (d: string, x: number, y: number, w: number, h: number) => {
      const b = boundsOf(flatten(d, 24));
      expect(b.x).toBeCloseTo(x, 0);
      expect(b.y).toBeCloseTo(y, 0);
      expect(b.w).toBeCloseTo(w, 0);
      expect(b.h).toBeCloseTo(h, 0);
    };
    near(circle(0, 0, 10), -10, -10, 20, 20);
    near(ellipse(5, 0, 10, 4), -5, -4, 20, 8);
    near(rrect(0, 0, 20, 10, 3), 0, 0, 20, 10);
    near(capsule(0, 0, 4, 20, 0, 2), -4, -4, 26, 8);
    near(xform(circle(0, 0, 5), { sx: -1, tx: 10 }), 5, -5, 10, 10);
    expect(Math.abs(polyArea(flatten(circle(0, 0, 10), 32)[0]!))).toBeCloseTo(Math.PI * 100, -1);
    expect(
      parsePath(
        blob([
          [0, 0],
          [10, 0],
          [10, 10],
          [0, 10],
        ]),
      ).drawCount,
    ).toBe(4);
    expect(
      parsePath(
        tube([
          [0, 0, 3],
          [10, 0, 2],
          [20, 5, 1],
        ]),
      ).drawCount,
    ).toBe(8);
  });
});

describe('palette (R16)', () => {
  it('OKLCH round-trips', () => {
    for (const hex of ['#F2792E', '#C2506B', '#E9DCC4', '#3D9BE9', '#2B2320']) {
      const back = fromOklch(oklch(hex));
      const [a, b] = [oklch(hex), oklch(back)];
      expect(Math.abs(a[0] - b[0])).toBeLessThan(0.01);
    }
  });
  it('derived ink is darker, same family, L in 0.20–0.32', () => {
    for (const sp of SPECIES) {
      const [L] = oklch(deriveInk(sp.colors[0]));
      expect(L).toBeGreaterThanOrEqual(0.19);
      expect(L).toBeLessThanOrEqual(0.33);
    }
  });
});

describe('golden remap (CRITIQUE-3 #4)', () => {
  it('yellow bases get the deep metallic gold; others gold; the turtle keeps rose', () => {
    for (const hex of ['#F2D43B', '#F2B93B', '#D9C27A']) expect(goldenKind(hex), hex).toBe('deep');
    for (const hex of ['#3D9BE9', '#C9503A', '#E9DCC4']) expect(goldenKind(hex), hex).toBe('gold'); // cream: no hue
    expect(goldenKind('#E8B23E', 'rose')).toBe('rose');
    expect(GOLDEN_DEEP.body).toBe('#E9A93A');
  });
});

describe('cast lints (CRITIQUE-3: colour identity across the cast)', () => {
  it('CIEDE2000 matches the Sharma et al. reference pairs', () => {
    const pairs: [number[], number[], number][] = [
      [[50, 2.6772, -79.7751], [50, 0, -82.7485], 2.0425],
      [[50, -1.3802, -84.2814], [50, 0, -82.7485], 1.0],
      [[50, 2.49, -0.001], [50, -2.49, 0.0009], 7.1792],
      [[60.2574, -34.0099, 36.2677], [60.4626, -34.1751, 39.4387], 1.2644],
      [[2.0776, 0.0795, -1.135], [0.9033, -0.0636, -0.5514], 0.9082],
    ];
    for (const [p, q, d] of pairs)
      expect(deltaE2000(p as [number, number, number], q as [number, number, number])).toBeCloseTo(d, 3);
    expect(deltaE2000(cielab('#F2D43B'), cielab('#F2D43B'))).toBe(0);
  });
  const e = (id: string, body: string, habitat = 'reef', legendary = false) => ({ id, body, habitat, legendary });
  const rules = (m: Map<string, { rule: string }[]>, id: string) => m.get(id)!.map((i) => i.rule);
  it('C1: shared hex and near-twins (ΔE00 < 6) are flagged on both species', () => {
    const m = validateCast([
      e('a', '#3D9BE9', 'x'),
      e('b', '#3d9be9', 'y'),
      e('c', '#3F9DEA', 'z'),
      e('d', '#C9503A', 'w'),
    ]);
    expect(rules(m, 'a')).toContain('C1');
    expect(rules(m, 'b')).toContain('C1');
    expect(rules(m, 'c')).toContain('C1');
    expect(rules(m, 'd')).toEqual([]);
  });
  it('C2: more than 40 % of a habitat inside 30° of hue is flagged; neutrals sit out', () => {
    // 5 species: ≤ 2 may share a window. Three blues (hue ≈ 250–265°) is one too many.
    const hab = [e('b1', '#3D9BE9'), e('b2', '#4A78E0'), e('b3', '#7C9FD0'), e('r', '#C9503A'), e('g', '#C3CDD6')];
    const m = validateCast(hab);
    for (const id of ['b1', 'b2', 'b3']) expect(rules(m, id), id).toContain('C2');
    expect(rules(m, 'r')).toEqual([]);
    expect(rules(m, 'g')).toEqual([]); // chroma 0.017: no hue to speak of
    expect(validateCast(hab.map((x) => (x.id === 'b3' ? e('b3', '#3BC9A0') : x))).get('b1')).toEqual([]);
  });
  it('C3: a non-legendary within 15° of a legendary hue AND (ΔE00 < 10 or same habitat) is flagged', () => {
    const m = validateCast([e('L', '#714B99', 'legend', true), e('u', '#7D57A3', 'shallows'), e('f', '#3BC9A0')]);
    expect(rules(m, 'u')).toContain('C3');
    expect(rules(m, 'L')).toContain('C3');
    expect(rules(m, 'f')).toEqual([]);
    // CRITIQUE-4: the same hue, but pale (ΔE00 ≥ 10) and elsewhere, keeps its own identity …
    const pale = validateCast([e('L', '#714B99', 'legend', true), e('p', '#B9A2D6', 'shallows')]);
    expect(rules(pale, 'p')).toEqual([]);
    expect(rules(pale, 'L')).toEqual([]);
    // … but not in the legendary's own habitat
    const home = validateCast([e('L', '#714B99', 'legend', true), e('p', '#B9A2D6', 'legend')]);
    expect(rules(home, 'p')).toContain('C3');
  });
  it('the cast has no cast-lint errors (warnings are listed in docs/art/LINT.md)', () => {
    const strict = CAST_LINT_AS_ERRORS || process.env.ART_CAST_STRICT === '1';
    const m = validateCast(castOf(arts, (id) => SPECIES_BY_ID.get(id)));
    for (const [id, issues] of m) expect(failing(issues, strict), id).toEqual([]);
  });
});

describe('motion', () => {
  const a = ART.get('clownfish')!;
  it('keyframes ease between keys and clamp at the ends', () => {
    const k = [
      [0, 0],
      [0.5, 10],
      [1, 0],
    ] as const;
    expect(sample(k, -1)).toBe(0);
    expect(sample(k, 0.5)).toBe(10);
    expect(sample(k, 0.25)).toBe(5);
    expect(sample(k, 2)).toBe(0);
  });
  it('the static pose is the rest pose', () => {
    const p = pose(a, {});
    expect(p.root).toEqual({ tx: 0, ty: 0, rot: 0, sx: 1, sy: 1 });
    expect(p.face.expr).toBe('idle');
    expect(p.shown.size).toBe(0);
  });
  it('blinks every 2.5–6 s for 120 ms', () => {
    const starts: number[] = [];
    let was = false;
    for (let t = 0; t < 120; t += 0.01) {
      const b = blinking(t, 12345);
      if (b && !was) starts.push(t);
      was = b;
    }
    const gaps = starts.slice(1).map((s, i) => s - starts[i]!);
    expect(Math.min(...gaps)).toBeGreaterThanOrEqual(2.45);
    expect(Math.max(...gaps)).toBeLessThanOrEqual(6.05);
  });
  it('signatures recur every 4–8 s and props show only during them', () => {
    let plays = 0;
    let was = false;
    for (let t = 0; t < 60; t += 0.02) {
      const u = signatureProgress(t, 99, a.idle.signature.dur, a.idle.signature.every);
      if (u >= 0 && !was) plays++;
      was = u >= 0;
    }
    expect(plays).toBeGreaterThanOrEqual(6);
    expect(plays).toBeLessThanOrEqual(13);
    expect(pose(a, { t: 0.001, signatureAt: 0.5 }).shown.has('anemone')).toBe(true);
    expect(pose(a, { t: 0.001, signatureAt: 0.5, noSignature: true }).shown.has('anemone')).toBe(true);
  });
  it('size sets tempo: an XS fidgets faster than an L drifts (R24)', () => {
    // the same channel spec, two size classes: count zero crossings of the root bob
    const crossings = (size: 'XS' | 'L') => {
      const art = { ...a, size, idle: { ...a.idle, ambient: [{ m: 'bob', amp: 2, period: 2 }] } } as typeof a;
      let n = 0,
        prev = 0;
      for (let t = 0; t < 20; t += 0.01) {
        const y = pose(art, { t, noSignature: true }).root.ty;
        if (prev < 0 && y >= 0) n++;
        prev = y;
      }
      return n;
    };
    expect(crossings('XS')).toBeGreaterThan(crossings('L') * 1.8);
  });
  it('every expression is reachable and changes only the face + a body transform', () => {
    for (const e of EXPRESSIONS) {
      const p = pose(a, { expression: e });
      expect(p.face.expr).toBe(e);
      for (const xf of p.groups.values()) expect(xf).toEqual({ tx: 0, ty: 0, rot: 0, sx: 1, sy: 1 });
    }
  });
  it('size classes derive from the species size range (R27)', () => {
    expect(sizeClassFor([1, 3])).toBe('XS');
    expect(sizeClassFor([6, 11])).toBe('S');
    expect(sizeClassFor([8, 25])).toBe('M');
    expect(sizeClassFor([60, 120])).toBe('L');
    expect(sizeClassFor([300, 700])).toBe('XL');
    expect(sizeClassFor([800, 1200])).toBe('XXL');
  });
});
