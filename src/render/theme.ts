/** Design tokens. Every color/size/duration used by the renderer comes from here. */

export interface Palette {
  readonly name: 'day' | 'night';
  readonly bg: string;
  readonly bgGlow: string;
  readonly board: string;
  readonly boardEdge: string;
  readonly cell: string;
  readonly cellInset: string;
  readonly text: string;
  readonly textDim: string;
  readonly water: string;
  readonly waterHi: string;
  readonly foam: string;
  readonly ghost: string;
  readonly ringOutline: string;
  readonly danger: string;
  /** index 1..6 */
  readonly pebbles: readonly string[];
}

const PEBBLES = ['#000000', '#F2795B', '#F2B93B', '#53C08C', '#3D9BE9', '#8E5BD8', '#EC86AE'];

export const DAY: Palette = {
  name: 'day',
  bg: '#F4EDE2',
  bgGlow: '#FBF7F0',
  board: '#E3D6C2',
  boardEdge: '#D2C2AA',
  cell: '#D9CAB3',
  cellInset: '#CDBCA2',
  text: '#3B3229',
  textDim: '#8A7B69',
  water: '#5CC8E0',
  waterHi: '#BFF1FA',
  foam: '#FFFFFF',
  ghost: 'rgba(59,50,41,0.18)',
  ringOutline: '#FFFFFF',
  danger: '#D9534F',
  pebbles: PEBBLES,
};

export const NIGHT: Palette = {
  name: 'night',
  bg: '#0B1622',
  bgGlow: '#12273A',
  board: '#15293A',
  boardEdge: '#08131D',
  cell: '#1D384B',
  cellInset: '#162E3F',
  text: '#E8EEF2',
  textDim: '#7F95A6',
  water: '#2FB8D8',
  waterHi: '#9BF0FF',
  foam: '#DFFBFF',
  ghost: 'rgba(232,238,242,0.16)',
  ringOutline: '#E9FDFF',
  danger: '#FF7A70',
  pebbles: PEBBLES,
};

/** UI font: Nunito ("Lagoon UI", bundled) — every number in the game. */
export const FONT_STACK = `"Lagoon UI", ui-rounded, "SF Pro Rounded", system-ui, -apple-system, "Segoe UI", sans-serif`;
/** Display voice: Fraunces ("Lagoon Display", bundled) — words only, never numbers (proportional digits). */
export const DISPLAY_STACK = `"Lagoon Display", "Iowan Old Style", Georgia, serif`;

export const MOTION = {
  pickUp: 90,
  place: 110,
  placeOvershoot: 1.08,
  lagoonFill: 120,
  ringStagger: 18,
  waveGap: 150,
  particleMin: 450,
  particleMax: 700,
  scorePop: 650,
  callout: 760,
  dealIn: 220,
  dealStagger: 60,
  returnToTray: 180,
  shake: 260,
} as const;

export const GEOM = {
  gutter: 0.06,
  cellRadius: 0.26,
  boardRadius: 0.05,
  trayScale: 0.74,
  liftCells: 1.4,
  touchSlop: 6,
} as const;

/** Lagoon size → callout word. Only big moments speak; small pops stay quiet. */
export function calloutFor(area: number, waves: number, clean: boolean): string | null {
  if (clean) return 'Spotless!';
  if (waves >= 2) return `Ripple ×${waves}`;
  if (area >= 12) return 'Atoll!';
  if (area >= 6) return 'Lagoon';
  return null;
}
