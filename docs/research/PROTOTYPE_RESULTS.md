# Prototype results (Phase 1)

Code: `prototypes/sim/` (bot harness + mechanics), `prototypes/play/` (ugly playable page + automated
pointer-drag playtest). All throwaway; the production game does not import from `prototypes/`.

Reproduce: `npx tsx prototypes/sim/matrix.ts` (≈90 s on 12 processes) → `npx tsx prototypes/sim/report.ts`.

## Setup
- Board 8×8, tray of 3, refill when empty (except Overgrowth: refill per move), shared 37-piece
  fixed-orientation catalog (1–9 cells), uniform deal unless noted. Seeds 1000+g (deterministic).
- Bots (see `docs/research/RUBRIC.md`): **random**, **firstFit** (dominant-strategy probe),
  **greedy** (1-ply, points + heuristic), **search** (beam 10 through the whole tray).
- Games: random 300, firstFit 100, greedy 60, search 40. Move cap 500 ("capped" = never died).
- Each mechanic gets a sensible heuristic (mobility, holes, overshoot, near-pockets) so we compare
  rules, not bot quality.

## Results
| mechanic | med moves r / ff / g / s | mean score r / ff / g / s | skill s÷r | ff÷s | g÷s | moves/clear (s) | search capped % | 1st clear (random) | pocket area (s) | best pocket (s, median) |
|---|---|---|---|---|---|---|---|---|---|---|
| lines-heavy | 10 / 14 / 28 / 55 | 56 / 104 / 256 / 564 | 10.1 | 0.18 | 0.45 | 2.02 | 0 | 10 | 0 | 0 |
| hollow8 | 20 / 42 / 500 / 500 | 368 / 621 / 5419 / 9498 | 25.8 | 0.07 | 0.57 | 2.16 | 100 | 8 | 2.45 | 12 |
| lines | 11 / 17 / 41 / 125 | 61 / 121 / 341 / 1285 | 21.1 | 0.09 | 0.27 | 2.08 | 0 | 12 | 0 | 0 |
| hollow4 | 17 / 28 / 104 / 500 | 253 / 431 / 2085 / 12258 | 48.5 | 0.04 | 0.17 | 1.41 | 88 | 8 | 2.5 | 16 |
| hollow+lines | 25 / 50 / 500 / 500 | 448 / 882 / 5402 / 9215 | 20.6 | 0.10 | 0.59 | 2.06 | 100 | 8 | 2.11 | 11 |
| moat | 158 / 263 / 500 / 500 | 9903 / 6587 / 11768 / 32045 | 3.2 | 0.21 | 0.37 | 1.81 | 100 | 5 | 10.05 | 27 |
| hollow8-nomono | 20 / 35 / 500 / 500 | 331 / 544 / 5332 / 10047 | 30.4 | 0.05 | 0.53 | 2.14 | 100 | 8 | 2.53 | 13 |
| hollow8-heavy | 14 / 23 / 157 / 500 | 267 / 391 / 3629 / 12843 | 48.1 | 0.03 | 0.28 | 2.13 | 100 | 7 | 3.04 | 16 |
| hollow8-min2 | 16 / 16 / 143 / 500 | 213 / 142 / 3821 / 12588 | 59.1 | 0.01 | 0.30 | 2.92 | 100 | 9 | 4.28 | 18 |
| skid | 11 / 13 / 17 / 25 | 52 / 64 / 116 / 186 | 3.6 | 0.34 | 0.62 | 3.01 | 0 | 12 | 0 | 0 |
| skid-small | 13 / 14 / 20 / 29 | 54 / 66 / 114 / 205 | 3.8 | 0.32 | 0.56 | 3.33 | 0 | 13 | 0 | 0 |
| flip | 60 / 60 / 60 / 60 | 6 / 0 / 261 / 273 | 45.5 | 0.00 | 0.96 | 2.19 | 0 | 999 | 0 | 0 |
| exact | 101 / 199 / 500 / 500 | 1290 / 2558 / 4691 / 5014 | 3.9 | 0.51 | 0.94 | 1.07 | 100 | 3 | 0 | 0 |
| exact-hard | 35 / 83 / 500 / 500 | 363 / 945 / 4308 / 4764 | 13.1 | 0.20 | 0.90 | 1.46 | 100 | 5 | 0 | 0 |
| overgrowth | 11 / 18 / 44 / 92 | 65 / 124 / 442 / 1352 | 20.8 | 0.09 | 0.33 | 1.77 | 0 | 10 | 0 | 0 |
| hollow8-ramp | 20 / 35 / 116 / 500 | 313 / 496 / 2202 / 15201 | 48.6 | 0.03 | 0.14 | 2.2 | 60 | 8 | 4.04 | 19 |
| hollow8-ramp2 | 17 / 27 / 80 / 488 | 270 / 388 / 1684 / 14488 | 53.7 | 0.03 | 0.12 | 2.2 | 45 | 8 | 4.14 | 19 |

