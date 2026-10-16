# Teardown: Block Blast and Meowdoku

Sources: my own knowledge of the games and genre, plus the design doc (see `DESIGN_DOC_NOTES.md`).
Anything marked *(unverified)* is a plausible reconstruction, not a confirmed fact about the studios'
implementations. Numbers like "8×8" are directly observable from play; numbers like retention rates
are not public and are not claimed here.

---

## 1. Block Blast (Hungry Studio)

### 1.1 Core loop (one turn = ~3–6 s)
1. Look at the tray of **3 pieces**.
2. Drag one onto the **8×8** board. A ghost shows where it lands; full rows/columns light up
   *before* release when the drop would complete them.
3. Release → snap → any completed **rows and columns clear simultaneously**.
4. When all 3 pieces are used, a new tray of 3 is dealt.
5. If **none** of the remaining tray pieces fits anywhere → game over.

That is the entire rule set. No rotation, no gravity, no timer.

### 1.2 Board
- 8×8 = 64 cells. Small enough to read at a glance on a phone, large enough to hold ~3 large
  pieces of planning. 9×9 (Woodoku) and 10×10 (1010!) are the common alternatives; 8×8 makes each
  piece a bigger fraction of the board → more tension per decision, shorter games.
- Dark recessed board, bright glossy blocks (design doc §3).

### 1.3 Piece set and generation
- Polyominoes from 1 to 9 cells: monomino, dominoes, straight 3/4/5 in both orientations,
  2×2, 3×3, L/J shapes in various orientations (3- and 5-cell), T, S/Z, small corners.
  **Orientation is fixed** — orientations are separate pieces. Removing rotation removes a whole
  input verb and makes each tray a hard constraint.
- Tray generation is *(unverified)* not uniform. Observed behaviour suggests weighting toward
  pieces that fit and toward pieces that enable clears early, harsher trays later or after long
  streaks ("the game knows when to hurt you"). The design doc's §4.4 describes the plausible
  engineering approach: score candidate trays by mobility / dead-end probability.
- **Why it works:** a 3-piece tray is a micro-puzzle: *order matters* (placing A might block B).
  Not rotating means the shape is a promise you have to honor.

### 1.4 Scoring and combos
- Points per placed cell, plus a large bonus per cleared line, with **multipliers for multiple
  lines at once** and a **combo/streak** counter for consecutive turns that clear *(exact formula
  unverified)*.
- Callouts ("Good", "Great", "Excellent", "Unbelievable") escalate with clear size. Full-board
  clears get a special bonus.
- **Why it works:** a combo streak makes *every* move after a clear tense — you're protecting the
  streak — which gives a casual game a skill ceiling without new rules.

### 1.5 Fail state & session length
- Only fail: tray has no legal placement. No lives, no timer.
- Sessions: a beginner game lasts a few minutes; skilled games can last much longer. The game
  feels "fair" because you can always see the death coming one tray ahead.
- Restart is one tap. The best-score line is always visible — beating it is the real goal.

### 1.6 Difficulty curve
- No levels in classic mode. Difficulty rises implicitly as the board gets messy and *(unverified)*
  as the generator gets meaner with score. It's a slow squeeze, not a cliff.

### 1.7 Structure
- **Classic** (endless) and **Adventure** (level-based goals, e.g., collect gems / reveal picture by
  clearing tiles). Adventure adds a progression map — goals give finite, completable sessions.

### 1.8 Retention hooks
- High score + "new best!" fanfare; best score shown during play (near-miss pull).
- Streak/combo excitement inside a session.
- Adventure levels give a meta-progression.
- Instant restart, no load screens.
- Zero learning curve → huge top-of-funnel; depth comes from planning and combo play.

### 1.9 Monetization (observed)
- Ad-supported: interstitials between games, rewarded ads for revives/continues
  *(details vary by version)*. Remove-ads IAP. No pay-to-win pieces in classic play.
- **Lesson for us:** the core is monetization-neutral. A revive is the only gameplay-touching
  monetization; we will avoid even that (cosmetics + optional supporter IAP only).

### 1.10 Why each choice works (the distilled lessons)
| Choice | Effect |
|---|---|
| 8×8, no rotation | Each piece is a hard constraint; decisions are fast and weighty |
| 3-piece tray, all must be used | Ordering puzzle; you can "see" doom coming → fairness |
| Rows + columns clear | Two axes of opportunity; crossing clears feel like discoveries |
| Preview highlights lines-to-be | Turns the payoff into anticipation *before* commitment |
| Combo streak | Adds skill ceiling with zero new rules |
| Glossy faux-3D blocks, dark board | Pieces feel like objects; clears feel like destruction |
| No timer | Low-stress, playable anywhere, one-handed, interruptible |

