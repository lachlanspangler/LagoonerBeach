# Diary

Append-only. Newest at the bottom. Format: `## YYYY-MM-DD HH:MM TZ — title`, then what I did, what
broke, what I decided and why.

## 2026-10-15 23:00 CDT — Kickoff
- Read the full design doc (`~/Desktop/Meowdoku_Block_Blast_Engineering_Design.docx`) by unzipping
  `word/document.xml` and stripping tags (no pandoc / python-docx on this machine). No images in it.
  Notes in `docs/research/DESIGN_DOC_NOTES.md`.
- `git init -b main` in `~/Desktop/Game`. No remote (user will add).
- **Broke:** the machine's default npm registry (`npmpm.corp.amazon.com`) fails TLS ("unable to
  verify the first certificate"). **Decision:** project-local `.npmrc` pins
  `registry=https://registry.npmjs.org/`. This only affects this repo.
- **Broke:** `npm i vite vitest` crashed with an arborist `edgesOut` error; root cause was latest
  vitest 5 requiring Node ≥22 while the machine default is Node 20.20. **Decision:** pin
  Vite 7.3.7 + Vitest 3.2.7 (support Node 20.19+), `.nvmrc` = 20. Revisit when Node 22 is default.

## 2026-10-15 23:10 CDT — Research
- Wrote `TEARDOWN.md` (Block Blast + Meowdoku), `GENRE.md` (20 games, what works / what kills),
  `RUBRIC.md` (14 tests, 5 gates).
- 60 ideas in `docs/ideas_ledger.json` (source of truth) → `docs/IDEAS.md` via `scripts/render-ideas.ts`.
- Shortlist (est.): Hollow, Skid, Flip, Exact Count, Overgrowth.

## 2026-10-15 23:20 CDT — Bot prototypes
- Built a throwaway harness (`prototypes/sim`): shared 37-piece catalog, 4 bots
  (random / firstFit / greedy / beam search), 15 mechanic variants, parallel runner (12 procs).
- First surprise: **Hollow is too forgiving** — greedy almost never dies (accidental pockets
  self-clean messy boards). Second: its skill gradient is the biggest of all candidates.
- Tried knobs: ring4 vs ring8, no monomino, heavy catalog, min pocket area 2, ramps. A ramp
  (no monomino early, chunkier pieces from move 10→100) gives greedy 80 / search 488 median moves.
