/** Resolution-independent layout in CSS pixels, recomputed on resize. */
import { N } from '../core/grid.ts';
import { GEOM } from './theme.ts';

export interface Insets {
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
  readonly left: number;
}

export interface Rect {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

export interface Layout {
  readonly w: number;
  readonly h: number;
  readonly board: Rect;
  readonly cell: number;
  readonly hud: Rect;
  readonly tray: Rect;
  /** Centers of the three tray slots. */
  readonly slots: readonly { cx: number; cy: number; w: number; h: number }[];
  readonly trayCell: number;
  readonly lift: number;
}

export function computeLayout(w: number, h: number, inset: Insets = { top: 0, right: 0, bottom: 0, left: 0 }): Layout {
  const usableW = w - inset.left - inset.right;
  const usableH = h - inset.top - inset.bottom;
  const margin = Math.max(12, Math.round(usableW * 0.045));
  const hudH = Math.min(120, Math.max(72, usableH * 0.12));
  // stack = board + gap + tray block (≈3.4 cells); fit it, then center it in the space left
  const TRAY_CELLS = 3.4;
  const GAP_CELLS = 0.5;
  const maxBoardByW = usableW - margin * 2;
  const maxBoardByH = ((usableH - hudH - margin) * N) / (N + GAP_CELLS + TRAY_CELLS);
  const boardSize = Math.floor(Math.min(maxBoardByW, maxBoardByH, 560) / N) * N;
  const cell = boardSize / N;
  const stackH = boardSize + cell * (GAP_CELLS + TRAY_CELLS);
  const slack = Math.max(0, usableH - hudH - margin - stackH);
  const bx = Math.round(inset.left + (usableW - boardSize) / 2);
  const by = Math.round(inset.top + hudH + slack * 0.42);
  const trayY = by + boardSize + Math.round(cell * GAP_CELLS);
  const trayH = cell * TRAY_CELLS;
  const trayCell = Math.round(cell * GEOM.trayScale);
  // tray spans the board (a little wider on phones for big hit areas), never the whole tablet
  const span = Math.min(usableW, boardSize * 1.12);
  const slotW = span / 3;
  const sx = inset.left + (usableW - span) / 2;
  const slots = [0, 1, 2].map((i) => ({
    cx: sx + slotW * (i + 0.5),
    cy: trayY + trayH / 2,
    w: slotW,
    h: trayH,
  }));
  return {
    w,
    h,
    board: { x: bx, y: by, w: boardSize, h: boardSize },
    cell,
    hud: { x: inset.left, y: inset.top, w: usableW, h: hudH },
    tray: { x: inset.left, y: trayY, w: usableW, h: trayH },
    slots,
    trayCell,
    lift: cell * GEOM.liftCells,
  };
}

/** Cell index under a CSS-pixel point, or -1. */
export function cellAt(l: Layout, px: number, py: number): number {
  const x = Math.floor((px - l.board.x) / l.cell);
  const y = Math.floor((py - l.board.y) / l.cell);
  return x >= 0 && y >= 0 && x < N && y < N ? y * N + x : -1;
}

/** Index of tray slot under a point, or -1. Generous hit area (the whole slot column). */
export function slotAt(l: Layout, px: number, py: number): number {
  if (py < l.tray.y - l.cell * 0.3) return -1;
  for (let i = 0; i < 3; i++) if (Math.abs(px - l.slots[i]!.cx) <= l.slots[i]!.w / 2) return i;
  return -1;
}
