/**
 * Tiny SVG path-data toolkit (pure, no DOM): parse `d` strings, count segments, flatten to
 * polygons, bounds, and a nonzero-winding rasteriser for silhouette masks. The renderer uses
 * `new Path2D(d)`; this file lets tests and tools reason about the same data without a canvas.
 */

export type Seg =
  | { readonly c: 'M'; readonly p: readonly [number, number] }
  | { readonly c: 'L'; readonly p: readonly [number, number] }
  | { readonly c: 'C'; readonly p: readonly [number, number, number, number, number, number] }
  | { readonly c: 'Q'; readonly p: readonly [number, number, number, number] }
  | { readonly c: 'Z' };

export interface Parsed {
  /** Absolute segments (H/V → L, S/T expanded, A → cubics). */
  readonly segs: readonly Seg[];
  /** Drawing commands as authored (everything except M and Z), arcs counted once. */
  readonly drawCount: number;
  /** Most segments in any one subpath (R2: a closed path has ≤ 24). */
  readonly maxSubpath: number;
}

const ARGS: Record<string, number> = { M: 2, L: 2, H: 1, V: 1, C: 6, S: 4, Q: 4, T: 2, A: 7, Z: 0 };

export function parsePath(d: string): Parsed {
  const tokens = d.match(/[a-zA-Z]|[-+]?(?:\d*\.\d+|\d+\.?)(?:[eE][-+]?\d+)?/g) ?? [];
  const segs: Seg[] = [];
  let i = 0;
  let cmd = '';
  let x = 0,
    y = 0,
    sx = 0,
    sy = 0;
  let lcx = 0,
    lcy = 0,
    lq: 'C' | 'Q' | '' = '';
  let draws = 0,
    sub = 0,
    maxSub = 0;
  const num = () => {
    const t = tokens[i++];
    if (t === undefined || /[a-zA-Z]/.test(t)) throw new Error(`path: expected number in "${d.slice(0, 40)}…"`);
    return +t;
  };
  while (i < tokens.length) {
    const t = tokens[i]!;
    if (/[a-zA-Z]/.test(t)) {
      cmd = t;
      i++;
      if (!(cmd.toUpperCase() in ARGS)) throw new Error(`path: unknown command ${cmd}`);
    } else if (!cmd) throw new Error('path: must start with a command');
    const C = cmd.toUpperCase();
    const rel = cmd !== C;
    if (C === 'Z') {
      segs.push({ c: 'Z' });
      x = sx;
      y = sy;
      lq = '';
      // a Z followed by numbers is malformed; let the next loop iteration complain
      if (i < tokens.length && !/[a-zA-Z]/.test(tokens[i]!)) throw new Error('path: numbers after Z');
      continue;
    }
    const ox = rel ? x : 0;
    const oy = rel ? y : 0;
    switch (C) {
      case 'M': {
        x = ox + num();
        y = oy + num();
        sx = x;
        sy = y;
        sub = 0;
        segs.push({ c: 'M', p: [x, y] });
        cmd = rel ? 'l' : 'L'; // implicit lineto after the first pair
        lq = '';
        break;
      }
      case 'L':
      case 'H':
      case 'V': {
        if (C === 'L') {
          x = ox + num();
          y = oy + num();
        } else if (C === 'H') x = ox + num();
        else y = oy + num();
        segs.push({ c: 'L', p: [x, y] });
        draws++;
        maxSub = Math.max(maxSub, ++sub);
        lq = '';
        break;
      }
      case 'C':
      case 'S': {
        let x1: number, y1: number;
        if (C === 'C') {
          x1 = ox + num();
          y1 = oy + num();
        } else {
          x1 = lq === 'C' ? 2 * x - lcx : x;
          y1 = lq === 'C' ? 2 * y - lcy : y;
        }
        const x2 = ox + num(),
          y2 = oy + num(),
          ex = ox + num(),
          ey = oy + num();
        segs.push({ c: 'C', p: [x1, y1, x2, y2, ex, ey] });
        lcx = x2;
        lcy = y2;
        lq = 'C';
        x = ex;
        y = ey;
        draws++;
        maxSub = Math.max(maxSub, ++sub);
        break;
      }
      case 'Q':
      case 'T': {
        let qx: number, qy: number;
        if (C === 'Q') {
          qx = ox + num();
          qy = oy + num();
        } else {
          qx = lq === 'Q' ? 2 * x - lcx : x;
          qy = lq === 'Q' ? 2 * y - lcy : y;
        }
        const ex = ox + num(),
          ey = oy + num();
        segs.push({ c: 'Q', p: [qx, qy, ex, ey] });
        lcx = qx;
        lcy = qy;
        lq = 'Q';
        x = ex;
        y = ey;
        draws++;
        maxSub = Math.max(maxSub, ++sub);
        break;
      }
      case 'A': {
        const rx = num(),
          ry = num(),
          rot = num(),
          large = num(),
          sweep = num(),
          ex = ox + num(),
          ey = oy + num();
        for (const c of arcToCubics(x, y, ex, ey, rx, ry, rot, large !== 0, sweep !== 0)) segs.push(c);
        x = ex;
        y = ey;
        lq = '';
        draws++;
        maxSub = Math.max(maxSub, ++sub);
        break;
      }
    }
  }
  if (!segs.length || segs[0]!.c !== 'M') throw new Error('path: must start with M');
  return { segs, drawCount: draws, maxSubpath: maxSub };
}

