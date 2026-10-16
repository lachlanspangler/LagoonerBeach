# Hungry Studio & Block Blast: celebration teardown, and what Lagooner Beach should take

Status: research, 2026-10-16. Input for a future ADR on combo and celebration (see §6).
Context read first: `CLAUDE.md`, ADR 0001 (core mechanic), ADR 0003 (visual identity),
`src/app/fx.ts`, `src/render/theme.ts` (`MOTION`, `calloutFor`), `src/core/scoring.ts`.
Earlier internal notes on the same game: `docs/research/TEARDOWN.md` §1, `GENRE.md`.

## How to read this doc: evidence grades

Public information about Block Blast is mostly press releases, analytics-vendor estimates,
SEO "solver" sites and Reddit threads. None of it gives frame timings. Every claim carries a tag:

| Tag | Meaning |
|---|---|
| **[S]** | Sourced: press, store page, analytics vendor or company statement (URL inline) |
| **[C]** | Community-reported: Reddit, student papers, fan or solver sites. Plausible but unofficial, sometimes contradictory |
| **[E]** | Estimate: my reconstruction from genre norms and common gameplay observation, with the method stated. Treat these as hypotheses to check against a screen recording, not as facts |

Search was done through Brave Search plus direct fetches. Reddit, Bloomberg, Business Wire and
the Independent blocked automated fetches, so Reddit content below comes from search-result snippets.
The thread URLs are given so a human can check them.

---

## 1. Hungry Studio: who they are

| Fact | Detail | Grade / source |
|---|---|---|
| Founded | 2021 | [S] https://www.blockblast.com/about-us ; https://www.pocketgamer.biz/tencent-in-talks-to-take-a-small-stake-in-block-blast-developer-hungry-studio/ |
| HQ | Hong Kong, per trade press and Tracxn. Press releases are datelined Hong Kong. I found **no source for Beijing** | [S] PocketGamer.biz (above); https://tracxn.com/d/companies/hungry-studio/__WdaLeX_uPAGLKMIzvEGU5SfLZQLdfHGlWFNUObr1Nig ; https://www.gamespress.com/Block-Blast-and-Hungry-Studio-Recognized-for-Industry-Excellence-at-th |
| Legal entity | **ARETIS LIMITED** operates Hungry Studio and is also the App Store seller. Terms of service are governed by Singapore law with SIAC arbitration, which probably explains the occasional "Singapore HQ" claims | [S] https://www.hungrystudio.com/serviceus.html ; https://apps.apple.com/us/app/block-blast/id1617391485 |
| Team | About 70 employees (Tracxn, Sept 2026). For a product with 70M DAU, that is a tiny team | [S] Tracxn (third-party estimate) |
| Funding | Tracxn lists one institutional investor (Lollapalooza Capital). In Feb 2026 Bloomberg reported that Tencent was in talks for a *small* stake. I found no confirmation that the deal closed | [S] Tracxn; https://investgame.net/news/tencent-in-talks-to-acquire-stake-in-block-blast-developer-hungry-studio/ ; Bloomberg headline https://www.bloomberg.com/news/articles/2026-02-26/tencent-is-said-to-be-in-talks-for-stake-in-block-blast-gaming-studio (paywalled) |
| Named people | Jason Wang, VP of brand & marketing. I found no public founder names | [S] https://www.pocketgamer.biz/block-blast-reaches-70m-daily-active-users-and-300m-monthly-active-users-worldwide/ |
| Stated values | "Experience Equality, Stay Hungry, Think Different (A/B testing), Less Is More" | [S] gamespress (above) |
| Other titles | Google Play developer page lists Double Tile!, Sudoku Blast!, Block Journey – Puzzle Games, Solitaire Master!, Match Out!. Tracxn and a 2024 student paper also name Sudoku Master. None is a known hit, so Block Blast is effectively the whole company | [S] https://play.google.com/store/apps/dev?id=6272993483096524210&hl=en_US ; [C] https://morganpawprint.com/86837/our-morgan/this-generations-blast-with-blocks/ |