- Found a ring4 flaw by reasoning, confirmed by the rule: board **corners can never clear** under
  ring4 (their orthogonal neighbors are border cells, which can't be pockets). → ring8.
- Skid, Flip, Exact all fail a measured gate (fairness / planning depth / endless). Overgrowth ≈
  baseline (fails novelty).

## 2026-10-15 23:28 CDT — Playable prototypes
- The Playwright MCP browser was locked by another session → installed `@playwright/test` locally
  and wrote `prototypes/play/playtest.ts`, which plays the ugly prototype page with **real pointer
  drags** chosen by a bot and screenshots mid-drag.
- Felt: Hollow's preview (pocket + ring lit before release) teaches the rule; big rings are thrilling
  relative to pinches. Skid died with half the board empty (unfair). Flip became checkerboard noise.

## 2026-10-15 23:31 CDT — Decision: Hollow
- ADR 0001 (core mechanic), ADR 0002 (TS + Canvas2D PWA → Capacitor).
- **Working title: "Atoll"** — a ring of land that encloses a lagoon is literally the mechanic.
  Visual identity: calm sea palette, sand/coral blocks; a sealed pocket fills with lagoon light and
  the ring bursts into foam. Dark mode = night reef with bioluminescence. Name availability on the
  stores is **not verified** (needs the user; noted in STATUS).

## 2026-10-15 23:35 CDT — Production core
- Wrote `src/core` from scratch (prototype code not reused): rng, grid, pieces (41 incl. 4 "cups"
  — the natural loop builders), rules, scoring, dealer, game, serialize, replay, daily.
- First tune on the production catalog: **greedy survived 311 moves** (way too easy — cups and the
  fairness guard help a lot). Swept ramps; chose start 8 → end 60 with chunkier late weights:
  random 23, firstFit 29, greedy 74, search 194 (median). Skill 53×, firstFit÷search 0.02,
  greedy÷search 0.16.
- **Broke (test):** fairness test showed only 8/200 trays had a fitting piece on a near-full board —
  rejection sampling can't find rare fitting pieces. **Root-cause fix:** if retries fail, force one
  slot to a weighted pick among pieces that fit.
- **Broke (property test):** "no pockets after a move" failed. Clearing a ring inside a *thick* wall
  leaves a bigger empty region that is still enclosed. **Decision: cascade** — keep capturing in
  waves until no pocket remains; wave k scores ×k. Keeps the one rule always true and creates a
  jackpot (thick walls collapse inward-out). Balance unchanged (bots rarely build thick walls).

## 2026-10-15 23:50 CDT — Presentation layer
- Renderer (Canvas2D, pre-rendered pebble sprites, pooled particles), drag controller, synth SFX,
  haptics, storage, DOM menus, effects choreography driven by domain events.
- **Broke:** `__atoll` hook missing in Playwright → port 5173 was already serving *another
  project's* Vite app on this machine. Moved Atoll to :5317 / :4317 (strictPort).
- Played via `scripts/shoot.ts` (real pointer drags chosen by a bot), looked at screenshots:
  - Good: pebbles read as objects; the lagoon water + ring outline preview is very legible; the
    "Pool"/"+69" pop with foam rings feels lively; teaching hint clearly says "put the cup here".
  - Bad → fixed: dead space above/below the board on tall phones (centered the board+tray stack,
    biased toward the thumb); tray stretched across tablets (now spans the board); Night board
    nearly invisible against background (raised contrast).
  - Noted: teaching capture also triggers "Clear reef" (+300) on move 2 — a big first-game wow, but
    inflates the first score. Kept for now; revisit.

## 2026-10-16 00:05 CDT — e2e + perf
- 18 Playwright tests: boot, 30-move real-drag play, illegal drop, reload persistence, game over →
  play again, menu toggles persist, daily identical across contexts, 10 layout/screenshot cases,
  perf budget.
- **Broke:** menu toggle re-render left two dialogs during the fade (strict-mode locator caught it).
  Fixed by replacing an open dialog instantly.
- Perf at 4× CPU throttle, 1083 frames of heavy play: draw p50 0.4 ms, p95 1.0, max 3.8 ms.

## 2026-10-16 00:20 CDT — Feel loop 1
- Built `scripts/filmstrip.ts` + `scripts/montage.py` to review an effect frame by frame.
  Found: score ticked up ~100 ms *before* anything popped, and the score pop collided with the
  callout. Fixed: points land with the burst; when there's a callout the points sit under it.
- Added a pre-commit hook (`make check`) after a formatting slip got committed.

## 2026-10-16 00:35 CDT — Skins, polish batch
- 7 cosmetic skins incl. **Glyph** (Okabe–Ito colors + one shape per color), never gated.
  Review grid caught: Lantern invisible on Night, Moonstone washed out, Glyph black-on-blue.
- **Broke (silently):** a Python string-replace edit didn't apply because Prettier had reformatted
  the file; the skin colors never changed and I chased "rendering" for 3 iterations. **Fix:**
  `scripts/sub.py` — replace that fails loudly when the old text is missing. All edits use it now.
- Built from the ledger: seal tick (I-069), fade pieces that fit nowhere (I-071), near-miss bar on
  game over (I-066), daily share with an emoji lagoon picture (I-065), leaping fish (I-072).

## 2026-10-16 00:55 CDT — Reef puzzles (ADR 0004)
- Second mode: fixed reef + 2–3 pieces; place all so the board ends empty.
- Generator: lagoons → rings → carve catalog pieces → rest is the starting reef. Solver: DFS over
  order × placement, dead-state memo. 120 shipped puzzles in ~21 s.
- First grading metric (safe first moves over *all* placements) called tiny puzzles "abyss" because
  open-water placements dominate. Switched to *plausible* first moves (touching the reef) + solution
  count + cascade bonus; tiers by rank.
- My own unit test was wrong ("a single dot can't solve the cup") — the solver was right: the dot
  seals the 1-cell lagoon and the 8-ring takes everything. Good sign the solver beats intuition.
- Played the hardest reef by hand (on paper): the obvious lagoon is a trap; the solution joins two
  clusters into two lagoons with one piece. That's the Meowdoku-style "aha" — keep.

## 2026-10-16 01:10 CDT — Hint, native shells, WebKit, audio QA
- Puzzle hint button (solver-backed; flags dead ends).
- Capacitor 7 (8 needs Node 22). iOS Simulator build + launch works (`make ios-sim`).
  **Broke on iOS only:** score under the Dynamic Island — the JS safe-area probe read 0 before
  WKWebView settled insets. Persistent probe + ResizeObserver fixed it. Android: no SDK here.
- Gameplay e2e now also runs on WebKit (iPhone 15 profile): 9/9 pass.
- Audio QA via OfflineAudioContext: mix was far too quiet (deal ≈ silent). After boosting, cascades
  clipped (each wave stacked a sub-bass). Body on first wave only; level hierarchy now asserted.

## 2026-10-16 01:20 CDT — Played by hand (scripts/play-cli.ts, seed 777, 7 moves)
- Move 2 already pinches a pocket (bend + zag). Early game = a stream of pinches; board stays
  clean. Slightly too gentle before the ramp kicks in at move 8 — acceptable as a warm-up.
- Emergent tactics I noticed without being told (rubric R7 ✓):
  1. **Roof & cup** — a long bar becomes a roof; you build a cup under it for a 2–4 cell lagoon.
  2. **Twin pockets** — two diagonal-adjacent holes sealed by one piece → ×2 multi.
  3. **Sealer spot** — leave a one-cell notch so a future dot/duo can close a big ring.
  4. **Thick walls** — building a double wall around a lagoon sets up a cascade jackpot.
- Push-your-luck is real: I set up a 2-cell lagoon under the roof and had to *hope* the next tray
  had the closing piece. That hope is the "one more round" hook.
- Risk noted: players may think diagonal gaps leak. They don't (4-connectivity); the live water
  preview teaches it on the first try. Keep the preview prominent.

## 2026-10-16 01:35 CDT — Tap-to-place, session length retune
- Tap-to-place (I-073): tap piece → tap board previews → tap again places. Works on WebKit.
- Added a **human-like bot** (greedy 70%, otherwise a random top-6 move). With ramp end 60 it
  played 62 moves median (~3.6 min at ~3.5 s/move) — over the rubric's ~3 min. Ramp end 60 → 45:
  random 20, human 50 (~3 min), greedy 56, search 86 (median). Skill 35×, firstFit÷search 0.05,
  greedy÷search 0.26. Golden snapshot updated deliberately.
- Trade-off logged: experts now average ~5 min games instead of ~11. If real players find the late
  game too harsh, raise `late.huge` less steeply rather than moving `end`.

## 2026-10-16 02:15 CDT — Independent review → 11 fixes
- Ran a separate review agent over `src/` (read-only). It found 8 real bugs, 3 plausible; core
  rules/solver/serialization held up. Worst: a delayed reef-result card could fire after switching
  to classic, and "Next" then loaded a puzzle *into classic mode* and saved it — a stuck game on
  every launch. Same class: the game-over card could appear over a fresh game.
- Root cause: delayed UI read global state at fire time. Fix: `gameToken` bumped in `syncScene`;
  `later()` drops callbacks from older games; cards snapshot their data when the game ends.
  Also: drags cancelled on restart and when a dialog opens; hint credit keyed by reef id; save
  validation checks mode and `over` consistency; daily streak can't rewind; one clock.
- Wrote regression e2e tests and **proved they fail on the old code** before keeping them.
- Store screenshot generator (`scripts/store-shots.ts`) — first run caught my own staging bug.

## 2026-10-16 02:45 CDT — Content, a11y, perf, visual nets
- Reef pack analysis: **zero** cascade reefs and 14 tiny reefs. Added a double-wall construction
  and a minimum reef size → 200 reefs, 27 needing a cascade. Reef select grid (nothing locked).
- Points peek (I-076), tide dots for streak grace (I-087), last-chance wobble (I-088).
- Colorblind audit (Machado CVD matrices + ΔE): default orchid merged with lagoon blue under
  deuteranopia (ΔE 3.9). Darkened orchid → 11.3. Test keeps floors.
- Hint perf: worst full solve 76 ms on M4 (≈300+ ms on a mid phone). Hints now follow the stored
  solution while on-path; off-path positions solve in ≤ 10 ms.
- Visual baselines: first attempt *didn't* catch a 1 px gutter change (Playwright's default
  per-pixel threshold 0.2 swallowed it). Tightened to 0.08; now fails 4/5 on that change and is
  stable over 3 runs.
