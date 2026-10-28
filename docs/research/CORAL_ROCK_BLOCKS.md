# Coral & rock blocks: research, approach, and mapping (proposal)

Status: research and mock only. No source changes. Mock images:
`docs/media/research/blocks-mock-day.png`, `docs/media/research/blocks-mock-night.png`.

**Ask (owner):** blocks should look much more like real coral and rock than today's soft
"sea-worn pebbles" (ADR 0003), but every colour must stay instantly readable at 22–48 px in Day and
Night, stay colourblind-safe under our CVD test, keep WCAG AA wherever text sits on them, and keep
pops, ring bursts and celebrations looking right.

**Decision (summary):**
1. **Procedural Canvas2D**, drawn into the existing `SpriteCache` (`src/render/sprites.ts`). No assets.
   Cost is paid only at cache build. Measured at about 1.1 ms per sprite at dpr 3 under 4× CPU
   throttle, 27 ms for the full 24-sprite warm-up, and roughly 1.5–2 KB gz of code.
2. **One material per colour.** The hue stays the piece identity. Each material adds one silhouette
   tweak, one surface pattern and one highlight:
   coral → brain coral, sun → porites/fire coral, kelp → sea glass, lagoon → blue coral,
   orchid → sea fan, shell → coralline crust.
3. The six patterns are different in kind (ridges, pores, smooth frost, columns, lattice, bands).
   That makes them a **second, hue-free identity cue**, the same idea as the Glyph style, without
   adding symbols. In greyscale every block can still be told apart (see the "gray" column in the mock).

---

## 1. Real references: visual signatures at a stylised level

These are what a small sprite can keep: silhouette, then 1–2 pattern cues, then one highlight.

