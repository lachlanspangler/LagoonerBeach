/**
 * Pre-rendered pebble sprites (one per color × size × variant) so the per-frame cost of a block is a
 * single drawImage. Cache is invalidated when cell size or DPR changes.
 */
import { GEOM, type Palette } from './theme.ts';
import { LOOKS, type SkinLook } from './skins.ts';

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
  look: SkinLook = LOOKS.pebble!;
  constructor(private dpr: number) {}

  setLook(l: SkinLook): void {
    this.look = l;
  }

  reset(dpr: number): void {
    this.dpr = dpr;
    this.cache.clear();
  }

  pebble(p: Palette, color: number, size: number, variant: Variant = 'normal'): CanvasImageSource {
    const key = `${this.look.id}:${p.name}:${color}:${size}:${variant}`;
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
    const base = this.look.colors[color] ?? '#888888';
    const gut = size * GEOM.gutter;
    const x = gut;
    const y = gut;
    const s = size - gut * 2;
    const r = s * GEOM.cellRadius;
    const style = this.look.style;
    const night = p.name === 'night';
    const rr = (yy: number, hh: number) => {
      g.beginPath();
      g.roundRect(x, yy, s, hh, r);
    };
    // contact shadow (all styles)
    g.fillStyle = night ? 'rgba(0,0,0,0.35)' : 'rgba(80,55,30,0.22)';
    rr(y + s * 0.06, s);
    g.fill();
    if (style === 'glyph') {
      g.fillStyle = base;
      rr(y, s);
      g.fill();
      g.lineWidth = Math.max(1.5, s * 0.06);
      g.strokeStyle = night ? '#FFFFFF' : '#1A1A1A';
      rr(y + g.lineWidth / 2, s - g.lineWidth);
      g.stroke();
      drawGlyph(g, color, x + s / 2, y + s / 2, s * 0.22, luminance(base) < 0.35 ? '#FFFFFF' : '#1A1A1A');
    } else if (style === 'lantern') {
      g.fillStyle = night ? '#3A4357' : '#2B2F3A';
      rr(y, s);
      g.fill();
      g.strokeStyle = shade(base, -0.1);
      g.lineWidth = Math.max(1, s * 0.05);
      rr(y + g.lineWidth / 2, s - g.lineWidth);
      g.stroke();
      const glow = g.createRadialGradient(x + s / 2, y + s * 0.46, 0, x + s / 2, y + s * 0.46, s * 0.55);
      glow.addColorStop(0, '#FFFFFF');
      glow.addColorStop(0.25, base);
      glow.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = glow;
      rr(y, s * 0.92);
      g.fill();
    } else {
      // bottom lip
      g.fillStyle = shade(base, style === 'glass' ? -0.12 : -0.28);
      rr(y, s);
      g.fill();
      // face
      const face = g.createLinearGradient(x, y, x, y + s);
      const hiAmt = variant === 'lit' ? 0.38 : 0.16;
      face.addColorStop(0, shade(base, hiAmt));
      face.addColorStop(1, shade(base, variant === 'lit' ? 0.12 : -0.04));
      g.globalAlpha = style === 'glass' ? 0.9 : 1;
      g.fillStyle = face;
      rr(y, s * 0.9);
      g.fill();
      g.globalAlpha = 1;
      if (style === 'pearl') {
        // iridescent diagonal sheen
        const sh = g.createLinearGradient(x, y + s, x + s, y);
        sh.addColorStop(0.35, 'rgba(255,255,255,0)');
        sh.addColorStop(0.5, 'rgba(255,240,255,0.45)');
        sh.addColorStop(0.62, 'rgba(200,255,250,0.25)');
        sh.addColorStop(0.75, 'rgba(255,255,255,0)');
        g.fillStyle = sh;
        rr(y, s * 0.9);
        g.fill();
      }
      if (style === 'coral') {
        g.fillStyle = shade(base, -0.2);
        for (const [px, py] of [
          [0.3, 0.35],
          [0.62, 0.3],
          [0.48, 0.58],
          [0.72, 0.62],
          [0.28, 0.66],
        ] as const) {
          g.beginPath();
          g.arc(x + s * px, y + s * py, s * 0.045, 0, Math.PI * 2);
          g.fill();
        }
      }
      // top-left highlight
      const hi = g.createRadialGradient(x + s * 0.32, y + s * 0.26, 0, x + s * 0.32, y + s * 0.26, s * 0.55);
      hi.addColorStop(0, `rgba(255,255,255,${style === 'glass' ? 0.6 : 0.55})`);
      hi.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = hi;
      rr(y, s * 0.9);
      g.fill();
      if (style === 'glass') {
        g.strokeStyle = 'rgba(255,255,255,0.85)';
        g.lineWidth = Math.max(1, s * 0.05);
        rr(y + g.lineWidth, s * 0.9 - g.lineWidth * 2);
        g.stroke();
      }
    }
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

/** Six shapes so colors are distinguishable without hue (Glyph skin). */
function drawGlyph(g: CanvasRenderingContext2D, color: number, cx: number, cy: number, r: number, ink: string): void {
  g.fillStyle = ink;
  g.strokeStyle = ink;
  g.lineWidth = r * 0.45;
  g.lineCap = 'round';
  g.beginPath();
  switch (color) {
    case 1:
      g.arc(cx, cy, r, 0, Math.PI * 2);
      g.fill();
      break;
    case 2:
      g.rect(cx - r * 0.85, cy - r * 0.85, r * 1.7, r * 1.7);
      g.fill();
      break;
    case 3:
      g.moveTo(cx, cy - r);
      g.lineTo(cx + r, cy + r * 0.8);
      g.lineTo(cx - r, cy + r * 0.8);
      g.closePath();
      g.fill();
      break;
    case 4:
      g.moveTo(cx - r, cy - r);
      g.lineTo(cx + r, cy + r);
      g.moveTo(cx + r, cy - r);
      g.lineTo(cx - r, cy + r);
      g.stroke();
      break;
    case 5:
      g.moveTo(cx, cy - r * 1.1);
      g.lineTo(cx + r, cy);
      g.lineTo(cx, cy + r * 1.1);
      g.lineTo(cx - r, cy);
      g.closePath();
      g.fill();
      break;
    default:
      g.arc(cx, cy, r, 0, Math.PI * 2);
      g.lineWidth = r * 0.4;
      g.stroke();
  }
}

function luminance(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  const lin = (v: number) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * lin((n >> 16) & 255) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255);
}

export { shade, luminance };
