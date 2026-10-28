/**
 * "Tidemark" icon set (UI_DESIGN §8): one 24×24 grid, 2 px padding, stroke 2.25 with round caps
 * and joins, corner radius 2 on rectangles. Two states per icon, same silhouette: outline
 * (default) and filled (selected tab, active toggle), so a switch never shifts layout.
 * Inline SVG with `currentColor`; the shell is shared with the canvas (combo grace shells, pips).
 */

interface IconDef {
  /** Stroked outline. */
  d: string;
  /** Filled-state shape (closed areas); falls back to `d` filled + stroked. */
  fill?: string;
  /** Extra strokes drawn over the fill in the filled state (in the background color). */
  cut?: string;
}

/** Scallop shell (fan + hinge), the game's medal/pip/grace-shell glyph. */
export const SHELL_D = 'M12 20.2 4.3 10.4C5.6 6.6 8.5 4.3 12 4.3s6.4 2.3 7.7 6.1L12 20.2Z';
export const SHELL_RIBS_D = 'M12 20.2 8.4 7.2M12 20.2V5.6M12 20.2l3.6-13';

/** A pointing hand, index finger up; its fingertip is at (10.6, 3.4) (first-run demo, canvas). */
export const TAP_D =
  'M9 14.5V5a1.6 1.6 0 0 1 3.2 0v5.4a1.6 1.6 0 0 1 3.2.4 1.6 1.6 0 0 1 3.2.8V15c0 3.4-2.4 5.8-5.6 5.8h-1.2c-2 0-3.4-.9-4.5-2.4L5.6 16a1.6 1.6 0 0 1 2.5-2Z';
const TAP_KNUCKLES = 'M12.2 10.4v2.4M15.4 10.8v2.2';

const SUN_RAYS =
  'M12 2.8v1.6M12 19.6v1.6M2.8 12h1.6M19.6 12h1.6M5.5 5.5l1.1 1.1M17.4 17.4l1.1 1.1M5.5 18.5l1.1-1.1M17.4 6.6l1.1-1.1';

