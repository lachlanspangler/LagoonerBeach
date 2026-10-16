/**
 * Pre-rendered pebble sprites (one per color × size × variant) so the per-frame cost of a block is a
 * single drawImage. Cache is invalidated when cell size or DPR changes.
 */
import { GEOM, type Palette } from './theme.ts';

export type Variant = 'normal' | 'lit';

function shade(hex: string, amt: number): string {
  const n = parseInt(hex.slice(1), 16);
  const ch = (v: number) => Math.max(0, Math.min(255, Math.round(amt >= 0 ? v + (255 - v) * amt : v * (1 + amt))));
  const r = ch((n >> 16) & 255);
  const g = ch((n >> 8) & 255);
  const b = ch(n & 255);
  return `rgb(${r},${g},${b})`;
}

export class SpriteCache {
  private cache = new Map<string, HTMLCanvasElement | OffscreenCanvas>();
  constructor(private dpr: number) {}

  reset(dpr: number): void {
    this.dpr = dpr;
    this.cache.clear();
  }

  pebble(p: Palette, color: number, size: number, variant: Variant = 'normal'): CanvasImageSource {
    const key = `${p.name}:${color}:${size}:${variant}`;
    let c = this.cache.get(key);
    if (!c) {
      c = this.drawPebble(p, color, size, variant);
      this.cache.set(key, c);
    }
    return c;
  }

  private canvas(px: number): HTMLCanvasElement | OffscreenCanvas {
    if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(px, px);
    const c = document.createElement('canvas');
    c.width = px;
    c.height = px;
    return c;
  }

  /** Sprite covers the full cell (size × size CSS px) including gutter and shadow padding. */
  private drawPebble(p: Palette, color: number, size: number, variant: Variant): HTMLCanvasElement | OffscreenCanvas {
    const px = Math.ceil(size * this.dpr);
    const c = this.canvas(px);
    const g = c.getContext('2d') as CanvasRenderingContext2D;
    g.scale(this.dpr, this.dpr);
    const base = p.pebbles[color] ?? '#888888';
    const gut = size * GEOM.gutter;
    const x = gut;
    const y = gut;
    const s = size - gut * 2;
    const r = s * GEOM.cellRadius;
    // contact shadow
    g.fillStyle = p.name === 'night' ? 'rgba(0,0,0,0.35)' : 'rgba(80,55,30,0.22)';
    g.beginPath();
    g.roundRect(x, y + s * 0.06, s, s, r);
    g.fill();
    // bottom lip
    g.fillStyle = shade(base, -0.28);
    g.beginPath();
    g.roundRect(x, y, s, s, r);
    g.fill();
    // face
    const face = g.createLinearGradient(x, y, x, y + s);
    face.addColorStop(0, shade(base, variant === 'lit' ? 0.38 : 0.16));
    face.addColorStop(1, shade(base, variant === 'lit' ? 0.12 : -0.04));
    g.fillStyle = face;
    g.beginPath();
    g.roundRect(x, y, s, s * 0.9, r);
    g.fill();
    // top-left highlight
    const hi = g.createRadialGradient(x + s * 0.32, y + s * 0.26, 0, x + s * 0.32, y + s * 0.26, s * 0.55);
    hi.addColorStop(0, 'rgba(255,255,255,0.55)');
    hi.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = hi;
    g.beginPath();
    g.roundRect(x, y, s, s * 0.9, r);
    g.fill();
    if (variant === 'lit') {
      g.strokeStyle = p.ringOutline;
      g.lineWidth = Math.max(1.5, s * 0.07);
      g.beginPath();
      g.roundRect(x + g.lineWidth / 2, y + g.lineWidth / 2, s - g.lineWidth, s * 0.9 - g.lineWidth, r);
      g.stroke();
    }
    return c;
  }
}

export { shade };
