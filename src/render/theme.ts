/**
 * Design tokens (docs/research/UI_DESIGN.md §2–§5, §10). Every color/size/duration used by the
 * renderer comes from here; `src/ui/style.css` declares the same values as CSS variables
 * (`tests/unit/contrast.test.ts` checks both stay in sync and every text pair stays readable).
 */

export interface Palette {
  readonly name: 'day' | 'night';
  readonly bg: string;
  readonly bgGlow: string;
  /** Cards and sheets. */
  readonly surface: string;
  /** Wells, tiles, tracks. */
  readonly surfaceSunk: string;
  readonly line: string;
  readonly board: string;
  readonly boardEdge: string;
  /** 1 px top highlight on the board (night: the board reads as a lit tray). */
  readonly boardHi: string;
  readonly cell: string;
  readonly cellInset: string;
  /** Primary text (ink). */
  readonly text: string;
  /** Secondary text (ink.2, ≥ 4.5:1 on bg and surface). */
  readonly textDim: string;
  /** Decorative glyphs / disabled only (never body text). */
  readonly ink3: string;
  /** The one interactive accent (Deep Lagoon by day, glow water by night). */
  readonly accent: string;
  readonly accentLip: string;
  readonly accentTint: string;
  readonly onAccent: string;
  /** Water is material, never small text on light. */
  readonly water: string;
  readonly waterHi: string;
  readonly foam: string;
  readonly gold: string;
  readonly goldInk: string;
  readonly goldTint: string;
  readonly coral: string;
  readonly coralInk: string;
  readonly success: string;
  readonly ghost: string;
  readonly ringOutline: string;
  readonly danger: string;
  /** index 1..6 */
  readonly pebbles: readonly string[];
}

const PEBBLES = ['#000000', '#F2795B', '#F2B93B', '#53C08C', '#3D9BE9', '#8E5BD8', '#EC86AE'];

export const DAY: Palette = {
  name: 'day',
  bg: '#F6EFE4',
  bgGlow: '#FBF7F0',
  surface: '#FFFBF5',
  surfaceSunk: '#EFE5D6',
  line: 'rgba(43,35,28,0.08)',
  board: '#E3D6C2',
  boardEdge: '#D2C2AA',
  boardHi: 'rgba(255,255,255,0.55)',
  cell: '#D9CAB3',
  cellInset: '#CDBCA2',
  text: '#2B231C',
  textDim: '#6B5C4B',
  ink3: '#968672',
  accent: '#16588A',
  accentLip: '#0E3F66',
  accentTint: '#DCEBF3',
  onAccent: '#FFFFFF',
  water: '#5CC8E0',
  waterHi: '#BFF1FA',
  foam: '#FFFFFF',
  gold: '#F2B93B',
  goldInk: '#875C00',
  goldTint: '#FFF1CC',
  coral: '#F2795B',
  coralInk: '#B8452B',
  success: '#2C7A55',
  ghost: 'rgba(43,35,28,0.18)',
  ringOutline: '#FFFFFF',
  danger: '#B53A35',
  pebbles: PEBBLES,
};

export const NIGHT: Palette = {
  name: 'night',
  bg: '#0A1520',
  bgGlow: '#12273A',
  surface: '#13253A',
  surfaceSunk: '#0E1D2D',
  line: 'rgba(238,243,246,0.08)',
  board: '#162C40',
  boardEdge: '#050D15',
  boardHi: 'rgba(160,220,255,0.10)',
  cell: '#1F3B52',
  cellInset: '#183247',
  text: '#EEF3F6',
  textDim: '#A3B5C3',
  ink3: '#6C8193',
  accent: '#6FD3EC',
  accentLip: '#2B8FC0',
  accentTint: 'rgba(111,211,236,0.14)',
  onAccent: '#04212D',
  water: '#3FCBEA',
  waterHi: '#A8F5FF',
  foam: '#DFFBFF',
  gold: '#F5C451',
  goldInk: '#F5C451',
  goldTint: 'rgba(245,196,81,0.14)',
  coral: '#FF8F73',
  coralInk: '#FF8F73',
  success: '#6FD6A0',
  ghost: 'rgba(238,243,246,0.16)',
  ringOutline: '#E9FDFF',
  danger: '#FF7A70',
  pebbles: PEBBLES,
};

/**
 * Palette field → CSS variable in style.css (`:root` = Day, `html[data-theme='night']` = Night).
 * The contrast test parses style.css and fails if a value drifts from the palette above.
 */
