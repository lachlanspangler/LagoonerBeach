/**
 * Staged boards for celebration reviews (filmstrips, pixel baselines, perf). Each one is a single
 * move away from a specific moment; tests/unit/moments.test.ts proves every board produces the
 * word it is named for, so a rules change can't silently break the staging.
 * Board: 8 rows of '.' (empty) or 1–6 (pebble colors). Tray: piece ids for slots 0–2.
 */
export interface StagedMoment {
  rows: string[];
  tray: (string | null)[];
  move: { slot: number; x: number; y: number };
  /** Combo before the move (stageCombo). */
  combo?: number;
  word: string | null;
}

export const BOARDS: Record<string, StagedMoment> = {
  // (a) calm 1-cell pinch, with other pebbles around so the board doesn't clear
  pinch: {
    rows: ['5.......', '........', '..123...', '..4.5...', '..6.....', '........', '.....23.', '1....4..'],
    tray: ['dot', 'duo-h', 'tri-v'],
    move: { slot: 0, x: 3, y: 4 },
    word: null,
  },
  // (b) a 6-cell lagoon on a ×5 combo → COMBO ×6 + "Nice Lagoon!"
  lagoon: {
    rows: ['........', '..1234..', '..5..6..', '..1..2..', '..3.....', '..456...', '........', '3.....12'],
    tray: ['duo-v', 'dot', 'tri-h'],
    move: { slot: 1, x: 5, y: 4 },
    combo: 5,
    word: 'Nice Lagoon!',
  },
  // COMBO ×5 Atoll: a 12-cell lagoon (3×4) on a ×4 combo
  atoll: {
    rows: ['........', '.12345..', '.6...1..', '.2......', '.3......', '.4...5..', '.61234..', '6.....45'],
    tray: ['duo-v', 'dot', 'tri-h'],
    move: { slot: 0, x: 5, y: 3 },
    combo: 4,
    word: 'Atoll!',
  },
  // (c) a cascade through a thick wall: two waves → "Ripple ×2"
  cascade: {
    rows: ['........', '.12.45..', '.61.23..', '.24.54..', '.31265..', '.61234..', '........', '1.....23'],
    tray: ['duo-v', 'dot', 'tri-h'],
    move: { slot: 0, x: 3, y: 1 },
    combo: 2,
    word: 'Ripple ×2',
  },
  // (d) Spotless: the pinch's ring is every pebble on the board
  spotless: {
    rows: ['........', '........', '..123...', '..4.5...', '..6.....', '........', '........', '........'],
    tray: ['dot', 'duo-h', 'tri-v'],
    move: { slot: 0, x: 3, y: 4 },
    combo: 3,
    word: 'Spotless!',
  },
  // the biggest in-game moment: three waves that empty the board → "Unbelievable!" (perf budget)
  biggest: {
    rows: ['123.561.', '212.453.', '361.234.', '424.545.', '5312656.', '6612341.', '1234561.', '........'],
    tray: ['tri-v', 'dot', 'duo-h'],
    move: { slot: 0, x: 3, y: 0 },
    combo: 19,
    word: 'Unbelievable!',
  },
};

/** The 64-char board string `__atoll.setup` takes. */
export const boardString = (b: StagedMoment): string => b.rows.join('');
