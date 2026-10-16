# ADR 0001 — Core mechanic: enclosure clears ("close a loop, the inside pops")

- Status: accepted
- Date: 2026-10-15
- Deciders: Claude (autonomous), per user brief

## Context
The brief asks for a mobile puzzle game in the Block Blast / Meowdoku tier with **one unique core
idea**, explainable in one sentence and learnable in one move. Phase 1 produced 60+ ideas
(`docs/IDEAS.md`), a rubric (`docs/research/RUBRIC.md`) and a 5-idea shortlist. All five were bot-
simulated against a Block-Blast-like baseline; the top three by novelty (Hollow, Skid, Flip) were
also built as playable prototypes and played via automated pointer drags
(`docs/research/PROTOTYPE_RESULTS.md`).

## Decision
Build the game around **Hollow**:

> **Close a loop of blocks and everything inside it pops.**

Concrete rules (v1, tuned later by bots and play):
- 8×8 board, tray of 3 fixed-orientation polyominoes, all three must be placed before a new tray.
- After a placement, any **pocket** — a group of empty cells not connected (orthogonally, through
  empty cells) to the board's border — is captured.
- A captured pocket clears together with every block in its 8-neighborhood (the "ring").
- Score for a pocket = area × ring size (+ placed cells); several pockets at once multiply.
- Game over when no tray piece fits anywhere.
- Rows/columns do **not** clear. One rule only.
- Difficulty ramp: the tray generator shifts toward chunkier pieces as the game goes on.
- First tray is a scripted teaching tray: you can close a loop in two moves.

## Why it beat the others (data)
| | Hollow (ramp) | Skid | Flip | Exact | Overgrowth | Baseline lines |
|---|---|---|---|---|---|---|
| Search ÷ random score | **53.7×** | 3.6× | 45×* | 3.9× | 20.8× | 21.1× |
| Greedy ÷ search (lower = planning matters) | **0.12** | 0.62 | 0.96 | 0.94 | 0.33 | 0.27 |
| FirstFit ÷ search | 0.03 | 0.34 | 0.00 | 0.51 | 0.09 | 0.09 |
| Moves per clear (search) | 2.2 | 3.0 | 2.2 | 1.1 | 1.8 | 2.1 |
| Visible jackpot | big rings (median best 19 cells) | – | – | – | – | multi-line |
| Natural fail state | yes (with ramp) | yes, but unfair | no | no | yes | yes |
| Novelty gate | pass | partial | pass | pass | fail | — |

\*Flip's ratio is inflated: random almost never clears, while greedy ≈ search.

Qualitative:
1. **It inverts the genre's core instinct.** In every block puzzle, holes are death. Here holes
   are how you score. Genre veterans get a fresh "wait — what?" while newcomers just see a pretty
   rule. That inversion is the one-sentence hook for the store page.
2. **Push-your-luck emerges for free.** Pinch a single cell now (safe, ~11 pts) or keep a ring open
   to seal a big lagoon later (risky, 70–150+ pts). No extra rule needed.
3. **The jackpot is plannable and preview-able**: the ghost shows the pocket and ring before release.
4. **Messy boards self-heal a little** (accidental pockets), which makes early games friendlier than
   Block Blast's while the ramp keeps late games tense.
5. **Engineering**: one flood-fill per move (O(64)), trivially deterministic, easy to bot-test.

## Alternatives rejected
- **Skid** — unfair deaths with the board half-empty; low ceiling.
- **Flip** — no planning depth, visual noise; puzzle mode kept in backlog (I-041).
- **Exact Count** — endless, shallow, numeric.
- **Overgrowth** — fails novelty; may return as a modifier.
- **Hollow + lines / Moat** variants — measured too forgiving; dilute the single rule.

## Consequences
- Pocket detection, ring computation and scoring must be exhaustively unit/property-tested
  (pockets never touch the border; clears never remove empty cells; nested pockets; multi-pocket).
- The ramp is the main tuning knob; session length is tuned against bot targets, then by feel.
- Visual design must make the *pocket* legible before release (glowing lagoon preview).
- Risk: 1-cell pinches could feel samey → scoring/feedback must escalate with pocket size.
- Risk: a player expecting line clears is confused on game 1 → the teaching tray must produce a
  pocket on move 2 with a preview glow.