export const CSS_VARS: Readonly<Partial<Record<keyof Palette, string>>> = {
  bg: '--bg',
  bgGlow: '--bg-glow',
  surface: '--surface',
  surfaceSunk: '--surface-sunk',
  line: '--line',
  text: '--ink',
  textDim: '--ink-2',
  ink3: '--ink-3',
  accent: '--accent',
  accentLip: '--accent-lip',
  accentTint: '--accent-tint',
  onAccent: '--on-accent',
  water: '--water',
  waterHi: '--water-hi',
  gold: '--gold',
  goldInk: '--gold-ink',
  goldTint: '--gold-tint',
  coral: '--coral',
  coralInk: '--coral-ink',
  success: '--success',
  danger: '--danger',
};

/** UI font: Nunito ("Lagoon UI", bundled) — every number in the game (its digits are tabular). */
export const FONT_STACK = `"Lagoon UI", ui-rounded, "SF Pro Rounded", system-ui, -apple-system, "Segoe UI", sans-serif`;
/** Display voice: Fraunces ("Lagoon Display", bundled) — words only, never numbers (proportional digits). */
export const DISPLAY_STACK = `"Lagoon Display", "Iowan Old Style", Georgia, serif`;

/**
 * Type scale (px at a 390-pt phone; multiply by the Larger Text scale). Display = Fraunces for
 * words and titles; everything else, and every number, = Nunito.
 */
export const TYPE = {
  scoreHero: { font: 'ui', weight: 900, size: 76, line: 1, track: -0.02 },
  scoreHud: { font: 'ui', weight: 900, size: 52, line: 1, track: -0.02 },
  displayXl: { font: 'display', weight: 900, size: 56, line: 1, track: -0.01 },
  displayL: { font: 'display', weight: 900, size: 40, line: 1.05, track: 0 },
  displayM: { font: 'display', weight: 900, size: 30, line: 1.1, track: 0 },
  displayS: { font: 'display', weight: 600, size: 22, line: 1.2, track: 0 },
  nameRow: { font: 'display', weight: 900, size: 18, line: 1, track: 0.06 },
  nameHero: { font: 'display', weight: 900, size: 44, line: 1, track: 0.08 },
  title: { font: 'ui', weight: 800, size: 19, line: 1.25, track: 0 },
  body: { font: 'ui', weight: 650, size: 17, line: 1.4, track: 0 },
  callout: { font: 'ui', weight: 700, size: 15, line: 1.35, track: 0 },
  label: { font: 'ui', weight: 800, size: 12, line: 1.2, track: 0.08 },
  caption: { font: 'ui', weight: 700, size: 12, line: 1.3, track: 0.01 },
} as const;

/** Base-4 spacing scale (px). */
export const SPACE = { 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 8: 32, 10: 40, 14: 56 } as const;
/** Radii (px); pebbles and the board keep their own ratios in GEOM. */
export const RADII = { xs: 6, sm: 10, md: 14, lg: 20, xl: 28, pill: 999 } as const;

/** Gameplay motion (ADR 0003), ms. */
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

/**
 * UI motion (UI_DESIGN §5): durations (ms), M3 easings, springs as stiffness + damping ratio (the
 * CSS side uses `linear()` samples of the same springs; canvas uses `spring()` in celebrate.ts).
 */
export const UI_MOTION = {
  instant: 80,
  quick: 140,
  base: 220,
  sheet: 320,
  exit: 180,
  celebrate: 900,
  reveal: 1400,
  staggerRow: 35,
  staggerCap: 8,
  ease: {
    standard: [0.2, 0, 0, 1],
    enter: [0.05, 0.7, 0.1, 1],
    exit: [0.3, 0, 0.8, 0.15],
    pop: [0.34, 1.56, 0.64, 1],
  },
  spring: {
    press: { stiffness: 1400, damping: 0.9 },
    sheet: { stiffness: 700, damping: 0.9 },
    screen: { stiffness: 300, damping: 0.9 },
    bouncy: { stiffness: 500, damping: 0.6 },
  },
} as const;

export const GEOM = {
  gutter: 0.06,
  cellRadius: 0.26,
  boardRadius: 0.05,
  trayScale: 0.74,
  liftCells: 1.4,
  touchSlop: 6,
} as const;

/** Thousands separators for every displayed score ("12,480"); fixed, not locale-dependent. */
export function fmt(n: number): string {
  const s = String(Math.round(Math.abs(n)));
  return (n < 0 ? '−' : '') + s.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}