const ICONS = {
  menu: { d: 'M4.5 7h15M4.5 12h10M4.5 17h15' },
  tap: { d: `${TAP_D}${TAP_KNUCKLES}`, fill: TAP_D },
  close: { d: 'M6.5 6.5l11 11M17.5 6.5l-11 11' },
  back: { d: 'M14.5 5.5 8 12l6.5 6.5' },
  chevronLeft: { d: 'M14.5 5.5 8 12l6.5 6.5' },
  chevronRight: { d: 'M9.5 5.5 16 12l-6.5 6.5' },
  chevronDown: { d: 'M5.5 9.5 12 16l6.5-6.5' },
  // open book, with a little fish swimming across the right page
  journal: {
    d: 'M12 6.6C10 5 7 4.5 3.5 5v13.2c3.5-.5 6.5 0 8.5 1.6 2-1.6 5-2.1 8.5-1.6V5C17 4.5 14 5 12 6.6Zm0 0v13.2',
    fill: 'M12 6.6C10 5 7 4.5 3.5 5v13.2c3.5-.5 6.5 0 8.5 1.6 2-1.6 5-2.1 8.5-1.6V5C17 4.5 14 5 12 6.6Z',
    cut: 'M12 6.6v13.2',
  },
  // three stepped podium pebbles
  leaderboard: {
    d: 'M3 20.5h18M4 20.5v-7A1.5 1.5 0 0 1 5.5 12H9v8.5M9 20.5V6.5A1.5 1.5 0 0 1 10.5 5h3A1.5 1.5 0 0 1 15 6.5v14M15 20.5V9.5h3.5A1.5 1.5 0 0 1 20 11v9.5',
    fill: 'M4 20.5v-7A1.5 1.5 0 0 1 5.5 12H9V6.5A1.5 1.5 0 0 1 10.5 5h3A1.5 1.5 0 0 1 15 6.5v3h3.5A1.5 1.5 0 0 1 20 11v9.5Z',
    cut: 'M9 12v8.5M15 9.5v11',
  },
  // six-armed sea-star gear (original)
  settings: {
    d: 'M10.1 3.5Q12 2.4 13.9 3.5l.9 2.4 2.6.4q2.2.3 2.7 2.4l-1.6 2Q19 12 18.5 12.9l1.6 2q-.5 2.1-2.7 2.4l-2.6.4-.9 2.4q-1.9 1.1-3.8 0l-.9-2.4-2.6-.4q-2.2-.3-2.7-2.4l1.6-2Q5 12 5.5 11.1l-1.6-2Q4.4 7 6.6 6.7l2.6-.4.9-2.8ZM12 9.4a2.6 2.6 0 1 0 0 5.2 2.6 2.6 0 0 0 0-5.2Z',
  },
  hint: {
    d: 'M9.2 18h5.6M10.2 21h3.6M12 3a6 6 0 0 0-3.6 10.8c.7.5 1.1 1.3 1.1 2.2h5c0-.9.4-1.7 1.1-2.2A6 6 0 0 0 12 3Z',
    fill: 'M12 3a6 6 0 0 0-3.6 10.8c.7.5 1.1 1.3 1.1 2.2h5c0-.9.4-1.7 1.1-2.2A6 6 0 0 0 12 3Z',
  },
  sun: { d: `M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z${SUN_RAYS}`, fill: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z' },
  moon: {
    d: 'M19.5 14.6A8 8 0 0 1 9.4 4.5a8 8 0 1 0 10.1 10.1Z',
    fill: 'M19.5 14.6A8 8 0 0 1 9.4 4.5a8 8 0 1 0 10.1 10.1Z',
  },
  // half sun, half moon
  themeAuto: {
    d: 'M12 4a8 8 0 1 0 0 16 8 8 0 0 0 0-16Zm0 0v16',
    fill: 'M12 4a8 8 0 0 0 0 16Z',
  },
  share: { d: 'M12 3.5v11M8 7.5l4-4 4 4M5.5 11v7.5a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2V11' },
  // branching coral on a rock
  reef: {
    d: 'M12 20.5v-8.2M12 15.2c-2.6 0-4.4-1.8-4.4-4.6V7.2M12 12.6c2.6 0 4.4-1.6 4.4-4.4V5M7.6 10.2c-1.9 0-3.1-1.3-3.1-3.2M16.4 8.4c1.6 0 2.8-1 2.8-2.7M7.5 20.5h9',
  },
  // the sun coming up over a wave
  daily: {
    d: 'M7 14a5 5 0 0 1 10 0M12 5v2M5.5 8.5l1.4 1.4M18.5 8.5l-1.4 1.4M3 18c1.5 0 1.5-1.2 3-1.2S7.5 18 9 18s1.5-1.2 3-1.2 1.5 1.2 3 1.2 1.5-1.2 3-1.2 1.5 1.2 3 1.2',
  },
  calendar: {
    d: 'M6 5.5h12a2 2 0 0 1 2 2V18a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7.5a2 2 0 0 1 2-2ZM4 10h16M8.5 3.5v4M15.5 3.5v4',
    fill: 'M6 5.5h12a2 2 0 0 1 2 2V10H4V7.5a2 2 0 0 1 2-2Z',
  },
  // a pebble ring with its lagoon (Endless)
  endless: {
    d: 'M7 4.5h10a2.5 2.5 0 0 1 2.5 2.5v10a2.5 2.5 0 0 1-2.5 2.5H7A2.5 2.5 0 0 1 4.5 17V7A2.5 2.5 0 0 1 7 4.5ZM10 9.5h4a.5.5 0 0 1 .5.5v4a.5.5 0 0 1-.5.5h-4a.5.5 0 0 1-.5-.5v-4a.5.5 0 0 1 .5-.5Z',
    fill: 'M10 9.5h4a.5.5 0 0 1 .5.5v4a.5.5 0 0 1-.5.5h-4a.5.5 0 0 1-.5-.5v-4a.5.5 0 0 1 .5-.5Z',
  },
  sound: { d: 'M4.5 9.5v5h3.5l4.5 4v-13L8 9.5H4.5ZM16 9a4 4 0 0 1 0 6M18.6 6.4a7.6 7.6 0 0 1 0 11.2' },
  soundOff: { d: 'M4.5 9.5v5h3.5l4.5 4v-13L8 9.5H4.5ZM16.5 9.5l5 5M21.5 9.5l-5 5' },
  music: {
    d: 'M9 17.5V6.2l10-2v11M9 17.5a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0ZM19 15.2a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0Z',
  },
  haptics: {
    d: 'M9 3.5h6a1.5 1.5 0 0 1 1.5 1.5v14a1.5 1.5 0 0 1-1.5 1.5H9A1.5 1.5 0 0 1 7.5 19V5A1.5 1.5 0 0 1 9 3.5ZM3.8 9v6M20.2 9v6',
  },
  motion: { d: 'M3 9.5c2-2.7 4-2.7 6 0s4 2.7 6 0 4-2.7 6 0M3 15.5c2-2.7 4-2.7 6 0s4 2.7 6 0 4-2.7 6 0' },
  textSize: { d: 'M3.5 7h9M8 7v11.5M14 11.5h7M17.5 11.5v7' },
  // four pebbles (skins)
  style: {
    d: 'M6 4.5h3.5a1.5 1.5 0 0 1 1.5 1.5v3.5a1.5 1.5 0 0 1-1.5 1.5H6a1.5 1.5 0 0 1-1.5-1.5V6A1.5 1.5 0 0 1 6 4.5ZM14.5 4.5H18A1.5 1.5 0 0 1 19.5 6v3.5A1.5 1.5 0 0 1 18 11h-3.5A1.5 1.5 0 0 1 13 9.5V6a1.5 1.5 0 0 1 1.5-1.5ZM6 13h3.5a1.5 1.5 0 0 1 1.5 1.5V18a1.5 1.5 0 0 1-1.5 1.5H6A1.5 1.5 0 0 1 4.5 18v-3.5A1.5 1.5 0 0 1 6 13ZM14.5 13H18a1.5 1.5 0 0 1 1.5 1.5V18a1.5 1.5 0 0 1-1.5 1.5h-3.5A1.5 1.5 0 0 1 13 18v-3.5a1.5 1.5 0 0 1 1.5-1.5Z',
  },
  crown: {
    d: 'M3.5 8.5 8 12l4-6.5 4 6.5 4.5-3.5-1.8 10H5.3l-1.8-10Z',
    fill: 'M3.5 8.5 8 12l4-6.5 4 6.5 4.5-3.5-1.8 10H5.3Z',
  },
  shell: { d: `${SHELL_D}${SHELL_RIBS_D}`, fill: SHELL_D, cut: SHELL_RIBS_D },
  offline: {
    d: 'M3.5 3.5l17 17M8.7 8.8A5 5 0 0 0 7 18.5h10.3M16.8 11.2a3.6 3.6 0 0 1 3.4 6.2M10.6 6.3a5 5 0 0 1 5.6 2.9',
  },
  check: { d: 'M5 12.5l4.5 4.5L19 7.5' },
  lock: {
    d: 'M7 10.5h10a1.5 1.5 0 0 1 1.5 1.5v7a1.5 1.5 0 0 1-1.5 1.5H7A1.5 1.5 0 0 1 5.5 19v-7A1.5 1.5 0 0 1 7 10.5ZM8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5',
  },
  plus: { d: 'M12 5v14M5 12h14' },
  sparkle: {
    d: 'M12 3.5c.6 4.2 2.3 6.4 6.5 7.5-4.2 1.1-5.9 3.3-6.5 7.5-.6-4.2-2.3-6.4-6.5-7.5 4.2-1.1 5.9-3.3 6.5-7.5Z',
    fill: 'M12 3.5c.6 4.2 2.3 6.4 6.5 7.5-4.2 1.1-5.9 3.3-6.5 7.5-.6-4.2-2.3-6.4-6.5-7.5 4.2-1.1 5.9-3.3 6.5-7.5Z',
  },
  streak: { d: 'M3 14c2.2-3.4 4.4-3.4 6.6 0s4.4 3.4 6.6 0c1.4-2.1 2.8-3 4.3-2.6M5.5 9.5c1.6-2.3 3.2-2.3 4.8 0' },
  star: {
    d: 'M12 3.8l2.5 5.2 5.6.7-4.1 3.9 1.1 5.6L12 16.4l-5.1 2.8L8 13.6 3.9 9.7l5.6-.7L12 3.8Z',
    fill: 'M12 3.8l2.5 5.2 5.6.7-4.1 3.9 1.1 5.6L12 16.4l-5.1 2.8L8 13.6 3.9 9.7l5.6-.7L12 3.8Z',
  },
  erase: { d: 'M5 7h14M10 4h4M7 7l1 12.5a1.5 1.5 0 0 0 1.5 1.5h5a1.5 1.5 0 0 0 1.5-1.5L17 7' },
  /** Opens outside the app (charity links): a box with an arrow leaving it. */
  external: { d: 'M13.5 4.5h6v6M19.5 4.5 11 13M17.5 14v4a2 2 0 0 1-2 2h-9a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h4' },
  info: { d: 'M12 3.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17ZM12 11v5.5M12 7.8v.2' },
  restart: { d: 'M5 12a7 7 0 1 0 2.2-5.1M5 4.5v3.5h3.5' },
  play: { d: 'M8 5.5v13l10-6.5-10-6.5Z', fill: 'M8 5.5v13l10-6.5-10-6.5Z' },
} satisfies Record<string, IconDef>;

export type IconName = keyof typeof ICONS;

/**
 * Inline SVG markup for an icon. `filled` = the selected/active state (same silhouette).
 * `size` sets width/height (CSS can override); decorative by default (aria-hidden).
 */
export function icon(name: IconName, o: { filled?: boolean; size?: number; cls?: string } = {}): string {
  const def: IconDef = ICONS[name];
  const sz = o.size ? ` width="${o.size}" height="${o.size}"` : '';
  const cls = `ic ic-${name}${o.filled ? ' ic-filled' : ''}${o.cls ? ` ${o.cls}` : ''}`;
  const head = `<svg class="${cls}" viewBox="0 0 24 24"${sz} fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">`;
  // icons without a filled shape (chevrons, check, …) keep their outline when "filled"
  if (!o.filled || !def.fill) return `${head}<path d="${def.d}"/></svg>`;
  const fill = def.fill;
  const cut = def.cut ? `<path d="${def.cut}" stroke="var(--ic-cut, var(--surface))" stroke-width="1.6"/>` : '';
  const rest = `<path d="${def.d}"/>`;
  return `${head}<path d="${fill}" fill="currentColor"/>${rest}${cut}</svg>`;
}

/** Every icon name (review sheets, tests). */
export const ICON_NAMES = Object.keys(ICONS) as IconName[];

let shellPath: Path2D | null = null;
let ribsPath: Path2D | null = null;
/**
 * The shell glyph on a canvas, centered at (x, y), `r` ≈ half its width. Paths are built once
 * (no per-frame Path2D construction, ADR 0011 R36).
 */
export function drawShell(
  g: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  color: string,
  filled: boolean,
  ribs?: string,
): void {
  shellPath ??= new Path2D(SHELL_D);
  ribsPath ??= new Path2D(SHELL_RIBS_D);
  const k = r / 7.7;
  g.save();
  g.translate(x - 12 * k, y - 12.4 * k);
  g.scale(k, k);
  g.lineJoin = 'round';
  g.lineCap = 'round';
  if (filled) {
    g.fillStyle = color;
    g.fill(shellPath);
    if (ribs && r >= 5) {
      g.strokeStyle = ribs;
      g.lineWidth = 1.4;
      g.stroke(ribsPath);
    }
  } else {
    g.strokeStyle = color;
    g.lineWidth = Math.max(1.6, 2.6 / Math.max(0.6, k));
    g.stroke(shellPath);
  }
  g.restore();
}

let tapPath: Path2D | null = null;
let tapKnuckles: Path2D | null = null;
/**
 * The "tap" hand on a canvas with its fingertip at (x, y); `size` ≈ the glyph's height. A light
 * fill with a dark outline reads on pebbles, sand and water alike (the first-run demo finger).
 */
export function drawTap(
  g: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  fill: string,
  stroke: string,
  alpha: number,
): void {
  tapPath ??= new Path2D(TAP_D);
  tapKnuckles ??= new Path2D(TAP_KNUCKLES);
  const k = size / 18;
  g.save();
  g.globalAlpha = alpha;
  g.translate(x - 10.6 * k, y - 3.4 * k);
  g.scale(k, k);
  g.lineJoin = 'round';
  g.lineCap = 'round';
  g.shadowColor = 'rgba(0,0,0,0.22)';
  g.shadowBlur = 3;
  g.shadowOffsetY = 1;
  g.fillStyle = fill;
  g.fill(tapPath);
  g.shadowColor = 'transparent';
  g.strokeStyle = stroke;
  g.lineWidth = 1.7;
  g.stroke(tapPath);
  g.stroke(tapKnuckles);
  g.restore();
}
