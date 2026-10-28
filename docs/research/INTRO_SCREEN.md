# Intro (title) screen: research and spec

Status: research + spec, nothing implemented. Companion doc: `TITLE_TYPE.md` (wordmark font,
mock-ups in `docs/media/research/title-*.png`).

**The brief.** Show "Lagooner Beach" in a beautiful display face with a large Play button on
launch. Get into play in one tap. Never block a fast player or a daily share link (any `?mode=`
deep link skips it). Give a quiet way to reach About. Support Day and Night, reduced motion,
Larger text, ≥ 44 px targets and screen readers. Stay inside the 64 KB gz initial-JS budget
(we're at about 55 KB).

## How to read the evidence

- **[S]** = sourced. The link is next to the claim.
- **[R]** = recalled from playing the game, not re-checked for this doc. Taps and seconds marked
  [R] are rough recollections, not measurements. Versions change, so treat them as
  directional. Before anyone quotes a number from a game as fact, re-check it on a device.
- Wikipedia has the base facts (studio, year, audio) for most of these games but says nothing
  about their title screens. I looked and say so where it applies.
- I had no working web search in this session, only page fetches. So the sourced material is
  the platform guidance (Apple, Android, Poki, WCAG, Game Accessibility Guidelines) plus
  Wikipedia facts.

---

## 1. The guidance that frames everything (sourced)

| Source | What it says | What it means for us |
|---|---|---|
| Apple HIG, *Launching* [S] ([JSON of the page](https://developer.apple.com/tutorials/data/design/human-interface-guidelines/launching.json)) | "People want to start interacting with your app or game right away, and sometimes they don't want to wait more than a couple of seconds." "Restore the previous state when your app restarts so people can continue where they left off." "Don't advertise. The launch screen isn't a branding opportunity." "If you need a splash screen, consider displaying it at the beginning of your onboarding flow." | The native *launch* screen stays a plain colour field. The title screen is an *app* screen and has to earn its tap. "Continue" must take you back to the exact run. |
| Android, *Splash screens* [S] ([developer.android.com](https://developer.android.com/develop/ui/views/launch/splash-screen)) | "we recommend not exceeding 1,000 ms on phones." "The splash screen is dismissed as soon as your app draws its first frame." "make sure the motion can be comfortably skipped." | Our entry motion is decoration that never gates input. Total entry motion stays under 1 s. |
| Poki, *Easy access & onboarding* [S] ([developers.poki.com](https://developers.poki.com/guide/easy-access)) | "Skip the menu. For first-time players especially, skip splash screens, title screens, and level selects." "Drop-off during loading is brutally underestimated." "download only the essentials first". | This is the strongest argument *against* a title screen. §5.1 explains how ours answers it: one tap, zero wait, and the tap does real work (it unlocks audio). |
| WCAG 2.2, 2.5.5 Target Size (Enhanced, AAA) [S] ([w3.org](https://www.w3.org/WAI/WCAG22/Understanding/target-size-enhanced.html)) | "at least 44 by 44 CSS pixels". | Every control on the title screen is ≥ 44 × 44. Play is far bigger. |
| WCAG 2.2, 2.2.2 Pause, Stop, Hide [S] ([w3.org](https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html)) | Moving content that "starts automatically" and "lasts more than five seconds" and "is presented in parallel with other content" needs a way to pause, stop or hide it. | The ambient water shimmer runs for more than 5 s, so the Reduced motion setting must stop it, and so must the OS preference. |
| Game Accessibility Guidelines [S] ([full list](https://gameaccessibilityguidelines.com/full-list/)) | "Provide an option to turn off / hide background movement". "Ensure screen reader support, including menus & installers". "Use simple clear language". "Avoid flickering images and repetitive patterns". | Real DOM text and buttons, a canvas marked `aria-hidden`, one plain verb ("Play"), no flicker. |
| MDN, *Autoplay guide* [S] ([developer.mozilla.org](https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Autoplay)) | Starting Web Audio "outside the context of handling a user input event is subject to autoplay rules". Firefox: "audio contexts are only able to play on pages once there has been Sticky activation." | The Play tap is a guaranteed user gesture. It unlocks `sfx` and starts `music`, so the first lagoon of the session always has sound. Today that only happens on the first drag (`sfx.unlock()` in `main.ts`). |

---

## 2. Teardowns

Each entry covers layout, typography, motion, launch/tap sound, time to play, how fast and
returning players are handled (including deep links), and how About, credits and settings are
reached.

### 2.1 Monument Valley 1 / 2 / 3 (ustwo games)
Facts [S]: ustwo games, 2014. The art draws on "Japanese prints, minimalist sculpture" and
indie games, and critics compared it to Escher. Soundtrack by Stafford Bawler, Obfusc and
Grigori ([Wikipedia](https://en.wikipedia.org/wiki/Monument_Valley_(video_game))). MV3 shipped on
Netflix Games on 10 Dec 2024 and came back to iOS/Android as a try-before-you-buy app on
3 Dec 2025 ([Wikipedia](https://en.wikipedia.org/wiki/Monument_Valley_3)). Wikipedia doesn't
describe the menus.
- **Layout [R]:** the title is a living diorama, an isometric structure floating in a flat
  gradient, with a small, widely tracked caps wordmark. You tap the scene, not a button.
  Chapters are presented as objects in a world (MV1's chapter "boxes"), not as a list.
- **Typography [R]:** a quiet, thin geometric caps wordmark. The world is the hero, not the
  word.
- **Motion [R]:** a slow camera drift, and water and cloud loops measured in seconds. Nothing
  snaps.
- **Sound [R]:** a sustained ambient pad from launch, then a soft chime or bell on the tap.
- **Time to play [R]:** cold launch → title in about 2–4 s (engine load), then 1 tap to
  continue the current chapter.
- **Fast / returning players [R]:** resume puts you back in the chapter. No streak, no daily.
- **Settings and credits [R]:** a small corner glyph opens a sparse menu. Credits live there.
- **Lesson:** the title *is* a place. A little continuous motion and one hand-tuned palette
  read as premium. The wordmark can be quiet when the scene carries the brand.

### 2.2 Alto's Adventure / Alto's Odyssey (Team Alto: Snowman, with Harry Nesbitt)
Facts [S]: Odyssey came out 21 Feb 2018. It has a "day-night cycle, weather" and a Zen Mode in
which the player can't fail ([Wikipedia](https://en.wikipedia.org/wiki/Alto%27s_Odyssey)).
Wikipedia doesn't describe the title screen.
- **Layout [R]:** the title is *the first frame of a run*. The character stands on the slope
  with a centred wordmark, and the menu sits as small icons along the bottom edge.
- **Typography [R]:** a light, widely tracked serif or sans caps wordmark with a lot of air
  around it.
- **Motion [R]:** the live lighting cycle and weather are already running behind the title.
  Tapping starts the run *in place*: the UI fades away and the same scene becomes gameplay.
  There's no cut.
- **Sound [R]:** wind and the ambient score are present from launch. The tap blends into
  gameplay audio.
- **Time to play [R]:** 1 tap. Effectively zero transition.
- **Fast players [R]:** there's nothing to dismiss. The title *is* the game, paused.
- **Settings [R]:** small bottom icons (settings, Zen, workshop).
- **Lesson (the one we copy):** **the title screen is the game world with a lockup on top, and
  Play dissolves into play without a scene change.** For us that means the board can sit
  underneath, already dealt.

### 2.3 A Short Hike (Adam Robinson-Yu, 2019)
Facts [S]: one-person game with "crunchy" pixel-art 3D and no anti-aliasing. Music by Mark
Sparling ([Wikipedia](https://en.wikipedia.org/wiki/A_Short_Hike)). Wikipedia doesn't describe
the title screen.
- **Layout, motion and sound [R]:** an island vista with gentle wind and waves, a chunky
  wordmark and a short vertical menu (Continue, Options, Quit). Ambient water and wind play
  from launch.
- **Time to play [R]:** 1–2 inputs.
- **Lesson:** a cosy title can be very simple: a vista, a wordmark and "Continue". The *sound
  of water* does most of the mood work, and that's cheap for us to synthesize.

### 2.4 Two Dots (Playdots, 2014)
Facts [S]: iOS 29 May 2014. Five lives, one regenerating every 20 minutes. Levels are grouped
into "worlds" ([Wikipedia](https://en.wikipedia.org/wiki/Two_Dots_(game))). Dots won the 2014
Webby for Best Visual Design (cited in `UI_DESIGN.md` §1).
- **Layout [R]:** a flat-colour brand moment, then a vertical level map with a big next-level
  node. Over time more chrome (events, offers) piled onto the map.
- **Sound [R]:** rising tonal notes as dots connect. The brand *is* that tonal ladder.
- **Time to play [R]:** 2 taps (map → level node → Play on a level card), plus any event
  pop-ups.
- **Lesson:** flat colour and one sound motif make a strong brand. The cautionary part: menus
  that accumulate pop-ups slow returning players down.

### 2.5 Unpacking (Witch Beam, 2021)
Facts [S]: "over 14,000 foley effects", with a unique pick-up and place sound per item. Won
accessibility awards ([Wikipedia](https://en.wikipedia.org/wiki/Unpacking_(video_game))).
- **Layout [R]:** a pixel-art room or box scene with a hand-drawn-feeling wordmark and a short
  menu.
- **Sound [R]:** tactile foley on menu presses (cardboard and object sounds), not generic UI
  clicks.
- **Lesson:** make the *menu click sound like the game's material*. For us that's the stone
  "tok" and water, not a UI beep.

### 2.6 Townscaper (Oskar Stålberg, 2021)
Facts [S]: "no inherent objective", which Stålberg called "more of a toy". Players build on "a
calm body of endless water", with "a simple, minimalist user interface"
([Wikipedia](https://en.wikipedia.org/wiki/Townscaper)).
- **Layout [R]:** you open straight onto the water and can place a block at once. A tiny
  palette strip and a corner menu are the only UI.
- **Time to play [R]:** 0 taps after load.
- **Lesson:** calm water plus one decision is the cosy register we want. The *zero-tap* ideal
  is why fast players must be able to skip our title for good (§5.6).

### 2.7 Florence (Mountains, 2018)
Facts [S]: directed by Ken Wong, music by Kevin Penkin, about 30 minutes long, "20 chapters"
in six acts ([Wikipedia](https://en.wikipedia.org/wiki/Florence_(video_game))).
- **Layout [R]:** an illustrated title with a hand-drawn wordmark, then a chapter list as
  storybook spreads.
- **Motion and sound [R]:** a soft cello or piano motif on the title. Transitions are page-like
  wipes.
- **Lesson:** a *title card* that feels like a book cover gets its warmth from illustration and
  one musical motif.

### 2.8 Gris (Nomada Studio, 2018)
Facts [S]: art and direction by Conrad Roset, music by Berlinist
([Wikipedia](https://en.wikipedia.org/wiki/Gris_(video_game))).
- **Layout and motion [R]:** a painterly, almost empty title. A thin serif wordmark fades in
  over slow-moving washes. The menu is a few words.
- **Time to play [R]:** a console/PC pattern of press-any-button, then a short menu.
- **Lesson:** the luxury comes from *restraint and slowness* (long fades, a thin line, empty
  space). It doesn't need loud motion. For mobile it's too slow to copy literally.

### 2.9 Mini Metro (Dinosaur Polo Club)
Facts [S]: a "procedural audio system" by Disasterpeace, where sound comes from game events
(IGF 2016 Excellence in Audio). Visuals "imitate modern transit maps"
([Wikipedia](https://en.wikipedia.org/wiki/Mini_Metro_(video_game))).
- **Layout [R]:** the title is a living, auto-drawing transit map behind a plain sans menu.
- **Sound [R]:** every element is a note in the generative system, including UI.
- **Lesson:** our music is already generative (`src/audio/music.ts`, pentatonic). The Play tap
  should be a *note in that system*, not a stock sound effect (§5.8).

### 2.10 Threes (Sirvo, 2014)
Facts [S]: Asher Vollmer, Greg Wohlwend and Jimmy Hinson. Tiles have faces that "express
emotions when paired", and there's no "game over" screen as such
([Wikipedia](https://en.wikipedia.org/wiki/Threes)).
- **Layout [R]:** a playful wordmark with the tile characters, a big Play, and small Menu /
  About-style entries. The game talks to you.
- **Time to play [R]:** 1 tap to the board.
- **Lesson:** characters on the title screen sell the personality. We have 47 creatures, so
  one of them can swim in the title lagoon.

### 2.11 Wordle and NYT Games
Facts [S]: the spoiler-free share grid drove the virality (`UI_DESIGN.md` §1, `GENRE.md`). I
couldn't fetch nytimes.com from this session.
- **Layout [R]:** a centred welcome card with the game icon, the wordmark in a heavy display
  serif, a one-line promise ("Get 6 chances to guess a 5-letter word."), a primary **Play**,
  secondary account links, and the date and puzzle number below.
- **Time to play [R]:** 1 tap. A shared link lands on today's puzzle. A returning player who
  has already solved today's puzzle sees their result, not the welcome card.
- **Lesson:** this is the closest analogue to our brief: wordmark, one line, one big Play,
  date context, and nothing else. Link-in lands on the content.

### 2.12 Royal Match (Dream Games)
Facts [S]: in the "top ten largest mobile games by monthly revenue globally" since 2023. A
review praises "the speed, fluidity, and palette"
([Wikipedia](https://en.wikipedia.org/wiki/Royal_Match)).
- **Layout [R]:** after a branded loading screen with a progress bar (about 3–6 s cold), you
  land on the castle home screen. A huge **"Level N"** button sits bottom-centre. Event
  bubbles, a coin counter and lives surround it.
- **Motion [R]:** the button pulses slowly and the area decorations idle. Every press has a
  satisfying squash.
- **Time to play [R]:** 2 taps (Level N → Play on the level card).
- **Lesson:** the **Play button names your next thing** ("Level 4,312"), which is why our
  "Continue · Endless 3,150" state is worth having (§5.4). Copy the press feel. Don't copy the
  loading wait, the counters or the event bubbles.

### 2.13 Block Blast (Hungry Studio)
Facts [S] (`HUNGRY_STUDIO.md`): the most-downloaded game of 2025 by AppMagic, with
industrial-scale A/B testing. Ad-supported, with interstitials between games
(`TEARDOWN.md`).
- **Layout [R]:** opens to a mode chooser (Classic / Adventure) with a big Classic Play. Ads
  and offers can sit in the flow.
- **Time to play [R]:** 1–2 taps, but ad interstitials and consent prompts can come first.
- **Lesson:** the chart-topper gets players onto the board fast, and it's mostly a launcher,
  not a title. Our differentiator is a title that's *beautiful and equally fast*.

### 2.14 Others worth a look
- **Pokémon Sleep / Animal Crossing Pocket Camp style "tap to start" [R]:** a full-screen key
  art with "Tap to start" and a corner menu. Fine, but "tap anywhere" causes accidental
  starts and gives screen readers no clear control. We use a real button.
- **Stardew Valley mobile [R]:** a parallax scene with a hand-lettered logo and a few large
  buttons. Its premium feel comes from slow parallax clouds and a bird.

---

## 3. What makes a title screen feel premium (synthesis)

1. **It's a place, not a page.** MV, Alto, A Short Hike and Townscaper all show the world,
   alive and quiet. A gradient with a logo reads as "loading".
2. **One hero word, one hero button, lots of air.** Wordle and Threes do this. Two strong
   elements and nothing competing.
3. **Slow ambient motion, fast response.** Ambient loops last seconds (water, light). Input
   responds in under 100 ms with a physical squash. Premium games are never slow *to react*,
   only slow *to idle*.
4. **The tap sounds like the world.** Unpacking's foley, Mini Metro's generative notes, MV's
   chimes. No generic "click".
5. **There's no cut into play.** Alto's title dissolves into the run. A load or a black frame
   after Play cheapens everything before it.
6. **The button names your next thing.** Royal Match's "Level N" and every game's "Continue".
   Returning players see *their* state.
7. **Craft in type.** A wordmark set in a real display cut, kerned, with a tuned line gap,
   optically centred, and not a UI font at a big size.

## 4. Anti-patterns

- **Splash walls:** a studio logo, then an engine logo, then a publisher logo before the title.
  Apple says "The launch screen isn't a branding opportunity" [S].
- **Unskippable intros:** cinematics or slow logo builds that hold up input. Android asks that
  splash motion "can be comfortably skipped" [S]. Our rule: **input is live from the first
  frame.**
- **Login, consent and news gates before play:** account walls, "What's new" modals, offers,
  daily-reward pop-ups on the title. We have none and must keep it that way. Name entry happens
  only after a score (ADR 0010 flow).
- **"Tap anywhere" with no button:** accidental starts, no screen-reader target, no focus
  ring.
- **Choice paralysis:** five equal mode buttons on the title. One primary per view (HIG,
  `UI_DESIGN.md` §6.1).
- **Fake loading:** a progress bar for an app that's already loaded. We're local and offline.
  The title must never *look* like it's loading.
- **Title after every game over:** sending players back to the title between runs. The results
  card already has "Play again".
- **Deep link swallowed:** a shared daily link opening the title (or worse, Endless) instead of
  the daily.

---

## 5. Spec for Lagooner Beach

Mock-ups (font comparison, same layout): `docs/media/research/title-fraunces-day.png` and
`title-fraunces-night.png` (the pick), plus the Caprasimo and Young Serif variants.

### 5.1 Decision: show it, but make it cost one tap and zero waiting
Poki says to skip title screens for first-time players [S]. That advice targets web portals
where a title screen means a menu, a level select and a wait. Ours differs in three ways, and
each one is a hard requirement:
1. **No waiting.** The title is static HTML and CSS in `index.html`. It paints before the main
   bundle finishes evaluating. The game boots *behind* it, so the board is ready by the time a
   thumb lands.
2. **One tap does real work.** It's the user gesture that unlocks Web Audio and starts the
   music (MDN autoplay rules [S]). Today a first-time player's first capture can be silent. It
   also sets the expectation: "a calm beach game", not "an ad-funded block game".
3. **It gets out of the way for good.** There's a Settings toggle to switch it off, plus the
   skip rules in §5.6.

Measure it: log `titleShownAt → firstPointerDown on board` in the run log (local only). If the
median is over 2.5 s on the first run, revisit the decision.

### 5.2 Layout
Use percentages of the **safe** viewport height `H` (inside the safe-area insets) and width `W`.
All elements are horizontally centred.

| Element | 390 × 844 (iPhone 12–16) | 375 × 667 (SE) | iPad portrait 820 × 1180 / 1024 × 1366 | iPad landscape / wide (W ≥ 700 and W > H) |
|---|---|---|---|---|
| Lockup | 2 lines, "Lagooner" / "Beach", 74 px, line gap 1.0, block top at 0.20 H | 2 lines, 60 px, top at 0.14 H | 2 lines, 112 px (cap), top at 0.22 H | **1 line**, 96 px, centred at 0.30 H |
| Wave rule (existing `WAVE` svg) | 120 × 10, 14 px below the lockup | 100 × 9, 10 px below | 160 wide | 160 wide |
| Tagline (Nunito 700, 16 px, `--ink-2`) | "Close a loop. Water fills it." 14 px below the wave | same, 15 px | 20 px | 20 px |
| Play button | 280 × 68 (Continue state 280 × 76), top at 0.51 H | 280 × 64 (Continue 72), top at 0.54 H | 360 × 80, top at 0.52 H | 360 × 80, at 0.55 H |
| Lagoon scene (canvas) | sand atoll ellipse filling the lower 45% and bleeding off both sides | lower 40% | lower 45%, max width 900 | lower 50% |
| Footer | "About" and "Settings" ghost pills, 44 h, 28 px apart, bottom = safe-bottom + 24 | bottom + 16 | bottom + 40 | bottom + 32 |

- Lockup size: `font-size: clamp(56px, min(19vw, 9.2vh), 112px)`. In the wide case use one line
  at `clamp(72px, 8.5vw, 112px)`. Wordmark ink is `--ink` (13.5:1 by day, 16.5:1 at night). At
  night it gets a soft glow: `text-shadow: 0 0 24px rgba(111,211,236,.25)`.
- Optical centring: the stacked lockup sits 2 px left of maths centre because the "L" and "B"
  stems are heavy on the left. Check it in the mock before shipping.
- The "g" descender must clear the "B" in the stacked lockup. Line gap 1.0 with Fraunces
  (0.9 collided in the first mock render).
- No board is visible on the title. The board fades in during the Play transition (§5.7).
  A board showing behind the lockup would read as a paused game (the home sheet already plays
  that role), not as a title. This is a design judgement. I didn't mock it.
- Tagline: the shortened "Close a loop. Water fills it." is deliberate. At 16 px the full home
  tagline ("…, the ring pops.") wraps on 375 px. The home sheet keeps the full line.

### 5.3 The title lockup
Fraunces (our "Lagoon Display" family) at a dedicated **opsz 144, SOFT 100, WONK 1, wght 800**
instance, subset to the 11 glyphs of "Lagooner Beach". It's about **2.0 KB woff2**, with the
exact command in `TITLE_TYPE.md` §5. Same family as every other display moment in the game,
with a more characterful cut. Family name `Lagoon Title`, `font-display: block`, preloaded. The
lockup waits at `opacity: 0` until the face loads, with a 600 ms timeout fallback to Lagoon
Display 900 (already loaded) so it never shows the system serif.
Set it as real text: `<h1 class="title-word">Lagooner<br>Beach</h1>`. Not an image, not
canvas.

### 5.4 The Play button (and its states)
Decision: **one primary button whose label always says what happens next.**

| Saved state | Label (Nunito 900 26 px) | Sub-line (Nunito 700 15 px, 85% opacity) | Accessible name | Action |
|---|---|---|---|---|
| No run in progress (or first run) | ▶ **Play** | — | "Play" | Endless (the first run gets the teaching tray as today) |
| Endless run with moves > 0 | ▶ **Continue** | Endless · 3,150 | "Continue Endless, 3,150" | `onResume()` |
| Daily in progress (today's) | ▶ **Continue** | Daily · 1,240 | "Continue today's Daily, 1,240" | `onResume()` |
| Reef in progress | ▶ **Continue** | Reef 28 | "Continue Reef 28" | `onResume()` |
| Daily in progress from a previous day (expired) | ▶ **Play** | — | "Play" | Endless (the menu still explains that the daily ended) |

- Why "Continue" and not "Resume": it's the word the platforms and most games use. In the home
  sheet "Resume" stays (that's a paused game, a different context).
- Why the sub-line goes inside the button: it makes one control with one accessible name, and
  the Royal Match lesson that the button names your thing.
- **Never** "New game" on the title. Destructive choices stay in the menu with the existing
  confirm-on-card.
- Look: the pebble button from `UI_DESIGN.md` §6.1, scaled up. `--accent` fill, 5 px
  `--accent-lip` bottom lip, radius 22, shadow `0 14px 30px` (16% by day, 40% at night). At
  night it inverts as specified (`#6FD3EC` fill, `#04212D` label, 9.7:1). Leading play
  triangle 20 × 22.
- Press: `pointerdown` → `translateY(4px)`, lip 1 px, scale 0.98 over `--dur-instant` (80 ms)
  `--ease-standard`, plus a light haptic. The action fires on `pointerup` (click semantics,
  cancellable by sliding off).
- Idle: **no pulse.** A breathing Play button is a free-to-play tell. The water carries the life
  on this screen.

### 5.5 Secondary entries
Decision: **Play plus a quiet "About" and "Settings". No Daily, no Reefs, no Journal on the
title.**
- *Daily*: the people who most want the daily come through share links, and §5.6 sends them
  straight in. Everyone else is one tap away (home menu → Daily card, which already shows
  "Day 7" and the streak). A second big button would split the decision and break "one
  primary per view".
- *Reefs and Journal*: these are destinations for players who are already playing, and the
  home sheet presents them better (counts, progress).
- *Settings*: kept because it holds things people need *before* their first move: sound off
  (on a bus), Larger text, Reduced motion and theme. It opens the existing settings sheet over
  the title. Closing it returns to the title.
- *About*: opens the existing `showAbout()` sheet (lazy `sheets` chunk) with a back target of
  the title. Credits and font licences (OFL) live there.
- Footer style: ghost pills, Nunito 800 15 px, 44 px tall, ≥ 88 px wide, with icons from the
  Tidemark set (`info`, `settings`). A translucent pill fill (`rgba(255,251,245,.6)` by day,
  `rgba(10,21,32,.45)` at night) keeps the text at AA where it overlaps the sand or water.
  Check that in `contrast.test.ts` with the composited colours.

### 5.6 When it shows (and when it never does)
Rules run once at boot, in this order. The first match wins.
1. **Any deep link → skip.** `?mode=` (daily, puzzle or anything else), `?seed=`, a shared
   daily link, or any future content param. Land directly on that content. A daily share link
   must reach the daily board in **zero taps**. Audio unlocks on the first board drag, as it
   does today.
2. **"Start in the game" is on → skip.** This is a new Settings toggle under *Play*, default
   off. Label: "Open straight into the game". For players who never want a title.
3. **Warm return → skip.** If the last `pagehide` or `visibilitychange: hidden` was under
   **10 minutes** ago (`profile.lastSeenAt`), restore the board directly. That covers the OS
   killing the app in the background, a quick app switch, and a PWA reload. Ten minutes fits
   one phone-check session. Longer than that, a title is a welcome back rather than an
   obstacle.
4. **Coming back from the background without a reload → never.** The live page just shows the
   board or the menu as it was. The title is a cold-launch screen only.
5. **After game over, or after closing a sheet → never.** The results card has "Play again", and
   the home sheet already has the wordmark.
6. **Otherwise (a cold launch, including the very first one) → show it.**

Debug hooks: add `?title=1` (force show) and `?notitle` (force skip) so screenshots and e2e can
stage it. Under webdriver, default to skip, so the existing 165 e2e tests are unchanged. Add
one e2e for each rule above.

Capacitor: `capacitor.config.ts` sets the native background to `#0B1622` (night navy) for both
themes. On a Day cold launch that's a dark → cream flash. Either match the native launch
colour to the theme (it can't know the in-app theme before JS, so use the OS appearance) or
keep the title's first frame on a 160 ms cross-fade from `#0B1622`. Recommendation: in
`index.html`, set the static title background from `prefers-color-scheme` before first paint,
and set the native background to the OS appearance. This is an implementation detail to verify
on the iOS Simulator.

### 5.7 Motion
Every value comes from the existing tokens (`style.css`, `UI_DESIGN.md` §5). **Input is live
from the first frame. No entry motion ever blocks a tap.**

| Moment | What moves | Timing / easing |
|---|---|---|
| First paint | The static scene and lockup are visible at once (no fade from black) | 0 ms |
| Lockup settle (cold launch only) | Lockup rises 8 px and goes from 0.0 to 1.0 opacity once the font is ready | 320 ms `--ease-enter` |
| Play button arrive | 12 px rise plus fade, starting at +120 ms | 340 ms `--spring-sheet` |
| Footer | fade only, at +200 ms | 220 ms `--ease-standard` |
| Ambient water | 12–14 shimmer arcs drifting at 6–9 px/s with a ±0.2 opacity breathe on a 3.2 s period, each phase-offset | continuous, 30 fps cap |
| Creature | One creature swims a slow lazy-eight across the lagoon, about 14 s per loop, with an occasional 1.2 s tail flick. A 0.3 s "peek" if the player taps the water (no game effect) | continuous |
| Night extras | 20–26 plankton dots twinkle (opacity 0.3 → 0.8, random 2–5 s), a crescent moon, a few stars | continuous, no flicker faster than 1 Hz |
| Play press | Squash (§5.4) | 80 ms in, `spring.press` out |
| **Play → board** | Lockup and footer scale to 0.96 and fade out (180 ms `--ease-exit`). The lagoon water *rises*: the scene cross-dissolves into the board backdrop while the board fades in from 0.96 scale, moving up 16 px (300 ms `spring.screen`). The tray deals with the existing deal animation. | ≤ 420 ms total. The board accepts drags from +150 ms. |
| Continue → board | Same, and the saved board appears with its pieces (no re-deal animation) | ≤ 420 ms |

**Reduced motion** (OS `prefers-reduced-motion` or the in-game toggle): the scene draws one
static frame (no shimmer, the creature parked). Entry is a 150 ms opacity crossfade, no rise.
Play → board is a 150 ms crossfade, with no scale or movement. Sound and haptics carry the
moment (HIG).

**Lagoon scene budget (canvas):**
- A separate `<canvas id="title-bg">`, DPR capped at 2.
- The static layers (sky gradient, sun or moon, sand rings, lagoon radial fill) are drawn once
  to an offscreen canvas, then *blitted*.
- Per frame: one `drawImage`, about 14 stroked arcs, one or two creature paths, and the
  plankton dots at night.
- Targets: under 0.6 ms draw time per frame on the perf-probe phone profile, and 30 fps cap.
  Stop rAF on `visibilitychange` and the moment Play is tapped. Drop the canvas after the
  transition.
- Creature: first run uses a simple two-path fish silhouette (about 0.3 KB code, in the initial
  chunk). On idle, if the lazy creature-art chunk is already cached, draw *the player's most
  recently caught species* (`drawCreature`), a quiet personal touch. Never fetch the art chunk
  just for the title.

### 5.8 Sound on the Play tap (synthesized, `sfx.ts`)
Name it `sfx.titlePlay()`. It's a "pebble drops into the lagoon, the lagoon answers" gesture
built from existing voices (`tone`, `hiss`, the `PENTA` scale, C5 base):
1. **t = 0:** stone "tok", like `place(4)`: triangle 174 Hz → 104 Hz, 90 ms, gain 0.30, plus a
   2.4 kHz noise tick of 40 ms at 0.16. The same material as placing a piece.
2. **t = 0.04 s:** water bloop: sine 520 Hz gliding to 1,040 Hz over 110 ms, gain 0.14 (an
   upward "plip").
3. **t = 0.10 s:** wash: band-passed noise, Q 1.6, sweeping 2,600 → 700 Hz over 380 ms, 60 ms
   attack, gain 0.06. A small wave folding over.
4. **t = 0.12 s:** answer: two pentatonic triangle notes, degree 0 (C5) then degree 4 (A5)
   80 ms later, each 0.45 s at gain 0.07, with a sine an octave below the second at 0.04. This
   is the same harmonic language as the music.
5. The **music** starts on this gesture with a 1.2 s fade-in, so the chime leads into it.

Night: everything an octave lower (or −7 semitones for the notes), wash gain 0.045, and the
second note becomes degree 2 (E5) for a softer interval. Respect the Sound and Music toggles
separately. Under `?mute`/webdriver the zero-gain sink applies as it does everywhere. Peak
under −6 dBFS, which matches `capture(…)` levels. Check it with `audioLevels()`.

Haptic: `impactLight` on press-down, nothing on release.

### 5.9 Accessibility
- **Structure:** `<main id="title" aria-labelledby="title-word">` holds
  `<h1 id="title-word">Lagooner Beach</h1>`, then `<p>` for the tagline, then the Play
  `<button>`, then `<nav aria-label="More">` with the two footer buttons. The canvas is
  `aria-hidden="true"`. The `<br>` inside the h1 is read as one name: wrap each word in a span
  and set `aria-label="Lagooner Beach"` on the h1, so VoiceOver doesn't pause oddly.
- **Focus:** Play gets programmatic focus when the title shows (`focus({ preventScroll:
  true })`, with focus-visible only for keyboard). Tab order: Play → About → Settings.
  `Enter`/`Space` activate. On transition, focus moves to the board's first focusable control.
  Screen-reader users get a polite live announcement: "Endless. Score 3,150." or "New game."
- **Larger text:** the tagline, button label, sub-line and footer scale with `--fs`. The lockup
  doesn't (it's already 56–112 px), but at 375 × 667 with Larger text on, the tagline may wrap
  to two lines. Allow it, and test it.
- **Contrast:** wordmark ink is 13.5:1 by day and 16.5:1 at night. Tagline `--ink-2` is 5.64:1
  by day and 8.72:1 at night. The Play label on accent is 7.51:1 by day and 9.7:1 at night.
  Footer pills are composited over the scene. Add their pairs to `contrast.test.ts`.
- **Targets:** Play is 280 × 68 or larger. Footer pills are 44 h, ≥ 88 w, with ≥ 28 px between
  them.
- **Motion:** §5.7 reduced-motion rules. The Reduced motion toggle also satisfies WCAG 2.2.2
  for the ambient shimmer.
- **Themes:** the theme follows the existing `data-theme` preference (Auto/Day/Night). The
  static HTML reads it from `localStorage` in a tiny inline script before first paint, so the
  theme never flips after load.

### 5.10 Budget
- **Initial JS:** the title is markup plus CSS (about 0.8 KB gz CSS). The JS is about 1.5–2.5
  KB gz: show/skip rules, handlers, transition, the canvas scene and the fish silhouette.
  Estimated total after: **about 57–58 KB gz** of 64. The About and Settings sheets are
  already lazy. Measure with `scripts/size-check.ts` and fail the build over budget, as now.
- **Fonts:** +1 file, `lagoon-title.woff2`, **about 2.0 KB** (measured, see `TITLE_TYPE.md`),
  preloaded. No other new assets. Every sound is synthesized.
- **Perf:** add the title scene to `tests/perf` (draw time per frame under 0.6 ms at 4× CPU
  throttle).

### 5.11 Open questions for the owner
1. Is the 10-minute warm-return window right? (Alternatives: 5 or 30 minutes.)
2. Should the title creature be "your latest catch" (personal) or always the same mascot
   (brand)? My recommendation is the latest catch, with a fixed mascot on first run.
3. Should "Open straight into the game" be offered proactively, for example as a one-time
   hint after the 10th cold launch where the player tapped Play within 1 s? I'd hold it until
   there's data.