/** SVG arc (endpoint parameterisation) → cubic béziers (SVG 1.1 F.6.5). */
function arcToCubics(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  rx: number,
  ry: number,
  rotDeg: number,
  large: boolean,
  sweep: boolean,
): Seg[] {
  if (rx === 0 || ry === 0 || (x1 === x2 && y1 === y2)) return [{ c: 'L', p: [x2, y2] }];
  rx = Math.abs(rx);
  ry = Math.abs(ry);
  const phi = (rotDeg * Math.PI) / 180;
  const cos = Math.cos(phi),
    sin = Math.sin(phi);
  const dx = (x1 - x2) / 2,
    dy = (y1 - y2) / 2;
  const x1p = cos * dx + sin * dy;
  const y1p = -sin * dx + cos * dy;
  const lam = (x1p * x1p) / (rx * rx) + (y1p * y1p) / (ry * ry);
  if (lam > 1) {
    rx *= Math.sqrt(lam);
    ry *= Math.sqrt(lam);
  }
  const num = rx * rx * ry * ry - rx * rx * y1p * y1p - ry * ry * x1p * x1p;
  const den = rx * rx * y1p * y1p + ry * ry * x1p * x1p;
  let k = Math.sqrt(Math.max(0, num / den));
  if (large === sweep) k = -k;
  const cxp = (k * rx * y1p) / ry;
  const cyp = (-k * ry * x1p) / rx;
  const cx = cos * cxp - sin * cyp + (x1 + x2) / 2;
  const cy = sin * cxp + cos * cyp + (y1 + y2) / 2;
  const ang = (ux: number, uy: number, vx: number, vy: number) => {
    const a = Math.atan2(ux * vy - uy * vx, ux * vx + uy * vy);
    return a;
  };
  const t1 = ang(1, 0, (x1p - cxp) / rx, (y1p - cyp) / ry);
  let dt = ang((x1p - cxp) / rx, (y1p - cyp) / ry, (-x1p - cxp) / rx, (-y1p - cyp) / ry);
  if (!sweep && dt > 0) dt -= 2 * Math.PI;
  else if (sweep && dt < 0) dt += 2 * Math.PI;
  const n = Math.max(1, Math.ceil(Math.abs(dt) / (Math.PI / 2)));
  const step = dt / n;
  const kk = (4 / 3) * Math.tan(step / 4);
  const out: Seg[] = [];
  const pt = (t: number): [number, number] => [
    cx + rx * Math.cos(t) * cos - ry * Math.sin(t) * sin,
    cy + rx * Math.cos(t) * sin + ry * Math.sin(t) * cos,
  ];
  const dp = (t: number): [number, number] => [
    -rx * Math.sin(t) * cos - ry * Math.cos(t) * sin,
    -rx * Math.sin(t) * sin + ry * Math.cos(t) * cos,
  ];
  for (let s = 0; s < n; s++) {
    const a = t1 + s * step,
      b = a + step;
    const [ax, ay] = pt(a),
      [bx, by] = pt(b);
    const [dax, day] = dp(a),
      [dbx, dby] = dp(b);
    out.push({ c: 'C', p: [ax + kk * dax, ay + kk * day, bx - kk * dbx, by - kk * dby, bx, by] });
  }
  return out;
}

export type Poly = number[]; // flat [x0,y0,x1,y1,…], implicitly closed

