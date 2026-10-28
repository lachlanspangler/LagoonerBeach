# Title wordmark typeface for "Lagooner Beach"

Companion to `INTRO_SCREEN.md`. Goal: a display face for the title lockup that suits a calm
beach and lagoon mood, pairs with the bundled **Fraunces** ("Lagoon Display", SOFT 100, 900 and
600) and **Nunito** ("Lagoon UI"), uses the SIL OFL or an equally permissive licence that allows
app embedding, and costs almost nothing once subset to the wordmark's glyphs.

**Pick: Fraunces, in a dedicated title instance (opsz 144, SOFT 100, WONK 1, wght 800), subset
to "Lagooner Beach": 2,052 bytes woff2. SIL OFL 1.1.** The reasoning is in §4 and the command
in §5.

## 1. Method (reproducible)
- **Sources:** each font's `OFL.txt` and `METADATA.pb` come from the official Google Fonts
  repository, `https://raw.githubusercontent.com/google/fonts/main/ofl/<family>/`, the same
  source `scripts/fonts.sh` already uses. The font binaries come from the same directory.
  Everything was downloaded into a fresh `/tmp/lb-type-dl.*` directory.
- **License check:** every `METADATA.pb` says `license: "OFL"`. Every `OFL.txt` contains
  "This Font Software is licensed under the SIL Open Font License, Version 1.1." The copyright
  line and any Reserved Font Name (RFN) are quoted per font below.
- **Measuring:** fontTools 4.x with brotli in `/tmp/lbvenv-type`. Variable fonts are instanced
  with `fontTools.varLib.instancer` at the stated axes. Each one is subset with
  `--text="Lagooner Beach"` (glyphs: space B L a c e g h n o r, plus .notdef), layout features
  `kern, liga, calt`, and name IDs 0, 1, 2, 13, 14 (keeps the copyright and licence fields, as
  OFL §2 requires), flavour woff2. Sizes are exact bytes.
- **Rendering:** a contact sheet of all 21 candidates at 44 px, then full mock-ups of the top 3
  at 390 × 844 (DPR 1.5) over a Day and a Night lagoon, rendered with Playwright Chromium
  (`--mute-audio`). Scripts are in `/tmp/lb-type-scripts/`. No repo files were touched apart
  from these docs and the PNGs.

### What the OFL allows for an app (quoted from the OFL 1.1 text in each `OFL.txt`)
> "Permission is hereby granted, free of charge, to any person obtaining a copy of the Font
> Software, to use, study, copy, merge, embed, modify, redistribute, and sell modified and
> unmodified copies of the Font Software, subject to the following conditions: …
> 2) Original or Modified Versions of the Font Software may be bundled, redistributed and/or
> sold with any software, provided that each copy contains the above copyright notice and this
> license. …
> 3) No Modified Version of the Font Software may use the Reserved Font Name(s) unless explicit
> written permission is granted by the corresponding Copyright Holder. This restriction only
> applies to the primary font name as presented to the users."

Subsetting and instancing create a **Modified Version**. Two things follow:
1. Ship the `OFL.txt` (we already ship `public/fonts/OFL-Fraunces.txt`).
2. For any font **with an RFN**, the subset's internal family name (name IDs 1, 4, 6, 16) must
   be renamed. Abril Fatface, Corben, Lilita One, Lobster, Playfair Display, Righteous,
   Sacramento and DM Serif Display (RFN "Source") all have one. Fraunces, Young Serif,
   Caprasimo, Gloock, Shrikhand, Bagel Fat One, Pacifico, Fredoka, Instrument Serif, Bodoni
   Moda and Bricolage Grotesque have **no** RFN, so a subset can keep its name. That's one
   reason to prefer them, and our CSS family alias (`Lagoon Title`) is cosmetic either way.