Legend: r=random, ff=firstFit, g=greedy, s=search. "skill" = search ÷ random mean score (want ≥ 3).
ff÷s and g÷s are dominance probes (want low: planning should beat simple rules).

## Reading the numbers
- **Baseline `lines`** (Block-Blast-like) is the calibration: random 11 moves, greedy 41, search 125.
  Our uniform catalog is harsher than Block Blast's (which almost certainly biases trays).
- **Hollow (`hollow8`)** is *too forgiving*: messy boards produce accidental pockets that self-clean,
  so greedy rarely dies. But the **skill gradient is enormous** and lookahead matters a lot.
- **Ramp** (`hollow8-ramp2`: no monomino early, chunkier pieces from move 10 to 100) restores a fail
  state: greedy 80, search 488 (45% capped). Planning dominance: greedy reaches only **12%** of
  search's score — the strongest "planning matters" signal of any candidate.
- Hollow's **jackpot exists**: search's median best pocket per game is 19 cells, scoring ~7–10× a
  tiny "pinch" pocket. Greedy mostly makes 1-cell pinches; search builds big rings. That gap is
  exactly the mastery ladder we want (pinch → ring → nested ring → multi-pocket).
- **Skid** is brutal and shallow: even search dies by ~25 moves; small pieces barely help.
- **Flip** has no planning depth (greedy 96% of search; XOR commutes, so order is irrelevant) and
  random play almost never clears a line.
- **Exact Count** is endless for any non-random bot and greedy ≈ search (0.90–0.94).
- **Overgrowth** behaves like the baseline; the twist doesn't change the board.
- **Moat** (edges count as walls) is trivially easy (random survives 158 moves).
- **Hollow + lines** hybrid: endless and dilutes the idea.
- **ring4 vs ring8**: ring4 leaves board corners permanently unclearable (a corner's orthogonal
  neighbors are border cells, which can never be pockets). ring8 has no dead cells → ring8.

## Hands-on play (automated pointer drags + screenshots, `prototypes/play/shots/`)
- **Hollow**: the preview (pocket + ring highlighted before release) teaches the rule instantly.
  Placing the last piece of a ring and seeing a 3×3 chunk light up is a genuine "oh!" moment.
  Big rings (area 5–6) scored 70–89 vs ~11 for pinches in a greedy game — the pull toward building
  bigger is felt immediately. Concern: lots of 1-cell pinches can feel samey → scoring must make big
  rings feel special (escalating callouts, sound, particles).
- **Skid**: deaths occurred with ~half the board empty because the L5 couldn't slide anywhere useful.
  This is the "unfair death" that kills puzzle games. Flicking is fun once, then fiddly.
- **Flip**: after ~15 moves the board is checkerboard noise; it's hard to see what a stamp will do
  even with the preview. Clears feel accidental.

## Rubric (measured where possible) — see `docs/IDEAS.md`
| idea | total | gates |
|---|---|---|
| I-001 Hollow | 27 | all pass (R2 requires the teaching tray) |
| I-005 Overgrowth | 23 | R10 novelty fails |
| I-002 Skid | 21 | R13 fairness 0; R10 partial |
| I-003 Flip | 21 | R6 fails (no planning depth) |
| I-004 Exact | 21 | R6 fails; R4 0 (endless) |

## Production re-measurement (2026-10-16, real core, `make tune`)
The shipped rules differ from the prototype (41-piece catalog with "cups", fairness guard, cascades,
ramp 8→45). Measured on the production core:

| bot | median moves | notes |
|---|---|---|
| random | 20 | first capture by ~move 8 even at random |
| firstFit | 31 | dominance probe: 5% of search's score |
| human-like (greedy 70%, else top-6) | 50 | ≈ 3 min at ~3.5 s/move (rubric R4 ✓) |
| greedy | 56 | 26% of search's score → lookahead matters |
| search (beam 10, full tray) | 86 | median best lagoon 12 cells |

Skill gradient (search ÷ random score) 35×. Every rubric gate passes on measured data.