/** Flatten to closed polygons (one per subpath). `steps` samples per curve. */
export function flatten(p: Parsed | string, steps = 12): Poly[] {
  const segs = typeof p === 'string' ? parsePath(p).segs : p.segs;
  const polys: Poly[] = [];
  let cur: Poly = [];
  let x = 0,
    y = 0;
  for (const s of segs) {
    if (s.c === 'M') {
      if (cur.length >= 6) polys.push(cur);
      cur = [s.p[0], s.p[1]];
      x = s.p[0];
      y = s.p[1];
    } else if (s.c === 'L') {
      cur.push(s.p[0], s.p[1]);
      x = s.p[0];
      y = s.p[1];
    } else if (s.c === 'C') {
      const [x1, y1, x2, y2, ex, ey] = s.p;
      for (let k = 1; k <= steps; k++) {
        const t = k / steps,
          u = 1 - t;
        cur.push(
          u * u * u * x + 3 * u * u * t * x1 + 3 * u * t * t * x2 + t * t * t * ex,
          u * u * u * y + 3 * u * u * t * y1 + 3 * u * t * t * y2 + t * t * t * ey,
        );
      }
      x = ex;
      y = ey;
    } else if (s.c === 'Q') {
      const [qx, qy, ex, ey] = s.p;
      for (let k = 1; k <= steps; k++) {
        const t = k / steps,
          u = 1 - t;
        cur.push(u * u * x + 2 * u * t * qx + t * t * ex, u * u * y + 2 * u * t * qy + t * t * ey);
      }
      x = ex;
      y = ey;
    } else {
      if (cur.length >= 6) polys.push(cur);
      cur = [x, y];
    }
  }
  if (cur.length >= 6) polys.push(cur);
  return polys;
}

export interface Box {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

export function boundsOf(polys: readonly Poly[]): Box {
  let x0 = Infinity,
    y0 = Infinity,
    x1 = -Infinity,
    y1 = -Infinity;
  for (const p of polys)
    for (let i = 0; i < p.length; i += 2) {
      x0 = Math.min(x0, p[i]!);
      x1 = Math.max(x1, p[i]!);
      y0 = Math.min(y0, p[i + 1]!);
      y1 = Math.max(y1, p[i + 1]!);
    }
  if (x0 === Infinity) return { x: 0, y: 0, w: 0, h: 0 };
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}

export const unionBox = (a: Box, b: Box): Box => {
  if (!a.w && !a.h) return b;
  if (!b.w && !b.h) return a;
  const x = Math.min(a.x, b.x),
    y = Math.min(a.y, b.y);
  return { x, y, w: Math.max(a.x + a.w, b.x + b.w) - x, h: Math.max(a.y + a.h, b.y + b.h) - y };
};

/** Signed area (positive = clockwise in screen coordinates, y down). */
export function polyArea(p: Poly): number {
  let a = 0;
  for (let i = 0, n = p.length; i < n; i += 2) {
    const j = (i + 2) % n;
    a += p[i]! * p[j + 1]! - p[j]! * p[i + 1]!;
  }
  return a / 2;
}

/** Nonzero winding of a point against one shape's polygons. */
export function inside(polys: readonly Poly[], px: number, py: number): boolean {
  let w = 0;
  for (const p of polys)
    for (let i = 0, n = p.length; i < n; i += 2) {
      const x0 = p[i]!,
        y0 = p[i + 1]!,
        x1 = p[(i + 2) % n]!,
        y1 = p[(i + 3) % n]!;
      if (y0 <= py) {
        if (y1 > py && (x1 - x0) * (py - y0) - (px - x0) * (y1 - y0) > 0) w++;
      } else if (y1 <= py && (x1 - x0) * (py - y0) - (px - x0) * (y1 - y0) < 0) w--;
    }
  return w !== 0;
}

/**
 * Coverage mask of the union of shapes: `n×n` cells, each `cell` units wide, top-left at (ox, oy),
 * `ss×ss` subsamples per cell. Values 0..1.
 */
export function rasterize(
  shapes: readonly (readonly Poly[])[],
  ox: number,
  oy: number,
  cell: number,
  n: number,
  ss = 3,
): Float32Array {
  const out = new Float32Array(n * n);
  const boxes = shapes.map(boundsOf);
  for (let r = 0; r < n; r++)
    for (let c = 0; c < n; c++) {
      let hit = 0;
      for (let a = 0; a < ss; a++)
        for (let b = 0; b < ss; b++) {
          const px = ox + (c + (b + 0.5) / ss) * cell;
          const py = oy + (r + (a + 0.5) / ss) * cell;
          for (let k = 0; k < shapes.length; k++) {
            const bx = boxes[k]!;
            if (px < bx.x || py < bx.y || px > bx.x + bx.w || py > bx.y + bx.h) continue;
            if (inside(shapes[k]!, px, py)) {
              hit++;
              break;
            }
          }
        }
      out[r * n + c] = hit / (ss * ss);
    }
  return out;
}

/** Soft intersection-over-union of two equally sized coverage masks. */
export function iou(a: Float32Array, b: Float32Array): number {
  let i = 0,
    u = 0;
  for (let k = 0; k < a.length; k++) {
    i += Math.min(a[k]!, b[k]!);
    u += Math.max(a[k]!, b[k]!);
  }
  return u ? i / u : 0;
}
