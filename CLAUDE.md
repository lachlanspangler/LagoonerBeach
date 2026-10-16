# CLAUDE.md — Lagooner Beach

**Lagooner Beach** (formerly working title "Atoll"): a mobile puzzle game. *Close a loop of blocks: the space inside fills with water and the ring pops.*
8×8 board, tray of 3 fixed-orientation pieces, drag to place. Any empty region cut off from the
board's border (a "lagoon") is captured and clears with every block around it (8-neighborhood).
Captures cascade through thick walls. No line clears. Game over when nothing in the tray fits.

Start every session by reading, in order: `docs/STATUS.md` (where things stand), the last few
entries of `docs/DIARY.md`, then `docs/WORKFLOW.md` (the loop to run).

## Commands
| | |
|---|---|
| `make setup` | install deps + Playwright Chromium + git hooks |
| `make dev` | dev server http://localhost:5317 (`?debug=1` exposes `window.__atoll` test hooks, `?seed=N` fixes the seed, `?mode=daily`) |
| `make test` | unit + property + balance tests (Vitest, ~5 s) |
| `make check` | typecheck + lint + format + tests + ideas ledger sync — run before every commit |
| `make e2e` | build, then Playwright (Chromium + WebKit): gameplay, visual baselines, layouts, perf, audio |
| `make tune` | bot balance report → `artifacts/tune.json` |
| `npm run coverage` | coverage of pure layers (core/sim/meta), thresholds enforced (≈99% lines) |
| `make ideas` | regenerate `docs/IDEAS.md` from `docs/ideas_ledger.json` |
| `npm run puzzles` | regenerate the 200-reef pack (deterministic; CI diffs it) |
| `make ios-sim` | build + launch on an iPhone simulator, screenshot |

Review/play tools are listed in `docs/WORKFLOW.md` → "Review tools".

Node 20.19+ (`.nvmrc`). The repo pins the public npm registry in `.npmrc` (the machine default
registry fails TLS). Vite 7 / Vitest 3 are pinned because newer majors need Node 22.

## Architecture
```
src/core/      PURE game logic. No DOM, no clock, no Math.random (ESLint-enforced).
  rng.ts         mulberry32, uint32 state (serializable, clonable)
  grid.ts        8×8 indexing, neighbor tables
  pieces.ts      piece catalog (ASCII-defined, fixed orientation, families for the ramp)
  rules.ts       canPlace, findPockets, resolvePlacement (cascade waves)
  scoring.ts     integer scoring + streaks
  dealer.ts      ramped fair dealer, teaching tray  ← balance knobs live here (DEFAULT_RAMP)
  game.ts        GameState, applyMove → {state, events}, previewMove, legalMoves
  serialize.ts   versioned, validating save format
  replay.ts      seed + move log → state
  daily.ts       daily seed, streak math
  solver.ts      reef-puzzle solver + grader      puzzlegen.ts  constructive reef generator
  puzzle.ts      puzzle games (no refills, win = empty board)
src/meta/      pure meta-progression: unlocks (skins), share text
src/content/   generated data (puzzles.json) — never hand-edit
src/sim/       bots (random/firstFit/greedy/search) + playGame; used by tests, tuning, autoplay
src/render/    Canvas2D renderer, theme tokens, sprites, particles, tweens (no rules here)
src/input/     pointer drag model (grab offset, lift, snap, hysteresis, cancel)
src/audio/     WebAudio-synthesized SFX (no audio files)
src/platform/  storage, haptics, visibility/lifecycle, PWA
src/ui/        DOM overlays (menus, game over, settings)
src/app/       wiring: state machine, event → effects dispatch
tests/unit/    Vitest (rules, property tests, determinism golden, balance bands)
tests/e2e/     Playwright (real drags, screenshots, save/restore, a11y basics)
tests/perf/    Playwright frame-time budget under CPU throttling
prototypes/    Phase-1 throwaway code. Never import from it.
docs/          research, ADRs, ideas ledger, diary, status, workflow
```
Data flow: input → `applyMove` (core) → events → `app` dispatches to renderer FX, audio, haptics,
persistence. The renderer animates events; the logical state is already final.

## Conventions
- Core functions are pure; states are treated as immutable (new `Uint8Array` per move).
- Every rule change: update tests first, then `make tune`, then the golden snapshot & balance bands,
  and log it in the diary. Changing `DEFAULT_RAMP`/scoring changes everyone's daily.
- Integer math in core (determinism across devices).
- Commits: small, one logical change, conventional prefixes (`core:`, `render:`, `feel:`, `ui:`,
  `test:`, `docs:`, `build:`). Never push (the user manages the remote).
- Big decisions get an ADR in `docs/adr/NNNN-title.md`.
- Original everything: no names/art/sounds from other games. Sounds are synthesized in code.
- Inclusive language (allowlist/denylist, primary/replica).
- Verify by running: after any visual/feel change, run the game (Playwright screenshot or
  `tests/e2e`), look at the screenshot, and write what felt good/bad in the diary.

## Debug hooks
`window.__atoll` (only with `?debug=1` or in tests): `state()`, `autoplay(bot, moves)`,
`plan(bot)` → pointer path for a bot's next move (used by e2e to drive real drags),
`pathFor(move)`, `setup(board64, trayIds)` to stage a board, `switchMode`, `loadPuzzle(i)`,
`puzzleSolution()`, `debugSkin(id)`, `drawTimes()`, `audioLevels()`.

## Gotchas learned the hard way
- Port 5173 is used by another project on this machine → dev is :5317, preview :4317.
- Prettier reformats files; string-replace edits must assert (use `scripts/sub.py`).
- Delayed UI must go through `later()` (bound to `gameToken`) or it can fire on the next game.
- iOS WKWebView settles safe-area insets after first layout → the persistent probe in main.ts.
