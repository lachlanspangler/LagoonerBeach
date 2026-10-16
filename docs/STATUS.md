# Status

## Milestone summary (M2: modes + progression) — 2026-10-16 01:00 CDT
- **Core idea:** *Close a loop of blocks and everything inside it pops.* (**Atoll**)
- **Playable:** Classic (endless, ramped), Daily (shared seed, streaks, emoji share), **Reef
  puzzles** (120 solver-verified, graded Calm → Abyss), 7 unlockable cosmetic skins incl. a
  high-contrast Glyph skin, Day/Night, teaching tray, seal tick, misfit fading, near-miss bar,
  leaping fish, cascades.
- **Placeholder:** native store wrappers (Capacitor not yet added), sound is synthesized first-pass,
  no music, store name unverified.
- **Next:** Capacitor scaffolding + native haptics bridge, puzzle hint button (solver-backed),
  tap-to-place accessibility input, sound pass, more puzzle tiers/packs.

## Milestone summary (M1: playable core) — 2026-10-16 00:05 CDT

- **Core idea:** *Close a loop of blocks and everything inside it pops.* (Working title **Atoll**.)
- **Playable now:** full classic game in the browser (`make dev` → http://localhost:5317): drag
  pieces from a tray of 3 onto an 8×8 board; sealed pockets fill with water and the surrounding
  pebbles burst; cascades through thick walls; streak multiplier; game over + play again; daily
  challenge (same seed for everyone per date) with streaks; menu with sound/haptics/theme/reduced
  motion; Day/Night themes; first-run teaching tray with a pulsing hint; save on every move.
- **Placeholder / missing:** app icon PNGs (only SVG), unlockable skins (designed, not built),
  native wrappers (Capacitor not yet added), share card is text-only, sound design is first-pass.
- **Next:** polish feel (place/capture timing, sound pass, invalid-drop feedback), unlockable
  themes, Capacitor scaffolding, PNG icons, more ideation loops.

## What works
| Area | State | Evidence |
|---|---|---|
| Rules engine (pockets, 8-ring, cascades, scoring, streaks) | ✅ | 54 unit/property tests |
| Dealer (ramp, fairness, teaching tray) | ✅ tuned | `make tune`: random 23 / greedy 74 / search ~200 median moves |
| Determinism (seeded, replay, golden game) | ✅ | `game.test.ts` |
| Save/load (validated) | ✅ | round-trip property + corruption tests, e2e reload |
| Rendering (Canvas2D, sprites, particles, themes) | ✅ | e2e screenshots on 5 sizes × 2 themes |
| Input (lift, grab offset, magnet snap, hysteresis, cancel) | ✅ | e2e real-drag play-throughs |
| Audio (synth) / haptics (Vibration API) | ✅ first pass | manual; iOS haptics need Capacitor |
| Daily + streak | ✅ | unit + e2e (same tray across contexts) |
| PWA (manifest, offline SW) | ✅ basic | — |
| Perf | ✅ | draw p95 1.0 ms at 4× CPU throttle (`artifacts/perf.json`) |

## Known issues / risks
- Store name "Atoll" not checked for trademark/App Store conflicts — **needs the user**.
- Perf test measures our draw call; GPU raster/compositing isn't captured. Real-device profiling
  still needed (needs a device — user).
- Greedy-bot session ≈ 74 moves (~4–5 min); the rubric target is a ~3 min median. Real humans
  probably sit below greedy; revisit with real play data.

## How to verify quickly
`make check && make e2e` — then look at `artifacts/shots/e2e-*.png`.
