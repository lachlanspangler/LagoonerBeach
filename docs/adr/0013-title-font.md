# ADR 0013 — Title wordmark font

- Status: accepted · Date: 2026-10-27
- Input: the owner's brief ("'Lagooner Beach' in a beautiful aesthetic font"), `docs/research/TITLE_TYPE.md`
  (21 OFL fonts measured, 12 written up, top 3 mocked: `docs/media/research/title-*-{day,night}.png`).

## Decision
The wordmark uses **Fraunces** at a dedicated display cut: opsz 144, SOFT 100, **WONK 1**, weight 800.
It is subset to the 11 glyphs of "Lagooner Beach" and saved as `public/fonts/lagoon-title.woff2`
(**2,052 B**, family `Lagoon Title`, `font-display: block`). It's built by `scripts/fonts.sh`, and
the text stays real (`<h1>`): it isn't an image and isn't drawn on canvas.

## Why
- **One voice.** Fraunces is already the game's display face (`Lagoon Display`). The title cut adds
  the soft, wonky ball terminals (the "g", "a", "e") at their most characterful, so the first
  screen sounds like the rest of the game.
- **Cost.** About 2 KB. Size didn't decide anything: every candidate subset came in at 1.3–4.8 KB.
- **Legibility.** It holds up from 56 to 112 px, Day and Night (ink 13.5:1 / 16.5:1).
- **Licence.** SIL OFL 1.1, "Copyright 2018 The Fraunces Project Authors", with no Reserved Font
  Name. A subset therefore needs no renaming, and the licence file is already shipped
  (`public/fonts/OFL-Fraunces.txt`, linked from Settings › Credits).
- **Runner-up: Caprasimo.** The most immediate beach charm, but next to Fraunces everywhere else it
  reads as an inconsistency. **Third: Young Serif.** The most elegant, but it has less presence
  over the water.
- **Rejected:** scripts (Pacifico, Sacramento, Lobster) are thin, generic and weak at small sizes.
  Several faces carry a Reserved Font Name (Abril Fatface, Lobster, Playfair, DM Serif Display, …),
  so their subsets would need renaming.

## Consequences
- The subset holds only those glyphs. Any other text set in `Lagoon Title` falls back glyph by
  glyph, so only `.title-word` uses it (checked by `tests/unit/title.test.ts`).
- Fallback: `Lagoon Display` 900, which is already loaded, then Georgia.