| Reference | Silhouette | Surface pattern | Colour (real) | Highlight / light | Source |
|---|---|---|---|---|---|
| **Brain coral** | Spheroid dome, soft lumpy outline | Winding furrows and ridges, "resembles a brain"; packed meanders | Not stated in source; in life usually tan/green/orange-brown | Ridges catch light, valleys dark | [Wikipedia: Brain coral](https://en.wikipedia.org/wiki/Brain_coral) |
| **Staghorn** | Antler-like vertical branches, tightly packed | Fine corallites along branches | Pale brown/beige to green, blue, purple | Rounded tips lighter | [Wikipedia: Staghorn coral](https://en.wikipedia.org/wiki/Staghorn_coral) |
| **Plate / table coral (Acropora)** | Flat plates or branches | Tiny ~2 mm polyps in a dense grid | Mostly brown or green, a few bright | Top surface lit, thin dark rim | [Wikipedia: Acropora](https://en.wikipedia.org/wiki/Acropora) |
| **Sea fan (gorgonian)** | Upright flat fan, only inches thick | Branch mesh (a lattice in many species; the article only says "fan") | Often bright purple, red, yellow | Mesh lighter than the holes | [Wikipedia: Sea fan](https://en.wikipedia.org/wiki/Sea_fan) |
| **Mushroom coral (Fungiidae)** | Single free disc | Radiating septa from a central mouth (from knowledge; the article doesn't describe it) | Often pale, "appear bleached" | Septa rim light | [Wikipedia: Fungiidae](https://en.wikipedia.org/wiki/Fungiidae) |
| **Pillar coral** | Upright cylinders with rounded tops | Furry: polyps out by day | Beige/brown | Column sides shade horizontally | [Wikipedia: Dendrogyra](https://en.wikipedia.org/wiki/Dendrogyra) |
| **Blue coral (Heliopora)** | Columns, plates or branches | Polyp tubes (dots) | **Skeleton is blue** (iron salts) | Column ridges | [Wikipedia: Heliopora coerulea](https://en.wikipedia.org/wiki/Heliopora_coerulea) |
| **Fire coral (Millepora)** | Digit-tipped branches, plates, crusts | Smooth surface with two kinds of pores | **Usually yellow or orange** | Smooth sheen | [Wikipedia: Millepora](https://en.wikipedia.org/wiki/Millepora) |
| **Organ-pipe coral** | Dome of parallel tubes | Tubes joined by platforms | Skeleton bright red | Tube ends | [Wikipedia: Tubipora musica](https://en.wikipedia.org/wiki/Tubipora_musica) |
| **Encrusting coralline algae** | Flat crust over rock, irregular edge, knobby bumps | Layered crust, knobs 1 mm to several cm | **Usually pink or red** (also purple, grey-green) | Matte, chalky | [Wikipedia: Coralline algae](https://en.wikipedia.org/wiki/Coralline_algae) |
| **Coral rag / porous limestone** | Rubbly block | Rubble of old reef, pits | Cream/grey | Matte | [Wikipedia: Coral rag](https://en.wikipedia.org/wiki/Coral_rag) |
| **Basalt (wet)** | Angular, sometimes hexagonal columns | Vesicles (gas holes), "frothy" | Dark grey to black, rust weathering | Wet sheen (not covered by the source; from observation) | [Wikipedia: Basalt](https://en.wikipedia.org/wiki/Basalt) |
| **Pumice** | Rounded, light | Densely packed bubble cavities, stretched fibres | White, cream, grey | Matte, foamy | [Wikipedia: Pumice](https://en.wikipedia.org/wiki/Pumice) |
| **Sea glass** | Rounded, tumbled edges; C-shaped marks | **Frosted**, powdery surface | Kelly green, brown, white common; soft blue less common; pink, teal, yellow, red rare | Bright rim, translucent core | [Wikipedia: Sea glass](https://en.wikipedia.org/wiki/Sea_glass) |
| **Beach pebble** (today's look) | Smooth rounded square | None | Any | Soft top-left highlight | ADR 0003 |

**Takeaways for us**
- Real coral colours are mostly drab browns and greens (Acropora, staghorn, pillar). We keep our
  saturated palette and use the real *structure*. Three real colours line up with our hues anyway:
  yellow fire coral = sun, blue Heliopora = lagoon, pink coralline = shell.
- The cues that survive at small sizes are the high-contrast, repeating ones: ridges, pores, columns,
  lattice, bands. Fine fur (pillar coral) and tiny corallites (Acropora) don't, so they are out.
- Rock (basalt, pumice, limestone) has the wrong saturation for piece identity. Use it for *board*
  surfaces and skins (§7), not for the six colours.

## 2. What survives at 24 px: lessons from games

Verified sources are linked. Points without a link come from playing the games and were **not**
checked on the web here. Several wiki hosts blocked fetching (403/402), so those points are marked "(play)".

- **Colour carries function.** Monument Valley uses colour to show where you can interact. Its look
  draws on "Japanese prints" and "minimalist sculpture"
  ([Wikipedia](https://en.wikipedia.org/wiki/Monument_Valley_(video_game))). Our hue stays the
  identity and the material only decorates it.
- **Small sprites are compromises; colour beats outline at small sizes.** "At this size, color plays
  a larger role in defining the character than outlines", and "If you add an outline around
  something, you may lose the room to shade it"
  ([Derek Yu, pixel art tutorial](https://www.derekyu.com/makegames/pixelart.html)). So we don't add
  per-material outlines. The only outline stays the "lit" ring state.
- **Rule-based procedural detail looks hand-made.** Townscaper's blocks become spires or balconies
  depending on their neighbours, with a "gorgeous, illustrative art style"
  ([Wikipedia](https://en.wikipedia.org/wiki/Townscaper)). The same idea fits our cache: a seeded,
  deterministic generator per material.
- **Painterly natural materials on tiles.** Dorfromantik's tiles follow romantic landscape
  painting, not realism ([Wikipedia](https://en.wikipedia.org/wiki/Dorfromantik)). Stylise, don't
  photograph.
- **Time-of-day relighting of the same assets.** Alto's environments "change in lighting as time
  passes" ([Wikipedia](https://en.wikipedia.org/wiki/Alto%27s_Adventure)). Our Night should relight
  the same materials (cool rim light, glow), not swap to different art.
- (play) **Match-3 gems** (Candy Crush, Royal Match): each colour also has its own *shape*, so a tile
  reads in a glance even in peripheral vision. Wikipedia only confirms the colour matching rule
  ([Candy Crush Saga](https://en.wikipedia.org/wiki/Candy_Crush_Saga)). We can't change the square
  footprint because our pieces are polyominoes and their outline is the gameplay. So we change the
  *surface* per colour and keep silhouette tweaks under about 3% of the cell.
- (play) **Two Dots, Islanders**: flat, one-highlight materials stay calm at a glance. Detail must
  not make the board noisy. Our patterns use ±30–40% lightness of the base, never full contrast.
- (play) **Animal Crossing, Stardew** small item icons: a big silhouette, one interior cue, a lit
  top edge. **Spiritfarer, Ori**: a rim light separates objects from dark backgrounds, which is our Night trick.
- **Accessibility guidance:** "Do not convey information in color only", and show differences
  "BOTH in color and shape" or hatching
  ([Okabe & Ito, Color Universal Design](https://jfly.uni-koeln.de/color/)). Six different texture
  families are hatching done in materials.

**Rule we adopt:** at 24 px a block = **footprint (unchanged) + 1 pattern family + 1 highlight**.
At 40 px and up, a second cue appears: polyp dots on blue coral, ridge highlights on brain coral,
frost specks on sea glass.

## 3. Rendering approaches for our pipeline

The current pipeline: `SpriteCache.pebble(palette, color, size, variant)` builds an offscreen canvas per
`look:theme:color:size:variant`. `Scene.warmSprites()` pre-builds 6 colours × 2 sizes (board cell,
tray cell) × 2 variants = **24 sprites** per theme. Each frame then draws one `drawImage` per block.
Initial JS measured from the current `dist/` was **59,566 B gz against the 65,536 B budget**
(`scripts/size-check.ts`), so about **5.8 KB of headroom**. `sprites.ts` is in the initial chunk.

| | (a) Procedural Canvas2D into the cache | (b) Hand-authored SVG paths (Path2D) | (c) Bitmap textures / atlas | (d) WebGL shader |
|---|---|---|---|---|
| Look | Seeded, deterministic, tunable in code; per-cell variants are cheap | Crisp, art-directed; one fixed drawing per material | Richest detail, but blurry or aliased when scaled 22→64 px at dpr 1–3 | Best (normal maps, real lighting) |
| Build cost | **Measured ~1.1 ms per sprite** at dpr 3, 4× throttle (below) | Similar: Path2D fill and stroke, plus parse once | Decode once (~ms per image), then `drawImage` scaling | n/a |
| Frame cost | Unchanged (one `drawImage` per block) | Unchanged | Unchanged | n/a |
| Memory | Same sprite count as today, ~1.2 MB at dpr 3 (138² + 75² px × 4 B × 12 each) | Same | Today's sprites plus decoded atlas (e.g. 6×2×256² × 4 B ≈ 3 MB) | n/a |
| Bundle | **~1.5–2 KB gz** (mock code: 1,831 B gz unminified) | 0.3–0.6 KB gz path data per material, ≈ 2–4 KB plus a loader | 6 materials × 2 themes PNG/WebP ≈ 40–90 KB, outside JS but must load before the first board paint | n/a |
| Day/Night, skins, lit | Parameters per theme and variant, free | Need tint and overlay logic | Need extra images per theme and lit state, or runtime tinting | n/a |
| Risk | Pattern code must keep the mean colour on the palette (CVD, §6) | Authoring time; patterns don't vary per cell | Load-time and budget hit; violates "instant start" and "no assets" | **Not available (Canvas2D only)** |

**Measured (mock harness, this machine).** Headless Chromium, OffscreenCanvas, dpr 3, cell sizes
46 and 25 CSS px, normal and lit, median of 5 runs, machine load average ≈ 6:

| | per sprite, 1× | per sprite, 4× throttle | 24-sprite warm-up, 4× |
|---|---|---|---|
| Current pebble (copy of `drawPebble`, pebble style) | 0.088 ms | 0.375 ms | 9 ms |
| Proposed materials | 0.254 ms | **1.11 ms** | **27 ms** |

**DECISION: (a), procedural Canvas2D.** It is about 3× today's per-sprite cost but only at cache
build: 27 ms once per theme or size change on a throttled phone, and 0 ms per frame. It is the only
option that keeps zero assets and fits the 64 KB budget, and per-theme and per-variant tuning comes
for free. Keep warm-up off the first frame: build board-cell sprites now and tray-cell sprites in the
next `requestAnimationFrame` (or `requestIdleCallback` where available). Theme switch already
rebuilds, so split it the same way.

**How to measure in the repo (when implementing):** wrap `warmSprites()` in
`performance.mark/measure` and expose `__atoll.spriteBuildMs()` next to `drawTimes()`. In
`tests/perf`, set CDP `Emulation.setCPUThrottlingRate {rate: 4}` with `deviceScaleFactor: 3`, call
`scene.sprites.reset(dpr)` and then `warmSprites()` 5×, and assert median ≤ 40 ms and p95 frame time
unchanged. Gate bundle growth with the existing `size-check` (initial ≤ 64 KB). If headroom gets
tight, the material module can be its own chunk preloaded via `<link rel="modulepreload">`, with the
plain pebble as a fallback for the first frame. Don't do that by default: a visible swap is worse
than 2 KB.

## 4. Mapping: six colours → six materials

The colour hex values are **unchanged** (the ADR palette and the CVD test stay valid). Each material
only reshapes the face's light and dark distribution around the base. Every pattern is tuned so the
**rendered mean colour stays close to the hex** (§6).

| # | Colour | Material | Why this one | Silhouette tweak (inside the cell) | Surface pattern (24 px cue) | Second cue (≥ 40 px) | Highlight |
|---|---|---|---|---|---|---|---|
| 1 | coral `#F2795B` | **Brain coral** | Coral orange is *the* coral colour; brain coral is the most recognisable coral form and reads as a dome | Rounder superellipse (n≈3), soft lumpy edge (±2%) | 4 packed meandering ridges with dark valleys | Thin light line along each ridge crest | Soft dome highlight top-left |
| 2 | sun `#F2B93B` | **Porites / fire coral** | Fire coral is "usually yellow or orange"; pores are its defining surface | Rounded square (n≈4), slight knobbly edge | Staggered grid of dark pores (about 4×5) | Each pore gets a light lower lip (a cup) | Smooth sheen top-left |
| 3 | kelp `#53C08C` | **Sea glass (green)** | Kelly green is the classic, commonest sea glass colour. The one *smooth* material, so it contrasts with five textured ones (smoothness is a cue too) | Squarer (n≈5.5), almost no wobble: tumbled, chamfered | Frosted specks plus a darker translucent core | Bright C-shaped rim highlight | **Sharp rim** along the top-left edge (glass) |
| 4 | lagoon `#3D9BE9` | **Blue coral (Heliopora)** | The one coral whose *skeleton* is blue, so the hue is honest. Columns make a strong vertical rhythm | Squarest (n≈7): columns pack | 3 rounded vertical columns with dark grooves | Polyp-tube dots in each column | Each column lit on its left side |
| 5 | orchid `#8E5BD8` | **Sea fan (gorgonian)** | Sea fans are "often bright purple"; a lattice is unique in the set | Rounded square, small wobble | Diagonal lattice of branches over darker holes | Branches slightly curved (organic) | Soft top-left |
| 6 | shell `#EC86AE` | **Coralline crust** | Coralline algae are "usually pink"; crust plus knobs reads as encrusted rock. Calmer than a second coral | Most irregular edge (±3.4%): crust on rock | Concentric growth bands from one corner | 3 knobby nubs with soft shadows | Matte, chalky (weak highlight) |

Considered and rejected:
- **Mushroom coral** for shell: radiating septa read as a "starburst" or icon and fight with the
  sparkle and gold vocabulary.
- **Staghorn** for kelp: branches break the square footprint, so pieces stop reading as polyominoes.
- **Blue sea glass** for lagoon: two glass materials would merge into one family.
- **Pumice / basalt** for any colour: wrong saturation (§1).

**Silhouette rule:** footprint stays the cell minus gutter (GEOM.gutter 6%). Variation is only
superellipse exponent and ≤ 3.4% edge wobble, so a piece still reads as its polyomino and adjacent
blocks keep an even gutter.

**Per-cell variety (optional, phase 2):** seed the pattern by (colour, variant 0..2) so neighbouring
cells don't repeat. That triples the sprite count (72 per theme, ~80 ms warm-up at 4× throttle,
built lazily on idle) and memory (~3.6 MB at dpr 3). Ship v1 with one variant and decide after a
playtest. Don't flip sprites: the light comes from the top-left.

## 5. States, skins and Glyph

- **normal:** as above.
- **lit** (ring cells that will pop, held-piece cells that will pop): face lifted as today
  (`hiAmt 0.38`). Pattern lights scale up with it (ridges, columns, mesh brighten), and the white
  `ringOutline` stroke follows the *material silhouette*. Mock column "40 lit": the outline is the
  dominant cue in both themes, so the capture state still reads by shape and motion, not colour.
- **preview / ghost** (drag preview, first-run demo ghost): the same sprite at reduced alpha (mock
  "40 ghost" at 0.45). Patterns fade with it and stay recognisable. No separate sprite needed.
- **dying / burst** (`burst.draw` gets the lit and normal sprites): bursts keep working unchanged,
  because they already scale and rotate the sprites. Optional polish: 2–3 small *chips* in the
  material's dark tone among the foam particles (coral crumbs, glass shards for kelp). Keep within
  the particle budget (×0.3 under reduced motion).
- **Night glow** (`SpriteCache.glow`): unchanged radial halo from the base hex.
- **Celebrations** (sweeps, gold, combo badge): they don't touch block sprites, so nothing changes.
  Checkpoint: the clear-reef sweep band crosses textured blocks, so re-check visually that it still
  reads.
- **Skins** (`src/render/skins.ts`): add a style `'reef'` and make it the **default look**. Keep today's
  `pebble` style as a skin ("Smooth Pebbles") so nobody loses the old look. Material is chosen by
  colour index *only when the style is `reef`*. Other skins keep their own style code untouched (glass,
  lantern, pearl, Atoll's pebble style with its own hues). The existing **Coral skin** (all warm hues,
  dot pores) is a good candidate to adopt `reef` materials: its hues are close together, so the
  six patterns would add the separation it lacks today (its CVD ΔE is reported, not gated). Treat
  that as a separate decision.
- **Glyph** (accessibility style): **unchanged.** Flat Okabe–Ito colours, outline, and shape glyph.
  It is the guaranteed-readable mode and must not get busier. Settings copy can mention that the
  default reef materials also have distinct textures.

## 6. Day / Night, CVD and contrast plan

**Day:** warm contact shadow `rgba(80,55,30,.22)`, lip `-28%`, face gradient `+14% → -6%`, one
top-left highlight. The pattern darks are about `-34%` of the base and the lights `+42%`.

**Night:** lip `-36%`. Darks deepen (`-42%`) so textures don't float. A cool top **rim light**
`rgba(190,240,255,.35)` over the top 30% (the Ori/Spiritfarer trick) separates blocks from the navy
board, and the existing additive glow stays. Blue-coral polyp dots brighten (bioluminescent hint).
Nothing else changes, so Day and Night share one generator.

**CVD (our test, `tests/unit/a11y.test.ts`):** the current test checks the *hex list*. Patterns change
what the eye averages, so a material can drift towards a neighbour even with the same hex. The mock
showed this: the first sea-fan lattice used *light* branches, which lifted orchid's mean towards
lagoon blue, and the deuteranopia ΔE fell to **3.1**. That is the exact merge ADR 0003 fixed by darkening orchid.
Fix: darker branches over darker holes, so the mean sits at or below the hex.

Results (CIE76 ΔE, Machado 2009 full severity, same maths as `src/render/color.ts`; mean of opaque face
pixels of the 40 px sprite at dpr 2):

| | normal | deutan | protan | tritan |
|---|---|---|---|---|
| Flat hexes (today's test input) | 41.8 | 11.3 (lagoon/orchid) | 16.1 | 14.6 |
| Materials v1 (light fan mesh) | 28.9 | **3.1 (lagoon/orchid) ✗** | 9.8 | 11.1 |
| Materials v2, day (as mocked) | 31.0 | **10.2** (lagoon/orchid) | **10.4** (coral/kelp) | 11.1 |
| Materials v2, night | 29.5 | 10.3 | 10.5 | 10.6 |

v2 passes the existing ">10 under protan/deutan" floor, but with less margin than the flat hexes.
The patterns themselves are a strong extra cue: in greyscale all six are distinct (mock "gray"
column), which flat pebbles are not. Proposed test additions:
1. **Rendered-mean CVD test:** render each `reef` sprite with a node canvas (or inside the e2e
   harness), average opaque face pixels, and assert `minPairDelta > 10` for protan and deutan in both
   themes. This stops pattern tweaks from drifting colours apart from the hex list.
2. **Mean-lightness guard:** |L*(mean) − L*(hex)| ≤ 8 per material, a cheaper unit check on the
   pattern parameters.
3. Keep the Glyph test (> 10 under all three CVDs) as is.

**WCAG / contrast:** no text sits on blocks in the default style. The `+N`, callouts and chips are
stacked *above* the lagoon (ADR 0012). The only ink on a block is the **Glyph** symbol, which
picks white or `#1A1A1A` by luminance and is unchanged. For any future text or icon on a block
(e.g. a numbered "bomb" block), require 3:1 for graphics and 4.5:1 for text against the *darkest
pattern tone* of that material, not just the hex
([WCAG 2.1 SC 1.4.11 Non-text Contrast](https://www.w3.org/WAI/WCAG21/Understanding/non-text-contrast.html)).
The lit white outline is the meaningful graphic. Against the night board it is ≥ 3:1 by design.
Against day cells (`#D9CAB3`) the outline is white on a block face, so it needs its own check once
the face lightness is final.

## 7. Rock, beyond the six colours (optional)

- **Board cells as coral rag / porous limestone:** a few pits per empty cell in `cellInset` tone at
  low contrast (≤ 1.15:1 to the cell) so empty cells look like reef rock without competing with blocks.
- **Night skin "Basalt & Glow":** dark wet-basalt faces with the colour as a bioluminescent inlay
  (the lantern style already does this). It fits as a reward skin, not as the default.

## 8. Mock and how it was made

- Mock: `docs/media/research/blocks-mock-day.png` (224 KB) and `blocks-mock-night.png` (232 KB).
  Rows are the six materials. Columns: 24 / 40 / 64 px, 40 lit, 40 ghost (α 0.45), and 24 px under
  deutan, protan, tritan and greyscale. Below: a 28 px board snippet as seen, under deutan, and in grey.
- Script: `/tmp/blocksmock/mock.html` and `/tmp/blocksmock/run.cjs` (Playwright Chromium,
  `--mute-audio`, `deviceScaleFactor` 1 with an internal dpr 2 canvas; perf at dpr 3 with CDP 4×
  throttle). `/tmp` is temporary, so copy the script into `tools/` if it should be kept.
- **Iteration 1 → 2:** (1) The brain coral read as wavy "bacon" stripes, so it became 4 packed ridges
  with two frequencies, dark valleys and a light crest line. It now reads as maze-like ridges at 40–64 px.
  (2) The sea-fan lattice lifted orchid towards lagoon under deuteranopia (ΔE 3.1), so it now uses
  darker branches over darker holes (ΔE 10.2). (3) The brain ridges then lifted coral towards kelp
  under protanopia (6.6), so the ridges are now base-tone over darker valleys (10.4).
- **What looked good:** all six are distinct at 24 px in both themes. Sea glass "reads" as glass
  thanks to its rim. Blue coral's columns and the porites pores are the strongest cues. The grey board
  is fully decodable. **What to watch:** shell's bands are subtle at 24 px (the nubs carry it).
  Brain coral at 24 px is "wavy" rather than "brain". Lattice at 24 px is close to a texture blur on
  low-dpr Android, so check it on a real dpr 2 device.

## 9. Next steps (if accepted)
1. ADR 0013 "Reef materials" (amends ADR 0003's Material section).
2. `skins.ts`: style `'reef'` and default look. `sprites.ts`: `drawReef(g, material, …)` behind the
   style switch, no change to call sites.
3. Tests: rendered-mean CVD, mean-lightness guard, perf warm-up budget, visual baselines updated
   (reduced motion).
4. Playtest Day and Night on device (dpr 2 and 3), then decide per-cell variants and the Coral skin.
