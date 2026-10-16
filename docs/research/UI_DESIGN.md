# UI Design Research: making Lagooner Beach look like a chart-topper

Status: research / proposal · Date: 2026-10-16 · Scope: every screen and overlay, plus the coming
features (leaderboards, name entry, creature reveal + share card, celebration callouts, NEW HIGH
SCORE, endless reef progress).

Inputs read: `CLAUDE.md`, `docs/adr/0003-visual-identity.md`, `src/ui/style.css`,
`src/ui/overlay.ts`, `src/render/theme.ts`, `src/render/scene.ts` (`FONT`, `drawTexts`,
`drawHud`), screenshots in `docs/media/before/`, `artifacts/store/`, `artifacts/ux/v1-before/`.
Font facts (licenses, OpenType features, digit widths, subset sizes) were measured on the actual
font files from the `google/fonts` GitHub repo with fontTools 4.63 + brotli. Every URL below was
fetched while writing this. Claims about other games are limited to what those pages say. Where a
point is my design judgement and not a sourced fact, I say so.

---

## 0. The diagnosis in one paragraph

The game already has a good material (sea-worn pebbles, water filling the lagoon) and a calm
palette. What keeps it from looking top-of-chart is the **chrome around the board**: one
system font at one weight (800) for everything, so there's no type voice. Secondary text sits
under WCAG contrast (`#8A7B69` on `#F4EDE2` = **3.53:1**). The two signature accents fail badly as
text: "NEW BEST" in `--water` on the panel is **1.87:1**, and the mode tag is **1.67:1**. Labels
are over-tracked (0.14em). The results card is a uniform stack of grey boxes, the creature tiles
are flat pastel squares with no frame, and the icons mix stroke widths. Scores count up in a font
whose digits are proportional, so they jitter. The board itself isn't the problem. The UI needs a
display voice, a real neutral ramp, one accent with a job, and choreography for the big moments.

---

## 1. What the top of the charts teaches (sourced)

