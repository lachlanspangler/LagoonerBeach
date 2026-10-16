# ADR 0003 — Visual & sensory identity: "Atoll"

- Status: accepted · Date: 2026-10-16

## Decision
**Metaphor:** blocks are sea-worn pebbles; a sealed pocket is a lagoon. Capturing fills the lagoon
with light-water, then the ring of pebbles bursts into foam. Calm by default, punchy on big moments.

**Themes:** *Day* (warm sand canvas, wet-sand board) and *Night* (deep-sea navy, faint bioluminescent
glow). Default follows the OS (`prefers-color-scheme`); user can override.

**Pebble palette (6):** coral `#F2795B`, sun `#F2B93B`, kelp `#53C08C`, lagoon `#3D9BE9`,
orchid `#8E5BD8` (darkened from #A97BE6: it merged with lagoon blue under deuteranopia, ΔE 3.9 → 11.3), shell `#EC86AE`. Colors are *cosmetic only* (piece identity); no rule depends on
hue, so the game is fully playable with any color vision. The one state that matters — "this will
be captured" — is shown with shape + motion (lagoon shimmer fills the pocket, ring pebbles lift and
gain a white outline), not color alone.

**Material:** soft rounded squares (corner radius ≈ 26% of cell), one light source from top-left:
pale top highlight, saturated face, darker bottom lip, soft contact shadow. Distinct from glossy
bevelled "candy" blocks. Pre-rendered per color/size to offscreen canvases.

**Geometry tokens:** gutter 6% of cell; board radius 5% of board; tray piece scale 0.55; lift while
dragging ≈ 1.4 cells above the finger; touch slop 6 px.

**Motion tokens (ms):** pick-up 90 (spring), place 110 (overshoot 1.08), lagoon fill 120, ring pop
stagger 18/cell, wave gap 150, particles 450–700, score pop 600, callout 900, deal-in 220 stagger 60,
return-to-tray 180. Reduced-motion: no shake, particles ×0.3, no callout scale bounce.

**Sound:** synthesized in WebAudio (no assets): place = muted stone "tok"; capture = water "bloop" +
pentatonic chime whose pitch climbs with streak; cascade waves arpeggiate; invalid = soft low thud;
new best = little rising figure. Music: none in v1 (sound effects carry the mood).

**Haptics:** place = light tick; capture = medium; ≥2 waves or lagoon ≥ 12 cells = heavy double.

**Text:** none needed to play. Small callouts by lagoon size: Pop (1–2), Pool (3–5), Lagoon (6–11),
Atoll! (12+); "Ripple ×N" for cascades; "Clear reef" for an empty board.

## Why
Meowdoku proves warmth + one focal reward; Block Blast proves tactile material + choreographed
clears. Water filling an enclosure is the most legible possible animation of *our* rule, so the
theme teaches the mechanic. It's also clearly not either reference game's look.