---

## 2. Meowdoku

*(The design doc characterizes Meowdoku as a cat-themed constraint-satisfaction puzzle in the
Queens family. I'm treating its rules as the doc describes them.)*

### 2.1 Core loop (one puzzle = 1–5 min)
1. An N×N grid divided into **colored regions** (N regions).
2. Place exactly **one cat per row, per column, and per region**; cats may not touch, including
   diagonally.
3. Tap cycles a cell: empty → **X** (my own "not here" mark) → **cat**. Players mark eliminations
   to reason, Sudoku-style.
4. Solve → cats celebrate → next puzzle.

### 2.2 Board
- Typically 5×5 to ~10×10 by difficulty. Regions are irregular, pastel, gutter-separated.
- The single focal decorative element (cats) is the reward symbol.

### 2.3 Generation & fairness
- Every puzzle must have **exactly one solution reachable by logic** (no guessing). Pipeline per
  doc §2.2: sample valid cat placement → grow N regions around it → uniqueness check (count
  solutions to 2) → human-technique solver → difficulty by techniques/steps.
- **Why it works:** the guarantee "there is a logical path" is what lets players keep trying
  instead of rage-quitting. Unfairness kills puzzle games faster than difficulty.

### 2.4 Scoring / fail state
- Puzzle games of this type generally don't score; the reward is completion (and maybe time/stars).
  Mistake limits or "hearts" may exist *(unverified)*. Fail state is soft: you are stuck, not dead.

### 2.5 Session & difficulty
- A puzzle takes minutes; daily puzzles cap consumption → anticipation. Difficulty curve is
  explicit by size and technique (e.g., "naked single" → region-pair exclusion → contradiction).

### 2.6 Structure & retention
- Level progression, daily puzzle, collectible cats/themes *(likely)*, streak tracking.
- The emotional hook is **calm competence**: "I'm smart, and the cats are happy about it."

### 2.7 Monetization
- Likely ads + hints + cosmetics *(unverified)*. Hints are the classic puzzle monetization lever.

### 2.8 Why each choice works
| Choice | Effect |
|---|---|
| Queens-style rules | Proven daily-puzzle hook (LinkedIn Queens) with near-zero rules text |
| Region colors | Constraint is *visible* — you see the regions |
| X marks | Lets players externalize reasoning → reduces cognitive load |
| Cats as tokens | Turns an abstract CSP into something warm; the reward has a face |
| Guaranteed logical solvability | Players trust that stuck = "I missed something" |

---

## 3. Side-by-side

| Dimension | Block Blast | Meowdoku |
|---|---|---|
| Mode | Endless, score attack | Finite puzzles, completion |
| Input | Drag & drop | Tap cycle |
| Decision type | Spatial packing under uncertainty (future trays) | Pure deduction, full information |
| Randomness | Tray RNG | None during play (generated offline) |
| Fail | Hard (board locked) | Soft (stuck) |
| Session | 2–15 min, open-ended | 1–5 min per puzzle |
| Reward cadence | Every few moves (clear) | End of puzzle (+ micro: each cat) |
| Skill expression | Planning, combos, space hygiene | Technique recognition |
| Retention | Best score, combos, adventure levels | Daily, progression, cosmetics |
| Mood | Punchy, vivid | Calm, cozy |

## 4. What a third game in this tier must have (synthesis)
1. **One verb.** Drag-place or tap. Not both in the core.
2. **A visible rule.** The board state itself tells you what will happen next (Block Blast's
   line-preview; Meowdoku's colored regions).
3. **A frequent micro-reward** (every ~3–5 moves) and a rarer macro-reward (combo / solve).
4. **A fairness contract** the player can feel: "I could see it coming" or "there is a logical path".
5. **Depth from interaction of simple parts**, not from added rules.
6. **Instant restart** and a visible personal-best target.
7. **Feel**: sub-frame acknowledgment, choreographed clears, material-feeling pieces.
8. **A face for the reward** (Meowdoku's cats; Block Blast's shattering glossy tiles + callouts).

## 5. What I explicitly don't want to inherit
- Rewarded-ad revives (they distort fail-state design and erode trust).
- Picture-reveal adventure mode (fine, but it's Block Blast's signature, not ours).
- Cats or any mascot evocative of Meowdoku. Glossy "candy" bevel identical to Block Blast's.
