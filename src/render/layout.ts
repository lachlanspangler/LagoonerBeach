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
  let above = Math.min(slack * 0.3, cell * 1.3);
  const below = Math.min(slack * 0.22, cell * 1.0); // under the tray (implicit: what's left)
  // (UX S3: 1.9 cells left ~130 px of sand between board and hand on a 390×844 phone; 1.6 lifts the
  // hand a little while keeping it within thumb reach — layout.test pins the bottom gap)
  const between = Math.min(slack - above - below, cell * 1.6);
  // tablets: whatever is left centers the whole stack instead of opening a canyon in the middle
  const rest = slack - above - below - between;
  above += rest / 2;
  const by = Math.round(inset.top + hudH + above);
  const boardBottom = by + boardSize;
  const trayY = Math.round(boardBottom + cell * GAP_CELLS + between);
  const trayH = cell * TRAY_CELLS;
  // tall phones: the hand grows a little (bigger thumb targets) instead of floating in empty sand
  const trayCell = Math.round(cell * Math.min(0.82, GEOM.trayScale + (slack / cell) * 0.025));
  // tray spans the board (a little wider on phones for big hit areas), never the whole tablet
  const span = Math.min(usableW - margin * 2 + 8, boardSize * 1.12);
  const slotW = span / 3;
  const sx = inset.left + (usableW - span) / 2;
  const slots = [0, 1, 2].map((i) => ({
    cx: sx + slotW * (i + 0.5),
    cy: trayY + trayH * 0.46,
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

/** The HUD stack: score, best line, COMBO slot (all CSS px; y values are text baselines / centers). */
export interface HudStack {
  /** Score font px and baseline. */
  readonly big: number;
  readonly scoreY: number;
  /** Best-line font px and baseline. */
  readonly lab: number;
  readonly bestY: number;
  /** COMBO badge center, and the half-height reserved for the biggest (×20) badge. */
  readonly badgeY: number;
  readonly badgeHalf: number;
  /** Tablet scale of the stack (1 on phones). */
  readonly k: number;
}

/** Cap height of Nunito heavy, as a fraction of the font size (digits and caps). */
export const CAP = 0.72;
/** How far the score's thousands comma hangs below the baseline, per px of score size. */
const COMMA = 0.12;
/** Half the visual height of the outlined ×20 badge per px of badge size. */
const BADGE_HALF = 0.5;
/** Biggest COMBO step's size in cells (moments.ts ×20). */
const BADGE_MAX = 0.68;

/**
 * Lays the HUD stack out from the bottom up so it never overlaps itself or the board, whatever the
 * text scale (Larger text) and however tall the badge grows: the badge keeps clear of the board's
 * top edge, the best line clear of the badge, and the score shrinks only if the three can't fit.
 * Tablets scale the stack with the board and sit it just above the board instead of in a far corner.
 */
export function hudStack(l: Layout, textScale: number): HudStack {
  const ts = Math.min(1.15, textScale);
  const tablet = Math.min(l.w, l.h) >= 600;
  const k = tablet ? Math.min(1.45, Math.max(1, l.cell / 46)) : 1;
  const pad = 4;
  const badgeHalf = l.cell * BADGE_MAX * ts * BADGE_HALF;
  // tablets: the stack hugs the board (the spare height above it is centering slack, not HUD)
  const drop = tablet ? Math.max(0, l.board.y - (l.hud.y + l.hud.h) - l.cell * 0.4) : 0;
  const top = l.hud.y + 2 + drop;
  let big = Math.round(Math.min(52 * k, l.hud.h * 0.5 * k, l.cell * 1.2) * ts);
  let lab = Math.round(Math.min(12 * k, big * 0.25) * Math.min(1.2, textScale));
  const badgeY = Math.min(l.hud.y + drop + l.hud.h * 0.9, l.board.y - pad - badgeHalf);
  const bestY = Math.min(l.hud.y + drop + l.hud.h * 0.5 + lab * 1.8, badgeY - badgeHalf - 3);
  // the gap clears the thousands comma, which hangs below the digits' baseline
  const scoreY = Math.min(l.hud.y + drop + l.hud.h * 0.5, bestY - lab * CAP - big * COMMA - 2);
  // the score gives up size before it climbs out of the top of the HUD
  if (scoreY - big * CAP < top) {
    big = Math.max(18, Math.floor((scoreY - top) / CAP));
    lab = Math.min(lab, Math.floor(big / 2.4)); // the score stays the hero (smaller lab only adds room)
  }
  return { big, scoreY, lab, bestY, badgeY, badgeHalf, k };
}