| Reference | What the source says | What we take |
|---|---|---|
| **Block Blast** (Hungry Studio) | 8×8 board with daily challenges, endless high-score and Adventure modes ([App Store](https://apps.apple.com/us/app/block-blast/id1617391485)). "As of January 2026, it was the world's most downloaded game", with 70M DAU ([Wikipedia](https://en.wikipedia.org/wiki/Block_Blast!)). | Our core format (8×8, tray of 3) is proven mass-market. We have to win on **finish and identity**, not novelty of layout. |
| **Royal Match** (Dream Games) | Top-10 by monthly global revenue since 2023. A reviewer praised its "speed, fluidity, and palette" ([Wikipedia](https://en.wikipedia.org/wiki/Royal_Match); [App Store](https://apps.apple.com/us/app/royal-match/id1482155847)). | Polish reads as **speed + fluidity + palette**. Every transition must be fast and continuous, never a hard cut. |
| **Candy Crush Saga** | The level-complete voice "Sweet!" is iconic enough that it was the center of a copying dispute. Cascades score progressively more ([Wikipedia](https://en.wikipedia.org/wiki/Candy_Crush_Saga)). | One-word celebratory callouts are a brand asset. Ours must be **our own words** in **our own typeface**. |
| **Monument Valley** (ustwo) | Draws on Escher, Japanese prints and minimalist sculpture. Ken Wong aimed for every frame to be good enough to display publicly. Color signals interactivity ([Wikipedia](https://en.wikipedia.org/wiki/Monument_Valley_(video_game)); [ustwo](https://ustwo.com/work/monument-valley)). | The "every frame is a poster" bar applies to menus too: results, journal and share card should each be screenshot-worthy. |
| **Threes!** | Vollmer pushed for "warmth" to balance harsh rules. Cards are uniform for clarity, and tiles have faces ([Threemails](https://asherv.com/threes/threemails/); [Wikipedia](https://en.wikipedia.org/wiki/Threes)). 2014 Apple Design Award. | Our creatures are the warmth. Give them the stage (reveal card, journal frames, avatars). |
| **Dots / Two Dots** | NYT cited it as an example of flat design. Won the 2014 Webby for Best Visual Design ([Wikipedia](https://en.wikipedia.org/wiki/Dots_(video_game))). | Restraint wins awards: few colors, generous space, one shape language. |
| **Alto's Adventure / Odyssey** | One-touch controls with no on-screen console controls. Time-of-day lighting. Zen mode. Haptics on trick landings ([Adventure](https://en.wikipedia.org/wiki/Alto%27s_Adventure); [Odyssey](https://en.wikipedia.org/wiki/Alto%27s_Odyssey); [site](https://www.altosodyssey.com/)). | Our Day/Night theme is our "time of day". Haptics belong on *landings* (place, capture), not on every tap. |
| **Mini Metro** | Art mimics transit maps. Passengers are shapes. Procedural audio is driven by player actions ([Wikipedia](https://en.wikipedia.org/wiki/Mini_Metro_(video_game)); [Dinosaur Polo Club](https://dinopoloclub.com/games/mini-metro/)). | A single geometric icon language. Shapes over words. |
| **Good Sudoku / Knotwords** (Zach Gage) | "Elegant layout". Daily puzzles have **3 global leaderboards** ([playgoodsudoku.com](https://www.playgoodsudoku.com/)). Knotwords: "minimal and elegant"; streaks, sharing, a streamlined game-over, a background-motion toggle. Reviews complain of small cells and **low contrast on the active cell** ([App Store](https://apps.apple.com/us/app/knotwords/id1598756238)). | Minimal can't mean low-contrast. Leaderboards split by period. A motion toggle is table stakes. |
| **Woodoku** (Tripledot) | 9×9 block puzzle, 4.7★ on ~665K ratings ([App Store](https://apps.apple.com/us/app/woodoku-wood-block-puzzles/id1496354836)). | Material identity (wood) carries a commodity mechanic. Ours is pebble + water. |
| **Wordle / NYT** | The share text is a header (puzzle number, score) plus a colored-square grid that reveals no letters. That format drove the viral spread. It also has a high-contrast mode ([Wikipedia](https://en.wikipedia.org/wiki/Wordle)). | The share artifact must be **spoiler-free, glanceable, and recognizably ours**. |
| **Duolingo leagues** | A league starts every Sunday. You're matched with learners who have similar habits and time zones. There are 10 tiers ([blog](https://blog.duolingo.com/duolingo-leagues-leaderboards/)), in groups of up to 30 ([Wikipedia](https://en.wikipedia.org/wiki/Duolingo)). The tab redesign removed borders and backgrounds and used whitespace instead, with "a minimal number of styles" ([blog](https://blog.duolingo.com/core-tabs-redesign/)). | Leaderboards: small cohorts, a weekly reset, rows without boxes, few type styles. |
| **Leaderboard design** | "Show top 10, show their position, show who's just above them." Show ~5 above and below and highlight the gap to the next rank. Use micro-leaderboards and season resets ([Yu-kai Chou](https://yukaichou.com/advanced-gamification/how-to-design-effective-leaderboards-boosting-motivation-and-engagement/)). | Our "person just above you" target is the right instinct. Build the screen around it. |
| **Game feel** | Swink: control "with interactions emphasised by polish" ([Wikipedia](https://en.wikipedia.org/wiki/Game_feel)). See also *Juice it or lose it* by Jonasson & Purho ([video](https://www.youtube.com/watch?v=Fy0aCDmgnxg)). | Juice goes on the **moments**. The chrome stays calm. |

### Platform guidance (sourced)
- **Apple HIG, Typography** ([link](https://developer.apple.com/design/human-interface-guidelines/typography)): iOS default text is **17 pt, minimum 11 pt**. "In general, avoid light font weights." With custom fonts, "be guided by the recommended minimum font sizes", and "test game text for legibility on each platform".
- **Apple HIG, Accessibility** ([link](https://developer.apple.com/design/human-interface-guidelines/accessibility)): iOS default control size **44×44 pt** (minimum 28×28). Contrast up to 17 pt needs **4.5:1**; 18 pt+ or bold needs **3:1**. "Consider spacing between controls as important as size."
- **Apple HIG, Buttons** ([link](https://developer.apple.com/design/human-interface-guidelines/buttons)): a hit region of at least 44×44 pt. "Keep the number of prominent buttons to one or two per view."
- **Apple HIG, Motion** ([link](https://developer.apple.com/design/human-interface-guidelines/motion)): "Add motion purposefully". "Gratuitous or excessive animation can distract people". "Aim for brevity and precision in feedback animations". Don't use motion as the only way to communicate.
- **Android / Material**: touch targets "at least 48dp × 48dp" ([Android a11y](https://developer.android.com/guide/topics/ui/accessibility/apps)). The M3 type scale is Display 57/45/36, Headline 32/28/24, Title 22/16/14, Body 16/14/12, Label 14/12/11 sp ([Typography.md](https://raw.githubusercontent.com/material-components/material-components-android/master/docs/theming/Typography.md)). M3 easing: standard `cubic-bezier(0.2,0,0,1)`, emphasized-decelerate `(0.05,0.7,0.1,1)`, emphasized-accelerate `(0.3,0,0.8,0.15)`. Durations run 50–1000 ms in 50 ms steps. Springs: fast-spatial damping 0.9 / stiffness 1400, default-spatial 0.9 / 700, slow-spatial 0.9 / 300 ([Motion.md](https://raw.githubusercontent.com/material-components/material-components-android/master/docs/theming/Motion.md)).
- **WCAG 2.2**: 4.5:1 for text and 3:1 for large text ([1.4.3](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html)). 3:1 for UI components and meaningful graphics ([1.4.11](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html)). Target size 24×24 minimum at AA ([2.5.8](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html)). We use 44 because it's stricter.
- **Web platform facts that constrain us**: `font-variant-numeric: tabular-nums` works in DOM ([MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/font-variant-numeric)). **Canvas2D has no `font-variant-numeric` equivalent.** It has `letterSpacing` (Baseline 2025), `fontKerning`, `fontVariantCaps` and `fontStretch` ([MDN letterSpacing](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/letterSpacing)). `FontFace` and `document.fonts.load()` let us load before drawing ([FontFace](https://developer.mozilla.org/en-US/docs/Web/API/FontFace), [FontFaceSet.load](https://developer.mozilla.org/en-US/docs/Web/API/FontFaceSet/load)).

---

## 2. Typography

### 2.1 Problems with today's stack
`FONT = ui-rounded, "SF Pro Rounded", "Nunito", system-ui, …` (scene.ts:101, style.css:9).
1. **Android never gets the intended look.** SF Pro Rounded is iOS-only and Nunito isn't bundled,
   so Android falls through to `system-ui` (Roboto): a different game on half our audience.
2. **The live score jitters.** `drawHud` draws `Math.round(this.shownScore)` while it counts up.
   SF Pro's digits are proportional by default, and canvas can't switch on `tnum` (see MDN above),
   so the centered number twitches sideways as digits change.
3. **No hierarchy of voice.** Everything is weight 800 or 900 in one family, and titles are
   small-caps-style labels (`h2`: 15 px, 0.14em tracking, dim). Nothing feels like a *title*.

### 2.2 Candidates evaluated (measured)
Subset = Basic Latin + Latin-1 + typographic punctuation + `×`, as woff2, from a single static
instance at display weight. "Tabular" means every digit 0–9 has the same advance width in the
default glyphs (needed for canvas).

| Font | License (from file / repo) | Latin woff2 | A–Z+0–9 | Tabular digits by default | `tnum` | Personality vs brief |
|---|---|---|---|---|---|---|
| **Fraunces** (SOFT 100, WONK 0) | OFL 1.1 | 16.4 KB @900 / 16.3 KB @600 | 3.9 KB (A–Z only) | no | no | Soft "old-style" display serif. Warm, 70s surf-shop, *high class and playful*. Variable opsz 9–144, wght 100–900, **SOFT 0–100**, WONK |
| Fredoka | OFL 1.1 | 14.4 KB | 4.1 KB | no | no | Rounded and bubbly. Friendly but reads younger ("kids' app") |
| Baloo 2 | OFL 1.1 | 15.0 KB | 4.6 KB | no | yes | Chunky rounded. Very "casual game", generic |
| **Nunito** | OFL 1.1 | 30.9 KB (variable 200–1000) | 3.4 KB | **yes (all 600 units)** | n/a | Rounded humanist sans. Our current fallback, already "the look" |
| Lilita One | OFL 1.1 | 9.0 KB | 2.8 KB | no | no | Heavy poster sans. Fun, but single weight and loud |
| Titan One | OFL 1.1 | 9.6 KB | 3.1 KB | no | no | Bubbly heavy. Childish |
| Luckiest Guy | **Apache 2.0** | 15.4 KB | 4.3 KB | no | no | Comic-book. Too loud for "calm" |
| Bagel Fat One | OFL 1.1 | 21.6 KB (1.5 MB raw: CJK) | 7.5 KB | no | no | Fat and cute. Hard to outline legibly |
| Chewy | Apache 2.0 (`apache/chewy`) | – | – | – | – | Cartoon hand. Off-brief |
| Rubik / Outfit / Sora / Lexend | OFL 1.1 | 11.5–16.2 KB | 3.0–4.1 KB | no | Rubik/Outfit/Sora yes | Clean geometric UI sans. Competent but no beach soul |
| Quicksand | OFL 1.1 | 12.0 KB | 3.6 KB | no | no | Thin rounded. Weak at small sizes (HIG: avoid light weights) |
| DM Serif Display | OFL 1.1 | 22.0 KB | 7.0 KB | no | no | Elegant high-contrast serif. Hairlines die at small sizes and under outlines |
| Young Serif | OFL 1.1 | 22.4 KB | 9.2 KB | no | yes (+`lnum`) | Lovely, but one weight only |
| Gochi Hand | OFL 1.1 | 18.2 KB | 6.8 KB | no | no | Handwritten. Off-brief |
| Recoleta | commercial (not on Google Fonts) | – | – | – | – | **Rejected**: paid desktop/app license, and Fraunces covers the same "soft serif" mood for free |

### 2.3 Recommendation: Fraunces (display) + Nunito (UI and all numerals), both bundled

**Display font: Fraunces, instanced at `SOFT=100, WONK=0`.**
- **Why:** it's the only candidate that hits *both* halves of the brief. "High class" comes from
  the serif structure and its optical sizes, the register of a boutique hotel or a vintage beach
  postcard. "Playful, not childish" comes from the SOFT axis, which rounds every terminal
  ("Sharp, Soft, SuperSoft"; opsz 9–144, wght 100–900, per
  [undercasetype/Fraunces](https://github.com/undercasetype/Fraunces)). At SOFT=100 its terminals
  echo our 26%-radius pebbles. Rounded sans fonts (Fredoka, Baloo, Titan) would only repeat
  Nunito and push the game younger. Fraunces gives a **contrast pairing**: serif voice for
  moments, rounded sans for function.
- **All-caps names (A–Z only):** Fraunces Black caps at SOFT 100 are wide, stable and
  distinctive. That's exactly the "stylized name" look, with no custom lettering needed. Pin
  `WONK=0` (WONK only affects lowercase leaning forms anyway) and use `opsz≈72` for the static
  display instance.
- **Outlines and celebrations:** Black weight with soft terminals survives a 2-layer stroke. The
  hairline serifs that make DM Serif fragile aren't present at opsz 72 / wght 900.
- **What it must NOT do:** live or animating numbers. Its digits are proportional (advances
  range 967–1395 units) and it has no `tnum`. Numbers always go in Nunito.
- **Fallback:** `"Lagoon Display", "Fraunces", Georgia, "Times New Roman", serif`. If the woff2
  fails to load within 1.5 s, callouts fall back to the **UI font at 900** rather than Georgia.
  Implement this by checking `document.fonts.check('900 40px "Lagoon Display"')` and choosing the
  stack in code, so we never show a mismatched serif.

**UI font: Nunito (variable, 200–1000), bundled, first in the stack on every platform.**
- Measured: **every digit is 600 units wide in the default glyphs**, so it's tabular *without*
  `tnum`. That solves canvas score jitter with zero code tricks. We keep the current look (it's
  already the fallback), and Android finally matches iOS.
- Stack: `"Lagoon UI", "Nunito", ui-rounded, "SF Pro Rounded", system-ui, sans-serif`.

**Licensing evidence (quoted from `ofl/fraunces/OFL.txt` and `ofl/nunito/OFL.txt` in google/fonts):**
> "This Font Software is licensed under the SIL Open Font License, Version 1.1."
> "Permission is hereby granted, free of charge, to any person obtaining a copy of the Font
> Software, to use, study, copy, merge, embed, modify, redistribute, and sell modified and
> unmodified copies of the Font Software, subject to the following conditions: 1) Neither the
> Font Software nor any of its individual components, in Original or Modified Versions, may be
> sold by itself. 2) Original or Modified Versions of the Font Software may be bundled,
> redistributed and/or sold with any software, provided that each copy contains the above
> copyright notice and this license."

The preamble adds: "The fonts, including any derivative works, can be bundled, embedded,
redistributed and/or sold with any software provided that any reserved names are not used by
derivative works." Copyright lines: "Copyright 2018 The Fraunces Project Authors
(https://github.com/undercasetype/Fraunces)" and "Copyright 2014 The Nunito Project Authors
(https://github.com/googlefonts/nunito)". **Neither declares a Reserved Font Name**, so our
subsetted, instanced files may keep the name. The [OFL FAQ](https://openfontlicense.org/ofl-faq/)
says bundling with games and mobile apps is allowed (1.4) and the app needn't be open source
(1.3). At minimum, include the copyright statement, license notice and license text, and add an
About-box credit (1.20).
**Obligations:** ship `public/fonts/OFL-Fraunces.txt` and `public/fonts/OFL-Nunito.txt`, keep the
copyright in the font `name` table (don't strip name IDs 0/13/14 when subsetting), and add
"Fonts: Fraunces, Nunito (SIL OFL 1.1)" to Settings → About.

### 2.4 Subsetting and loading plan
```bash
# 1) instance Fraunces (pin SOFT/WONK/opsz/wght) → two static styles
fonttools varLib.instancer "Fraunces[SOFT,WONK,opsz,wght].ttf" SOFT=100 WONK=0 opsz=72 wght=900 -o fraunces-soft-900.ttf
fonttools varLib.instancer "Fraunces[SOFT,WONK,opsz,wght].ttf" SOFT=100 WONK=0 opsz=24 wght=600 -o fraunces-soft-600.ttf
# 2) subset to Latin-1 + punctuation + × (keep name IDs 0,1,2,13,14 for the license)
U="U+0020-007E,U+00A0-00FF,U+2013-2014,U+2018-2019,U+201C-201D,U+2022,U+2026,U+00D7"
pyftsubset fraunces-soft-900.ttf --unicodes="$U" --layout-features=kern,liga,case \
  --name-IDs=0,1,2,13,14 --flavor=woff2 --output-file=public/fonts/lagoon-display-900.woff2   # ≈16.4 KB
pyftsubset fraunces-soft-600.ttf --unicodes="$U" --layout-features=kern,liga,case \
  --name-IDs=0,1,2,13,14 --flavor=woff2 --output-file=public/fonts/lagoon-display-600.woff2   # ≈16.3 KB
pyftsubset "Nunito[wght].ttf" --unicodes="$U" --layout-features=kern,liga,case \
  --name-IDs=0,1,2,13,14 --flavor=woff2 --output-file=public/fonts/lagoon-ui.woff2            # ≈30.9 KB
```
Total ≈ **64 KB** for the entire type system, offline, in the Capacitor bundle (no CDN, works on
a plane). An A–Z-only name subset is 3.9 KB, but it's unnecessary because names use the 900 file
that's already loaded. Put the script in `scripts/fonts.ts` (or `make fonts`) so the output is
reproducible. Don't use glyphhanger: it needs a crawl, and our glyph set is known.

Canvas loading (the renderer pre-renders text sprites, so the font must be ready *before* the
first draw, and caches must be invalidated if it arrives late):
```ts
const faces = [
  new FontFace('Lagoon UI', 'url(./fonts/lagoon-ui.woff2) format("woff2")', { weight: '200 1000' }),
  new FontFace('Lagoon Display', 'url(./fonts/lagoon-display-900.woff2) format("woff2")', { weight: '900' }),
  new FontFace('Lagoon Display', 'url(./fonts/lagoon-display-600.woff2) format("woff2")', { weight: '600' }),
];
faces.forEach((f) => document.fonts.add(f));
await Promise.race([Promise.all(faces.map((f) => f.load())), sleep(1500)]);
renderer.invalidateTextCaches(); // re-run on document.fonts 'loadingdone' if the race timed out
```
Also add `<link rel="preload" as="font" type="font/woff2" crossorigin>` for the UI and Display 900
files, and `@font-face { font-display: block }` with the same family names for the DOM. A unique
family name (`Lagoon …`) keeps a user-installed "Nunito" from shadowing ours.

### 2.5 Type scale (px at 390-pt-wide iPhone; multiply by `textScale` for Larger Text)
Rule: **Display = Fraunces, everything else = Nunito.** Numbers are always Nunito.

| Token | Font / weight | Size / line | Tracking | Use |
|---|---|---|---|---|
| `score.hero` | Nunito 900 | 76 / 1.0 | −0.02em | Results score |
| `score.hud` | Nunito 900 | 52 / 1.0 | −0.02em | Live score |
| `display.xl` | Fraunces 900 | 56 / 1.0 | −0.01em | "Atoll!", NEW HIGH SCORE number line |
| `display.l` | Fraunces 900 | 40 / 1.05 | 0 | Callouts ("Nice Lagoon!", COMBO), reveal creature name |
| `display.m` | Fraunces 900 | 30 / 1.1 | 0 | Screen titles: "Beach Journal", "Leaderboard", "Reef 186" |
| `display.s` | Fraunces 600 | 22 / 1.2 | 0 | Card titles, creature name in detail, results headline ("No room left") |
| `name.row` | Fraunces 900 caps | 18 / 1.0 | +0.06em | Leaderboard names |
| `name.hero` | Fraunces 900 caps | 44 / 1.0 | +0.08em | Name entry preview, share card |
| `title` | Nunito 800 | 19 / 1.25 | 0 | Row titles, button labels (large) |
| `body` | Nunito 650 | 17 / 1.4 | 0 | Sentences, flavor text (HIG default 17) |
| `callout` | Nunito 700 | 15 / 1.35 | 0 | Secondary sentences, "142 to pass CORAL" |
| `label` | Nunito 800 caps | 12 / 1.2 | **+0.08em** (was 0.12–0.14) | Overlines: BEST, MOVES, SHALLOWS |
| `caption` | Nunito 700 | 12 / 1.3 | +0.01em | Journal tile names, footers (never below 11) |

Notes: tracking on caps labels comes down from 0.14em to 0.08em. Wide tracking at 15 px in a
rounded face reads "default UI", not luxury. Don't fake-bold: request the actual weight, since
variable Nunito has it. `font-variant-numeric: tabular-nums` on any DOM number (harmless with
Nunito, and protects the fallback).

---

## 3. Color system

Principles: (1) warm neutrals do 90% of the work; (2) **one** interactive accent (Deep Lagoon);
(3) water cyan becomes *decorative/material only*, never small text on light; (4) gold is
reserved for records and rank 1; (5) pebble colors stay cosmetic (ADR 0003).

### 3.1 Day palette ("Wet sand")
| Token | Hex | Contrast notes (measured) |
|---|---|---|
| `bg` | `#F6EFE4` | – |
| `bg.glow` | `#FBF7F0` | radial top glow |
| `surface` (cards/sheets) | `#FFFBF5` | – |
| `surface.sunk` (wells, stats, tiles) | `#EFE5D6` | – |
| `line` | `rgba(43,35,28,0.08)` | hairlines |
| `ink` | `#2B231C` | 13.5:1 on bg |
| `ink.2` (secondary text) | `#6B5C4B` | **5.64:1 on bg, 6.25:1 on surface** (replaces `#8A7B69` = 3.53:1 ✗) |
| `ink.3` (disabled, decorative glyphs only) | `#968672` | 3.42:1: non-text or ≥18 px bold only |
| `accent` (Deep Lagoon: buttons, links, focus) | `#16588A` | white on it 7.51:1. As text on surface 7.28:1 |
| `accent.lip` (button bottom edge) | `#0E3F66` | – |
| `accent.tint` (your-row, selected) | `#DCEBF3` | ink on it 12.7:1 |
| `water` / `waterHi` (material) | `#5CC8E0` / `#BFF1FA` | **never as text on light** (1.87:1) |
| `gold` (record, rank 1) fill / text | `#F2B93B` / `#9A6A00` | gold text 4.59:1 on surface |
| `coral` (celebration warm) fill / text | `#F2795B` / `#B8452B` | 5.19:1 |
| `success` (kelp) text | `#2C7A55` | 5.06:1 |
| `danger` text | `#B53A35` | 5.62:1 |
| `silver` / `bronze` (medals, fills only) | `#B9C3CC` / `#C98A5A` | used with a dark numeral on top |

### 3.2 Night palette ("Bioluminescent")
| Token | Hex | Contrast notes |
|---|---|---|
| `bg` | `#0A1520` | – |
| `bg.glow` | `#12273A` | – |
| `surface` | `#13253A` | – |
| `surface.sunk` | `#0E1D2D` | – |
| `surface.raised` (sheet top highlight) | 1px inset `rgba(255,255,255,0.06)` | elevation comes from light, not shadow |
| `ink` | `#EEF3F6` | 16.5:1 on bg |
| `ink.2` | `#A3B5C3` | 7.36:1 on surface, 8.72:1 on bg (current `#7F95A6` passes but is muddy) |
| `ink.3` | `#6C8193` | non-text only |
| `accent` | `#6FD3EC` (glow water) | as text 9.0:1 on surface; on-accent ink `#04212D` 9.7:1 |
| `accent.tint` | `rgba(111,211,236,0.14)` | your-row |
| `gold` | `#F5C451` | 9.5:1 |
| `coral` | `#FF8F73` | 7.0:1 |
| `danger` | `#FF7A70` | (existing) |

Primary buttons at night invert to light-on-dark glow: `#6FD3EC` fill, `#04212D` label. That's
deliberate. A deep-blue button on a navy screen disappears.

### 3.3 Pebbles and contrast
Keep the 6 pebble hexes (ADR 0003, deuteranopia-checked). They must meet **3:1 non-text contrast
against the board cell** (WCAG 1.4.11), and they do via the dark bottom lip plus the contact
shadow. Re-check the sun pebble `#F2B93B` on day cell `#D9CAB3`: its face alone is low, so the
lip must stay at least as dark as it is now.

---

## 4. Space, grid, radii, elevation

- **Base unit 4.** Scale: `space.1=4, 2=8, 3=12, 4=16, 5=20, 6=24, 8=32, 10=40, 14=56`.
- **Phone grid (390 pt):** outer margin 20 (the board already spans ~370, keep it). Card/sheet
  inner padding 24 horizontal, 24 top, 20 bottom. Vertical rhythm between groups 24, within a
  group 8–12. Duolingo's redesign used **whitespace instead of containers** (blog above). Apply
  that to the results card: fewer boxes, more air.
- **Radii:** `r.xs=6` (bars), `r.sm=10` (chips inside tiles), `r.md=14` (tiles, inputs), `r.lg=20`
  (buttons, rows), `r.xl=28` (cards, sheets), `r.pill=999`. Pebble cell stays at 26% of the cell.
  Board stays at 5%. Nested radius rule: inner = outer − padding.
- **Elevation (day, warm-tinted, never pure black):**
  `e1 = 0 1px 2px rgba(74,52,30,.10), 0 1px 1px rgba(74,52,30,.06)` (tiles, chips);
  `e2 = 0 6px 16px rgba(74,52,30,.12)` (floating buttons, pinned your-row);
  `e3 = 0 18px 48px rgba(74,52,30,.18), 0 2px 6px rgba(74,52,30,.08)` (sheets, cards).
  **Night:** shadows `rgba(0,0,0,.45)` plus a 1px top inner highlight, and surfaces get lighter
  as they rise.

---

## 5. Motion tokens

Consistent with ADR 0003's gameplay tokens, which stay as they are. These cover UI. Durations
follow M3's "duration grows with area" rule.

| Token | Value | Use |
|---|---|---|
| `dur.instant` | 80 ms | press-in |
| `dur.quick` | 140 ms | chip in/out, tab underline, toggle |
| `dur.base` | 220 ms | card content swap, row insert |
| `dur.sheet` | 320 ms | sheet/card enter (spring settles ≈ this) |
| `dur.exit` | 180 ms | anything leaving (exits are faster than entries) |
| `dur.celebrate` | 900 ms | callout lifetime (ADR: 760–900) |
| `dur.reveal` | 1400 ms | creature reveal total |
| `ease.standard` | `cubic-bezier(0.2, 0, 0, 1)` | default (M3 standard) |
| `ease.enter` | `cubic-bezier(0.05, 0.7, 0.1, 1)` | elements entering (M3 emphasized-decelerate) |
| `ease.exit` | `cubic-bezier(0.3, 0, 0.8, 0.15)` | elements leaving (M3 emphasized-accelerate) |
| `ease.pop` | `cubic-bezier(0.34, 1.56, 0.64, 1)` | small overshoot for badges and medals (design choice) |
| `spring.press` | stiffness 1400, damping ratio 0.9 | button release (M3 fast-spatial) |
| `spring.sheet` | stiffness 700, damping 0.9 | sheets, cards (M3 default-spatial) |
| `spring.screen` | stiffness 300, damping 0.9 | full-screen transitions (M3 slow-spatial) |
| `spring.bouncy` | stiffness 500, damping 0.6 | celebration text and the reveal card only (design choice) |
| `stagger.row` | 35 ms/row, cap 8 rows (≤ 280 ms) | lists, stats, journal tiles |

The current `.card` uses `cubic-bezier(0.2, 1.4, 0.4, 1)` over 240 ms for *every* card. That
overshoot is fine for a reveal, but it makes Settings feel bouncy. Use `spring.sheet` (no visible
overshoot) for utility screens, and save `spring.bouncy` for moments. **Reduced motion:** springs
become 150 ms opacity crossfades, stagger 0, count-ups jump to final, no scale on text. Haptics
and sound carry the moment instead. HIG: "avoid using [motion] as the only way to communicate."

Implementation note: a 30-line critically-damped spring integrator in `src/render/tweens.ts`
(semi-implicit Euler, dt clamp 1/30) covers both canvas and DOM (DOM via `style.transform` in
rAF). Don't pull in an animation library.

---

## 6. Components

### 6.1 Primary button: the "pebble button"
Tie the chrome to the board's material, so buttons *are* pebbles.
- 56 h, full width in cards (max 342), `r.lg` 20. Fill `accent`, bottom lip 4 px `accent.lip`
  (`box-shadow: 0 4px 0 var(--accent-lip), e1`). Label Nunito 800 18, `ink.onAccent`, optional
  20 px leading icon.
- **Press:** on `pointerdown`, `translateY(3px)`, lip shrinks to 1 px, `scale(.98)`, `dur.instant`
  `ease.standard`, light haptic tick. On release, `spring.press` back. That's the "squish": the
  button physically sinks the way a placed pebble does.
- **Secondary:** `surface.sunk` fill, `ink` label, lip `rgba(43,35,28,.12)`. **Ghost:** no fill,
  `ink.2` label, 48 h, used for "Not now" and "Close". Max **one primary per view** (HIG).
- Disabled: 40% opacity, no lip. Focus-visible: 3 px `accent` ring with 2 px offset (keep).

### 6.2 Chip
32 h (hit area padded to 44), `r.pill`, padding 0 12, Nunito 800 13, +0.02em. Variants:
`neutral` (`surface.sunk`/`ink`), `accent` (`accent.tint`/`accent`), `gold` (`#FFF1CC`/`#9A6A00`),
with an optional 16 px icon. Enter: scale .9→1 plus fade over `dur.quick` `ease.pop`. Used for:
streak, "New: Parrotfish" (today 1.9:1 cyan on sand, which fails), "Daily · Day 132", rank delta
"▲ 3".

### 6.3 Sheet / card
Bottom sheet for utility (Settings, Leaderboard, Journal): full-width, `r.xl` top corners, grabber
36×5, `surface`, `e3`, enters with `spring.sheet` from +40 px plus fade. Dismiss via drag (velocity
> 600 px/s or > 30% height), the scrim, or the Close ghost. Centered card for moments (Results,
Reveal): width min(92vw, 360), padding 24, `r.xl`, scrim = `bg` at 60% plus blur 8 (today 55% /
6 is fine).

### 6.4 Leaderboard row
```
| 44 rank | 12 | 36 avatar | 12 | NAME (flex) ............ | SCORE (right, tabular) | 16 |
height 60, radius 20 (only when highlighted), no borders between rows: spacing 4
```
- **Rank:** Nunito 800 17 `ink.2`, tabular, right-aligned in 44. Ranks 1–3 swap the numeral for
  a 28 px **shell medal** (custom SVG: scallop silhouette filled gold/silver/bronze, numeral
  in `ink` Nunito 900 12).
- **Avatar:** 36 circle, `surface.sunk`, showing the player's **chosen journal creature**
  (procedural art we already have, `creatureThumb`). It makes the journal social at zero art
  cost. Default = first species caught.
- **Name:** `name.row` (Fraunces 900 caps, +0.06em) `ink`.
- **Score:** Nunito 800 18 tabular, right. On Daily, an optional `ink.2` 13 subline: "29 moves".
- **You:** `accent.tint` background, `r.lg`, a 3 px left accent bar, name gets "YOU" label chip.
- **Pinning:** if your row is outside the viewport, it's pinned (sticky) at the bottom above the
  safe area with `e2`. Tapping it scrolls to you (`spring.screen`).
- **"Just above you" target (the motivational heart):** a card *above* the list:
  `[avatar] CORAL · #37` / "**142** to pass" with a progress bar (your score ÷ theirs) and a
  primary "Play Endless" button. That's the gap-to-next-rank principle from the
  [Yu-kai Chou](https://yukaichou.com/advanced-gamification/how-to-design-effective-leaderboards-boosting-motivation-and-engagement/)
  article. If you're #1: "You're on top. Best by **88**" in gold.
- **Window:** show top 3 plus 5 above and 5 below you (same source), with a "···" divider row,
  not the whole list.
- **Tabs:** segmented control **Daily · This week · All-time**, 3 equal segments, 40 h (44 hit),
  selected = `surface` pill with `e1`, `dur.quick` slide. The Daily tab title adds the date chip.
  Three boards mirror Good Sudoku's three daily leaderboards
  ([site](https://www.playgoodsudoku.com/)). The week resets Sunday 00:00 local, like Duolingo.
- **States:** *Loading*: 6 skeleton rows (sunk bars, a 1.2 s shimmer, none under reduced motion).
  *Empty* (no entries today): a small creature illustration, "Be the first on the beach today",
  and a primary "Play the daily". *Offline*: a cloud-off icon, "You're offline: your score is saved
  and will post when you're back", plus your local best shown as a single pinned row. *Not yet
  named*: replace the your-row name with a "Choose a name" button that opens name entry.
- **Rank change animation** after posting: your row slides from old to new position
  (`spring.screen`). Rows in between shift with a 20 ms stagger. The rank numeral counts. Haptic
  on settle.

### 6.5 Name entry field (max 7, A–Z)
**Recommendation: seven pebble slots + a custom A–Z keypad, not arcade wheels and not the
system keyboard.**
- Arcade 3-letter wheels are charming, but with 7 letters that's up to ~13 spins per letter.
  Too slow. Keep the arcade *feel* through the slots instead.
- The system keyboard (Capacitor WebView) resizes the viewport, brings lowercase, digits, emoji,
  autocorrect and IME composition we'd have to strip, and looks like a form. A custom keypad
  guarantees A–Z by construction and looks like part of the game.
- **Layout:** title `display.m` "Your beach name". The **preview** is `name.hero` (Fraunces 900
  caps 44, +0.08em) centered *above* seven 40×48 slots (`r.md`, `surface.sunk`, the active slot
  gets a 2 px `accent` ring and a blinking 2 px caret at 1 Hz, static under reduced motion). Each
  typed letter drops into its slot as a mini pebble (scale .6→1, `ease.pop`, 140 ms, light
  haptic). Keypad: QWERTY in 3 rows (10/9/7), keys 34×46 with 44 hit area via 6 px gaps on 390,
  Nunito 800 20, plus wide **⌫** and **Done** (primary, disabled until 2+ letters). Below:
  a ghost "Surprise me" that fills a random beachy word (SANDY, CORAL, KELP, TIDE, DRIFT, PEARL…).
- **Live enforcement (for hardware keyboards, a11y and any fallback `<input>`):**
  `value = value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 7)` on every `input` event, and
  cancel `beforeinput` events whose `data` contains anything else. Set
  `autocapitalize="characters" autocomplete="off" autocorrect="off" spellcheck="false"
  enterkeyhint="done" maxlength="7"`. With a rejected key, the slot row does a 6 px horizontal
  shake (none under reduced motion) and a soft "thud", the same vocabulary as an invalid
  placement.
- **Moderation:** a small denylist check on submit (substring match on the A–Z string) with a
  friendly "Try another name". Needed before anything goes on a public board.
- **A11y:** the slots are one `role="textbox"` with `aria-label="Beach name, 7 letters max"` and
  live `aria-valuetext`. The keypad buttons are real `<button>`s.

### 6.6 Results card (game over / daily complete)
Hierarchy, top to bottom, with whitespace instead of boxes:
1. Overline `label`: "NO ROOM LEFT" / "DAILY · DAY 132" (`ink.2`).
2. **Score** `score.hero` 76, counts up over 700 ms `ease.enter` (tabular Nunito, no jitter).
3. Best line: `callout` "Best 12,480" or the **NEW HIGH SCORE** moment (§7.3).
4. Rank line (when online): chip "#37 this week ▲ 5", which taps through to the leaderboard.
5. Stats: **inline**, three columns separated by 1 px `line` rules, value `title` Nunito 800 20,
   label `label`. No grey boxes.
6. New-in-journal strip: a horizontal row of 56 px framed tiles (§6.7), max 4 + "+2", tap → journal.
7. Primary "Play again" (pebble button). Secondary "Leaderboard" or "Daily". Ghost "Share".
   That's two prominent buttons max.
Enter: card `spring.sheet`, then a content stagger of 35 ms per block (overline → score →
best → stats → strip → buttons). Total under 600 ms before the button is pressable; never make
the player wait for "Play again".

### 6.7 Journal tile
92 h × (grid of 4 at 350 → ~82 w), `r.md` 14. **Caught:** `surface` fill, `e1`, a 1 px inner
ring tinted by the creature's habitat (Shallows sand `#E9DCC6`, Lagoon water `#CDEBF2`, Reef
coral `#F7D6CC`, Deep water navy `#C9D3E6`). Creature 48 px centered on a soft radial "pool" spot
(habitat color at 50%). Name `caption` 12 centered, max 2 lines. **Golden:** gold ring 2 px plus
a 4 px sparkle glyph top-right. **Undiscovered:** `surface.sunk`, silhouette at `ink.3` 40%, name
"???" in `ink.3`. **New** (unseen): an 8 px coral dot top-right that clears on view. Section
headers: `display.s` Fraunces 600 22 ("Shallows") plus a right-aligned `label` "9/10" and a 4 px
progress bar. That replaces today's tracked-caps dim header.

### 6.8 Discovery reveal card
The single most "shareable" moment. Sequence (≈1.4 s total, tap to skip at any point):
1. 0 ms: scrim in (180 ms). The card enters at 0.8 scale with `spring.bouncy`, showing the
   **silhouette** on a habitat-colored pool, overline `label` "NEW DISCOVERY".
2. 350 ms: a ripple ring expands from the creature (water metaphor), the silhouette crossfades to
   full color over 250 ms, medium haptic plus the discovery chime.
3. 600 ms: name `display.l` Fraunces 900 40 rises 8 px plus fades (`ease.enter`). Rarity chip
   (Common / Uncommon / Rare / Golden).
4. 800 ms: flavor text `body` `ink.2`, then "No. 27 of 47" `label`.
5. 1000 ms: buttons: primary "Add to journal", ghost "Share card".
Card: 320×440, `r.xl`, `surface`, a habitat gradient band in the top 55%. Golden variant gets a
gold foil border (linear gradient `#F7D774 → #C9922B → #F7D774` stroked 3 px) and slow sparkles.

### 6.9 Share card (rendered to canvas → PNG via the share sheet)
- 1080×1350 (4:5) default, which fits feeds and messages. Optional 1080×1920 story variant.
- **Creature card:** habitat gradient, creature at 520 px, name in Fraunces 900 caps 96
  (+0.06em), "Found by **CORAL** · Lagooner Beach" in Nunito 700 36, the date, and a small app
  mark bottom-center. No URL soup, no QR.
- **Daily result card** (Wordle principle: spoiler-free and glanceable): "Lagooner Beach · Day
  132", the score in Nunito 900 160, best-lagoon size, and a **mini 8×8 heatmap of where your
  lagoons formed**. It reveals no piece sequence, and it's unmistakably ours. Keep the text share
  (`src/meta` share text) for plain-text channels.

---

## 7. Celebrations: typography that stays readable

### 7.1 Construction (canvas)
Three passes, all Fraunces 900:
1. **Shadow:** fill at `(x, y + 0.06em)` in `rgba(43,35,28,.25)` (day) / `rgba(0,0,0,.5)` (night).
2. **Outer stroke:** `lineWidth = 0.16em`, `lineJoin = 'round'`, color `#2B231C` (day) / `#04212D`
   (night). Strokes are centered, so only half (0.08em) shows outside the glyph.
3. **Fill:** vertical gradient across the text box. *Warm* (default): `#FFE08A → #F2B93B → #F2795B`.
   *Water* (cascades): `#E8FCFF → #6FD3EC → #2B8FC0`. *Gold* (records): `#FFF4C2 → #F2C14E →
   #B9821F`.
4. Optional **inner highlight:** `strokeText` at `lineWidth 0.03em` in `rgba(255,255,255,.6)`
   clipped to the top 40%. Do it only for `display.xl`.

**Readability rules:** the stroke must contrast at least 3:1 against *both* the board and the water
(the dark outer stroke guarantees that). Minimum 34 px. At most 2 words. Never place it over the
lagoon center (it hides the payoff). Anchor it 0.6 cells above the lagoon's bounding box, clamped
inside the board. Pre-render each callout to an offscreen canvas once per size (consistent with
the pebble sprites) so 3-pass text costs nothing per frame.

### 7.2 Callout ladder (respecting CLAUDE.md's one-channel rule)
Points `+N` stay Nunito 900 (numbers rule) with the existing halo. Words only for jackpots:
| Trigger | Text | Style | Motion |
|---|---|---|---|
| Lagoon 6–11 | **Nice Lagoon!** | display.l 40, warm | scale 0.6→1.08→1 (`spring.bouncy`), hold, rise 12 px + fade |
| Lagoon ≥12 | **Atoll!** | display.xl 56, warm + highlight | as above + 4° rotation settle, heavy haptic |
| Cascade waves ≥2 | **COMBO ×N** | display.l, water. "×N" in Nunito 900 (tabular) | each new wave re-pops the ×N only |
| Board cleared | **Spotless!** | display.xl, water | ring of foam particles |
| New high score (in-run) | chip in the HUD best slot: "NEW BEST" | gold chip | once per run |
Today's `calloutFor` strings ("Lagoon", "Ripple ×N") should move to this set. "Nice Lagoon!" and
"Atoll!" are on-brand words, and COMBO is universally understood.

### 7.3 NEW HIGH SCORE moment (results)
At 700 ms, when the count-up passes the old best: the score briefly turns gold (gradient fill),
the old-best line strikes through and slides down ("was 12,480"), and a ribbon banner
"NEW HIGH SCORE" (Fraunces 900 caps 22, +0.08em, `#9A6A00` on a `#FFF1CC` ribbon with notched
ends, custom SVG) drops in with `spring.bouncy`. Add a gold confetti burst (30 particles,
≤ 900 ms), the existing rising "new best" figure, and a heavy double haptic. Under reduced
motion: show the gold state and the banner immediately, with no particles.

### 7.4 Endless reef progress
A slim 6 px progress track under the HUD score (`surface.sunk`, fill = water gradient,
`r.pill`), labeled `label` "REEF 3 · 64%". It fills with `ease.standard` on each capture. When it
reaches the next reef: the track pulses, a chip "Reef 4 reached" appears, and there's a subtle
board-tint shift toward the next habitat color (the journal habitats: Shallows → Lagoon → Reef → Deep water). The progression
should be felt in the *environment*, not only read in a number.

---

## 8. Iconography

Today: 3 inline SVG icons (`ICON_MENU` stroke 2.4, `ICON_HINT` 2.2, `ICON_DAILY` 2.2), all
outline, `--dim` color. The mixed weights read as unconsidered.

**Spec for a custom "Tidemark" set (inline SVG, `currentColor`):**
- 24×24 grid, 2 px padding (live area 20). **Stroke 2.25**, round caps and joins everywhere.
  Corner radius 2 on all rectangles, matching the pebble softness.
- Two states: **outline** (default) and **filled** (selected tab, active toggle). Filled variants
  use the same silhouette, so the switch never shifts layout.
- Rendered at 24 in buttons (44 hit), 20 in chips, 16 inline in text. Color `ink.2` default,
  `accent` when active.
- Set (each drawn once in `src/ui/icons.ts`): menu (3 lines, middle shorter, beach-like), close,
  back, daily (sun over wave, the existing one is good), hint (bulb), journal (open book with
  a fish bookmark), leaderboard (3 stepped podium pebbles), trophy/shell medal, share (arrow
  out of a rounded square), settings (a 6-tooth sea-star gear, original), sound on/off (shell
  with waves), haptics, theme (half sun / half moon), offline (cloud with slash), reef
  (branching coral), streak (wave), golden sparkle, lock, check, plus.
- Medals and the record ribbon are the only multi-color icons.

Replacing the hamburger with a **journal icon top-left** and **leaderboard top-right** (daily
moves into the menu or the results) would put the two retention loops one tap away. That's a
product call; flagging it.

---

## 9. Screen-by-screen critique (from the current screenshots)

### 9.1 In-game HUD, Day (`docs/media/before/start-day.jpg`, `capture-t0260.jpg`)
Strengths: the board material, generous margins, a calm canvas.
1. **Score type and jitter.** "0" / "71" in SF Rounded 800 with "BEST 0" in dim 3.5:1 caps
   above. Use `score.hud` Nunito 900 52 (tabular, so the count-up stops twitching), put "BEST
   12,480" *below* the score as `label` `ink.2` (score first, best second, as on results), add
   thousands separators, and hide "BEST" entirely when best = 0 (first run).
2. **Dead zone below the tray.** About 22% of the screen under the tray is empty sand, and the
   tray floats at 70% height. Move the tray down toward the thumb (bottom inset + 24) and use
   the gap between board and tray for the streak/reef-progress strip (§7.4). The layout then
   reads top-to-bottom: status → board → hand.
3. **Icon chrome.** Mixed-stroke outline icons in `#8A7B69` at 26 px feel like defaults. Swap in
   the Tidemark set at 24 px / 2.25 stroke in `ink.2`, sitting on 44 px circular `surface` buttons
   with `e1`, so they read as objects on the beach, not floating glyphs.

### 9.2 In-game HUD, Night (`start-night.jpg`, `artifacts/store/4-night.png`)
1. Board cells and background are too close in value. The board edge vanishes at the bottom.
   Lift `board` to `#162C40` and add the 1 px top inner highlight, so the board reads as a
   lit tray.
2. The drag ghost (the blue piece above the tray) is dull at 40% opacity on navy. Use the piece's
   own color at 70% plus the glow ring at night. Dashed preview outlines could be **solid soft
   glow** at night, since dashes are a "day/paper" idiom.
3. Night pebble saturation is the same as day, so the purple and pink glow. Drop to ~92%
   saturation and give **water** the brightest value: the lagoon should be the hero light source
   at night.

### 9.3 Capture moment (`capture-t0260.jpg`, `seal-preview.jpg`, store `2-pop.png`)
1. "+387" / "+129" sits dead center *on* the water, covering the payoff. Anchor it above the
   lagoon box (§7.1), in Nunito 900 with the dark-stroke treatment for punch.
2. "New: Parrotfish" under the score is pale cyan on sand (≈1.9:1) and competes with the score.
   Replace it with the gold/accent **chip** (§6.2) carrying a 20 px creature thumbnail, entering
   in the streak slot (respecting the one-chip queue).
3. The white ring outline on "will be captured" pebbles is good. Add a 120 ms synchronized 2%
   breathe on those pebbles plus the water shimmer, so the preview is unmistakable without
   color (ADR intent), and visually louder than the ghost.

### 9.4 Game over / results (`docs/media/before/gameover.jpg`)
1. **Flat hierarchy.** Overline, score and "Best 372" are fine, but then come 3 grey boxes, a
   tracked-caps header, 5 tinted tiles and 2 full-width buttons, all similar weight. Apply §6.6:
   inline stats with no boxes, the journal as a compact strip, the rank chip, and a NEW HIGH
   SCORE moment (the screenshot shows best = score with no celebration at all).
2. **Buttons.** Two 56 px full-width slabs, where "Daily challenge" in grey competes with
   "Play again". Make "Play again" a pebble button, "Daily" secondary at 48 px or a chip, and
   add a ghost Share.
3. **Type.** "NO ROOM LEFT" at 0.14em tracking in dim brown, "TOP LAGOON"/"CAUGHT" labels
   squeezed into narrow boxes. Use a Fraunces 600 22 headline ("No room left"), `label` at
   0.08em, and `ink.2` at 5.6:1.

### 9.5 Beach Journal (`artifacts/store/3-journal.png`, `creatures.jpg`)
1. **Tiles are flat pastel squares.** The creatures are delightful but sit on identical
   `#e5f3f3` blocks with no frame. Apply §6.7 (habitat rings, pool spot, golden ring) so the
   grid reads as a *collection*, like specimen cards.
2. **Header.** "BEACH JOURNAL" small caps plus "26 / 47" plus a gray sentence. Use a Fraunces 900
   30 title, a big circular progress ring (26/47) with the number in Nunito 900, and habitat
   sections with their own progress bars.
3. **Undiscovered** silhouettes are brown blobs on beige (low contrast, so they look broken).
   Use `ink.3` at 40% on `surface.sunk` with "???" and a habitat hint. Also: the journal is a
   centered card inside a blurred game. Make it a full-height **sheet** with the grabber, since
   it's a destination, not a dialog.

### 9.6 Reef puzzle (`artifacts/store/5-reef.png`)
1. "TRICKY · 186 OF 360" / "Reef 186" / "clear every pebble" are three stacked lines in three
   styles, with the subtitle in cyan at 1.7:1. Use a `display.m` Fraunces "Reef 186", a tier
   chip ("Tricky", tier color), and drop the instruction after the first 3 reefs.
2. The single remaining piece sits alone in a huge empty tray area. Center and enlarge
   remaining pieces (tray scale 0.74 → up to 0.9 when ≤ 1 piece), and show used slots as faint
   pebble outlines so progress is visible.
3. The reef select grid (from `overlay.ts`: 5-column 44 px buttons with inset bottom-shadow tier
   colors) needs tier sections with Fraunces headers, star marks as an icon rather than `<sup>★`,
   and a "next" tile with the accent fill plus a small pulse.

### 9.7 Menu / home card (from `overlay.ts` `showMenu`, no screenshot)
1. The `h2` "Lagooner Beach" in 15 px dim caps is our *name*, and it's the least prominent thing
   on the card. Make it a Fraunces 900 wordmark (≈34 px, wave-underline glyph) on a full-height
   home sheet.
2. Stats boxes repeat the results pattern. Show *one* hero stat (best) plus streak chip plus
   journal progress ring.
3. Modes (Endless / Daily / Reefs) should be 3 large mode cards (88 h, icon + Fraunces title +
   one `callout` line + right-aligned status such as "Day 132 ✓" or "186/360"), not a list of
   equal buttons.

### 9.8 Settings (from `overlay.ts` `showSettings`)
1. Rows are 48 px with hairlines, which is good. Group them into inset sections (Sound & feel /
   Look / About) with `label` headers, iOS-style, on `surface.sunk`.
2. The theme segmented control and the "Style" (skins) row should show **previews**: swatches of
   pebbles per skin, a sun/moon icon per theme.
3. Add the font credits plus the OFL link to About (license obligation, §2.3), and a "Your beach
   name" row (opens name entry).

### 9.9 App Store screenshots (`artifacts/store/*.png`)
1. Headlines are SF Pro Heavy with tight tracking: generic App Store type. Set them in Fraunces
   900 (SOFT 100), the brand's display voice, with a 2-line rhythm and the key word in the
   accent ("Close a *loop*.").
2. The device frames show the same empty bottom third as the game (§9.1 #2). After the layout
   fix, crop the frame to the board and tray, or bleed the device off the bottom edge, so the
   board is 15–20% larger in the shot.
3. Sequence: the shots are all the same board view (1, 2, 4, 6 are near-identical layouts). Make
   shot 2 the **creature reveal card**, shot 3 the **journal**, and shot 4 the **leaderboard
   with "142 to pass CORAL"**: show the loops, not only the mechanic.

---

## 10. Token proposal (drop-in shape for `theme.ts` / `style.css`)
```css
:root {
  --font-ui: 'Lagoon UI', 'Nunito', ui-rounded, 'SF Pro Rounded', system-ui, sans-serif;
  --font-display: 'Lagoon Display', 'Fraunces', Georgia, serif;
  --bg:#F6EFE4; --bg-glow:#FBF7F0; --surface:#FFFBF5; --surface-sunk:#EFE5D6;
  --line:rgba(43,35,28,.08); --ink:#2B231C; --ink-2:#6B5C4B; --ink-3:#968672;
  --accent:#16588A; --accent-lip:#0E3F66; --accent-tint:#DCEBF3; --on-accent:#FFFFFF;
  --water:#5CC8E0; --water-hi:#BFF1FA; --gold:#F2B93B; --gold-ink:#9A6A00;
  --coral:#F2795B; --coral-ink:#B8452B; --success:#2C7A55; --danger:#B53A35;
  --s1:4px; --s2:8px; --s3:12px; --s4:16px; --s5:20px; --s6:24px; --s8:32px; --s10:40px; --s14:56px;
  --r-xs:6px; --r-sm:10px; --r-md:14px; --r-lg:20px; --r-xl:28px;
  --e1:0 1px 2px rgba(74,52,30,.10),0 1px 1px rgba(74,52,30,.06);
  --e2:0 6px 16px rgba(74,52,30,.12);
  --e3:0 18px 48px rgba(74,52,30,.18),0 2px 6px rgba(74,52,30,.08);
  --ease-standard:cubic-bezier(.2,0,0,1); --ease-enter:cubic-bezier(.05,.7,.1,1);
  --ease-exit:cubic-bezier(.3,0,.8,.15); --ease-pop:cubic-bezier(.34,1.56,.64,1);
  --dur-instant:80ms; --dur-quick:140ms; --dur-base:220ms; --dur-sheet:320ms; --dur-exit:180ms;
}
html[data-theme='night'] {
  --bg:#0A1520; --bg-glow:#12273A; --surface:#13253A; --surface-sunk:#0E1D2D;
  --line:rgba(238,243,246,.08); --ink:#EEF3F6; --ink-2:#A3B5C3; --ink-3:#6C8193;
  --accent:#6FD3EC; --accent-lip:#2B8FC0; --accent-tint:rgba(111,211,236,.14); --on-accent:#04212D;
  --gold:#F5C451; --gold-ink:#F5C451; --coral:#FF8F73; --coral-ink:#FF8F73; --danger:#FF7A70;
  --e1:0 1px 2px rgba(0,0,0,.4); --e2:0 6px 16px rgba(0,0,0,.45);
  --e3:0 18px 48px rgba(0,0,0,.55),inset 0 1px 0 rgba(255,255,255,.06);
}
```
Mirror the same names in `theme.ts` (`Palette` gains `surface`, `surfaceSunk`, `ink2`, `ink3`,
`accent`, `gold`, `coral`; `MOTION` gains the UI tokens and springs; new `TYPE` with the §2.5
scale). Both CSS and canvas then read one source. A unit test can assert every text pair in §3
stays ≥ 4.5:1 using the same luminance formula used for this doc.

---

## 11. Priorities (do in this order)
1. Bundle **Nunito** and make it first in `FONT`/`--font` (fixes Android, fixes score jitter).
2. Add **Fraunces SOFT** as `Lagoon Display` with the loading/invalidation plan and the OFL files.
3. Replace the neutral ramp (`ink.2` 5.6:1) and stop using water cyan as text.
4. Pebble buttons with squish, one primary per view.
5. Results card rebuild plus the NEW HIGH SCORE moment.
6. Celebration text system (3-pass, gradients, ladder) replacing `drawTexts` styling for words.
7. Journal tiles with habitat frames; journal as a sheet.
8. Leaderboard screen (rows, pinning, just-above target, tabs, states) plus name entry keypad.
9. Discovery reveal plus share cards.
10. Tidemark icon set and layout fix (tray lower, progress strip between board and tray), then
    reshoot the store screenshots.