**Business model.** Block Blast is ad-funded. AppMagic, via Udonis, puts lifetime IAP at about
$66k and 2025 IAP under $10k ([S] https://www.blog.udonis.co/statistics/block-blast). Deconstructor of
Fun says it "still does not offer IAP and relies purely on ad monetization"
(https://www.deconstructoroffun.com/blog/2026/1/19/from-tetris-to-block-blast-why-block-puzzles-never-stop-printing).
The current US App Store page lists 1-week/1-month/1-year subscriptions ($4.99 / $9.99 / $49.99,
probably ad removal), so a small IAP layer now exists [S]. Two other revenue lines:
- **Apple Arcade:** "Block Blast+" launched on Apple Arcade on 3 Sep 2026, ad-free and without IAP ([S] https://mobilegamer.biz/hungry-studios-hit-puzzler-block-blast-is-heading-to-apple-arcade/).
- **Brand deals:** for example a Govee lights collaboration (Sept 2025) ([S] https://www.pocketgamer.com/block-blast/govee-curtain-lights-pro/, cited from Wikipedia).

**Timeline**

| When | Event | Source |
|---|---|---|
| 2021 | Studio founded. Hungry Studio says the game launched in 2021 as a single-mode puzzle | [S] PocketGamer.biz 70M article |
| Apr 2022 | Release date per AppMagic/Udonis. App Store copyright is 2022. 7.5M downloads in 2022 | [S] Udonis |
| 2023 | 138M downloads. It starts topping charts | [S] Udonis |
| Jun 2024 | Reddit already discusses the narrator's praise ladder, so the voiced praise exists by then | [C] see §3 |
| Nov 2024 | 40M DAU / 120M MAU (Pocket Gamer); the company later says 40M / 160M for Dec 2024 | [S] https://www.pocketgamer.com/block-blast/40m-players/ ; https://mobilegamer.biz/data-digest-2025s-top-earning-genres-appsflyer-for-sale-block-blast-hits-70m-dau-app-store-earnings-more/ |
| Late 2024 – early 2025 | Spreads through US high schools; student papers write about "dopamine" and attention spans | [C] §2.6 |
| 2024 | Peak month of about 49M installs at year end. 240M downloads in the year | [S] Udonis |
| 2025 | 363–368M downloads (AppMagic), the most-downloaded game of 2025. Sensor Tower has it 2nd (284M) behind Roblox. Company reports 10,000+ A/B tests (third parties say about 25,000). Awards: Global Tech Awards, Asia-Pacific Stevie Gold | [S] mobilegamer.biz Arcade article; mobilegamer.biz data digest; gamespress |
| Jan 2026 | Company claims 70M DAU / 300M MAU in 200+ countries, #1 Puzzle in 40+ markets. #1 worldwide in January with 28.1M installs | [S] PocketGamer.biz 70M article; https://www.pocketgamer.biz/january-2026-mobile-game-charts/ |
| Feb 2026 | Tencent stake talks reported | [S] above |
| Jan–May 2026 | #1 mobile game by ad revenue, an estimated $127M (Hungry Studio as publisher: $131M, about 60% from outside the US) | [S] Sensor Tower via https://gamedevreports.substack.com/p/sensor-tower-mobile-game-ad-monetization |
| Sep 2026 | Apple Arcade "Block Blast+" | [S] above |

---

## 2. How Block Blast got so big

### 2.1 Trajectory (AppMagic via Udonis unless noted)

| Year | Downloads | Notes |
|---|---|---|
| 2022 | 7.5M | soft start |
| 2023 | 138M | breakout |
| 2024 | 240M | peak month about 49M (end 2024) |
| 2025 | 363M (AppMagic says 368M elsewhere) | #1 game by downloads (AppMagic). Sensor Tower: #2, 284M |
| 2026 YTD (to ~May) | 121M | about 19.6M/month by mid-2026, down about 60% from peak |
| All-time | about 725–870M | range across vendors (mobilegamer.biz) |

**DAU, two sets of numbers.** The company claims 70M DAU and 300M MAU. AppMagic's modelled DAU is
32–38M (MAU 185–221M) between Jun 2025 and May 2026 (Udonis). Sensor Tower's ad report gives 181M MAU
for May 2026. One analyst estimated about 55M DAU on Black Friday 2025
(https://felixbraberg.substack.com/p/the-biggest-ad-monetized-game-on). Use the company figure as an
upper bound and the vendor figures as a floor.

**Revenue.** Estimates range from $17.5M/month (about $584k/day; Udonis citing Gamigion) to
$600k–$1M/day (other analysts), with roughly $1.8M on Black Friday 2025 (Braberg's model). Sensor
Tower's $127M for Jan–May 2026 works out to about $25M/month, which sits inside that range [S, all modelled].

**Engagement (AppMagic modelled).** Average session 12 min, 2.7 sessions/day. Retention D1 26%,
D7 4.1%, D30 1.1% [S, Udonis]. These look low for a game this size. The likely reason is that
paid-UA volume dilutes cohort averages, so take them as directional only.

**Markets.** By downloads: Indonesia, US, Vietnam, Brazil, India (mobilegamer.biz). Udonis lists
USA, Philippines, Germany, Russia, Indonesia, UK as top countries. Sensor Tower says 60% of ad
revenue comes from outside the US, which fits a game that wins on volume in emerging markets.

### 2.2 UA strategy
- **Recognisable instantly.** Deconstructor of Fun calls the Tetris-like look "a built-in UA superpower: instant comprehension, instant comfort, and a low mental barrier to hit install" [S].
- **Creatives.** "Satisfying clear" and fake-fail ads, TikTok-native creator content reused as paid ads, CTV, and phone-OEM preload partnerships [S, Udonis, no primary source]. App Store reviewers confirm that the ads differ from the game ("I only downloaded this game thinking it would be just like the ads") [S, App Store].
- **Volume.** About 30–40M installs a month at peak (Udonis, DoF), much of it paid. That works because ad LTV covers cheap emerging-market CPIs.

### 2.3 Ads model
- Interstitials between games or levels, one rewarded placement (revive/continue), no confirmed banners [S, Braberg; Udonis]. Revive is "one revive per run" in web clones, and WikiHow notes that the revive offer disappears offline (an ad has to load) [C].
- According to ad-network account managers, the studio keeps "one of the largest advertiser block lists in mobile gaming" [S, Braberg]. They trade eCPM for player trust.
- Offline play is a headline store feature ("no WiFi required"). Ads only show when you are connected [S, App Store].

### 2.4 Why it beat 1010!, Woodoku, Block Puzzle Jewel and the clones
Partly sourced, partly my synthesis:
1. **Simplicity instead of extra systems.** DoF says it "doubled down on the strength of that simplicity instead of trying to diversify", while rivals "tried to add depth through new rules, new objects, and extra systems" [S].
2. **The 8×8 board** (vs 1010!'s 10×10 and Woodoku's 9×9 with 3×3 boxes). Each piece takes up more of the board, so each decision carries more tension and runs are shorter. DoF: limited board dimensions "kept players focused, reduced chaos" [S].
3. **Better feel than the clones.** Store copy sells "Stunning Block Effects" and "vibrant cubes explode in color". Reviews and student papers keep describing the explosions, combos and vibration ([S] App Store; [C] §2.6). Clones such as Ivy Mobile's *Color Block: Combo Blast* copy the formula but reached only 9.4M installs to Block Blast's 28.1M in Jan 2026 [S, PocketGamer.biz charts].
4. **Industrial-scale A/B testing.** 10,000+ tests in 2025, 300+ running in parallel each day, plus "Block AI", a behaviour-simulation bot for pre-release testing that the company says cut post-launch issues by more than 50% [S, PocketGamer.biz]. Third parties say the tests target retention, not monetization [S, Braberg]. **For us:** our bot harness (`src/sim`, `make tune`) is the same idea at indie scale.
5. **Execution on ads.** Restrained ad load, a big blocklist, offline play.
6. **A real streak skill ceiling.** Combos stretch skill without adding a rule (see §3).

### 2.5 Retention hooks
- Best score always visible. Mid-run "beat your best" pull [C/E].
- Combo streak inside a session (§3).
- **Adventure mode**: level-based goals (collect gems, reveal pictures) that turn "infinite time killer" into "beatable content" [S, DoF]. One student paper describes an event asking players to "finish 100 levels in a week" [C, Webb Canyon Chronicle]. Pocket Gamer suggests adventure mode is a major reason for the success [S].
- Daily puzzle rewards and seasonal events (e.g. "Parrot Puzzle Event") [S, App Store]. Game Center achievements [S].
- Instant restart, offline play, no timer.

### 2.6 Store positioning & the social effect
- **App Store:** subtitle "Daily Puzzle & Block Crush", 4.9★ from 2.8M ratings, feature list: Strategic Puzzle Gameplay, Adventure Mode, Daily Puzzle Rewards, Score Mastery, Stunning Block Effects, offline. **Google Play:** 4.8★ from 5.7M [S].
- **School and social spread (late 2024 – 2025).** US student papers describe it spreading by word of mouth, phone to phone ([C] https://newtriernews.org/entertainment/2024/11/06/whats-the-deal-with-block-blast/ ; https://webbcanyonchronicle.com/17907/features/block-blast-are-our-attention-spans-cooked/ , which also cites similar coverage at Phillips Exeter, Berkeley High and Ladue High). Students compare it to short video: "basically Instagram reels on steroids". It is easy to screenshot and show off: high-score screenshots and even "fake score generator" sites exist ([C] https://fakeblockblast.com/). Block Blast has no official world-record leaderboard, so players post screenshots instead [C]. I found no measured TikTok view counts. The TikTok effect is plausible (creator content reused as UA, per Udonis) but unquantified.

---

## 3. The celebration system, frame by frame

### 3.1 What is documented

**Combo rules** [C, contradictory]
- A combo is a run of placements that clear lines. The on-screen counter reads like "Combo 4" in yellow text [C, New Trier News caption]. A student called a combo above 25 "euphoric", so counts in the 20s are normal for good players.
- **The break rule is not strict "every move".** The Reddit FAQ thread ([C] https://www.reddit.com/r/blockblast/comments/1pmjhoc/how_do_combos_and_any_other_important_features/) says: *"The combo run continues if (at least) every third piece placed deletes at least one line"* (iOS). A solver site says Android requires a clear in "every round of 3 blocks" ([C] https://blockblastsolverss.com/). Reddit strategy threads talk about "timing the combo on the third placement of each round" ([C] https://www.reddit.com/r/blockblast/comments/1hl87zk/block_blast_ultimate_high_score_guide/ ; https://www.reddit.com/r/blockblast/comments/1h3eo0v/what_is_combo_stacking/). Several SEO "scoring" sites say instead that a placement with no clear resets the combo immediately. Those sites usually describe their own web clones; one says outright that the official formula "is not established" ([C] https://blockblastplay.com/scoring-and-combos/).
  **Best reading:** the combo survives up to 2 dry placements and breaks on the 3rd. That gives a 3-placement window, the same size as one tray. Platforms and A/B cohorts may differ.
- **Escalation:** each clearing placement adds 1. Value rises roughly in proportion to the count; one guide says a single clear at combo ×8 is worth "approximately 8×" a clear with no combo ([C] https://smartblockblastsolver.com/blogs/block-blast-combos). Exact formula unknown.
- Multi-line clears stack on top of the combo [C].

**Praise ladder** [C, consistent across sources]
From the June 2024 Reddit thread "what the narrator says when I clear 6 lines at once"
([C] https://www.reddit.com/r/blockblast/comments/1dk71wv/does_anyone_know_what_the_narrator_says_when_i/):

| Lines in one placement | Word (voiced by a narrator, also shown as text) |
|---|---|
| 1 | none (combo text only) |
| 2 | **Good** |
| 3 | **Great** |
| 4 | **Excellent** |
| 5 | **Amazing** |
| 6+ | **Amazing** again ("It's just amazing again sadly") |
| Whole board empty | **Unbelievable** at first, later replaced by an **"All Clear"** treatment. An Oct 2024 thread asks to bring it back ([C] https://www.reddit.com/r/blockblast/comments/1g1zhcz/can_we_bring_back_the_unbelievable_instead_pf_all/) |

A student paper quotes stacked screens such as "All clear! Amazing! Excellent!" [C, Webb Canyon],
so an all-clear can show alongside a line-count word. The voiced narrator is the detail that stands out:
the praise is **audio first**, and the text reinforces it.

**Other documented feedback**
- A "beating cartoon heart behind your score" and "sparkly graphics" [C, New Trier News].
- Strong vibration on a full clear: "the way it makes your phone vibrate when you get a full clear is very satisfying" [C, Webb Canyon].
- A "Best Score!" screen "with the golden crown and confetti" at the end of a record run [C, Lemon8 user post, via search snippet].
- Store copy: "Watch vibrant cubes explode in color" [S].
- A helper character ("Sparkle Sprite") appears after large combos in some version or event [C, Lemon8, unverified].

### 3.2 Reconstructed choreography [E]

Method: genre norms for 60 fps mobile puzzlers (one frame ≈ 16.7 ms) plus the commonly observed
Block Blast behaviours below. **Not measured.** To verify, record a 240 fps clip and count frames.
- **Preview recolour:** while you drag, rows or columns that the drop would complete take on the held piece's colour. The payoff is shown *before* release, which the internal teardown also notes.
- **Snap:** the piece lands with no visible travel, plus a short click and a light haptic.
- **Burst:** cleared cells pop in a sweep along the line, starting near the placed piece. Each throws a few same-coloured shards outward and upward. The shards spin, fall under gravity and fade.
- **Combo text** ("Combo N") pops with a scale overshoot near the placement. The praise word pops near board centre, in a heavy rounded display face with a thick dark outline, vertical gradient fill and drop shadow.
- **Score** counts up in the HUD.
- **Shake:** small or none on normal clears. The all-clear is the big beat (word, bonus, strong haptic).

**(a) Single line clear (no combo active)** [E]

| t (ms) | Beat |
|---|---|
| 0 | Finger lifts. Piece snaps (≤ 1–2 frames of travel). Click SFX, light haptic |
| 0–60 | Line cells already wear the piece colour from the preview. A brief brighten (+10–20% lightness) |
| 60–200 | Cells pop in sequence along the line from the drop point, about 15–20 ms per cell (8 cells ≈ 120–160 ms). Each cell scales 1.0 → 1.15 → 0 over about 120 ms |
| 80–700 | 3–6 shards per cell, initial speed about 0.5–1.5 board-widths/s upward and outward, gravity, spin ±360–720°/s, alpha fade over 400–600 ms |
| 80–400 | Clear SFX (one bright "shatter/pop" layer). Score count-up about 300 ms |
| — | No praise word. Combo counter starts at 1 (hidden until 2, or shown subtly) |

**(b) 3-line multi-clear on combo 5** [E]

| t (ms) | Beat |
|---|---|
| 0 | Snap, click, light haptic |
| 40–260 | Three lines pop as a cross or parallel sweep. Overlapping cells pop once. About 20 cells × 4 shards ≈ 80 particles |
| 60 | Combo text "Combo 5" pops near the drop point: scale 0 → 1.25 → 1.0 over about 200 ms, holds about 500 ms, then rises and fades over about 300 ms |
| 100 | Praise **"Great"**, voiced and shown, centred on the board, scale-bounce in about 250 ms, hold about 600 ms, fade about 250 ms |
| 100–500 | SFX stack: clear layer + combo layer (pitch rises with combo index) + voice. Medium haptic |
| 60–200 | Small camera shake, an estimated 2–4 px for 150–200 ms (possibly none on some versions) |
| 300–900 | Score count-up. Total beat about 1.0–1.2 s. **Input stays open throughout** (common observation: you can grab the next piece during the animation) |

**(c) Whole-board clear** [E, with [C] for word and haptic]

| t (ms) | Beat |
|---|---|
| 0 | Snap |
| 40–300 | Remaining lines pop |
| 300 | Board empty. "All Clear" banner (formerly the voiced "Unbelievable"), the largest text in the game, centred and scaled in about 300 ms |
| 300 | Strongest haptic in the game [C], plus fanfare SFX |
| 300–1500 | Bonus points added. A board-wide glow or sparkle sweep. Banner holds about 1 s |

**(d) New high score** [E, with [C] for the crown screen]

| Moment | Beat |
|---|---|
| Mid-game crossing | No confirmed source. Most likely a short HUD treatment when the current score passes the best (crown or "best" marker on the score, a chime) that does not interrupt play, about 600–1000 ms |
| Game over | No piece fits → offer one revive (rewarded ad, needs network) → results. On a record: a "Best Score!" screen with golden crown and confetti [C], score count-up about 1 s, confetti about 2 s, then Replay / Home. Many players report the board greying out before the results [E] |

**Sound layering** [E]. Voiced praise words are confirmed [C]. The rest is the genre standard:
a placement click, a clear layer, and a combo layer whose pitch steps up the scale each combo
step, so long combos climb. I found no source for chord stacking or the exact ladder.

---

## 4. Why it feels so good

1. **Variable-ratio reward.** A clear does not arrive every move. Its size depends on the tray you were dealt and on your plan. Variable-ratio schedules produce a "rapid, steady rate of responding; most resistant to extinction" ([S] https://en.wikipedia.org/wiki/Reinforcement, "Intermittent reinforcement schedules"). The fair-but-random tray is the slot machine; skill moves the odds.
2. **Anticipation before commitment.** The recoloured preview shows the reward before you release. You get the "about to win" spike for free, and the release confirms it.
3. **Escalation with a visible ladder.** Good → Great → Excellent → Amazing is readable, and players learn it within a session. The combo number rises without limit, so every move after a clear has stakes. Students say they push the combo higher because of the on-screen counter [C, New Trier].
4. **Loss aversion on the combo.** A visible counter at 17 makes a dry move feel like a loss, not a neutral event. The 3-placement grace window makes the threat survivable but always present, which turns "protect the streak" into the mid-game goal (loss aversion: https://en.wikipedia.org/wiki/Loss_aversion).
5. **Juice: consistent reaction at several scales.** Jonasson & Purho, *Juice It or Lose It* (GDC Europe 2012, https://www.gdcvault.com/play/1016487/Juice-It-or-Lose): small tricks (tweens, squash, particles, sound) make a plain game "more satisfying to play". Nijman (Vlambeer), *The Art of Screenshake* (INDIGO 2013, https://www.youtube.com/watch?v=AJdEqssNZ-U): layered feedback and impact make actions feel powerful. Eiserloh, *Juicing Your Cameras With Math* (GDC 2016, https://www.gdcvault.com/play/1023557/Math-for-Game-Programmers-Juicing): shake should come from a decaying "trauma" value (offset ∝ trauma²) with smooth noise, not random jitter. Block Blast applies this at three scales: every placement (click + tick), every clear (burst), and jackpots (voice + text + haptic).
6. **Tactile material.** Glossy faux-3D cubes that "explode in color" make destruction itself the reward.
7. **No friction around the reward.** Input never waits on the celebration. Restart is instant, and offline play works.
8. **Pride you can share.** One screenshot of the score proves skill, and that drives social spread.

The dark side is documented too: students describe playing without enjoying it ("I don't even enjoy
playing it; I just want to play it" [C, Webb Canyon]). Our calm, high-class positioning should
deliberately not chase that compulsion loop.

---

## 5. What we take, what we leave, and how it maps to our rule

### 5.1 Our constraints (from ADR 0003 and CLAUDE.md)
Calm by default, punchy on big moments. One feedback channel: one `+N` at the lagoon, words only for
jackpots, chips one at a time in the streak slot. The board stays readable. Reduced motion means no
shake, particles ×0.3 and no scale bounce. No seizure-risk flashes. Original names, art and sounds only.

### 5.2 Take / leave

| Block Blast element | Take? | Our version |
|---|---|---|
| Combo survives a short dry spell (about 3 placements) | **Take, we already have it.** `STREAK_GRACE = 3` in `scoring.ts` matches BB's community-reported window | Make the grace *visible* (§5.3) |
| Open-ended combo counter (×26+) | Take, but calm | Streak chip "Tide N" (number grows without limit; multiplier already caps at ×4 at streak 13) |
| Preview showing the payoff before release | **Already ours** (lagoon shimmer + ring lift) | Keep. Add the predicted word to the preview at tier ≥ 3? No: keep text off the preview |
| Line-count praise ladder | Take the *shape* (a short, learnable ladder), not the words | Ladder keyed to lagoon size, pocket count and waves (§5.4) |
| Voiced narrator | **Leave** | Too loud for our tone, and voice needs localisation. Our "voice" is the chime pitch |
| Thick-outline gradient display text | Leave | Our text: rounded humanist weight 700–800, soft shadow, no outline, palette `text` colour with `water` accent |
| Shards with gravity and spin | Adapt | Pebbles don't shatter. They lift, pop into **foam and sea-spray droplets** that rise and drift, with light gravity and little spin |
| Camera shake on big clears | Adapt, capped | Tier 3 only, ≤ 6 px, trauma-decay (already `MOTION.shake` 260 ms) |
| All Clear banner + strongest haptic | Take | "Spotless!" (already `calloutFor`) + heavy double haptic + clean-reef sweep |
| Best Score crown + confetti | Adapt | Mid-game: quiet "New best" marker in the HUD. Game over: one calm "tide line" moment with no confetti |
| Revive via rewarded ad | Leave | ADR 0008 keeps monetization out of gameplay |
| Beating heart behind score, helper characters | Leave | Our creatures (catch layer) already give the reward a face |
| Board-wide flashes | **Leave** | One soft, low-contrast sweep at most (§5.6) |

### 5.3 Our "combo": three axes, one display each

1. **Tide (move-to-move streak)** is our existing `streak`: consecutive capturing moves that survive up to 2 dry moves. It is the only number that carries across moves.
   - Show it as a chip in the streak slot: `Tide 4`.
   - **Grace shells:** three small shell pips under the chip. Each dry move dims one: 3 lit = safe, 1 lit = "next dry move ends it". This is BB's loss-aversion hook made legible, and it teaches the grace rule without text.
   - **Break:** the chip drains (water level falls) over 420 ms, plays one soft low note and fades out. No red, no "COMBO LOST" text.
   - **Milestones** every 5 (already `Streak ×N!` toast at `streak % 5 === 0`): rename to `Tide 5`, `Tide 10`. Keep one at a time.
2. **Multi-lagoon** (pockets sealed by one placement, `score.multi`) feeds the praise word only. It never adds a second number.
3. **Cascade waves** (`score.waves`) each get their own beat 150 ms apart (`MOTION.waveGap`). The pitch rises per wave, and the word reports the depth.

### 5.4 Our praise ladder (one word per move, maximum)

Keyed to a single "moment tier" so words stay rare. Priority goes from top to bottom; the first match wins:

| Condition | Word | Tier | Notes |
|---|---|---|---|
| Board empty after capture | **Spotless!** | 4 | existing |
| waves ≥ 3 | **Riptide ×N** | 4 | new top cascade word |
| waves = 2 | **Ripple ×2** | 3 | existing format `Ripple ×N` |
| pockets ≥ 3 in one move | **Archipelago!** | 3 | new: multi-lagoon jackpot |
| largest area ≥ 12 | **Atoll!** | 3 | existing |
| pockets = 2 | **Twin Lagoons** | 2 | new. Shown smaller, no shake |
| largest area 6–11 | **Lagoon** | 2 | existing ("Nice Lagoon" was considered; the bare noun reads calmer) |
| area 3–5 | none (`+N` slightly larger) | 1 | stays quiet |
| area 1–2 pinch | none (`+N` small) | 0 | stays quiet |

Today `fx.ts` only shows words at tier 3. The proposal adds tier-2 words at 70% size with no
scale bounce, so mid-size moments get named but stay small. Tier 4 replaces the current
"tier 3 + clean" special case.

### 5.5 Proposed timings and amplitudes

Base: `MOTION` tokens. Times are measured from finger release. `flight = MOTION.place × 0.8 ≈ 88 ms`.

**(a) Small lagoon (3-cell pool, tier 1, Tide 1)**

| t (ms) | Beat |
|---|---|
| 0–88 | Piece flies to its cell. Place "tok" + `tick` haptic at 88 |
| 88–208 | Lagoon fills with water (120 ms). Capture "bloop" + chime at pentatonic step 0. `medium` haptic |
| 208 + 36·d | Ring pebbles lift 1.0 → 1.06 and pop, staggered by distance d (in cells) from the lagoon centre (`ringStagger 18 × 2`) |
| +60 per pebble | 3 foam droplets per pebble, budget 24. Initial speed ≤ 3 cells/s, mostly upward. Gravity 6 cells/s². Life 450 ms. Spin ≤ 90°/s. Alpha 1 → 0 ease-out |
| 288 | `+N` at the lagoon, 0.56 cell high, rises 0.3 cell over 650 ms |
| 88 | Tide chip shows `Tide 1`, gentle pulse 1.0 → 1.08 → 1.0 over 220 ms |
| — | No word, no shake. Total ≈ 950 ms. Input open the whole time |

**(b) Two lagoons sealed together, 2 cascade waves, at Tide 5**

| t (ms) | Beat |
|---|---|
| 0–88 | Flight, tok, tick |
| 88 | Wave 1: both lagoons fill. Chime at step min(streak−1, 7) = 4 on the pentatonic ladder, plus a soft fifth above (2-voice chord from Tide ≥ 3). `heavy` haptic (Tide ≥ 5) |
| 128 | Shake starts: amp = min(6, 2 + 2 × 1.2) = 4.4 px, trauma decay over 260 ms (offset ∝ trauma², smooth noise) |
| 208–400 | Wave 1 ring pops, droplets (4 per pebble, budget 36 shared across waves) |
| 238 | Wave 2 lagoon fills. Chime one step higher (arpeggio). Second `heavy` |
| 358–520 | Wave 2 ring pops |
| 358 | Lagoon light sweep (existing `sweep`), luminance change ≤ 8% |
| 438 | Word **Ripple ×2** at the last lagoon: 0.8 cell high, scale 0.9 → 1.04 → 1.0 over 200 ms, hold, fade, life 760 ms |
| 478 | `+N` under the word, 0.55 cell high, life 720 ms |
| 348 | Tide milestone `Tide 5` chip, but it waits until the word has faded (`chipAt` → ≥ 1078) |
| ≈ 1200 | Board settled, all text gone |

**(c) Spotless reef (board empty)**

| t (ms) | Beat |
|---|---|
| 88 → last wave | As in (b) |
| last + 120 | Last ring popped; the board is empty |
| last + 200 | A soft "tide wash" sweeps the board left to right over 600 ms: one pass, ≤ 8% luminance change, no repeat |
| last + 260 | `cleanReef` SFX: 3-note rising major-pentatonic figure over a soft pad, 900 ms. `heavy` double haptic (two pulses 90 ms apart) |
| last + 200 | Word **Spotless!** 0.9 cell, centred on the board, life 1000 ms. `+N (+300)` under it |
| — | No extra particles beyond the normal budget, and no confetti |

**(d) New best**
- **Mid-game crossing** (exists: `main.ts`, `later(650)`, "New best!", life 1100). Proposal: drop the board-centre text and move the moment to the HUD. The best-score label slides into the score, a thin gold-sand underline draws under the score over 400 ms, and the existing `newBest` rising figure plays, with a `medium` haptic (not `heavy`; heavy belongs to captures). If a jackpot word is on screen, delay it until the word has faded, with the same rule as `chipAt`. Rationale: one channel. Words on the board belong to the board.
- **Game over with a record:** pieces settle (500 ms, existing). The board dims to 60% over 400 ms. The score counts up over 800 ms (ease-out). At the end, "New best" appears under it in the accent colour with a single low-amplitude scale (1.0 → 1.03). One rising figure, one `medium` haptic. 1200 ms later the action buttons fade in. No confetti and no crown.

### 5.6 "Never chaotic" guardrails

| Guardrail | Limit |
|---|---|
| Text on the board at once | ≤ 1 word + 1 number. Chips: 1 at a time in the streak slot (existing queue) |
| Word frequency | Tier ≥ 2 only. If two consecutive moves earn words, the second must be a higher tier, otherwise it shows only `+N` |
| Particles per move | ≤ 36 (existing budget). Global live cap 64. Reduced motion: ×0.3 → ≤ 11 |
| Particle travel | ≤ 1.5 cells from source. Nothing crosses the tray or the HUD |
| Shake | Tier ≥ 3 only. ≤ 6 px, ≤ 260 ms, trauma-decay, translation only (no rotation or zoom). Reduced motion: 0 |
| Flashes | No full-screen flashes, ever. Sweeps: one opposing luminance pair per event, Δ ≤ 8% relative luminance (below WCAG's 10% "general flash" definition), never more than 1 per second ([S] https://www.w3.org/WAI/WCAG21/Understanding/three-flashes-or-below-threshold.html). No saturated-red transitions |
| Scale bounce | ≤ 1.08 overshoot on text. Reduced motion: fade only |
| Haptics | ≤ 1 `heavy` per 300 ms. ≤ 3 haptic events per move. Respects the system setting |
| Audio | ≤ 4 simultaneous capture voices. The chime ladder caps at step 12 (matches the ×4 multiplier cap). Ducking under the jackpot figure |
| Readability | Popping pebbles leave their cell within 250 ms of their pop. The next valid board state is readable ≤ 400 ms after the last wave. Text never covers the ghost of a dragged piece (if a drag starts, live text fades to 40% opacity) |
| Input | No celebration ever blocks input or delays the next deal by more than 140 ms after flight |
| Total move beat | ≤ 1.3 s for any non-game-over move |

---

## 6. Spec sketch: combo & celebration (ready to become an ADR)

**Title:** ADR 00NN — Tide (streak), moment tiers, and celebration choreography.

**Rules (core, pure, integer). No scoring change is required.**
- `streak` / `dry` stay as in `scoring.ts` (`STREAK_GRACE = 3`). Expose `graceLeft = STREAK_GRACE − dry` (3, 2 or 1) in the `captured` and `scored` events so the UI can draw the shells. Add a `dryMove` event carrying `graceLeft`.
- New pure function `momentTier(waves, multi, maxArea, clean) → 0..4` in `core/` (or `render/theme.ts` next to `calloutFor`), unit-tested:
  `4: clean || waves≥3 · 3: waves=2 || multi≥3 || maxArea≥12 · 2: multi=2 || maxArea≥6 · 1: maxArea≥3 · 0: otherwise`.
- `calloutFor` → `wordFor(tier, waves, multi, maxArea, clean)` using the §5.4 table. It returns `null` for tiers 0–1.

**Choreography (app/render)**
- One scheduler (`Fx.at`), times from release, all from `MOTION` tokens. New tokens: `tideDrain: 420`, `tideWash: 600`, `bestUnderline: 400`, `wordTier2Scale: 0.7`, `shakeMaxPx: 6`, `sweepMaxDeltaL: 0.08`, `particleCapLive: 64`, `heavyMinGap: 300`.
- Per wave k at `flight + k·waveGap`: fill → chime(step = min(streak−1+k, 12)) → ring pop by distance → droplets → (last wave) `+N` and word.
- Chime voicing: Tide 1–2 a single note; Tide ≥ 3 adds a fifth; Tide ≥ 8 adds an octave shimmer. Pentatonic, so any stack is consonant.
- Tide chip: pulse on increase, shells dim on dry moves, drains on break. Milestones every 5, queued behind words (`chipAt`).
- New best: the mid-game moment moves to the HUD (§5.5d). The game-over record moment as specified.

**Accessibility**
- Reduced motion: no shake, no scale bounce, particles ×0.3, tide-wash becomes a 200 ms crossfade, fish and creature leaps already disabled. All information (word, `+N`, shells) is still shown.
- Flash guardrail and haptic limits per §5.6, enforced in code (clamp in `Scene` and `Haptics`), not just by convention.
- Shells use shape and fill, not hue, so grace state reads with any colour vision.

**Tests**
- Unit: `momentTier`/`wordFor` table, including the priority order. `graceLeft` across sequences of dry and capturing moves (property test: streak never resets while `graceLeft ≥ 1`).
- E2E: stage boards via `__atoll.setup` for each of the §5.5 cases (a)–(d). Assert at most 1 word on screen, particle count ≤ cap, shake amplitude ≤ 6 px, and no frame whose mean luminance differs from the previous frame by more than 8%. Reduced-motion baselines.
- Perf: jackpot case (c) within the existing frame budget under CPU throttling.

**Out of scope:** revives, voiced praise, confetti, full-screen flashes, any change to scoring
numbers (the daily seed stays stable).

**Open questions for playtest:** do the shells make players over-cautious? Is "Twin Lagoons" too
long on small phones? Should tier-2 words appear at all on Night theme, where text contrast is higher?
