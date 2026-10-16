# Simplicity Rubric

Every core-mechanic idea is scored 0–2 on each test (0 = fails, 1 = partially, 2 = clearly passes).
**Gate tests** (marked ★) must score 2 or the idea is rejected regardless of total.
Max score = 2 × 14 = 28. Shortlist threshold: all gates pass and total ≥ 22.

| # | Test | How it's measured | Pass (2) |
|---|---|---|---|
| R1 ★ | **One sentence** | Write the rule. Count words, count clauses. | ≤ 12 words, one clause, no "unless/except" |
| R2 ★ | **Learnable in one move** | Imagine a first-time player making one move. Do they see the rule happen? | The first or second move demonstrates the rule visibly |
| R3 | **No text needed** | Can the rule be taught with zero words (ghost hand, preview highlight)? | Yes, the preview itself teaches it |
| R4 | **Session < 3 min** (for a median player) | Bot sim: median game length in moves × ~4 s/move; or puzzle solve estimate | Median 1.5–3 min, with long tail for experts |
| R5 ★ | **Skill gradient** | Bot sim: ratio of smart-bot to random-bot score | ≥ 3× (clear mastery headroom) |
| R6 ★ | **No dominant strategy** | Bot sim: does a trivial heuristic (e.g., "first fit", "corner-first") reach ≥ 80% of the search bot? | No: trivial heuristics ≤ 60% of search bot |
| R7 | **Depth by game 20** | List tactics a player discovers after the basics. | ≥ 3 named emergent tactics not stated in the rule |
| R8 | **One-handed** | Thumb reach on a 6.1" phone; no multi-touch, no precision taps at the top | All input in bottom 2/3 of screen, single finger |
| R9 | **Satisfying with sound off** | Is the reward visible (big transformation on board)? | Clears are large, legible, spatially dramatic |
| R10 ★ | **Novel** | Compare to every game in TEARDOWN/GENRE. Would a player say "oh, it's X with Y"? | Core rule not present in any listed game; screenshot distinguishable |
| R11 | **Frequent micro-reward** | Bot sim: moves between clears (median) | 2–5 moves |
| R12 | **Visible jackpot** | Is there a big move the player can plan and see coming? | Yes, and it's preview-able |
| R13 | **Fair fail state** | Can the player see their loss coming? Is any death "random"? | Loss is foreseeable ≥ 1 move ahead |
| R14 | **Engineerable & testable** | Deterministic rules; a bot/solver can play it; generation provably valid | Pure function rules; solver feasible in ms |

## Gate timing
R5 and R6 can only be *measured* with a prototype. Before prototyping, an idea is shortlistable if
no gate scores 0 and the estimated total is ≥ 21. For the **final choice**, every gate must be 2 on
measured data.

## Scoring conventions
- Pre-prototype scores are **estimates** (marked `est`). After a bot prototype, R4/R5/R6/R11 are
  replaced by **measured** values (marked `meas`) and the ledger records the data.
- Ties break on R10 (novelty) then R2 (learnability) — the user's brief is "uniqueness + simplicity".
- A total-score ranking is a tool, not the decision. ADR 0001 records the actual judgment.

## Bot definitions (used for R4/R5/R6/R11)
- **random**: uniformly random legal placement.
- **first-fit**: scans the board top-left → bottom-right, first piece, first legal spot (dominant-
  strategy probe #1).
- **greedy**: maximizes immediate score + a small board-health heuristic, one move deep.
- **search**: evaluates all orderings/placements of the current tray (full tray lookahead) with
  a board-quality heuristic (mobility, holes/fragmentation as appropriate to the rule).

Skill gradient = search ÷ random (median score). Dominance probe = first-fit ÷ search and
greedy ÷ search (we want greedy notably below search: planning should matter).
