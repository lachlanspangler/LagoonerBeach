# Status

## Final state (v1.0.0 release candidate) — 2026-10-27
**Lagooner Beach**: *Close a loop. Water fills it, the ring pops.* Every lagoon catches a beach
creature for your Beach Journal. Everything is committed on `main` (no other branches, no worktrees).
Nothing is pushed.

**Green:**
- `make check`: 512 unit, property and server tests.
- `make e2e`: 165 functional tests on Chromium and WebKit, then 8 perf budgets run alone and serially. Zero failures, with no budgets loosened.
- Release build: initial JS 55 KB gz (budget 64). `make build` fails if debug hooks or demo boards leak into a release.

**What's final:**
- **Game:**
  - Endless: every dealt tray can be placed.
  - Daily: a shared seed, a streak, and a spoiler-free share card.
  - Reefs: 360 hand-checked reefs, then reef N > 360 generated from N forever and solver-verified, with chapters, names and a depth meter.
  - The one rule only: closed loops pop. No line clears.
- **Creatures:** 47 species in a cohesive style.
  - The independent art critic's final round: **39 A / 8 A−**, with 45/47 named correctly on a cold read at 54 px.
  - Each species has its own size class and tile scale, a signature move and 8 expressions. Yellow species get a deeper gold golden variant; the gold legendary's golden is pearl.
  - Caught creatures leap out of the lagoon and **splash back into the water beside the board** (your call). Only a brand-new species pulses the journal.
- **Celebrations:** COMBO ×N (our streak), a one-word praise ladder, ring burst, peak moments with a gold sweep, shake and score roll, a chapter moment, and NEW BEST / NEW HIGH SCORE. Normal moves stay calm.
- **Discovery:**
  - Reveals scale with rarity: common pop → uncommon card → epic or legendary scene. Golden variants get a foil card.
  - The first catch ever is a full card that introduces the journal.
  - A reveal never interrupts a fast player.
  - Share card with a footer.
- **Leaderboards:**
  - Name entry: 7 letters, A–Z only.
  - Boards: Daily, This week and All-time, showing your rank and the next player to pass.
  - A Cloudflare Worker re-checks every score by replaying its move log.
  - **Release builds hide leaderboards until a server URL is set.** Demo boards exist only in dev and tests.
- **Polish:** design tokens, Fraunces + Nunito (SIL OFL), a custom icon set, Day/Night themes, Larger text, reduced motion, ≥ 44 px targets and WCAG AA contrast (both tested), and audio muted in every automated run.
- **Verified on:** Chromium and WebKit e2e, the iOS Simulator (release build) and the Android emulator (debug APK driven through its real WebView).

**Before / after:**
- `docs/media/before/` → `docs/media/after/`:
  - `final-vs-before-play-start.jpg`, `final-vs-before-results-record.jpg`, `final-vs-before-journal.jpg`;
  - every screen, Day and Night (`screen-*`);
  - creatures before → after for all 47 (`creatures-compare-day.jpg`, `-night.jpg`) and the whole cast (`creatures-cast-*.jpg`);
  - store frames (`store-*`);
  - devices (`ios-simulator.jpg`, `android-emulator.jpg`).
- Clips: `docs/media/video/*.mp4` (COMBO lagoon, cascade, biggest moment, Spotless, discoveries, NEW HIGH SCORE, Daily → name → leaderboard).
- Store PNGs at full size: `npx tsx scripts/store-shots.ts` → `artifacts/store/`. Native icons and splashes: `scripts/native-assets.ts`.

**Unmerged branches:** none. Everything is on `main`.

## What I need from you
1. **Name and trademark check** for "Lagooner Beach".
2. **Bundle id:** replace `com.example.atoll` in `capacitor.config.ts` before the first store upload.
3. **Accounts and signing:**
   - Apple Developer (team id; signing in Xcode).
   - Play Console.
   - An Android upload keystore in `android/keystore.properties` (format in `android/app/build.gradle`).
4. **Leaderboard backend (optional for launch):** a Cloudflare account on Workers Paid ($5/mo), then follow `docs/server/DEPLOY.md` (D1, one secret, deploy, build with `VITE_LB_URL=…`). Before boards go public, add server-side name moderation (ADR 0010 note) and update the store privacy forms (`docs/store/LISTING.md`). Without it, the game ships with no leaderboards and "Data Not Collected".
5. **Privacy:** host `public/privacy.html` and add a contact email.
6. **Share link:** replace the `SHARE_URL = 'lagooner.beach'` placeholder in `src/ui/share-card.ts` with your real store/landing link.
7. **A real phone:** 10–20 minutes on a mid-range iPhone and Android. Check drag feel, haptics, sound levels (including the new splash plop), reveal pacing and Larger text.
8. **Monetization:** go or no-go on ADR 0008's cosmetic Supporter Pack. It isn't built.

## How to ship
1. Set the bundle id, version and signing (above).
2. `make check && make e2e`. Both must be green.
3. Web build: `npm run build`. For leaderboards add `VITE_LB_URL=https://…`; without it they're hidden.
4. iOS: `npx cap sync ios`, open `ios/App/App.xcworkspace`, Archive, upload.
5. Android: `make android-release` (signed AAB), then upload to Play.
6. Store listing copy and screenshots are in `docs/store/LISTING.md` and `artifacts/store/`; privacy is in `docs/store/PRIVACY.md`.

## What I'd do next
- After launch, tune `DEFAULT_RAMP`, catch odds and the endless reef curve from real play (`make tune`, `scripts/catch-sim.ts`, `scripts/reef-curve.ts`).
  - A search bot never runs out of moves, so expert Endless runs can be very long.
  - Changing the dealer changes every daily and needs a `RULES_VERSION` bump.
- Optional art: lift the eight A− species to A (notes in `docs/art/CRITIQUE-5.md`).
- A cell-cursor mode so screen readers can play; localization.

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
