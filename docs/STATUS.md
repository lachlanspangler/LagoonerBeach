# Status

## Milestone summary (M4: wrap-up) — 2026-10-16 03:30 CDT
- **Core idea:** *Close a loop of blocks and everything inside it pops.* (**Atoll**: in every other
  block puzzle holes kill you; here holes are how you score.)
- **Playable:** `make setup && make dev` → http://localhost:5317. Classic (endless, about 3 min
  median sessions), Daily (shared seed, streak, share card), Reef puzzles (200 solver-verified,
  graded reefs, 27 needing cascades, reef grid, solver hints, no-hint marks), 7 cosmetic skins incl.
  high-contrast Glyph, Day/Night, drag or tap-to-place, teaching tray, points peek, tide dots,
  best-crossing moment, fish, near-miss bar. PWA + iOS Simulator app.
- **State of the tree:** everything is committed and green. 76 unit/property/balance tests (99%
  line coverage on pure layers), 55 browser tests on Chromium + WebKit (gameplay, input incl. real
  touch, visual baselines, layouts, perf, latency, soak, audio QA). Bundle is 26 KB gz.
- **Next (from the last UX critique, not done yet):**
  1. Calm the capture moment: round droplets, cap particle counts, fish only on Lagoon+, move the
     callout to the dead space above the board.
  2. Lagoon preview fill: gradient + soft sweep instead of stripes; outline the dragged piece's
     cells that will pop too.
  3. Stronger first-run cue (dashed pulsing outline, ghost demo) and say "Pop!" not "Clear reef"
     on the teaching capture.
  4. Layout: less dead space above the board, tray pieces about 0.68 scale.
  5. "≈ ×2" → "Streak ×2" pill; Night pebble glow (promised in ADR 0003); daily icon (smiley →
     sun/calendar); game-over card labels and a "% of best" label on the bar.
  6. Regenerate store screenshots (`npx tsx scripts/store-shots.ts`): captions on top, a believable
     best score.

## What I need from you
1. **Name check:** is "Atoll" free on the App Store / Google Play / trademarks? (I couldn't verify.)
2. **Bundle id + accounts:** replace the placeholder `com.example.atoll` in `capacitor.config.ts`;
   Apple/Google developer accounts and signing for store builds.
3. **A real phone session:** play 10 minutes on a mid-range phone and tell me how drag latency,
   haptics and sounds feel. All my verification is headless browsers + the iOS Simulator.
4. **Android:** this machine has no Android SDK, so the Android project is generated but never
   built. Either install Android Studio or OK me installing the command-line SDK (~2 GB).
5. **Remote:** push when you're ready (`git remote add origin …`). I never pushed.

## What works
| Area | State | Evidence |
|---|---|---|
| Rules (pockets, 8-ring, cascades, scoring, streaks) | ✅ | unit + property tests |
| Dealer (ramp, fairness, teaching tray) | ✅ tuned | random 20 · human-like 50 · greedy 56 · search 86 median moves |
| Determinism (seeded, replay, golden game) | ✅ | `game.test.ts` |
| Save/load (validated) | ✅ | round-trip property + corruption tests, e2e reload |
| Reef puzzles | ✅ | every shipped reef re-verified by solver in `puzzles.test.ts`; e2e clears one with drags |
| Rendering (Canvas2D, sprites, particles, themes, skins) | ✅ | e2e screenshots, 5 sizes × 2 themes; skins grid |
| Input (drag: lift, grab offset, magnet snap, hysteresis, cancel; tap-to-place) | ✅ | e2e on Chromium + WebKit |
| Audio (synth) | ✅ | offline loudness QA (`tests/e2e/audio.spec.ts`) |
| Haptics | ✅ web (Android) / ✅ native bridge (iOS via Capacitor) | not verified on a device |
| Daily + streak + share | ✅ | unit + e2e |
| PWA (manifest, icons, offline SW) | ✅ | — |
| iOS shell | ✅ builds & launches in Simulator | `make ios-sim` |
| Android shell | ⚠️ generated, not built | needs Android SDK |
| Perf | ✅ | draw p95 ≈ 1 ms, pick latency ≤ 1 frame, 400-move soak flat heap (4× throttle) |

## Test inventory
`make check`: 76 unit/property/balance/a11y tests, coverage thresholds via `npm run coverage`.
`make e2e`: 55 browser tests (Chromium + WebKit). `make ios-sim`: Simulator build + screenshot.

## Known risks
- Perf test measures our draw call only (not GPU compositing); real-device profiling still needed.
- Human sessions estimated with a bot model; real playtests should re-tune `DEFAULT_RAMP`.

## Previous milestones
- **M3 (2026-10-16 01:55):** native shells, WebKit e2e, audio QA, tap-to-place, review fixes.
- **M2 (2026-10-16 01:00):** Reef puzzles, skins, daily share, seal tick, misfit fading, fish.
- **M1 (2026-10-16 00:05):** playable classic + daily, renderer, input, audio, saves, e2e + perf.
- **M0 (2026-10-15 23:31):** research, 60 ideas, bot prototypes, ADR 0001 picks Hollow → Atoll.
