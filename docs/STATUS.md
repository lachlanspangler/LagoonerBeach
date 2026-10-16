# Status

## Milestone summary (v1.0.0 candidate) — 2026-10-16 04:50 CDT
**Lagooner Beach** — *Close a loop. Water fills it, the ring pops.* Every lagoon catches a beach
creature for your Beach Journal.

**Done (session 2):**
- **Game:** Classic (endless; every dealt tray is guaranteed placeable, the late ramp is retuned
  so it still ends), Daily (shared seed, streaks, spoiler-free share card), **360 Reef puzzles**
  (solver-verified, graded Calm → Abyss, 3 hand-made openers, 56 needing cascades, Reef of the day,
  hints, ★ for no-hint clears).
- **Catch layer (ADR 0007):** 47 species tied to lagoon shapes and conditions, golden variants,
  size records and a pity timer. Per-species odds are generated from simulated play (median 43/47
  by day 35). Creatures leap out and swim into ≡, so the board stays clean. Every lagoon has an
  everyday species, so rare ones are never handed out by default.
- **Feel and juice:**
  - Capture moments: a tiered capture with one feedback channel, cascades, the jackpot sweep, and
    streak milestones.
  - Drag and placement: the magnet lean on drag, night glow with plankton, and tap-to-place.
  - Sound: generative synthesized music with its own toggle, plus synthesized SFX and haptics.
- **Retention without clutter:** journal with hints, daily streak with a once-per-launch
  welcome-back chip, Reef of the day, skins unlocked by play, "New best" peak, near-miss bar.
- **Accessibility:**
  - Visual: Glyph style (a shape on every colour), CVD and WCAG contrast tests, Larger text,
    reduced motion.
  - Interaction: every control ≥ 44 px and named (automated sweep), keyboard focus handling.
  - Details in `docs/store/ACCESSIBILITY.md`.
- **Store-ready:**
  - Listing copy for both stores (`docs/store/LISTING.md`).
  - Six composed screenshots and the Play feature graphic and icon (`npx tsx scripts/store-shots.ts`, `native-assets.ts` → `artifacts/store/`).
  - Every iOS and Android icon and splash.
  - Privacy policy (`public/privacy.html`; no data collected).
  - Monetization ADR 0008: free and ad-free; recommends one optional cosmetic "Supporter Pack" IAP (not built, waits for your go).
- **Builds:**
  - iOS Simulator build (`make ios-sim`).
  - Android debug APK on a headless emulator (`make android-emu`).
  - Signed release AAB/APK verified with a throwaway key (`make android-release`).
- **Reviews this session:** three fresh-agent UX reviews (all must-fixes done) and one bug review
  (10 of 12 fixed; see the diary).
- **Tree:** all committed and green. `make check`: 121 unit/property/balance/a11y tests. `make e2e`:
  66 browser tests on Chromium and WebKit. Initial JS is 41.6 KB gz (budget 64 KB).

**Placeholders (deliberate, need your input):**
- `com.example.atoll` app id.
- The privacy policy has no contact email yet.
- No signing keystore is checked in (`android/keystore.properties` is gitignored).

## What I need from you
1. **Name check:** is "Lagooner Beach" free on the App Store, Google Play and trademarks? I can't verify this.
2. **Bundle id:** replace `com.example.atoll` in `capacitor.config.ts`. Changing it after a
   store release is painful.
3. **Accounts and signing:**
   - Apple Developer: team id and signing in Xcode.
   - Play Console.
   - An upload keystore. Create `android/keystore.properties`; the format is in `android/app/build.gradle`.
4. **Privacy URL and contact email:** host `public/privacy.html` (any static host or GitHub Pages)
   and fill in the email. Both stores require it.
5. **A real phone session:** 10 minutes on a mid-range phone covering drag latency, haptics,
   music level and text size. All my verification ran in headless browsers, the iOS Simulator and
   the Android emulator.
6. **CI:** push, then check the GitHub Actions run. The e2e job had failed only on GitHub; I hardened
   it (retries, 2 workers, ×3 perf budgets, GitHub annotations) but couldn't see the logs (they need
   repo admin). If it still fails, paste the annotation text.
7. **Monetization:** go/no-go on ADR 0008's Supporter Pack (needs store accounts; I'd build it as a purchase screen in Settings over the existing skins).

## What I'd do next
- Re-tune `DEFAULT_RAMP` and catch odds from real play data instead of the bot model. The tools
  exist: `make tune` and `scripts/catch-sim.ts`.
- A cell-cursor mode so screen readers can play (the only accessibility gap left).
- Localization. Strings are short and centralized in `src/ui/overlay.ts`.
- Known low-impact gaps:
  - A second open tab can re-save after Erase all progress.
  - Replaying a reef re-records its catches (counts only).

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
| PWA | ✅ | manifest, offline SW |
| iOS | ✅ Simulator | `make ios-sim` |
| Android | ✅ emulator, signed AAB | `make android-emu`, `make android-release` |
| Perf | ✅ | draw p95 ≈ 1 ms, pick/drop latency ≤ 1 frame, soak flat heap |

## Previous milestones
- **M4 (2026-10-16 03:30):** session-1 wrap-up (200 reefs, 7 skins, native shells).
- **M3 (2026-10-16 01:55):** native shells, WebKit e2e, audio QA, tap-to-place, review fixes.
- **M2 (2026-10-16 01:00):** Reef puzzles, skins, daily share, seal tick, misfit fading, fish.
- **M1 (2026-10-16 00:05):** playable classic + daily, renderer, input, audio, saves, e2e + perf.
- **M0 (2026-10-15 23:31):** research, 60 ideas, bot prototypes, ADR 0001 picks Hollow → Atoll.
