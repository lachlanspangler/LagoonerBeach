# Status

## Milestone summary (session 3: quality leap) — 2026-10-26
**Lagooner Beach**: *Close a loop. Water fills it, the ring pops.* Every lagoon catches a beach
creature for your Beach Journal.

**What I built this session** (on top of v1.0.0, keeping the core rule, modes, saves and tests):
- **Research** (`docs/research/`):
  - HUNGRY_STUDIO.md: Block Blast's celebration system, frame by frame.
  - CREATURE_ART.md: style guide R1–R39.
  - UI_DESIGN.md: chooses Fraunces + Nunito, both under the SIL Open Font License.
  - LEADERBOARDS.md: chooses Cloudflare Workers + D1, verified by replaying the move log.
  - 46 new ideas in the ledger, including rejected ones with reasons.
- **Creatures (ADR 0011):** all 47 species redrawn.
  - How they're made: SVG path art, one file per species, a shared face rig, size classes XS–XXL, idle motions and a signature move each, 8 expressions, real golden variants. The art loads lazily (38.8 KB gz).
  - How they were reviewed: by an independent art critic over 3 rounds. Round 1 was 11 A / 22 B / 13 C / 1 D; round 2 was 27 A / 15 B / 5 C. Round 3 redrew the remaining B/C species, and the redrawing artists self-graded A−/A. Notes are in `docs/art/`.
  - Style-guide checks, silhouette-overlap tests and Path2D parity tests run on Chromium and WebKit.
- **Combo & celebrations (ADR 0012):**
  - COMBO ×N is our existing streak; bots show it can't be farmed.
  - A one-word praise ladder: Nice! → Nice Lagoon! → Twin Lagoons! → Atoll! / Archipelago! / Ripple ×2 → Riptide! / Spotless! / Amazing! / Unbelievable!
  - Ring-burst physics, tiered sound, haptics and sweeps, plus NEW BEST and NEW HIGH SCORE moments.
  - Big moments get big (gold sweep, shake, score roll); normal moves stay calm.
- **Discovery moments:** a reveal scaled by rarity.
  - Common is a pop; uncommon is a card with a vignette; epic and legendary become a scene (the coin builds light, the creature bursts in, the name stamps in).
  - Golden variants get a foil card. Every reveal ends with the creature's signature dance.
  - A share card (tier colour, lagoon art) works through native share on iOS and Android.
- **Leaderboards (ADR 0010):**
  - Name entry is 7 letters, A–Z only, enforced live, with an on-screen keypad. A profanity filter catches lookalikes and has a reserved-name list.
  - Boards: Daily, This week and All-time, with your rank, "58 to pass BODHI", podium tints and reset countdowns.
  - A Cloudflare Worker re-checks every score by replaying its move log, with signed endless run tickets, IP-based caps and deletion. It is tested in-memory but has never run against a real database.
  - **Hidden in release builds until the server exists** (demo boards are dev/test only).
- **Endless reefs (ADR 0009):** reef N > 360 is generated from N in a Web Worker and checked by the solver before it's shown. It has a smooth curve, chapters of 20 with names, a depth meter, "Chapter N · Complete" moments, and a bitboard solver about 40× faster.
- **Aesthetic pass:**
  - Visual system: design tokens (CSS + canvas mirror, contrast-tested), the Fraunces/Nunito type system, a custom icon set, pebble buttons and sheets.
  - Screens redesigned: results / NEW HIGH SCORE, journal with rarity frames, reefs map, first-run lesson, settings / credits.
  - New store screenshots (gradient frames, a creature on every shot).
- **Robustness:**
  - Larger text scales type, not boxes, so sheets fit small phones.
  - Lazy chunks retry after a failed load.
  - The service worker is network-first for the app shell and versioned per build, and only runs on the web.
  - iOS minimum is now 16.4 (ADR 0005), and the render loop survives a draw that throws.
  - Initial JS is 55.9 KB gz (budget 64).
- **Verified on real engines:** Chromium and WebKit e2e, the iOS Simulator, and the Android emulator. A new `scripts/android-probe.ts` drives the real app in the emulator's WebView over CDP.

