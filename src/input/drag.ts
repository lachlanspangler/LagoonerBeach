/**
 * Drag-and-drop controller. Pointer movement only updates a transient drag model; the game state
 * is touched once, on release. Implements: grab offset, lift above the finger, snap to the nearest
 * legal anchor with a little magnetism, hysteresis against flicker, and robust cancellation.
 */
import { N } from '../core/grid.ts';
import { pieceById, type Piece } from '../core/pieces.ts';
import type { GameState, Move } from '../core/game.ts';
import { canPlace } from '../core/rules.ts';
import { slotAt, type Layout } from '../render/layout.ts';
import { MOTION } from '../render/theme.ts';

export interface DragHost {
  layout(): Layout;
  state(): GameState;
  /** Whether input is accepted right now (e.g. not behind a menu). */
  enabled(): boolean;
  onPick(slot: number): void;
  /** Called on every move with the current snapped anchor (or null). */
  onHover(slot: number, x: number, y: number, anchor: { x: number; y: number } | null): void;
  /** Release. `move` is null when the drop is not legal; from = piece top-left in CSS px. */
  onDrop(slot: number, move: Move | null, from: { x: number; y: number }, overBoard: boolean): void;
  onCancel(slot: number, from: { x: number; y: number }): void;
}

interface Active {
  pointerId: number;
  slot: number;
  piece: Piece;
  /** Grab offset in board-cell units (which part of the piece the finger holds). */
  gx: number;
  gy: number;
  px: number;
  py: number;
  start: number;
  anchor: { x: number; y: number } | null;
}

/** Snap search radius in cells and hysteresis band. */
const MAGNET = 0.62;
const HYSTERESIS = 0.62;

export class DragController {
  private a: Active | null = null;

  constructor(
    private readonly el: HTMLElement,
    private readonly host: DragHost,
  ) {
    el.addEventListener('pointerdown', this.down, { passive: false });
    el.addEventListener('pointermove', this.move, { passive: false });
    el.addEventListener('pointerup', this.up, { passive: false });
    el.addEventListener('pointercancel', this.cancel);
    el.addEventListener('lostpointercapture', this.lost);
    window.addEventListener('blur', this.cancelAll);
    document.addEventListener('visibilitychange', this.cancelAll);
  }

  get active(): boolean {
    return this.a !== null;
  }

  /** Current piece top-left (CSS px) and growth for the renderer. */
  view(now: number): { slot: number; x: number; y: number; grow: number } | null {
    const a = this.a;
    if (!a) return null;
    const [x, y] = this.origin(a);
    return { slot: a.slot, x, y, grow: Math.min(1, (now - a.start) / MOTION.pickUp) };
  }

  private origin(a: Active): [number, number] {
    const l = this.host.layout();
    return [a.px - a.gx * l.cell, a.py - a.gy * l.cell - l.lift];
  }

  private down = (e: PointerEvent): void => {
    if (this.a || !this.host.enabled() || !e.isPrimary) return;
    const l = this.host.layout();
    const r = this.el.getBoundingClientRect();
    const px = e.clientX - r.left;
    const py = e.clientY - r.top;
    const slot = slotAt(l, px, py);
    const s = this.host.state();
    const t = slot >= 0 ? s.tray[slot] : null;
    if (!t || s.over) return;
    e.preventDefault();
    const piece = pieceById(t.pieceId);
    // grab offset: where on the (tray-scale) piece the finger landed, clamped onto the piece
    const sl = l.slots[slot]!;
    const ox = sl.cx - (piece.w * l.trayCell) / 2;
    const oy = sl.cy - (piece.h * l.trayCell) / 2;
    const gx = Math.max(0, Math.min(piece.w, (px - ox) / l.trayCell));
    const gy = Math.max(0, Math.min(piece.h, (py - oy) / l.trayCell));
    this.a = { pointerId: e.pointerId, slot, piece, gx, gy, px, py, start: performance.now(), anchor: null };
    try {
      this.el.setPointerCapture(e.pointerId);
    } catch {
      /* synthetic events in tests may not support capture */
    }
    this.host.onPick(slot);
    this.update();
  };

  private move = (e: PointerEvent): void => {
    const a = this.a;
    if (!a || e.pointerId !== a.pointerId) return;
    e.preventDefault();
    const r = this.el.getBoundingClientRect();
    // use coalesced events' last point for lowest latency
    a.px = e.clientX - r.left;
    a.py = e.clientY - r.top;
    this.update();
  };

  private update(): void {
    const a = this.a!;
    const l = this.host.layout();
    const s = this.host.state();
    const [ox, oy] = this.origin(a);
    const fx = (ox - l.board.x) / l.cell;
    const fy = (oy - l.board.y) / l.cell;
    a.anchor = this.snap(s, a, fx, fy);
    this.host.onHover(a.slot, ox, oy, a.anchor);
  }

  /** Nearest legal anchor to the fractional position, keeping the current one when close enough. */
  private snap(s: GameState, a: Active, fx: number, fy: number): { x: number; y: number } | null {
    const legal = (x: number, y: number) => canPlace(s.board, a.piece, x, y);
    const cur = a.anchor;
    if (cur && Math.abs(cur.x - fx) < HYSTERESIS && Math.abs(cur.y - fy) < HYSTERESIS && legal(cur.x, cur.y))
      return cur;
    let best: { x: number; y: number } | null = null;
    let bd = Infinity;
    const x0 = Math.round(fx);
    const y0 = Math.round(fy);
    for (let y = y0 - 1; y <= y0 + 1; y++)
      for (let x = x0 - 1; x <= x0 + 1; x++) {
        if (x < 0 || y < 0 || x + a.piece.w > N || y + a.piece.h > N) continue;
        const d = Math.hypot(x - fx, y - fy);
        if (d < bd && d <= MAGNET + (x === x0 && y === y0 ? 0.5 : 0) && legal(x, y)) {
          bd = d;
          best = { x, y };
        }
      }
    return best;
  }

  private up = (e: PointerEvent): void => {
    const a = this.a;
    if (!a || e.pointerId !== a.pointerId) return;
    e.preventDefault();
    this.a = null;
    const l = this.host.layout();
    const [ox, oy] = this.origin(a);
    const cx = ox + (a.piece.w * l.cell) / 2;
    const cy = oy + (a.piece.h * l.cell) / 2;
    const overBoard = cx > l.board.x && cx < l.board.x + l.board.w && cy > l.board.y && cy < l.board.y + l.board.h;
    const move = a.anchor ? { slot: a.slot, x: a.anchor.x, y: a.anchor.y } : null;
    this.host.onDrop(a.slot, move, { x: ox, y: oy }, overBoard);
  };

  private cancel = (e: PointerEvent): void => {
    if (this.a && e.pointerId === this.a.pointerId) this.cancelAll();
  };

  private lost = (e: PointerEvent): void => {
    // capture lost without an up (e.g. system gesture): treat as cancel
    if (this.a && e.pointerId === this.a.pointerId)
      queueMicrotask(() => this.a && this.a.pointerId === e.pointerId && this.cancelAll());
  };

  cancelAll = (): void => {
    const a = this.a;
    if (!a) return;
    this.a = null;
    const [ox, oy] = this.origin(a);
    this.host.onCancel(a.slot, { x: ox, y: oy });
  };
}
