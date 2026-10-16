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
  /**
   * The strip between the board and the tray: reef progress and chips (lessons, reef of the day,
   * welcome back) live here, so they never cover the HUD's COMBO badge or the board.
   */
  readonly strip: Rect;
  readonly tray: Rect;
  /** Centers of the three tray slots. */
  readonly slots: readonly { cx: number; cy: number; w: number; h: number }[];
  readonly trayCell: number;
  readonly lift: number;
}

/** Tray block height in board cells (`trayCellFor` shrinks the rare 4–5-tall piece to fit). */
const TRAY_CELLS = 3.6;
/** Minimum strip between board and tray, in cells. */
const GAP_CELLS = 0.6;

export function computeLayout(w: number, h: number, inset: Insets = { top: 0, right: 0, bottom: 0, left: 0 }): Layout {
  const usableW = w - inset.left - inset.right;
  const usableH = h - inset.top - inset.bottom;
  const margin = Math.max(10, Math.round(usableW * 0.03));
  // HUD: score, best line, COMBO slot (UI_DESIGN §9.1)
  const hudH = Math.min(116, Math.max(78, usableH * 0.118));
  const maxBoardByW = usableW - margin * 2;
  const maxBoardByH = ((usableH - hudH - margin) * N) / (N + GAP_CELLS + TRAY_CELLS);
  const boardSize = Math.floor(Math.min(maxBoardByW, maxBoardByH, 560) / N) * N;
  const cell = boardSize / N;
  const stackH = boardSize + cell * (GAP_CELLS + TRAY_CELLS);
  const slack = Math.max(0, usableH - hudH - margin - stackH);
  const bx = Math.round(inset.left + (usableW - boardSize) / 2);
  // Spare height reads top-to-bottom: status → board → strip → hand. A little above the board
  // (room for callouts), a strip between board and tray, and the hand pulled down toward the thumb:
  // the old layout left ~22% of a tall phone as dead sand under the tray.
  const above = Math.min(slack * 0.3, cell * 1.3);
  const below = Math.min(slack * 0.22, cell * 1.0);
  const between = slack - above - below;
  const by = Math.round(inset.top + hudH + above);
  const boardBottom = by + boardSize;
  const trayY = Math.round(boardBottom + cell * GAP_CELLS + between);
  const trayH = cell * TRAY_CELLS;
  // tall phones: the hand grows a little (bigger thumb targets) instead of floating in empty sand
  const trayCell = Math.round(cell * Math.min(0.82, GEOM.trayScale + (slack / cell) * 0.025));
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
  // the strip spans the gap plus the tray's empty top band (pieces are centered in 4 cells)
  const stripH = Math.max(cell * 0.9, trayY - boardBottom + cell * 0.25);
  return {
    w,
    h,
    board: { x: bx, y: by, w: boardSize, h: boardSize },
    cell,
    hud: { x: inset.left, y: inset.top, w: usableW, h: hudH },
    strip: { x: bx, y: boardBottom, w: boardSize, h: stripH },
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

/** Cell size for a piece sitting in a tray slot: the tray scale, shrunk if the piece wouldn't fit. */
export function trayCellFor(l: Layout, p: { w: number; h: number }): number {
  const s = l.slots[0]!;
  return Math.min(l.trayCell, (s.w * 0.9) / p.w, (s.h * 0.86) / p.h);
}
