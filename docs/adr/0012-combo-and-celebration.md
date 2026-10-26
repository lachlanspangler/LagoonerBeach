# ADR 0012 — COMBO, moment tiers and celebrations

- Status: accepted · Date: 2026-10-16
- Input: the owner's brief (binding), `docs/research/HUNGRY_STUDIO.md` (Block Blast teardown, §5–6),
  `docs/research/UI_DESIGN.md` (§5 motion, §6.6 results, §6.8 reveal, §6.9 share card, §7 callouts),
  `docs/research/CREATURE_ART.md` (R29 rarity presentation, R30 the "present").

> "Celebrate like Block Blast does: the way blocks burst and scatter, the escalating COMBO ×2,
> COMBO ×3 … COMBO ×26, the 'Amazing!', 'Excellent!', the screen-filling moments, NEW HIGH SCORE.
> Bring that energy to our rule. Really satisfying but still simple, clean and readable, never
> chaotic. Big moments get big, normal moves stay calm." — and: "finding a new creature is a
> moment … rarer finds get bigger moments."

Where HUNGRY_STUDIO §6 is calmer than this (no COMBO text, no confetti, a quiet results line) the
owner's brief wins. We keep its guardrails, not its timidity.

## 1. The COMBO is our streak (no rule change)
COMBO ×N = `GameState.streak`: consecutive capturing moves; it survives `STREAK_GRACE − 1` = 2 dry
moves and breaks on the third (the same 3-placement window Block Blast's community reports). The
score multiplier stays ×1.00 … ×4.00, capped at streak 13 (`scoring.ts`). Shown from ×2 up. No
scoring or dealer change: dailies, golden snapshots and balance bands are untouched.

**Is it farmable?** `scripts/combo-sim.ts` (40 games/bot, seeds 1000+):

| Bot | Median score | Median moves | Median max combo | Multiplier share of score |
|---|---|---|---|---|
| greedy | 3470 | 83 | 25 | 59% |
| human-like | 1363 | 52 | 15 | 54% |
| **farmer** (any capture beats any non-capture, cheapest capture first) | **1657** | 59 | **26** | 58% |
| search (beam, 10 games, hits the 600-move cap) | 81 559 | 600 | 80 | 66% |

The farmer keeps the *longest* combos and still scores **48% of greedy**: keeping the combo alive is
not what pays, planning big lagoons is. `tests/unit/moments.test.ts` encodes the property on 10
fixed seeds (farmer median < 0.75 × greedy median, while its combos are at least 0.6× as long; ~1 s).

## 2. Moment tiers — `momentFor(event, context)` (src/render/moments.ts, pure, unit-tested)
One word per move at most. First match wins. `pockets` = lagoons sealed at once (one wave).

| Tier | Condition | Word | Style | Burst | Shake | Extras | Sting / haptic |
|---|---|---|---|---|---|---|---|
| 0 | pinch, 1–2 cells | — (+N only) | — | 0.8 | 0 | — | chime / tick |
| 1 | pool 3–5 | **Nice!** (small) | warm | 0.95 | 0 | — | whisper "nice" / tick (medium from ×5) |
| 2 | lagoon 6–8 | **Nice Lagoon!** | warm | 1.1 | 0 | — | lagoon triad / medium→heavy |
| 2 | lagoon 9–11 | **Lovely!** | warm | 1.1 | 0 | — | lagoon triad |
| 2 | 2 lagoons at once | **Twin Lagoons!** | warm | 1.1 | 0 | — | lagoon triad |
| 3 | lagoon ≥ 12 | **Atoll!** | warm | 1.25 | ≤ 6 px | sweep, sparks | atoll swell / heavy |
| 3 | ≥ 3 lagoons at once | **Archipelago!** | warm | 1.25 | ≤ 6 px | sweep, sparks | atoll swell |
| 3 | 2 waves | **Ripple ×2** | water | 1.25 | ≤ 6 px | sweep, sparks | ripple arpeggio |
| 4 | ≥ 3 waves | **Riptide!** | water | 1.4 | ≤ 6 px | sweep, **tide wash**, whoosh | riptide |
| 4 | two of {atoll, archipelago, cascade} | **Amazing!** | gold | 1.4 | ≤ 6 px | wash, whoosh | amazing |
| 4 | board empty | **Spotless!** (centre of the board) | water | 1.4 | ≤ 6 px | wash, whoosh | spotless figure |
| 4 | board empty + any jackpot feature | **Unbelievable!** | gold | 1.4 | ≤ 6 px | wash, whoosh | amazing |

Frequency (combo-sim, per capture, human-like bot): T0 73%, T1 14%, T2 10%, T3 2%, T4 1% — a
word on 12% of moves (greedy 17%). Rarer words sit higher; "Amazing!" is rarer than "Atoll!" (an
early draft let a ×10 combo count as a jackpot feature, which made "Amazing!" *more* common than
"Atoll!" — the combo now has only its own badge).

## 3. COMBO ×N badge and meter (src/render/celebrate.ts)
- Own slot under the score (the old "Streak ×N" line). "COMBO" in Fraunces, "×N" in Nunito.
- Escalation (`comboStyle`): ×2 water 0.40 cell/600 · ×5 water 0.47/900 · ×10 warm 0.54/900 + halo ·
  ×20 gold 0.60/900 + halo. Each step-up flares once (ring/halo) and plays `comboLevel`.
- The number **ticks up with a punch**: the old number lifts away, the new one lands with a spring
  (×1.35, ×1.55 on a level-up).
- **Grace shells**: three shells to the right. Each dry move dims one (with a little swell); with one
  left it breathes. Shape and fill, not hue, carry the state.
- **Break = gentle deflate**: the badge sinks, shrinks to 0.7 and fades over 420 ms with a soft
  two-note sigh. No red, no text.

## 4. Choreography (src/app/fx.ts, src/render/burst.ts)
Times from release (flight ≈ 88 ms with a drag, 0 for tap/staging). Per wave k at `flight + 150k`:
water fills → ring pebbles **burst**: each lifts in its cell (70 ms anticipation, 1.0 → 1.12) then
flies outward from the lagoon centroid with an upward kick, spin (3–8 rad/s × strength), gravity
(11 cells/s²), scale 1.12 → 0.3 and fade, staggered 36 ms per cell of distance; 2–3 foam droplets per
pebble. Bigger tiers and later waves burst harder (strength 0.8 … 1.4, +0.1 per wave). Motion is
closed-form in time (no integration) so frozen clocks render exact frames; pieces are the
pre-rendered pebble sprites (one `drawImage` each), clipped to the board (never over HUD or tray).

The word + number land at `last wave + 160 ms` as one stack **above the last lagoon** (never on the
water), else below it, else on the roomier side; Spotless takes the board's centre once the ring
has left. Words: 3-layer display text (shadow, dark round outline, vertical gradient), spring scale-in
(overshoot ≤ 1.08, start 0.7/0.6/0.45/0.3 by tier), 3–4° settle on tier ≥ 3, rise + fade out.
Lifetimes 700/850/950/1050 ms by tier, clamped so **every move is settled ≤ 1.3 s** (≤ 3 waves);
the rare tier-4 word may hold to ≥ 850 ms (≤ 1.7 s after release). A tier ≥ 2 moment punches the HUD
score as its points land.

Screen-filling moments, rare by design: tier-4 tide wash (one band of water + foam edge rolls across
the board, 700 ms), the jackpot sweep, the chapter-complete moment (endless reefs: wash + gold
"Chapter N!" + chapter name + whoosh + fanfare; the reef card waits for it).

## 5. NEW HIGH SCORE
- **Mid-game crossing** (once per game): a gold "NEW BEST!" ribbon drops into the combo slot with one
  glint sweep (1.7 s), the BEST label turns gold for the rest of the game, the rising figure plays,
  a medium haptic. It waits for the move's word to fade (≤ 1 s late).
- **Results** (`src/ui/results.ts`): the score counts up (tabular Nunito, 800 ms ease-out); the moment it
  passes the old best it turns gold, a "NEW HIGH SCORE" ribbon with a crown drops in (Fraunces),
  "was ~~4100~~" under it, 36 foam/gold confetti pieces burst once (≤ 1 s), fanfare + heavy haptic.
  Buttons are pressable from the first frame. The real score is always in the DOM (screen readers).
- Hook for leaderboards: `UiHandlers.onResultsSettled(info, card)` fires when the hero has settled;
  the results card keeps the leaderboard button (`showGameOver({ leaderboard })`). Flow: game over →
  results hero → [name entry / post] → board.

## 6. Discovery moments (src/ui/reveal.ts, lazy chunk; share card src/ui/share-card.ts)
After the capture settles (never mid-capture, never mid-drag, never over a menu), one at a time,
rarest last. Scaled by rarity (R29), and never lying about it (the tier is known from the start):

| Rarity | Presentation | Settled by |
|---|---|---|
| common | quick card pop at the top of the board (creature + name), chime; never blocks input | 0.8 s (gone at 1.9 s) |
| uncommon | modal card: bubble-pearl (tinted kelp) with the silhouette → pops (foam ring) → creature springs out | 0.9 s |
| rare | + light rays (in the pool and behind the card) + sparkles; ends `proud` | 1.15 s |
| epic | + low music sting + the board dims more | 1.45 s |
| legendary | + full-screen tide rolls up, pearl glows and cracks, fanfare | 2.0 s |
| golden (first golden of a found species) | rare treatment + gold foil + orbiting sparkles | 1.15 s |

The creature does a little dance: surprised (stretch spring) → its signature move (new art, ADR
0011) or two hops (legacy art) → happy, bobbing. The card shows name (display type), rarity pips,
size caught, how it was caught (its hint), "Added to your Beach Journal" with a stamp (No. N), and
Share: a 1080×1350 card (habitat gradient, creature, name in display caps, pips, "Lagooner Beach",
date — no hint) → Web Share with files → Capacitor Share + Filesystem if present → download.
Any tap during the animation skips to the settled card; once settled the backdrop lets presses
through and a press outside the card dismisses it and goes to the game. The game-over card waits
for a reveal that's still up. Reduced motion: no rays/tide motion, no hops, same information.

## 7. Sound and haptics (src/audio/sfx.ts, src/platform/haptics.ts)
- Capture chime climbs one pentatonic step per combo (`chimeStep`, cap 12 = the ×4 cap), extra voices
  at ×5 / ×10 / ×20 (`chimeLayers`). One sting per tier word, `whoosh` for screen-filling moments,
  `comboLevel`, `comboBreak` (a sigh), `fanfare`, `reveal(rarity)`, `bubblePop`.
- `tests/e2e/audio.spec.ts`: nothing clips (worst stacked case "amazingMoment" peaks 0.81); stings climb
  (nice < lagoon < atoll; amazing > 1.3 × lagoon); a combo break is quieter than a pinch; the whoosh
  stays under a big capture; legendary reveal > uncommon reveal; fanfare > the old new-best figure.
- Haptics per tier (`Moment.haptic`); `guardHaptic`: at most one heavy per 300 ms (extras soften to
  medium), at most 3 haptic events per move.

## 8. Guardrails (enforced in code, tested)
| Guardrail | Limit | Where |
|---|---|---|
| On the board at once | 1 word + 1 number; 1 combo badge in the HUD | single slots in `Celebrate`, `MomentGuard.claimWord` |
| Particles per move | ≤ 48 (tier budget 12/18/26/36/48), reduced motion × 0.3 | `momentFor`, `Particles.budget` |
| Flying burst pieces | ≤ 72 (the rest pop in place) | `Burst` |
| Shake | tier ≥ 3 only, ≤ 6 px, 260 ms trauma decay; none in reduced motion | `MomentGuard.shake` |
| Flashes | no full-screen flash; worst frame-to-frame board luminance change measured 1.9% (Spotless), 1.7% (biggest) vs the 8% limit | `celebrate.spec.ts` |
| Haptics | ≤ 1 heavy / 300 ms, ≤ 3 per move | `guardHaptic`, fx |
| Input | never blocked by a celebration; reveals block only while animating (≤ 2 s, tap skips) | `celebrate.spec.ts` |
| Settle | every non-game-over move settled ≤ 1.3 s (≤ 3 waves) | `LIMITS.settleMs` |
| Reduced motion | no shake, no scale bounce, no flight (pebbles shrink in place), wash = crossfade, no rays/tide motion | everywhere |

## 9. Perf (tests/perf/frame.spec.ts, 4× CPU throttle, Pixel 7 profile)
Biggest moment (3 waves, Unbelievable!, COMBO ×20, wash): draw p95 2.1–3.4 ms, max ≈ 8–12 ms; our own
longest task (frame or commit) ≈ 13–17 ms (< 50 ms). The reveal and share card are a lazy chunk
(initial JS 64.0 → 59.2 KB gz). The first version spent 19 ms on the jackpot frame
snapshotting freshly drawn text canvases; text sprites are now `ImageBitmap`s and are pre-rendered on
idle between release and the word. Browser long tasks during full-board redraws are software
compositing in headless Chromium (no GPU) — reported, not asserted.

## Consequences
- `calloutFor` (theme.ts) is removed; `wordFor`/`momentFor` replace it; the old toast chips for "New: X" and
  "Streak ×N!" are gone (reveals and the badge replace them). Chips (lessons, reef of the day,
  welcome back) moved out of the combo slot into the strip between board and tray (session 3
  aesthetic pass), so the badge is never hidden; the common-discovery pop shares that strip
  (chips wait for it), lasts 1.4 s instead of 1.9 s and no longer covers the board's top row.
  Burst pebbles shed the white "lit" rim over the first third of their flight.
- Debug: `freezeNow()/freeze(ms)` render exact frames; `stageCombo(n, dry)`, `stageRecord(best)`,
  `revealSpecies(id)`, `revealFreeze(t)`, `chapterMoment(n, name)`, `showResults({score, prevBest})`,
  `shareCard(id)`, `haptics()`, `taskTimes()`. Staged boards: `tests/e2e/celebrate-boards.ts`
  (each proven by a unit test to produce its word). Review: `scripts/filmstrip.ts --stage|--reveal|--results|--chapter`,
  `scripts/moments.ts` (real play, every capture frozen at its word).
- Baselines: `tests/e2e/celebrate.spec.ts-snapshots/` (reveal baselines change when ADR 0011's fleet
  redraws boxcrab/kraken — re-record then).

## Peaks + reveal tiers (2026-10-26, session-3 UX review)
The review found normal moves nicely calm but the peaks too close to them. Pinches keep their exact
timing and placement; "Nice Lagoon!" keeps its size and treatment (it only moves, see below).
- **Peaks (tier 3–4 only).** Words land with one overshoot pop (`peakPop`: 0.45/0.3 → 1.14/1.2 at
  150 ms → 1 at 360 ms, no wobble) instead of the spring; tier 4 gets a soft warm glow under the
  word. Height ratio Unbelievable : Nice Lagoon = 1.25 : 0.72 (≈ 1.7×; long words are width-capped
  to the board, so the on-screen ratio is ≥ 1.35×). The jackpot sweep is now **gold** and runs just
  after the word pops (`wordAt + 120`), so the board itself lights up (moving band, alpha ≤ 0.34; the
  no-flash test still passes). The shake (≤ 6 px) lands with the first ring burst; tier 4 takes the
  full 6 px. The score counts up on a fixed clock (420/520 ms, `Scene.scoreRoll`) and pulses gold
  (×1.17/×1.24) as the last digit lands.
- **COMBO badge.** Below ×10: clean Nunito 900 caps in one ink (`'flat'` sprite style: Day
  `#16588A`, Night `#6FD3EC`) in both themes — the outlined Fraunces at ~14 px was muddy on Day and
  Night rendered differently. From ×10: the outlined display treatment (warm ×10, gold ×20), and
  each step bursts a ring + 10 sparks off the badge (600 ms) on top of the colour change and punch.
- **Placement and stacking.** A word's stack sits half a cell higher when there's room, and waits
  (≤ 140 ms) until the last ring's top row has lifted and left (`topPop + BURST_LIFT + 90`).
  Picking up a piece (`onPick`) or committing the next move hurries the previous word and number out
  (`Celebrate.hurry`, 120 ms); a word whose move is no longer the latest never lands (`moveSeq`),
  only its points do. At most 3 creatures fly at once (`MAX_FLYING`, counting earlier waves/moves
  still in the air; new species get the seats); the rest become one gold "+N" coin chip. Creatures
  swim to the journal on an arc that hugs the right edge, so they never cross the badge slot.
- **Reveal tiers** — common (toast) → uncommon (card, soft tier-tinted vignette) → rare (card +
  rays) → epic/legendary (a *scene*). Epic/legendary: a coin in the tier colour (gold legendary,
  purple epic) with the silhouette pulses while the light builds (legendary 1.2 s, epic 0.7 s), it
  bursts, the creature enters large on a sharp full-screen canvas (`rv-hero`), then the card chrome
  slides up (`chrome` at 1.75/1.15 s), the creature moves into its pool (320 ms) and the name stamps
  in. Settled: legendary 2.5 s, epic 1.8 s (was 2.0/1.45; a tap still skips at any point; ADR §8's
  "≤ 2 s" for reveals now reads "≤ 2.5 s"). Rays are drawn in the tier colour from one radial
  gradient (bright core, soft falloff) instead of the flat white sunburst; the legendary tide is
  deep water, not bright ocean blue. Golden: a warmer, brighter light-gold wash over the creature's
  pixels plus a moving specular glint (`withFinish`; no glint in reduced motion). The card keeps the
  creature, name, rarity and No.; SIZE and HOW moved off it (the journal species page has both:
  the size line and the hint). Reduced motion: no scene (the settled card at once), as before.
- **Share card.** Tier-colour background, the creature in a lagoon (water + caustic lines) ringed by
  blocks, the app's icon mark + wordmark on top, the name in plain Fraunces (no outline) on a cream
  label with pips, rarity · No., "Found by" and the date.
- Review: `docs/media/celebrate/` (g2 legendary, g3 epic, g4 golden added), clips re-recorded.
  Perf: the biggest-moment p95 under 4× throttle measured the same as main on a heavily loaded
  machine (main 8.4–11.6 ms vs this 7.4–10.8 ms in the same minute); re-measure when idle.
