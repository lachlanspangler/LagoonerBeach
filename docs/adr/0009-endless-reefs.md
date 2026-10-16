# ADR 0009 — Endless reefs (generated forever, solver-verified)

- Status: accepted · Date: 2026-10-16 · Supersedes the "Why not runtime generation?" note in ADR 0004

## Context
Reef puzzles ran out at 360. Players who finish the pack have nothing left, and the goal is "generate
them forever, proven solvable by the solver, with a smooth difficulty curve and a sense of progress".
Constraints: reefs 1–360 stay exactly as shipped (saves reference `R001…R360`, tests re-verify them);
generation must never block input; reef N has to be the same for everyone, forever.

## Decision
**Reef N > 360 is a pure function of N** (`src/core/endless.ts`, `generateReef(n)`), built in the
browser in a Web Worker and verified by a solver before it is shown.

### Generator
- Construction is the shipped generator's (`constructPuzzle`: lagoons → rings → carve 2–3 catalog
  pieces → color the reef → reject starting pockets), split out of `generatePuzzle` with the same RNG
  sequence (the pack regenerates byte-identically).
- Verification + grading use a new **bitboard solver** (`src/core/bitsolver.ts`): the board is two
  uint32 words, captures are flood fills by shifts, and a memo of *winning-path counts* is shared by
  the whole tree, so one pass yields solvability, the first solution, the solution count, the
  safe-first-move ratio and "every solution needs a cascade". It agrees **exactly** with the
  exhaustive grader on all 360 shipped reefs (solutions, first moves, winning first moves, cascade,
  first solution — unit-tested) and is ~40× faster (1 ms vs 41 ms mean per shipped reef). Sound
  pruning: the last piece must touch the reef (a piece with no blocks in its 8-neighborhood cannot
  close a lagoon).
- **Sub-seeds:** candidate k of reef n uses seed `hashSeed("reef:n:k")`; the recipe (lagoons, pieces,
  thick walls, minimum pebbles) rotates per k among the recipes of the reef's role that can reach
  its target. First candidate inside the target band wins.
- **Hard caps, counted in solver work, never in time** (so every device takes the same decisions):
  200 000 expanded placements per candidate (over → drop it, try the next sub-seed), 6 M per reef
  or 120 verified candidates (then take the closest verified candidate). A fallback to the easiest
  recipe guarantees termination even if nothing verified before the caps (never observed).
- **Integer only:** the score is the pack's formula in integers — `100·(1−safeFirst)` as a rounded
  ratio, `10·log2(1+200/solutions)` via an exact integer `floor(16·log2 n)`, `8·pieces`, `+12` if
  every solution cascades. JS `Math.log2`/`exp` are implementation-approximated, so they are never
  used for decisions.
- **GENERATOR_VERSION** (now 1) must be bumped by any change that alters a generated reef. A golden
  test pins digests of reefs 361–370; the cache is keyed by version.

### Difficulty curve (pure function of N)
- Chapters of 20 reefs everywhere (the pack is chapters 1–18; endless starts at 19).
- Chapter peak `196 − ceil(10·30 / (30 + (chapter − 19)))`: 186 at chapter 19, 191 at 49,
  194 at 169, never reaching the ceiling 196 (the pack's hardest reef scores 201; ~196+ reefs exist
  but are kept rare so the climb stays humane).
- Sawtooth: reef `pos` of a chapter targets `peak − floor(16·(20 − pos)/19)`. Each chapter opens
  with a breather 16 points under its peak and climbs ≤ 2 points per reef.
- Roles: positions 1–3 breathers; every 10th reef (pos 10, 20) a **signature** showpiece
  (3 lagoons + 3 pieces + ≥12 pebbles, or a thick 3-piece cascade; band ±7); cascades at pos 4, 9,
  14, 19 (and 7, 17 from chapter 40), which must *require* a cascade; the rest climb (band ±4).
- Tier label from the score (`<154` calm, `<170` tricky, `<182` deep, else abyss).

### Progress
- Ids: shipped `R001…R360`; generated `g361`, `g362`… (stable strings in `profile.puzzle.solved`).
  `profile.puzzle.index` may now exceed 359 (clamped to the max reef). Old saves load unchanged.
- Chapter names: two original word lists (40 × 30), mapped so the first 1200 chapters are unique and
  neighbours share no word ("Driftglass Shoals", "Heron Narrows"); then a numeral cycle ("… II").
- HUD: `CHAPTER 23 · HERON NARROWS · 7/20` (shrinks to fit), sub line `Deep · clear every pebble`.
- Reef list: one chapter in the DOM (20 tiles) with ‹ › navigation, a 20-segment progress bar,
  and a depth line ("437 cleared · Depth: chapter 23"). Endless chapters open up to one past the
  player's frontier. "Continue · Reef N" continues into generated reefs once the pack is cleared.
- Milestone: on the clear that completes a chapter, `reefEvents` (`src/app/reefProgress.ts`)
  dispatches `chapterComplete` `{ chapter, name, first, last, reef, totalCleared }`. The app shows a
  chip + a sound; a richer celebration system can subscribe to the same event.
- **Reef of the day stays in 1–360**: it must load instantly for everyone, on any device, and the
  pack's Tricky/Deep reefs are the right difficulty for a daily.

### Runtime
- `src/app/reefSource.ts`: shipped reefs are synchronous; generated ones come from
  `new Worker(new URL('./reefWorker.ts', import.meta.url), { type: 'module' })`. If workers are
  missing, the constructor throws, or the worker errors (old WebView, CSP), every pending request
  falls back to synchronous generation in a macrotask. Every reef from the worker or the cache is
  re-checked (right id, no starting pocket, stored solution clears the board) before it is shown.
- Prefetch: whenever a reef is shown, the next 3 are requested, so "Next reef" is instant.
- Cache: `localStorage['atoll.v1.reefcache']` = `{ v: GENERATOR_VERSION, order, reefs }`, the last 50
  reefs (LRU), the reef being played pinned. A different version discards the cache.

## Numbers (M-series laptop, Node 20)
| range | p50 | p95 | max | in band | cascades |
|---|---|---|---|---|---|
| 361–1360 (every reef) | 2.9 ms | 17 ms | 150 ms | 99.8% | 29% |
| 1361–100000 (501 sampled) | 4.9 ms | 84 ms | 176 ms | 99.0% | 33% |

Chapter mean targets: 178 (ch 19) → 182 (ch 40) → 184 (ch 65) → 186 (ch 250), approaching 188
(the ceiling minus the average sawtooth dip). One duplicate
board in the first 1000 generated reefs (not de-duplicated: that would make reef N depend on other
reefs). Browser: worker generation of 8 far reefs while dragging kept frame p95 at 16.7 ms and no
main-thread long tasks (`tests/perf/reefgen.spec.ts`). Initial JS 47.9 KB gz; worker chunk 11 KB.

## Consequences
- Content never runs out, and the puzzle quality bar (solver-verified, graded) is the same as the pack's.
- Any change to construction, recipes, the curve or the solver order changes generated reefs → bump
  `GENERATOR_VERSION` and refresh the golden. Old cache entries are dropped, and players' progress ids
  `gN` now point at different boards (acceptable: cleared stays cleared).
- `profile.puzzle.solved` grows by one short string per reef (≈6 bytes); 10 000 reefs ≈ 60 KB. If that
  ever matters, compact generated ids into ranges.
- Measure with `npx tsx scripts/reef-curve.ts [--from --to --step]` (table, ASCII plot, timing,
  `artifacts/reef-curve.json`).
