# Genre study: minimalist puzzle games — what makes them work, what kills them

For each game: the one rule, the verb, why it lives, what threatens it. Then cross-cutting lessons.

| Game | One rule | Verb | Why it lives | What it risks / how others died |
|---|---|---|---|---|
| **Tetris** (1984) | Falling pieces; full rows vanish | Rotate/move/drop | Perfect pressure loop; gravity creates urgency; "Tetris" (4 lines) is a legible jackpot | Speed as difficulty locks out casual players; modern clones die by adding clutter |
| **1010!** (2014) | Place blocks on 10×10; rows+cols clear | Drag | Removed gravity & rotation from Tetris → calm, one-handed, infinite | Shallow late game; ad pressure; many indistinguishable clones |
| **Woodoku** (2019) | 9×9; rows, cols **and 3×3 boxes** clear | Drag | One extra clear-type adds a Sudoku flavor; wooden aesthetic gives identity | Looks like everyone else at thumbnail size; its twist is small |
| **Block Blast** (2022) | 8×8 rows+cols; 3-piece tray | Drag | Smaller board = more tension; best-in-class juice and combos | Genre saturation; differentiation is mostly feel |
| **Queens** (LinkedIn, 2024) | One per row/col/region, no touching | Tap | Daily, shareable, 1–3 min; regions make constraints visible | Daily-only cadence caps engagement; solvers trivialize it for some |
| **Sudoku** | 1–9 once per row/col/box | Tap+number | Infinite content, pure logic, guaranteed solvability | Number entry is fiddly on phones; intimidating to newcomers |
| **Two Dots** (2014) | Connect same-color dots; squares clear all of that color | Draw | The **square** (closing a loop!) is a spectacular, learnable power move | Moved to lives/levels/boosters → monetization fatigue |
| **Threes!** (2014) | Swipe; 1+2=3, then equal numbers merge | Swipe | Every swipe moves everything → deep, readable; personality in tiles | Cloned by **2048** within weeks (simpler, free) — originality alone didn't protect it |
| **2048** | Swipe; equal tiles merge | Swipe | Purest possible rule; obvious goal (the number) | Dominant strategy (corner) discovered quickly → boredom for experts |
| **Nonograms / Picross** | Clue numbers describe row/col runs | Tap | Picture reward; logic-guaranteed | Big grids are long and tedious on phones |
| **Wordle** (2021) | Guess the word in 6; color feedback | Type | One per day + spoiler-free share grid → social virality | Single-shot daily content; dependent on language |
| **Flow Free** | Connect color pairs; fill the board | Draw | Instant to understand; completion is "the board is full" | Levels feel samey; solution space too narrow at small sizes |
| **Monument Valley**-style | — (handcrafted) | Tap | Beauty | Content-hungry; not endless |
| **Mini Metro** | Draw lines; manage overload | Draw | Elegant escalating pressure | Requires explanation (a paragraph) |
| **Bejeweled / Candy Crush** | Swap to match 3 | Swap | Cascades = variable-ratio rewards | Pay-to-win boosters, lives, energy |
| **Puzzle Bobble / Bust-a-Move** | Shoot bubbles; 3 same color pop | Aim | Physical aiming + chain drop | Precision aiming frustrates on touch |
| **Hexa / Hex FRVR** | Block placement on hex grid | Drag | Grid-shape twist | Readability of hex pieces is poor; feels like a skin |
| **Stack/Knife Hit style hypercasual** | Timing tap | Tap | Five-second comprehension | No depth → days of retention, not months |
| **Dots and Boxes** | Close a box, keep your turn | Tap | Closing a shape is satisfying; chains of boxes | Needs an opponent |
| **Go (capture)** | Surround to capture | Place | Enclosure as a clearing rule is millennia-proven | Learning territory takes years |
| **Lights Out** | Toggle a cell and its neighbors | Tap | Parity puzzles are mathematically rich | Non-local effects feel arbitrary; frustration |

## What makes a minimalist puzzle game work
1. **The rule is shown, not told.** 2048's tiles display the goal; Queens' regions display the
   constraint; Block Blast's preview displays the payoff. If the UI needs a sentence, the rule isn't
   visible enough.
2. **One verb, many consequences.** Threes: swipe moves *everything*. Two Dots: one closed loop
   clears *all* of a color. Depth comes from the verb touching many things.
3. **A jackpot shape.** Tetris's 4-line, Two Dots' square, Block Blast's cross clear. Players learn
   a "big move" and chase it. The jackpot should be *visible in advance*, so planning it is the skill.
4. **Fairness the player can feel.** Seeing doom one tray ahead (Block Blast) or knowing a logical
   path exists (Sudoku/Queens).
5. **Short, restartable sessions** with a personal-best target or a daily finish line.
6. **Calm by default.** No timers in the main mode. Pressure comes from the board, not the clock.
7. **A face.** Cats, tile personalities (Threes), sounds (Two Dots' rising notes). Abstract rules
   need an emotional surface.
8. **The ladder of mastery shows up by game ~20**: you notice a new tactic you didn't see on game 1
   (2048's corner, Block Blast's "keep a 3×3 hole", Queens' region-pair).

## What kills them
1. **A dominant strategy.** 2048's corner strategy; once found, the game becomes execution. Test:
   does a trivial heuristic bot play nearly as well as a search bot?
2. **No skill gradient.** If random play ≈ smart play, nothing to master (hypercasual death).
3. **Unfair deaths.** Unwinnable trays or unsolvable puzzles. Players forgive difficulty, not RNG.
4. **Rule creep.** Each added mode/booster/rule dilutes the one clean idea (Two Dots' later years).
5. **Monetization in the loop.** Lives, energy, pay-to-continue → churn and resentment.
6. **Indistinguishable thumbnails.** If the screenshot looks like 1010!, it's lost in the store.
7. **Being clonable and second.** Threes lost to 2048; originality needs polish *and* depth.
8. **Content exhaustion** for handcrafted games — solved by provably-good generators.

## Mechanical axes to vary when inventing (used for ideation)
- **Grid**: size, shape (square/hex/tri/ring/torus), layers, regions, edges as walls or not.
- **Pieces**: shape source (dealt / drawn / taken from board / grown), mutability (grow, rotate,
  age), payload (color, number, direction).
- **Placement**: free / slides / falls / pushes / overlaps / toggles.
- **Clearing condition**: full line / exact count / one color / enclosure / shape match / parity /
  connected cluster / player-triggered.
- **What clearing does**: remove / collapse / convert / spread / score only.
- **Fail state**: no placement / overflow / move budget / stuck (puzzle).
- **Information**: full / future tray visible / hidden.
