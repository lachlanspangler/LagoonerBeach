# ADR 0014 — Block materials: coral and rock

- Status: accepted · Date: 2026-10-27 (written up 2026-10-28; the implementation landed on
  `s5-blocks` before a crash, and this record was rebuilt from its commits and code)
- Amends: ADR 0003 (visual identity), the "material" section only. The six piece hues are unchanged.
- Input: the owner's brief ("blocks should look much more like real coral and rock … readable at small
  sizes, Day and Night, colourblind-safe, with the WCAG AA tests passing; pops, ring bursts and
  celebrations must still look right"), and `docs/research/CORAL_ROCK_BLOCKS.md`, which includes the
  references, the comparison of game approaches and the mock in `docs/media/research/blocks-mock-*.png`.

## Decision
The default style, **Reef** (id `pebble`, so saves keep working), draws **six real materials, one
per piece colour**. They are procedural Canvas2D paths painted into the existing per-size sprite
cache. There are no bitmaps, no new assets, and nothing is drawn per frame.

| Colour (hex unchanged) | Material | Kind | Cues that survive at 24 px |
|---|---|---|---|
| coral `#F2795B` | brain coral | coral | domed, meandering ridges and valleys |
| sun `#F2B93B` | golden coral-rag sandstone | **rock** | chunky worn lump, matte, horizontal bedding and pits |
| kelp `#53C08C` | sea glass | glass | tumbled and frosted, a deeper band of thick glass at the rim, a milky middle |
| lagoon `#3D9BE9` | blue coral (*Heliopora*) | coral | packed vertical lobes and columns |
| orchid `#8E5BD8` | wet porphyry pebble | **rock** | smooth beach-worn pebble, crystal speckle, strong wet highlight |
| shell `#EC86AE` | pink coralline crust | coral | lumpy, chalky, growth bands and knobs |

Two rocks, three corals and a sea glass give the board a real shoreline mix. Each of the six has a
**different kind of pattern**: meanders, beds, a smooth translucent face, columns, speckle and
bands. So even with colour removed, the six stay apart.

## How
- **Silhouette.** A superellipse per material, with its own exponent and a seeded edge wobble,
  stays within a few % of the cell. The board still reads as a grid, but no edge is a machined
  rounded square.
- **Light.** One top-left light throughout: lit ridges, dark crevices, a soft contact shadow, and
  a wet specular highlight whose strength depends on the material (porphyry and sea glass the
  wettest, coralline the chalkiest).
- **LOD by tile size.** Fine structure (polyp texture, speckle, bands) fades out below about 28 px.
  Silhouette, one cue and one highlight carry the small tiles.
- **Colour grade.** The texture lives in **luminance**. Each sprite takes its hue and saturation
  from the piece hex over the material's own light and dark, so the mean colour stays the piece
  colour (see "CVD" below).
- **Variants.** Three seeded variants per colour (`cellVariant(i)` is a fixed hash of the cell
  index), so a saved board looks the same after a reload and walls don't tile.
- **States.** *Lit* (the lagoon-ring preview and the seal) keeps the white outline, which now
  follows the material's own silhouette. The preview ghost is the same sprite faded. Pops, ring
  bursts (`render/burst.ts` takes its chips from the material colours) and every celebration are
  unchanged in timing and staging.
- **Perf.**
  - Warm-up: all 48 sprites a phone layout needs (6 colours × 3 board variants + tray, normal +
    lit) are built in an idle task, one colour per task. It's measured by
    `tests/perf/sprites.spec.ts` at dpr 3 under a 4× CPU throttle, with a budget of a median under
    40 ms, Day and Night.
  - A drag passing through in-between sizes draws a cheap lazy stand-in, so no frame ever builds a
    material.
- **Skins.** The old look stays selectable as **Smooth Stones** (`smooth`). Glyph (accessibility),
  Sea Glass, Coral, Lantern, Moonstone and Atoll are untouched, and every saved skin id still
  resolves (`tests/unit/unlocks.test.ts`).

## Options considered
| Approach | Bundle | Runtime | Verdict |
|---|---|---|---|
| **Procedural Canvas2D into the sprite cache** | ~3 KB gz of code (initial chunk) | one-off warm-up, 0 per frame | **chosen** |
| Hand-authored SVG path textures | similar code size, less variety per variant | same | rejected: less natural, more work per material |
| Bitmap textures / atlas | +40–90 KB of images, Day + Night sets, blurs at dpr 3 | decode + memory | rejected: budget and crispness |
| WebGL shader | n/a | n/a | not available (Canvas2D renderer) |

## CVD and contrast
A pattern moves a block's *rendered* mean colour away from its hex, and the old CVD test only
checked hexes. The research mock's first sea fan merged orchid with lagoon under deuteranopia
(ΔE 3.1), the same merge ADR 0003 fixed once already. So:
- `tests/e2e/blocks.spec.ts` renders the real sprites in the browser. It checks each material's
  **mean colour** under protan, deutan and tritan simulation (ΔE floors as in `a11y.test.ts`),
  checks that greyscale lightness steps still separate, and counts **grain direction**
  (vertical blue coral lobes against horizontal sandstone beds) so two materials can't collapse
  into the same texture.
- No text sits on blocks, so the WCAG AA token tests (`contrast.test.ts`) are unaffected and still
  pass. Glyph is unchanged.

## Consequences
- The initial bundle grew by about 3 KB gz (the materials code). It's still under the 64 KB budget
  (see `npm run size`).
- Pixel baselines changed, deliberately: start light/dark, midgame, reef, Atoll ×5, Spotless and
  the boxcrab reveal. They were regenerated once and reviewed by eye.
- `scripts/blocks-sheet.ts` renders the contact sheet (sizes × states × variants × themes × CVD
  rows × skins, plus `--moments` captures) through the real sprite code. Use it for any future
  material change.