**Before / after:**
- Screens: `docs/media/before/` → `docs/media/after/` (`compare-*.jpg` side by side, `screen-*` Day/Night, `store-*`).
- Creatures: `docs/media/after/creatures-compare-day.jpg` (all 47 before → after), `creatures-cast-*.jpg`, and per-species sheets in `docs/media/art/<id>.jpg`.
- Moments: `docs/media/celebrate/*.jpg` (contact sheets).
- Recordings: `docs/media/video/*.mp4` (COMBO lagoon, cascade, biggest moment, Spotless, uncommon and legendary discoveries, NEW HIGH SCORE, Daily → name → leaderboard).
- Devices: `docs/media/after/android-emulator.jpg`, `ios-simulator.jpg`.

**Tree:** everything is committed. `make check` passes (476 unit/property/server tests). On the last full e2e run, 119 of 125 browser tests passed on Chromium + WebKit. The 6 failures:
1. **Waiting on you:** `tests/e2e/art.spec.ts` fails because the cockle and nautilus silhouettes overlap at 0.709 against a 0.70 limit (Chromium and WebKit). The fix is a two-constant change in `src/render/art/species/cockle.ts` (`OPEN = -48`, `S = 0.785`). An agent's edit to that file was blocked by the permission system, so it needs your OK before I apply it.
2. **Perf under load:** 4 perf tests failed in the full run while another project kept the machine's load at 30–100. Run serially, all passed except "biggest celebration": its draw p95 was 8.3–12.3 ms against an 8 ms budget, versus 2.1–3.4 ms measured on a quieter machine. Re-run `npx playwright test tests/perf --workers=1` when the machine is idle.

## What I need from you
1. **OK to edit `cockle.ts`** (above). Then e2e is fully green.
2. **Leaderboard backend:**
   - Create a Cloudflare account (Workers Paid, $5/mo before launch) and follow `docs/server/DEPLOY.md`: D1 database, one secret, deploy, then build with `VITE_LB_URL=…`. About 20 minutes.
   - Until then, release builds simply have no leaderboards.
   - Before launch, add server-side name moderation (a maintained word list or moderation API, plus a report/ban path). The hand-written filter is a floor; see the ADR 0010 note.
3. **Name and trademark check** for "Lagooner Beach"; a **bundle id** to replace `com.example.atoll`.
4. **Accounts and signing:** Apple Developer (team id), Play Console, Android upload keystore (`android/keystore.properties`).
5. **Privacy:** host `public/privacy.html` and add a contact email. When the leaderboard goes live, use the privacy labels written in `docs/store/LISTING.md`.
6. **A real phone session:** I want to know how haptic patterns, celebration loudness, reveal timing and drag feel come across on a mid-range phone. Everything so far ran in headless browsers, the Simulator and the emulator.
7. **CI:** push, then check that GitHub Actions passes. Pixel baselines are macOS-only; perf budgets are ×3 on CI.
8. **Monetization:** go or no-go on ADR 0008's cosmetic Supporter Pack.

## What I'd do next
- **Art round 4:** an independent critic pass on the round-3 redraws (the redrawing artists self-graded A−/A, but no critic has looked since), then fix any species still graded B. Kit backlog:
  - per-species scale within a size class;
  - colour cycles on more species;
  - a mask metric that's fairer to round bodies.
- **Real data:** tune `DEFAULT_RAMP`, catch odds and the endless reef curve once real play data exists. The tools are `make tune`, `scripts/catch-sim.ts` and `scripts/reef-curve.ts`.
- **Accessibility:** a cell-cursor mode for screen-reader play; localization.
- **Smaller gaps:**
  - The share card's iOS user-activation timing (verify on a device).
  - Golden variants of yellow species (critic note).

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
| Perf | ✅ (quiet machine) | draw p95 ≈ 1–3 ms, latency ≤ 1 frame, soak flat heap; initial JS 55.9 KB gz |

## Previous milestones
- **v1.0.0 candidate (2026-10-16 04:50):** session 2 — catch layer, music, store assets, 360 reefs.
- **M4 (2026-10-16 03:30):** session-1 wrap-up (200 reefs, 7 skins, native shells).
- **M3 (2026-10-16 01:55):** native shells, WebKit e2e, audio QA, tap-to-place, review fixes.
- **M2 (2026-10-16 01:00):** Reef puzzles, skins, daily share, seal tick, misfit fading, fish.
- **M1 (2026-10-16 00:05):** playable classic + daily, renderer, input, audio, saves, e2e + perf.
- **M0 (2026-10-15 23:31):** research, 60 ideas, bot prototypes, ADR 0001 picks Hollow → Atoll.
