# Status

## Milestone summary (M3: shippable-shaped) — 2026-10-16 01:55 CDT
- **Core idea:** *Close a loop of blocks and everything inside it pops.* (**Atoll**: in every other
  block puzzle holes kill you; here holes are how you score.)
- **Playable:** Classic (endless, ramped to ~3 min median sessions), Daily (shared seed, streak,
  share card), Reef puzzles (120 solver-verified and graded reefs, hints, no-hint marks), 7 cosmetic
  skins incl. high-contrast Glyph, Day/Night, tap-to-place, teaching tray, cascades, fish, near-miss
  bar, biggest-lagoon picture. Runs as a PWA and as an iOS Simulator app.
- **Placeholder:** bundle id `com.example.atoll`, store name unverified, Android never built (no
  SDK here), no music, sounds are synthesized first-pass (level-balanced, not "designed" by ear).
- **Next:** points peek (I-076), real-device feel pass (needs a phone), store listing art, Android build.

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
| Perf | ✅ | draw p95 ≈ 1 ms at 4× CPU throttle (`artifacts/perf.json`) |

## Test inventory
`make check`: 68 unit/property/balance tests (~5 s). `make e2e`: 32 browser tests (Chromium +
WebKit gameplay, layouts, perf budget, audio QA) (~50 s).

## Needs the user
- Choose the real app name / check "Atoll" for store & trademark conflicts.
- Apple/Google developer accounts, bundle id, signing.
- A real mid-range phone for a hands-on feel pass (latency, haptics, audio).
- Push to a remote (I never push).

## Known risks
- Perf test measures our draw call only (not GPU compositing); real-device profiling still needed.
- Human sessions estimated with a bot model; real playtests should re-tune `DEFAULT_RAMP`.

## Previous milestones
- **M2 (2026-10-16 01:00):** Reef puzzles, skins, daily share, seal tick, misfit fading, fish.
- **M1 (2026-10-16 00:05):** playable classic + daily, renderer, input, audio, saves, e2e + perf.
- **M0 (2026-10-15 23:31):** research, 60 ideas, bot prototypes, ADR 0001 picks Hollow → Atoll.
