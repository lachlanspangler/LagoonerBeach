# ADR 0007 — The catch layer: beach creatures and the Beach Journal

- Status: accepted · Date: 2026-10-16
- Input: the owner's seed idea ("score is fish caught and released, lots of species, bigger pools →
  rarer catches, a log to chase"). Research: `docs/research/COLLECTION.md`.

## Decision
Every captured lagoon **catches beach creatures**, which leap out of the water and dive back to the
sea (released). A **Beach Journal** records every species found (count, biggest, golden finds).
- **47 species in 6 habitats**: Shallows, Lagoon, Deep water, Night, Reef, Legends.
- **Species are tied to lagoon shape and conditions**, not just size: long flat pools → eels,
  tall narrow → garden eel/seahorse, 2×2 → box crab, 3×3 → boxfish, plus → sea star, L → cuttlefish,
  wide rectangles → flounder/rays, two pools sealed at once → clownfish, a lagoon *around an island*
  → sea turtle, cascades → nautilus / whale shark, clearing the board → leafy sea dragon, Night theme
  → glowing species, Reef puzzles → reef fish, the Daily → sunfish/otter, long streaks → dolphin.
- Locked entries show a silhouette and a **hint** ("Lives in long, flat pools"), so every unknown is
  a small goal that teaches a new way to use the one rule.
- Rolls: specials whose condition matches each get a per-species chance (rarest first); otherwise
  an everyday creature. Big lagoons sometimes bring a second creature (everyday pool). Sizes are
  skewed so records are rare. Golden variants (1/64) only for species already found. Pity after a
  real drought (~a day of captures), capped ×2.
- Deterministic: seeded by (game seed, move, wave, pocket), separate from the dealer's RNG, so the
  catch layer can never change the game.

## Why points stay the score (and catches are a layer)
The owner suggested making the score "fish caught". I kept points as the score because:
1. **Skill resolution.** Points scale with area × ring × multi × cascade × streak, so they separate
   a 1-cell pinch from a 12-cell lagoon by ~20×. A creature count compresses that to 1 vs 2 — the
   leaderboard-of-one stops rewarding mastery.
2. **Two kinds of chase.** Points are "beat my best tonight"; the journal is "find the seahorse this
   week". Different time scales keep people coming back (Block Blast has the first; Meowdoku-style
   collections have the second).
3. **Agency beats luck.** Tying species to *shapes* gives the catch layer a purpose the score can't:
   it pushes players to build new kinds of lagoons. That's stronger than "bigger = rarer" alone.
The game-over card leads with *both*: score, and "Catch: N creatures · new: …".

## Tuning (data)
`scripts/catch-rates.ts` measures how often each condition occurs per day of simulated play
(human-like bot; 5 Classic incl. 2 at night, 1 Daily, 3 Reefs per day), then sets each species'
chance so its expected first catch lands near a target day for its rarity (uncommon 3.5, rare 12,
epic 22, legendary 30 days), with a floor of 0.5 matches/day for conditions a player can build on
purpose. `scripts/catch-sim.ts` (8 players × 49 days): median species found — day 1: 15, day 3: 26,
day 7: 33, day 14: 38, day 21: 41, day 35: 43 / 47. Late finds: puzzle species from Deep/Abyss
reefs, legends. A lighter real player (fewer games/day) stretches this to many weeks.

## Consequences
- Board stays clean: creatures appear only as the existing leap from the water; the journal is in
  the menu. New species get a small "New!" tag in the leap and a card on the game-over screen.
- Original procedural art for 20 body types × palettes × patterns (no assets).
- Any change to conditions requires re-running catch-rates `--write` and the sim; the test suite
  checks every species stays catchable.