## 2. Contact sheet (all candidates, 44 px, Day ink on Day sand)
Rendered to `/tmp/lb-type-scripts/sheet.png` as a working file. It wasn't kept in the repo
because it's a quick look, not a deliverable. What I saw, in brief: the scripts (Sacramento,
Pacifico, Lobster) and the condensed grotesque (Bricolage at wdth 75) set themselves apart
immediately as the wrong register. The heavy soft serifs (Fraunces, Caprasimo, Young Serif,
Corben) cluster as the right one.

## 3. Shortlist (21 measured, 12 written up)
"Subset" = woff2 bytes for the glyphs of "Lagooner Beach". Legibility is judged at 32–64 px on
a phone, from the contact sheet and the mocks.

| # | Font (designer) | License (quoted from `OFL.txt` line 1 + `METADATA.pb`) | RFN | Personality | Legibility 32–64 px | Pairing with Fraunces + Nunito | Subset |
|---|---|---|---|---|---|---|---|
| 1 | **Fraunces** title instance: opsz 144, SOFT 100, WONK 1, wght 800 (Undercase Type, Phaedra Charles, Flavia Zimbardi) | "Copyright 2018 The Fraunces Project Authors (https://github.com/undercasetype/Fraunces)"; `license: "OFL"`; repo: "OFL-1.1" ([GitHub](https://github.com/undercasetype/Fraunces)) | none | A soft "Old Style" serif. At opsz 144 the contrast and ball terminals peak. WONK swaps in the leaning h, n, m (README: "Binary axis controls substitution of 'wonky' characters. Automatically substitutes when opsz > 18."). Boutique-hotel postcard, gently goofy. | Excellent. Open counters at 800, distinctive "g". | **Same family** as every display moment ("Nice Lagoon!", screen titles, the home-sheet wordmark), but a more characterful cut. Coherent with zero new voice. | **2,052 B** (WONK 0: 2,072 B) |
| 1b | Fraunces, reusing the bundled `lagoon-display-900.woff2` (opsz 72, WONK 0) | as above | none | Same voice, a bit sturdier and plainer. No wonky letters. | Excellent | Identical to the home sheet | **0 B extra** |
| 2 | **Caprasimo** (DocRepair Project, Phaedra Charles, Flavia Zimbardi) | "Copyright 2023 The Caprasimo Project Authors (https://github.com/docrepair-fonts/caprasimo-fonts)."; `license: "OFL"` | none | A soft, fat 1970s "Cooper" revival. Beach-shack sign, surf wax, very warm. | Excellent, the most legible of all at 32 px | Second soft heavy serif next to Fraunces. Close enough to look like a mistake, different enough to show. | 1,952 B |
| 3 | **Young Serif** (Bastien Sozeau) | "Copyright 2023 The Young Serif Project Authors (https://github.com/noirblancrouge/YoungSerif)"; `license: "OFL"` | none | A heavy old-style serif with a calligraphic "g" and "a". Literary, calm, elegant. | Very good. Lighter colour than the Fraunces 800. | Sits well with Nunito. Next to Fraunces it's a near-twin, same issue as Caprasimo. | 4,152 B (most of it is name and metadata) |
| 4 | Gloock (Duarte Pinto) | "Copyright 2022 The Gloock Project Authors (https://github.com/duartp/gloock)"; `license: "OFL"` | none | A high-contrast editorial serif. Fashion magazine. | Good at 48 px or more, hairlines thin out at 32 | Cooler and more formal than our world | 4,020 B |
| 5 | DM Serif Display (Colophon) | "Copyright 2014-2018 Adobe … with Reserved Font Name 'Source'"; `license: "OFL"` | 'Source' | A clean Didone display. Polite, generic. | Good | Fine, but forgettable | 3,968 B |
| 6 | Abril Fatface (TypeTogether) | "Copyright (c) 2011, TypeTogether (www.type-together.com), with Reserved Font Names "Abril" and "Abril Fatface""; `license: "OFL"` | yes | A fat-face Didone. Poster, loud. | Good large, hairlines vanish small | Too sharp beside SOFT 100 Fraunces and rounded Nunito | 1,548 B |
| 7 | Playfair Display at wght 800 (Claus Eggers Sørensen) | "Copyright 2017 The Playfair Display Project Authors …, with Reserved Font Name "Playfair Display""; `license: "OFL"` | yes | A transitional display serif. The most-used "elegant" web font. | Good | Reads like a template | 1,908 B |
| 8 | Shrikhand (Jonny Pinhorn) | "Copyright (c) 2015 Jonny Pinhorn"; `license: "OFL"` | none | A heavy, playful italic display. Ice-cream truck. | Good | Fun, but it's a loud brand and fights the calm brief | 2,104 B |
| 9 | Corben Bold (Vernon Adams) | "Copyright (c) 2010, 2011 by vernon adams …, with Reserved Font Name Corben"; `license: "OFL"` | yes | Very round, wide, friendly serif | Good, but **too wide**: on the contact sheet it was the only face that wrapped "Lagooner Beach" in a 440 px column at 44 px | Too wide for a phone lockup | 4,428 B |
| 10 | Pacifico (Vernon Adams et al.) | "Copyright 2018 The Pacifico Project Authors (https://github.com/googlefonts/Pacifico)"; `license: "OFL"` | none | A 1950s surf brush script. *The* beach cliché. | OK at 48 px or more, joins clot at 32 | Cliché, and it doesn't match the serif world | 4,828 B |
| 11 | Fredoka at wght 600 (Milena Brandão, Hafontia) | "Copyright 2016 The Fredoka Project Authors (https://github.com/hafontia/Fredoka-One)"; `license: "OFL"` | none | A rounded geometric sans. Kids' app. | Excellent | Repeats Nunito and pushes the game younger (`UI_DESIGN.md` §2.3) | 1,800 B |
| 12 | Bagel Fat One (Kyungwon Kim, JAMO) | "Copyright 2022 The Bagel Fat Project Authors (https://github.com/JAMO-TYPEFACE/BagelFat)"; `license: "OFL"` | none | A puffy, bubbly sans | Excellent | Candy, not beach. The full font is 1.5 MB (CJK), so subsetting is mandatory. | 3,808 B |

Also measured and set aside: **Lilita One** (1,260 B, RFN, a condensed sporty sans), **Lobster**
(4,532 B, RFN, an overused script), **Instrument Serif** (3,896 B, condensed and light, too
delicate under 48 px), **Bodoni Moda** at wght 700 (1,840 B, sharp Didone, cold),
**Bricolage Grotesque** at wdth 75 / wght 800 (1,716 B, a condensed grotesque, techy),
**Sacramento** (2,816 B, RFN, a monoline script that's illegible at 32 px and too thin for a
hero, as the brief expected) and **Righteous** (1,848 B, RFN, 1970s geometric, arcade). Not
downloaded (judged from the brief alone, so unverified): Great Vibes and Monoton (thin script,
inline), Bungee Shade, Baloo and Lobster Two (all off-register).

**Cost isn't a differentiator.** Every candidate subsets to **1.3–4.8 KB**. The 4 KB files
are mostly name-table text (long copyright and licence strings in IDs 0, 13 and 14), not
outlines. The choice comes down to beauty, mood, legibility and pairing.

## 4. Mock-ups of the top 3, compared
Same layout in each: stacked lockup (74 px for Fraunces, 70 px for the others, line gap
1.0–1.02), wave rule, tagline in Nunito 700, the pebble Play button (Day: "Play"; Night:
"Continue · Endless 3,150") and the footer pills, over a cheap SVG lagoon with sand rings,
water shimmer, two fish, plus a moon and plankton at night.

| Font | Day | Night |
|---|---|---|
| Fraunces (title instance) | `docs/media/research/title-fraunces-day.png` (158 KB) | `title-fraunces-night.png` (220 KB) |
| Caprasimo | `title-caprasimo-day.png` (158 KB) | `title-caprasimo-night.png` (222 KB) |
| Young Serif | `title-youngserif-day.png` (160 KB) | `title-youngserif-night.png` (224 KB) |

What I saw, as honestly as I can put it:
- **Caprasimo** has the most *immediate* beach charm. It's fat, round and happy, and it reads
  even from across the room. At night, in light ink with the cyan glow, it looks like a neon
  beach-bar sign, which is lovely. The problem is the rest of the game. Every other display
  moment is Fraunces, and a second heavy soft serif on the very first screen sets up a voice
  the game then drops. The two faces are close enough that the change reads as inconsistency,
  not contrast. It's also the loudest of the three, a step away from "calm".
- **Young Serif** is the most *elegant*. The calligraphic "g" and "a" are beautiful, and it's
  the calmest. But at 70 px its colour is lighter than the Fraunces 800, so the lockup has less
  presence over the lagoon, especially at night. As a third serif voice it has the same
  consistency problem as Caprasimo. Its name-table weight makes it the largest at 4.1 KB (still
  trivial).
- **Fraunces (opsz 144, SOFT 100, WONK 1, 800)** splits the difference. It's soft and warm
  like Caprasimo, with Young Serif's literary contrast at the large optical size, and the
  leaning "n" and "h" add a wink. Most importantly, it *is* the home-sheet wordmark, refined
  for a 74 px hero, so the brand reads as one voice from the title through to "Nice Lagoon!".
  Against Nunito, the serif-for-moments / rounded-sans-for-function contrast from
  `UI_DESIGN.md` §2.3 still holds. The mock surfaced a weakness: the "g" descender crowds the
  "B" at line gap 0.9, so the spec uses 1.0.

**Pick: Fraunces title instance.**
- **Beauty:** a strong cut, warmer and more crafted than the opsz 72 file.
- **Mood:** calm, and playful without turning childish.
- **Legibility:** excellent at 32–112 px.
- **Pairing:** perfect, being the same family.
- **Cost:** 2,052 B, one extra preloaded file, zero JS.
- **License:** SIL OFL 1.1 with no RFN, already credited in About and in
  `public/fonts/OFL-Fraunces.txt`.

**Fallback (0 B):** if even 2 KB or one extra request is unwelcome, reuse
`lagoon-display-900.woff2` (opsz 72, WONK 0). It looks almost the same, just plainer and with
no wonky letters. Runner-up for a future rebrand: Caprasimo.

## 5. Exact build step and expected size
Add to `scripts/fonts.sh`, after the existing instancer lines. It reuses `$SRC/fraunces.ttf`
and `$BIN`:
```bash
"$BIN"fonttools varLib.instancer "$SRC/fraunces.ttf" SOFT=100 WONK=1 opsz=144 wght=800 -q -o "$SRC/ftitle.ttf"
"$BIN"pyftsubset "$SRC/ftitle.ttf" --text="Lagooner Beach" --layout-features=kern,liga \
  --name-IDs=0,1,2,13,14 --flavor=woff2 --output-file="$OUT/lagoon-title.woff2"
```
Measured output: **2,052 bytes** (12 glyphs: .notdef, space, B L a c e g h n o r). With
`--name-IDs=1,2` it drops to 1,896 B, but keep 0, 13 and 14 so the copyright and licence stay
in the file, as OFL §2 asks.

CSS:
```css
@font-face {
  font-family: 'Lagoon Title';
  src: url('/fonts/lagoon-title.woff2') format('woff2');
  font-weight: 800;
  font-display: block; /* a 2 KB preloaded file; a FOUT on the hero word would look broken */
}
.title-word { font: 800 clamp(56px, min(19vw, 9.2vh), 112px)/1 'Lagoon Title', 'Lagoon Display', Georgia, serif;
  letter-spacing: -0.015em; }
```
Add `<link rel="preload" href="/fonts/lagoon-title.woff2" as="font" type="font/woff2" crossorigin>`
to `index.html`. The subset has *only* the wordmark glyphs, so it must never be used for other
text. Any other string falls back glyph by glyph to Lagoon Display. Add a unit test that asserts
`.title-word` text is exactly "Lagooner Beach".
