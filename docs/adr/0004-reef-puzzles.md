# ADR 0004 — Second mode: Reef puzzles (finite, solver-verified)

- Status: accepted · Date: 2026-10-16

## Context
Classic (endless) gives Block-Blast-style "one more round". The brief also wants Meowdoku-style
completable puzzles, and any puzzle must be **provably solvable with difficulty graded by a solver**.

## Decision
**Reef puzzle:** a board with some pebbles already placed and a fixed tray of 2–3 pieces.
*Place every piece so the board ends completely empty.* Same one rule (close loops → they pop,
cascades included). No new mechanic, so it teaches classic play (and vice versa).

- **Generation (constructive):** pick 1–3 lagoons in the interior, take their rings, carve 2–3
  catalog pieces out of the ring cells, leave the rest as pre-placed pebbles. Reject boards that
  already contain a pocket.
- **Verification:** exhaustive DFS solver over (order × placement) with memoization on
  (board, remaining pieces). A puzzle ships only if a solution exists. Its stored solution is
  replayed in tests.
- **Grading (by the solver, never guessed):** for every possible first move, does a solution remain
  reachable? `safeFirst = winning first moves ÷ legal first moves`. Plus total solution count, piece
  count, lagoon count and whether the intended solution cascades. Score → tier
  (Calm / Tricky / Deep / Abyss). Packs are sorted by score so difficulty climbs.
- **Shipping:** puzzles are generated offline (`npm run puzzles`) into `src/content/puzzles.json`;
  a unit test re-verifies every shipped puzzle (solvable, stored solution clears the board, no
  starting pockets, no duplicates). The daily puzzle is chosen from the pack by date hash.
- **UX:** level number, restart button, instant retry. A failed attempt shows what's left; there is
  no penalty.

## Why not runtime generation?
Exhaustive grading costs ~0.1–2 s per puzzle in Node; on a phone it would stall input. Offline packs
are deterministic, reviewable and testable. (The generator is pure, so runtime generation is a later
option.)
