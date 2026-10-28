# Status

## Final state (v1.0.0 release candidate, polish pass) — 2026-10-28
**Lagooner Beach**: *Close a loop. Water fills it, the ring pops.* Sessions 5–6 added a title screen, coral & rock
blocks, journal requirements, and an About page with a no-funding pledge. Everything is committed on `main`:
there are no other branches and no worktrees. Nothing is pushed.

**Green (2026-10-28, this machine):**
- `make check`: unit, property and server tests, lint, format and ledger sync.
- `make e2e`: 205 functional tests on Chromium and WebKit, then the 10 perf budgets run alone and serially. That includes the new block warm-up budget (≈37/38 ms against 40 ms at dpr 3 under a 4× CPU throttle). No budget was loosened.
- Release build: initial JS 62.7 KB gz (budget 64), CSS 5.8 KB (budget 6). Debug hooks and demo boards don't leak (`npm run size`).
- iOS Simulator (iOS 27, Release, this project's own "Lagooner iPhone" simulator): the title renders. This run found and fixed a ship blocker: the app had no UIScene lifecycle, and iOS 27 stops such apps at launch.
- Android emulator (`emulator-5594`, debug APK, the real WebView): title on a fresh launch, then Play onto the first-run board.
- Shots: `docs/media/after/s5/ios-simulator-title.jpg`, `android-emulator-*.jpg`.

**What's new (all your session-5 asks):**
- **Title screen** (ADR 0013, ADR 0015).
  - "Lagooner Beach" in a 2 KB Fraunces display cut, with one big Play button. When a run is in progress it reads Continue and names the mode, e.g. "Endless · 3,150".
  - Nothing else to press (your call, 2026-10-28): About and Settings live in the home menu.
  - Behind it, a calm atoll drawn with the board's own blocks.
  - Day/Night, reduced motion, Larger text and tablet layouts.
  - Tapping Play plays a synthesized chime and starts the music. The hand-off to the board takes about 370 ms.
  - Never in the way: it's skipped for deep links such as a shared Daily, for a return within 10 minutes, when Settings › "Open straight into the game" is on, and in automated runs.
- **Coral & rock blocks** (ADR 0014). Six materials, one per colour, all procedural, with no new assets:
  - brain coral
  - golden sandstone
  - sea glass
  - blue coral
  - wet porphyry
  - pink coralline crust

  They stay readable from 22 px, Day and Night. Colourblind separation is tested on the rendered sprites, and there's a non-text 3:1 boundary against the cell (tested). Pops, ring bursts and celebrations were re-checked on the new blocks. The old look is still available as the "Smooth Stones" style.
- **Journal.** Every habitat shows its requirement next to its name, plus found/total and a tick when complete. Catch rules are now just pool size and combo (your call, 2026-10-28; ADR 0007 amended): hints read "3–5 cells, ×6 combo", habitat lines "Pools of 1–5 cells · combos from ×6". No shapes, islands or cascade waves. The requirement is generated from the same rule data the game catches with, and property tests prove the two can't drift. There's also a rarity and golden summary (1 in 64, from the game's own constant), spoiler-free hints, and Switch to Night / Play Reefs nudges.
- **About** (ADR 0016).
  - A short note signed "Lachlan Spangler · grew up in Laguna Beach · advocates for marine wildlife protection".
  - It says plainly "I will not take any funding." and then "But you can donate to these charities and funds to help coastal wildlife:".
  - Reachable from Menu › About and Settings.
  - Five verified 501(c)(3)s, each with its own logo and beside a creature from the game: Pacific Marine Mammal Center, Laguna Ocean Foundation, Surfrider Foundation, Monterey Bay Aquarium and Ocean Conservancy. The evidence (EIN, IRS record and the official donate page) is in `docs/research/CHARITIES.md`.
  - Links open the charity's own page in the system browser, untracked and with no referrer.
  - ADR 0008's Supporter Pack is rejected. The store listing and privacy policy now say "no purchases".
- **Design critic:** five rounds by fresh reviewers. The last two came out at 11 A / 4 A−, then **16 A / 0 A−**. The record is in `docs/art/CRITIQUE-S6.md`.
- **Code review:** a fresh reviewer went over everything since the last push and found 11 issues. All the real ones are fixed: inert HUD behind the title, the welcome toast, OS theme flips, no board draws under the title, memory, focus, and test gaps.
- **Before/after media:** `docs/media/S5_MEDIA.md` (intro, board, every block type, journal, About). The launch → title → play clips are `docs/media/video/launch-title-play{,-night}.mp4`.

## What I need from you
1. **Sign-off on the About page:** the wording and the five charities. It's all in `src/ui/sheets.ts` (`showAbout`) and `src/meta/charities.ts`; to read it, open the game → About. Two choices I made that you may want to change:
   - The lead line is "I spent my childhood turning over rocks in the tide pools.", and the note ends with "I made this game to stand up for them."
   - Monterey Bay Aquarium (sea otters) replaced The Marine Mammal Center, so no two cards are the same cause.
2. **Charity logos:** they're the charities' own, unaltered and bundled, used only to identify each one next to its donate link. Most nonprofits have brand guidelines, so confirm with each (or tell me to drop the logos) before release.
3. **Name and trademark check** for "Lagooner Beach".
4. **Bundle id:** replace `com.example.atoll` in `capacitor.config.ts` before the first store upload.
5. **Accounts and signing:**
   - Apple Developer (team id; signing in Xcode).
   - Play Console.
   - An Android upload keystore in `android/keystore.properties` (format in `android/app/build.gradle`).
6. **Leaderboard backend (optional for launch):** see `docs/server/DEPLOY.md`. Without it the game ships with no leaderboards and "Data Not Collected".
7. **Privacy:** host `public/privacy.html` and add a contact email.
8. **Share link:** replace the `SHARE_URL = 'lagooner.beach'` placeholder in `src/ui/share-card.ts`.
9. **A real phone:** 10–20 minutes on an iPhone (iOS 27 especially, after the scene fix) and an Android phone. Check:
   - the title → Play hand-off;
   - the new blocks at arm's length;
   - the Play chime level;
   - drag feel and Larger text.

## How to ship
1. Set the bundle id, version and signing (above).
2. `make check && make e2e`. Both must be green.
3. Web: `npm run build` (add `VITE_LB_URL=https://…` for leaderboards).
4. iOS: `npx cap sync ios`, open `ios/App/App.xcworkspace`, Archive, upload. `make ios-sim` checks a Release build on the simulator.
5. Android: `make android-release` (signed AAB), then upload to Play.
6. Store copy is in `docs/store/LISTING.md`, privacy in `docs/store/PRIVACY.md`, screenshots via `npx tsx scripts/store-shots.ts`.

## What I'd do next
- **Re-shoot the store screenshots** with the title and the new blocks (`scripts/store-shots.ts`). The ones in `artifacts/store/` predate session 5.
- **The eligible-chances counter** for undiscovered species (I-201) needs a journal save-format change, so it's left for after launch.
- **Larger text is 1.12× in sheets.** The critic suggested 1.25×; that needs a layout pass, because every sheet is tested to fit at 375×667.
- **After launch,** tune catch odds and the endless curve from real play (`scripts/catch-sim.ts`, `scripts/reef-curve.ts`).

## What works
| Area | State | Evidence |
|---|---|---|
| Rules (pockets, 8-ring, cascades, scoring, streaks) | ✅ | unit + property tests |
| Dealer (ramp, every tray placeable) | ✅ tuned | independent brute-force check; human-like bot median ~50 moves |
| Determinism / saves / replay | ✅ | golden game, round-trip + corruption tests, e2e reload |
| Reef puzzles (360) | ✅ | every reef re-verified by the solver in `puzzles.test.ts` |
| Endless reefs (361+, ADR 0009) | ✅ | golden 361–370, 211-reef solvability sample to 100 000, worker e2e + frame budget |
| Catch layer + journal | ✅ | coverage, determinism, rarity and sanitize tests; e2e journal; `catch-sim` |
| Rendering / skins / themes | ✅ | pixel baselines (reduced motion), 5 sizes × 2 themes |
| Input (drag + tap-to-place) | ✅ | e2e on Chromium + WebKit, CDP touch |
| Audio (SFX + music) | ✅ | offline loudness QA: music under SFX |
| Accessibility | ✅ (except screen-reader play) | a11y sweep, contrast and CVD tests |
| PWA | ✅ | manifest; versioned, network-first SW (web only) |
| iOS (16.4+) | ✅ Simulator | `make ios-sim` |
| Android | ✅ emulator, signed AAB | `make android-emu`, `make android-release` |
| Creature art (47, ADR 0011) | ✅ | style-guide lint as errors, silhouette IoU, Path2D parity (Chromium + WebKit), draw budget |
| Celebrations + reveals (ADR 0012) | ✅ | moment ladder unit tests, no-flash, input-during-celebration, pixel baselines |
| Leaderboards (ADR 0010) | ✅ client + Worker (tests) · ⏳ no live server | names/filter, mock, replay verification, server handler tests |
| Title screen (ADR 0013/0015) | ✅ | pre-paint rule = `shouldShowTitle` (the inline script runs in a unit test), e2e Chromium + WebKit: skip rules, Continue, keyboard, inert HUD, theme flip, About from the title |
| Reef blocks (ADR 0014) | ✅ | rendered-colour CVD/greyscale e2e, non-text 3:1 unit test, warm-up perf budget, pixel baselines |
| Journal requirements | ✅ | rule-as-data equivalence over 190k contexts, gate property tests, generated hints, e2e |
| About + charities (ADR 0016) | ✅ | charities ↔ CHARITIES.md unit test, links e2e (no referrer, nothing added), Night card AA |
| Perf | ✅ (quiet machine) | draw p95 ≈ 1–3 ms, latency ≤ 1 frame, soak flat heap; initial JS 55.9 KB gz |

## Previous milestones
- **v1.0.0 candidate (2026-10-16 04:50):** session 2 — catch layer, music, store assets, 360 reefs.
- **M4 (2026-10-16 03:30):** session-1 wrap-up (200 reefs, 7 skins, native shells).
- **M3 (2026-10-16 01:55):** native shells, WebKit e2e, audio QA, tap-to-place, review fixes.
- **M2 (2026-10-16 01:00):** Reef puzzles, skins, daily share, seal tick, misfit fading, fish.
- **M1 (2026-10-16 00:05):** playable classic + daily, renderer, input, audio, saves, e2e + perf.
- **M0 (2026-10-15 23:31):** research, 60 ideas, bot prototypes, ADR 0001 picks Hollow → Atoll.