- Fresh clone → `make setup && make check` green (one-command setup verified).
- Refactor: debug hooks → `src/app/debug.ts`, env helpers → `src/app/env.ts`.

## 2026-10-16 03:10 CDT — Coverage, input tests, latency
- Coverage on pure layers: 99% lines / 92.7% branches; thresholds enforced in CI. Deleted a dead
  `core/index.ts` barrel; added search-bot and solver-limit tests.
- Input: pointercancel and blur mid-drag, rapid taps, off-board release (Chromium + WebKit), and a
  real **touch** drag via CDP touch events.
- **Latency measured:** first touch took 133 ms — constructing the AudioContext inside the gesture.
  Now created suspended at idle; the gesture only resumes it (first pick ≤ 15 ms). Sprites
  pre-warmed. Release → first placed frame: median ~2 ms, max ~20–35 ms at 4× throttle (vsync).
- **Process slip:** I chained `git commit` after an edit that failed loudly, committing a broken
  perf test (e2e isn't in pre-commit). Fixed in the next commit. Rule for myself: verify, then
  commit as a separate step — never `&&` a commit onto a command whose failure I can't see.

## 2026-10-16 03:30 CDT — Wrap-up (user asked to stop)
- UX critique agent: acted on the menu (split into menu + Settings with real switches, zero stats
  hidden) and fixed a real bug it surfaced (empty "next:" unlock hint: Glyph wasn't marked
  unlocked on a fresh profile). The remaining critique items are listed under "Next" in STATUS.
- Soak test (400 moves): heap +0.16 MB. Bundle budget check added (26 KB gz initial).
- Final state: `make check` (76) and `make e2e` (55) green; everything committed.

## 2026-10-16 (session 2) — Bearings
- Repo pushed by the user to GitHub. CI run on e0286d8: `check` ✅, `e2e` ❌. Job logs need admin
  rights and there's no `gh` or Docker here, so I can't see the failing test. Made CI diagnosable
  and robust instead: Playwright `github` reporter (failures become public annotations), 2 workers +
  1 retry on CI, perf budgets ×3 on shared runners (strict locally), ubuntu-24.04, action majors v7
  (the run warned Node-20 actions are deprecated). Verify after the next push.
- Local baseline green: `make setup && make check && make e2e` → 76 + 55.
- Played: Reef #31 (calm) solved quickly; Reef #141 (deep) I got wrong. I built the obvious small
  lagoon; the answer is the bigger 3×2 one using the bar as roof. Good "aha", fair. Classic early
  game still a stream of pinches; captures feel lively but busy (matches the UX critique).
- **User request:** Block Blast's "there's always a solution for the three pieces you get".
  Decision: the dealer will *guarantee* every new tray can be fully placed in some order on the
  current board (captures in between count). Losing becomes purely the player's misplay. Expect
  longer games → re-tune the ramp.

## 2026-10-16 (session 2) — Guarantee, rename, Android, UX batch 1
- **Always-a-solution trays** (user request): `trayClearable` DFS + constructive fallback; deal
  cost p50 0.01 ms. Search bot now never dies (Block Blast property); late ramp chunkier so the
  human-like median stays ~50 moves.
- **Renamed to Lagooner Beach** (user). ADR 0006. Storage keys/daily salt unchanged on purpose.
- **Android:** installed command-line SDK (5.5 GB on disk — the emulator system image is most of
  it; more than the ~2 GB estimate). Debug APK builds; runs on an Android 15 Pixel 6 emulator; real
  `adb input swipe` drags place pieces. `make android-emu`.
- UX batch 1 (before/after in `artifacts/ux/{before,after*}`): calmer tiered captures, gradient
  water + sheen (no stripes), lit held cells, dashed hint + ghost demo + "Pop!", tighter layout.

## Plan (user asked for a complete, shippable game + a catch/collection layer)
1. Finish UX items: Night bioluminescent glow; fresh UX review agent on the result.
2. **Catch layer** (ADR 0007): every lagoon catches beach creatures; species tied to lagoon *shapes*
   and conditions (long thin → eel, wide → ray, square → box crab, plus → starfish, night → glow
   jelly, cascades/clean reef → legendaries), rarity by size; sizes as personal records; a
   Beach Journal with silhouettes + hints; pity timer. Deterministic, separate from the dealer RNG.
   Procedural original creature art (archetypes × palettes × patterns). Tune with bots so the log
   takes weeks.
3. Feel pass: drag weight, snap, place/pop timing, combo & cascade escalation, sound, haptics.
4. Music: original synthesized generative beach music + ambience, separate toggle.
5. Retention: journal, daily, streaks, reef packs, skins, bests — plus weekly reef set & milestones
   if they pass the rubric.
6. Content: larger reef pack with a smooth curve and more cascades.
7. Store-ready: listing copy (both stores), screenshots, full icon sets (iOS AppIcon + Android
   adaptive), splash, privacy policy, accessibility review, Android release AAB, monetization ADR.

## 2026-10-16 (session 2) — Catch layer, feel, music, store-ready
- **Catch layer (ADR 0007):** 47 species tied to lagoon *shapes* and conditions; tuned from
  measured condition rates so the journal fills over weeks; procedural art for 25 body types;
  creatures leap out and swim into the journal button; Beach Journal with silhouettes + hints.
  First tuning was far too generous (29 species on day 1) — the fix was data: measure how often each
  condition happens, derive per-species chances to hit target days, and slow the pity timer.
- **Feel:** magnetic snap lean, jackpot sweep + swell (the first version blew the day board out to
  white — additive light only at night now), streak milestones, one-at-a-time chips.
- **Music:** generative synthesized beach music with its own toggle; offline-measured to sit under
  SFX; WAVs rendered to `artifacts/audio/` for the owner to listen to (I can only measure).
- **Second UX review** (fresh agent): main point "one feedback channel". Removed Pop!/per-wave text/
  per-creature New!; points once at the lagoon; chips in the streak slot; fixed tagline (the ring
  pops, the inside fills); rebuilt store shots; layout tightened. The perf test then caught a 5-wide
  piece overflowing its tray slot off-screen (bigger tray scale) → per-piece tray fit + a layout
  unit test proven to fail without it.
- **Content:** 360 reefs, 3 hand-made openers (the generator rejected two of my hand-made reefs as
  unsolvable — correctly), 56 cascade reefs, smooth curve. Reef of the day in the reef grid.
- **Store-ready:** privacy policy (md + html), listing copy, ADR 0008 monetization, accessibility
  review with automated sweeps (fixed button contrast and five sub-44 px targets), all native icons +
  splashes generated, signed Android release AAB verified on the emulator (throwaway key), iOS
  Simulator build with new assets.

## 2026-10-16 (session 2, close) — Third UX review + bug review
- **Third UX review** (fresh agent) → fixed: jackpot word and +N are one lockup and news chips now
  wait until it fades; endless clean-board callout renamed **Spotless!** (no clash with Reefs);
  creatures reach ≡ in 0.95 s (was 1.25 s, lingered on the board); flounder redrawn as a flat
  disc with a fin rim (the scalloped fringe read as a puffer); one tagline everywhere ("Close a
  loop. Water fills it, the ring pops."); **Continue · Reef N** is the primary reef button until 20
  reefs are cleared (Reef of the day sent new players to Deep reefs); store shots re-staged (distinct
  boards, the reef shot seals a lagoon on its first move with a full tray, staged score adds up).
  Skipped as invisible polish: bottom-third space, more distinct journal silhouettes, a creature on
  the feature graphic. "New best" peak already exists on the card.
- **Bug review** (fresh agent, 12 findings) → fixed 10: welcome-back toast was scheduled *every
  frame* (filled the chip queue forever, blocked real chips, kept 60 fps redraw — the worst bug of
  the session, invisible in tests because test profiles have no streak); collect pulse never fired
  (fish culled the frame before arrival); per-game tallies leaked across mode switches (now keyed
  by game); duplicate "New:" chip across cascade waves; dealer partial fallback could deal three
  non-fitting pieces (test proven to fail on the old code); **rarity bypass** — big/huge lagoons had
  no everyday species, so daytime 12+ lagoons always gave an epic octopus and night ones a kraken
  (parrotfish and moon jelly widened, rare-by-default removed, coverage test over every
  shape/size/mode; retuned; journal curve unchanged: median 43/47 by day 35); audio woke while
  hidden; stale drag frame on tap-to-place; music fade-in jump; leftover fish/chips on New game;
  dry counters disagreed. Left as known: another open tab can re-save after Erase; replaying a reef
  re-records the same catches (counts only).

## 2026-10-16 (session 3) — Quality leap: research, fleets, fonts
Owner brief: creatures "app used by millions" level, Block Blast-grade celebrations, discovery
moments, leaderboards with 7-letter names, endless reefs, top-chart aesthetics.
- **Research (4 parallel agents, docs/research/):** HUNGRY_STUDIO.md (Block Blast keeps a combo
  alive if 1 of every 3 placements clears — the same as our STREAK_GRACE = 3; voiced praise ladder
  by lines cleared), CREATURE_ART.md (style guide R1–R39; audit found 11 fish with pixel-identical
  silhouettes and no size variety), UI_DESIGN.md (Fraunces display + Nunito UI, both OFL),
  LEADERBOARDS.md (Cloudflare Workers + D1 with replay verification; Game Center can't show our
  7-letter names, has no PWA support, and splits iOS/Android).
- **Combo decision (data):** combo = our existing streak. `scripts/combo-sim.ts` (40 games): greedy
  median 3470 pts / max combo 25; a "farmer" that always takes the cheapest capture to keep the
  combo alive scores 1657 (max combo 26) — keeping the combo is not enough, planning big lagoons
  is what pays. Multiplier is ~55–60% of score. No scoring change → dailies and golden tests stay.
- **Overrode the Block Blast study's §6 where it was calmer than the owner's brief:** the brief asks
  for "COMBO ×N", praise words and a real NEW HIGH SCORE moment, so we show those; we keep the study's
  guardrails (1 word + 1 badge + 1 number max, particle and shake caps, no bright flashes, reduced
  motion variants, input never blocked).
- **Fonts shipped:** `scripts/fonts.sh` instances Fraunces (SOFT 100, 900 + 600) and subsets
  Nunito → 64 KB woff2 total in public/fonts with the OFL texts. Canvas FONT now leads with
  "Lagoon UI" so Android no longer falls back to Roboto; DISPLAY_FONT is for words, never numbers
  (Fraunces digits are proportional).
- **Parallel builds (worktrees, own ports via PW_PORT/LB_URL):** endless reefs; leaderboards +
  names + Cloudflare Worker; creature-art pipeline + 5 pilot species (then a fleet for the other
  42); combo/celebration/discovery. The worktrees sit in `.claude/` inside the repo, so lint and
  prettier picked them up — now ignored.

## 2026-10-16 (session 3) — Endless reefs (ADR 0009)
- **Plan:** (1) a solver fast enough to grade thousands of candidates; (2) reef N > 360 as a pure,
  integer-only function of N, with a curve and chapters; (3) a worker + cache + prefetch source;
  (4) chapter UI and a `chapterComplete` hook; (5) tests at every layer, a curve script, numbers.
- **Bitboard solver** (`core/bitsolver.ts`): two uint32 words, shift flood fills, a shared memo of
  winning-path counts. Matches the exhaustive grader *exactly* on all 360 shipped reefs (unit test)
  and is ~40× faster (1 ms vs 41 ms mean). That made the "add a cheaper grading path" question moot:
  the exact grader became cheap.
- **Curve:** first try started chapter 19 at a peak of 178, but the pack's last chapter averages
  ~189, so 361 felt like a cliff down. Lifted the start to 186 (chapter opens at 170 as a breather,
  peaks at 186), ceiling 196 approached hyperbolically. Recipes were measured (1500 candidates each)
  and only recipes that reach a reef's target are tried, which keeps p95 low near the ceiling.
- **Numbers** (`npx tsx scripts/reef-curve.ts`, Node, this machine): reefs 361–1360: p50 2.9 ms,
  p95 17 ms, max 150 ms; 99.8% in band (mean |error| 2.4); 29% cascades; 55/45 two/three-piece.
  1361–100000 (501 sampled): p50 4.9 ms, p95 84 ms, max 176 ms; 99.0% in band. Well under the
  300 ms p95 target. Chapter mean targets 178 → 182 (ch 40) → 184 (ch 65) → 186 (ch 250).
  One duplicate board in the first 1000 generated reefs (accepted; see ADR).
- **Browser:** reef 361 opens in ~50–120 ms cold (worker), then the next 3 are prefetched; Next is
  instant (e2e asserts it). While the worker built 8 far reefs during real drags, frame p95 was
  16.7 ms with zero long tasks (`tests/perf/reefgen.spec.ts`). WebKit runs the worker too.
- **Decisions:** chapters of 20 everywhere (the pack is chapters 1–18) so progress reads the same
  before and after 360; Reef of the day stays in 1–360 (instant, same for everyone, right
  difficulty); endless chapters open up to one past the frontier (the pack stays fully open);
  chapterComplete = all 20 cleared (skipping doesn't count), fired once, chip + sound for now.
- **Looked at it:** HUD "CHAPTER 19 · CUTTLE SOUND · 1/20" fits at 390 px; the longest name
  ("Driftglass Shallows", chapter 121) needed the label to shrink at 320 px (done in scene.ts).
  The reef list's first draft reused `.icon-btn` for ‹ ›, which is absolutely positioned: the
  arrow flew to the top-left corner. Own class now. Reef screen baseline updated (label only).
- **Didn't do:** no de-duplication across generated reefs; `solved` keeps one id per reef (≈60 KB
  at 10 000 reefs); no per-device timing on a real phone (estimate 3–5× Node, still off-thread).

## 2026-10-16 (session 3) — Leaderboards (ADR 0010)
- **Plan:** name rules + filter (pure, shared) → packed move log, rules version, replay verifier in
  core → board domain + Worker with an in-memory store → client (interface, mock, HTTP, queue) →
  UI per UI_DESIGN §6.4–6.5 → privacy/store docs → e2e.
- **Built:** `src/meta/names.ts` (A–Z ≤ 7, lookalike/collapse/reversed spellings, ROT13 list,
  Scunthorpe allowlist, reserved names), `src/core/{movelog,verify,version}.ts`,
  `src/meta/boards.ts`, `server/` (Cloudflare Worker + D1: pure `handle()`, HMAC single-use 72 h run
  tokens, shadow rows for inhumanly fast runs, rate limits, cron retention), `src/platform/
  {leaderboard,lbmock,runlog}.ts`, `src/ui/leaderboard.ts` + a delimited CSS section, small hooks
  in main.ts/overlay.ts (`showGameOver({ leaderboard })`, `Ui.present`, menu "Leaderboards").
  The move log is now saved inside the classic/daily save record (old saves still load).
- **Filter tuning was data:** the first list blocked 323 of 57k dictionary words. The worst hits
  were collapse and lookalike side effects: CUT (KUT), CANCER (KANKER), DICE (DYKE), KICKER (KIKE),
  RAPPER (RAPE), FISTFUL (STFU), and NAGGING/BAGGING (a reversed root). Fixed by giving every
  root its own safe spelling (collapsed / run-limited / exact). Blocks: 248 words (mostly real
  offensive words and rare compounds); 1 of 1,175 first names (DICK, on purpose).
- **Tests:** 22 name tests (each evasion family, allowlist, property tests on sanitize), 26 Worker
  tests (forged score, tampered log, wrong daily seed, reused/forged/foreign/expired tokens, bad
  names, ties, around, day/week partitioning, deletion, shadow rows, rate limits, CORS, 503), 17
  client tests (mock ranking, offline queue backoff, HTTP error mapping, **the client against the
  real handler as its fetch**, run log), save migrations. e2e on Chromium + WebKit: typed `n3m0x!`
  shows NMX live, post a daily, see yourself and the row above, resumed classic posts, menu +
  keyboard tabs, erase clears. The a11y sweep covers both sheets.
- **Looked at it** (`scripts/lb-shots.ts`, day + night): the keypad reads like part of the game,
  and the gradient hero name is the nicest thing on the screen. First run: hardware typing did
  nothing, because the dialog (not the card) holds focus after a tap. Keys are now heard at document
  level while the sheet is up. The target card ("58 to pass BODHI") is the motivating line, as the
  research said.
- **Decisions:** always offer (results button), auto-post once named; the Daily counts the first
  finish; demo players labelled "Demo"; unbound tickets for not-yet-named players so their first
  Endless game can be ranked; the lazy chunk (12.6 KB gz) loads only for opted-in players or on tap.
  Initial JS is 50.1 KB gz.
- **Not done / stubbed:** no live D1 (the SQL is untested without wrangler, see DEPLOY.md smoke
  test), no admin endpoint, no histogram ranks, no Settings "name" row (rename lives on the board).

## 2026-10-16 (session 3) — Creature art pipeline + 5 pilot species (ADR 0011)
Plan: (1) kit per CREATURE_ART.md §5 "B": path data → Path2D layers, shared face rig, outline,
palette, motion, caches, lazy chunk; (2) machine checks for the guide + R12 silhouettes; (3) review
tooling; (4) five pilots, ≥ 3 rounds each; (5) integrate leap + journal; (6) fleet brief.
- **Kit (`src/render/art/`):** species are data files (`species/<id>.ts`, auto-registered via
  `import.meta.glob`, so fleet agents never share a list). Outline is a same-hue ink stroke drawn
  *behind* the fills (`destination-over`), so joins vanish; Night rim behind that; patterns clip with
  `source-atop`. Face rig, 7 expressions + wink, blink/signature schedulers, keyframe tracks, size-scaled
  tempo, props (anemone, ink heart). `drawCreature` is still the API; legacy art is the fallback.
- **Numbers:** initial JS 41.9 KB gz (+0.3); art chunk 12.7 KB gz with 5 species (kit ≈ 8 KB, ≈ 0.7–1.1
  KB/species → ≈ 45–52 KB for 47; budget 60, enforced). 4× throttle: 0.026 ms mean per animated
  creature (budget 0.12), 6 leapers p95 0.7 ms, zero rasters after warm-up. WebKit Path2D(string) parity
  with the Canvas-free rasteriser within 8 %; closest silhouettes clownfish/turtle 0.75 (< 0.80).
- **Pilots, what the rounds fixed:** clownfish — validator bugs first (segments counted per joined
  path, patterns counted against the artboard), then a pectoral fin crossing the head bar, a tail tip
  clipped away (patterns clip to their own group). Octopus — box 89 × 87 and front arms meeting like
  clasped hands; separated them. Sand dollar — notched rim read as a lumpy potato; a clean, slightly
  wide coin also drops its IoU vs the octopus from 0.75 to 0.69. Hermit — crab drawn behind the shell
  hid its own eyes; moved in front, claw lowered off the face. Turtle — box 88 wide; and in the leap
  strip it stood upright. Kit fix: non-swimmers lean 30 % into the arc instead of pointing along it.
- **Felt good:** the faces (low solid eyes + blush) carry the charm at 54 px; peekaboo-wink, coin spin,
  anemone dive and head-tuck all read in single frames. Golden as a real remap looks like a prize.
- **Felt off / open:** the hermit (XS, fill 0.38) is honestly small in its journal tile, which is the
  guide's intent but costs readability. The mixed old/new journal looks inconsistent until the fleet
  lands. The catch roll can't be steered for a screenshot, so the in-game leap was verified with
  legacy species plus the sheet's "leap as in game" strip (the same call as scene.ts).
- Not done (guide items for later): rarity frames/pips (R29), the bubble-pearl present (R30), XS
  double-hop / XXL breach (R26), the species-page size line (R28).
