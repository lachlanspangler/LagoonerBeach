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
  /** Tap-to-place: a tray piece was tapped (selected) or the selection cleared (null). */
  onSelect(slot: number | null): void;
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
  sx: number;
  sy: number;
  moved: boolean;
  start: number;
  anchor: { x: number; y: number } | null;
}

/** Snap search radius in cells and hysteresis band. */
// Generous: hovering ~¾ cell off over an occupied cell should still show the nearest legal ghost.
const MAGNET = 0.95;

const HYSTERESIS = 0.62;
/** A press shorter/smaller than this on a tray piece is a tap (select), not a drag. */
const TAP_MS = 280;
const TAP_SLOP = 8;

export class DragController {
  private a: Active | null = null;
  /** Tap-to-place selection (accessibility path; dragging stays primary). */
  private sel: { slot: number; anchor: { x: number; y: number } | null } | null = null;

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
    if (this.sel && !t) {
      e.preventDefault();
      this.boardTap(px, py);
      return;
    }
    if (!t || s.over) return;
    e.preventDefault();
    const piece = pieceById(t.pieceId);
    // grab offset: where on the (tray-scale) piece the finger landed, clamped onto the piece
    const sl = l.slots[slot]!;
    const ox = sl.cx - (piece.w * l.trayCell) / 2;
    const oy = sl.cy - (piece.h * l.trayCell) / 2;
    const gx = Math.max(0, Math.min(piece.w, (px - ox) / l.trayCell));
    const gy = Math.max(0, Math.min(piece.h, (py - oy) / l.trayCell));
    this.a = {
      pointerId: e.pointerId,
      slot,
      piece,
      gx,
      gy,
      px,
      py,
      sx: px,
      sy: py,
      moved: false,
      start: performance.now(),
      anchor: null,
    };
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
    if (!a.moved && Math.hypot(a.px - a.sx, a.py - a.sy) > TAP_SLOP) {
      a.moved = true;
      if (this.sel) this.clearSel();
    }
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
    if (!this.host.enabled()) {
      // a dialog opened mid-drag (e.g. second finger on the menu): never commit behind it
      this.cancelAll();
      return;
    }
    this.a = null;
    const l = this.host.layout();
    const [ox, oy] = this.origin(a);
    if (!a.moved && performance.now() - a.start < TAP_MS) {
      // a tap: toggle selection instead of dropping
      const again = this.sel?.slot === a.slot;
      this.sel = again ? null : { slot: a.slot, anchor: null };
      this.host.onSelect(this.sel ? a.slot : null);
      return;
    }

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

  get selected(): number | null {
    return this.sel?.slot ?? null;
  }

  clearSel(): void {
    if (!this.sel) return;
    this.sel = null;
    this.host.onSelect(null);
  }

  /** With a piece selected: first tap previews (piece centered on the tapped cell), second confirms. */
  private boardTap(px: number, py: number): void {
    const sel = this.sel!;
    const l = this.host.layout();
    const s = this.host.state();
    const t = s.tray[sel.slot];
    if (!t) return this.clearSel();
    const piece = pieceById(t.pieceId);
    const cx = Math.floor((px - l.board.x) / l.cell);
    const cy = Math.floor((py - l.board.y) / l.cell);
    if (cx < 0 || cy < 0 || cx >= N || cy >= N) return this.clearSel();
    const fx = cx - (piece.w - 1) / 2;
    const fy = cy - (piece.h - 1) / 2;
    const fake = { piece, anchor: null } as unknown as Active;
    const anchor = this.snap(s, fake, fx, fy);
    if (anchor && sel.anchor && anchor.x === sel.anchor.x && anchor.y === sel.anchor.y) {
      this.sel = null;
      this.host.onSelect(null);
      this.host.onDrop(
        sel.slot,
        { slot: sel.slot, x: anchor.x, y: anchor.y },
        { x: l.board.x + anchor.x * l.cell, y: l.board.y + anchor.y * l.cell },
        true,
      );
      return;
    }
    sel.anchor = anchor;
    this.host.onHover(sel.slot, 0, 0, anchor);
  }

  cancelAll = (): void => {
    const a = this.a;
    if (!a) return;
    this.a = null;
    const [ox, oy] = this.origin(a);
    this.host.onCancel(a.slot, { x: ox, y: oy });
  };
}
