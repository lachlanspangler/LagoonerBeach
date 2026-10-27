# ADR 0011 — Creature art pipeline: path data + shared rig, rasterised to caches, lazy chunk

- Status: accepted · Date: 2026-10-16
- Input: `docs/research/CREATURE_ART.md` (the binding Creature Style Guide, rules R1–R39, and its
  §5 recommendation "B"), ADR 0003 (visual identity), ADR 0007 (catch layer).
- Pilot: clownfish, octopus, sand dollar, hermit crab, sea turtle (`docs/media/art/pilot-*.jpg`).

## Decision
Every species is **data**: one file, `src/render/art/species/<id>.ts`, that exports
`defineArt({...})`, containing:
- **layers of parts** as SVG path strings on a 100-unit artboard (origin at the centre, facing
  right, y down), each with a fill role `body | belly | accent | white | ink | light` and a kind
  (`fill` = silhouette primitive, `pattern` = clipped to the silhouette, `line` = interior ink);
- **animation groups** (≤ 6: `body` plus e.g. `tail`, `finA`, `armL`, `head`, `claw`) with pivots,
  and optional **props** (the clownfish's anemone, the octopus's ink heart) that exist only during a
  performance and never count toward the silhouette;
- **face anchors** (eye centres, eye height, face zone, mouth anchor/shape), **size class**,
  personality, R10 feature, **idle spec** (ambient channels + a keyframed signature) and optional
  **catch/release hooks**.

Everything that makes the cast cohesive is **shared code**, in `src/render/art/`:

| file | role |
|---|---|
| `kit.ts` | types, R24/R25/R27 tables, shape helpers (`ellipse`, `circle`, `rrect`, `capsule`, `blob`, `tube`, `xform`, `join`), motion presets (`dart`, `hop`, `snap`, `waveTrack`, `hideTrack`, `wiggleTrack`, `within`) |
| `palette.ts` | OKLCH; derived ink (R16), belly, golden/rose-gold remap (R33), night rim alpha, contrast inputs |
| `face.ts` | the face rig (R7–R9): solid low-set eyes + 2 highlights, mouth vocabulary, blush; expressions `idle blink happy surprised proud sleepy shy` + wink |
| `motion.ts` | pure pose solver: ambient channels (`bob glide breathe pulse wag flutter sway paddle wave`), seeded blink scheduler (120 ms every 2.5–6 s), signature scheduler (every 4–8 s), keyframe tracks, expression body transforms, size-scaled tempo |
| `render.ts` | `renderCreature(g, art, x, y, opts)`; per-group layer rasters with the same-hue outline drawn *behind* (R14), Night rim (R15), clipped patterns, highlight/shade (R17), baked glow; static composites; LRU cache (12 MB cap, R38) |
| `validate.ts`, `silhouette.ts`, `path.ts` | machine-checkable style-guide rules; Canvas-free path parser/flattener/rasteriser and the R12 IoU test |
| `species/index.ts` | registry: `import.meta.glob('./*.ts', { eager: true })`, so adding a species never touches a shared list (fleet agents can't conflict) |
| `creature-art.ts` | the lazy chunk entry + `drawSpecies` adapter (size-class fit, R32 resting face, R13 locked mask) |

**Public API stays `drawCreature(g, sp, x, y, s, angle, opts)`** in `src/render/creatures.ts`, with
opts extended by `expression`, `t` (seconds, animate), `still` (reduced motion: blinks only), `night`,
`fit` (`tile` / `detail` / `leap` / `avatar` for leaderboard rows: identity size, not size class), `flip`, `action` (catch/release hook) and `signatureAt`. If the
chunk isn't loaded yet, or a species has no new art, the **legacy procedural drawing** is used, so the
game is never broken mid-migration.

**One lazy chunk** (`creature-art-[hash].js`) holds the kit and every species. `creatures.ts` prefetches
it with `requestIdleCallback` after the first frame (600 ms timeout fallback on engines without it);
tiles opened before it lands redraw when it arrives (`whenArtReady`). One chunk instead of one per
species: the data is small (below), a single request is simpler, and a creature can leap from any
lagoon at any moment, so per-species fetching would only add latency at the worst time.

## Rendering model
- Static frames (journal tiles, the "new" row): one composite sprite per (species, exact px, device
  scale, theme, golden, expression), cached.
- Animated frames (species page, leap): ≤ 6 `drawImage` calls with transforms from cached group layers
  at the nearest size bucket at or above the drawn size (24/32/48/64/96/160/256 px), plus the live face
  rig (R35). No `Path2D` construction, `shadowBlur`, `filter` or gradient creation per frame (R36):
  all of it happens once, at layer build time.
- Outline: stroke every fill part at 2k in ink with `destination-over` after the fills, so internal
  joins vanish and only the outer contour shows; k = 3.5 % of the body-box height in px, clamped
  1.25–3 px. Night rim: a 2k + 2 px `#CFEFFF` stroke behind that.
- Silhouette (locked entries): the union of fill parts, tinted once, drawn at 22 % (Day) / 18 % (Night).
- Leap: size-class scale (R27), faces its direction of travel, `happy` (or `surprised` for a first
  catch), the species' catch hook during the splash-out; non-swimmers (crabs, octopuses, turtles,
  coins) lean 30 % into the arc instead of pointing along it. Timing and choreography are unchanged
  (scene.ts owns them); reduced motion still skips the leap entirely, as before.

## Alternatives considered
- **A. Keep drawing in code** (Canvas calls per body type, today). Smallest bytes, but every curve is
  hand-typed arithmetic; the art drifted to "ellipse + triangle" and 11 fish shared one silhouette.
  It can't be validated structurally. Kept only as the fallback.
- **C. Pre-rendered sprite atlas.** Highest ceiling only with a human painter; 300–800 KB for every
  species × expression × size × DPR × theme, opaque binary diffs, no structural tests, and an AI artist
  has no consistent construction system. Rejected (author as SVG and feed B if an illustrator joins).
- **Real SVG documents / `<img>` per species.** Theme, golden, rim and expressions would need N
  variants or CSS filters; no per-part animation without a DOM per creature. Rejected.
- **Per-species dynamic `import()`.** More requests, latency exactly when a creature leaps. Rejected
  for now; the registry API (`ART.get(id)`) would allow it later without touching species files.
- **Parse path strings ourselves into canvas calls** instead of `Path2D(string)`. Not needed: the
  constructor is supported in every target engine (verified below), and we already have a parser for
  tests. Keeping `Path2D` means no per-frame path building at all.

## Performance and bundle budget (measured)
- Initial JS **50.8 KB gz** on current main (≤ 64 KB budget); this pipeline adds ≈ 0.6 KB (loader, dispatch, tile/avatar plumbing). The art chunk is not
  in the initial bundle; `scripts/size-check.ts` fails the build if it is.
- Art chunk with 5 pilots: **13.4 KB gz** (kit ≈ 8 KB + ≈ 0.7–1.1 KB per species). Projection for all
  47: ≈ 45–52 KB. **Budget 60 KB gz**, enforced in `scripts/size-check.ts`.
- Draw cost at 4× CPU throttle (`tests/perf/art.spec.ts`, 6 animated leapers, steady state):
  **0.033 ms mean per creature** (budget 0.12), frame p95 0.8 ms for all six (budget 1.0), zero new
  rasters after warm-up, cache 0.6 MB. Whole-game draw p95 1.4 ms (`tests/perf/frame.spec.ts`).
- Memory: LRU over all rasters, 12 MB cap (w × h × 4).

## WebKit `Path2D(string)` verification
`tests/e2e/art.spec.ts` runs on Chromium **and WebKit** (iPhone 15 profile): every species' 24 px mask
rendered through `new Path2D(d)` must match the Canvas-free rasteriser's area within 8 % (arcs from
`capsule`, cubics from `blob`/`tube`, multi-subpath `join`s), the R12 IoU limits must hold on the real
masks, and every species must draw in all 7 expressions × Day/Night × golden × static/animated without
errors. Passing on Playwright's WebKit build; `make ios-sim` remains the on-device check.
`Path2D.addPath` is not used.

## Consequences
- Adding a species = adding one file; `make check` validates it (tests/unit/art.test.ts) and the IoU
  matrix grows with it. The fleet brief is `docs/art/FLEET_BRIEF.md`.
- Review is visual and fast: `scripts/art-sheet.ts <id>` (all expressions, sizes, themes, frames,
  the leap as drawn in game, checks), `scripts/gallery.ts` (before/after, silhouettes, filmstrips),
  `scripts/art-journal.ts` (the real journal and species page).
- During the migration the journal mixes old and new styles. Accepted; it ends when the fleet lands.
- Not in this ADR (later work in the guide): the bubble-pearl "present" reveal (R30, since done by
  ADR 0012), the XS double-hop / XL-XXL breach leap variants (R26). Done in the session-3 aesthetic
  pass (`src/ui/sheets.ts`): rarity frames + 1–5 shell pips on journal tiles, locked tiles included
  (R29); the species-page size line "Caught 12 cm · record 31 cm · about 8 pebbles" with a pebble
  at true relative scale (R28); the journal grid's ambient life, one signature move at a time on a
  random visible caught tile every 3–5 s, none under reduced motion (R37).

## Amendment 1 (2026-10-16): kit pass after CRITIQUE-1
All 47 species landed (5 fleets); an independent art director graded them 11 A / 22 B / 13 C / 1 D
(`docs/art/CRITIQUE-1.md`). The systemic findings were kit problems, so they're fixed once, in the kit:
- **`sleepy` redrawn** as closed, contented ‿ eyes (3 units), a soft smile (or `o`), blush 0.25, and a
  drifting "z" in the detail view only. The old half-lid read grumpy; it survives as **`drowsy`**, used
  only as a per-species **`restExpression`** (the grouper). **`neverSleepy`** keeps the kraken awake.
- **Absolute eye floor**: the renderer never draws an eye below `eyeFloorUnits` (≥ 4 CSS px in the
  54 px tile, ≥ 9 % of the body-box height); `face.eye` is optional (profile fish default 22 % of the
  face zone). R7's 24 % cap gives way to the floor on small heads.
- **Fill table** XS 0.50 · S 0.60 · M 0.70 · L 0.82 · XL 0.95 · XXL 1.15. Journal tile canvases bleed
  8 px past the 54 px art box (negative margins, layout unchanged) so XL fins can break the frame
  (2–4 px, validated); XXL is clipped to the art box by the kit, head-anchored (`crop: 'center'` opt-out).
- **Face**: Night blush `#FF9DB0` α 0.45 on bodies with L < 0.65; per-species `blush` override (colour,
  alpha, `always`); `open`/`toothy`/`grin` mouths fall back to a filled D below 6 px, `w` to a smile
  below 4 px; `pupil: 'w'` (cuttlefish); `profile: true` for two eyes in profile (hammerhead).
- **Fleet-reported gaps**: `outline: false` (glow-only parts, also out of the silhouette and body box);
  props with `followRoot`; `scaleSteps` (layers pre-rasterised per scale step so an inflate keeps its
  outline weight); `seamless` groups (all their outlines drawn in one pass behind all their fills: no
  seams between moving eel segments); `Part.cycle` colours with `SpeciesArt.cycle` timing (cached
  steps; always or only during the signature: comb-jelly ribs, cuttle bands); `leap: { point, hide }`
  (lean instead of point; drop the garden eel's mound in the leap); a needle-friendly silhouette floor.
- **Validator**: issues carry a level. New CRITIQUE-1 rules are **warnings** (eye floor R7F, rest tilt
  ≤ 10° R5T, XL frame-break R28, eye-coloured pattern near the eye R18E, pattern strokes ≥ 4 u / dots
  ≥ 6 u R18W, detail lines ≥ 3 u R2L, body chroma ≥ 0.08 R16S, contrast on the real mint journal tile
  R16M), listed per species in `docs/art/LINT.md` (`npm run art:lint`) and made errors by flipping
  `LINT_AS_ERRORS` (or `ART_LINT_STRICT=1`). Body lightness: < 0.45 is always an error, 0.45–0.55 needs a
  deviation note; deviation keys no longer waive the contrast checks (`R16K`).
- **Review**: sheets show the real journal tile (mint) Day/Night next to sand, all 8 expressions,
  errors vs warnings; `?cast` renders the whole cast as the journal shows it (`cast-{day,night}.png`).
- Measured after the pass (47 species): art chunk **37.2 KB gz** (budget 60); **0.028 ms** mean per
  animated creature at 4× throttle, 6 leapers p95 0.7 ms; game draw p95 1.2 ms; Chromium + WebKit green.

## Amendment 2 (2026-10-27): cast lints, golden remap, reveal settle, cold read (after CRITIQUE-3)
`docs/art/CRITIQUE-3.md` (38 A / 9 B) found the remaining problems are about the cast as a whole, not
single drawings. Kit-side answers:
- **Cast lints** (`validateCast` in `validate.ts`, per species, listed in `docs/art/LINT.md`): **C1** no two
  bodies share a hex or sit within **CIEDE2000** ΔE < 6 (CIELAB D65; ΔE00 rather than ΔE76 because ΔE76
  overstates differences between saturated yellows/blues and understates near-neutral ones, exactly
  the clusters the critique names); **C2** habitat hue histogram: ≤ 40 % of a habitat's species
  (never less than 1) inside any 30° **OKLCH** hue window, near-neutral bodies (OKLCH C < 0.05) sit out;
  **C3** legendaries own their hue: no non-legendary within 15° of a legendary's body hue. They start as
  **warnings** with their own switch (`CAST_LINT_AS_ERRORS`, or `ART_CAST_STRICT=1`), separate from
  `LINT_AS_ERRORS` (already on), because three artists are redoing palettes in parallel. At landing:
  C1 30 species (4 shared hexes: boxfish/butterfly, boxcrab/lionfish, firefly/wrasse, parrot/giantclam;
  the blue trio barracuda/stingray/dolphin at ΔE00 1.8–4.3; seahorse/golden turtle 2.2), C2 only
  Legends (seadragon + golden turtle in one 30° gold window), C3 20 species around the gold, blue and
  violet legendaries (whaleshark 253° sits in the blue-fish cluster; kraken 305° has the urchin at 1°).
- **Golden remap** (`goldenKind` in `palette.ts`): a base within 25° of the golden hue (#F2C14E) with
  real chroma (≥ 0.05) wears **`GOLDEN_DEEP`** (body `#E9A93A`, more orange) with a metallic sheen and
  a white body glint on tiles and in motion; other bases keep `GOLDEN`, the turtle keeps `rose`.
- **Reveal**: the settled card (scene tiers) shows the creature eyes-open: the beat (and the signature,
  whose own face may be eyes-closed) is fitted to end at the settle (`sceneBeatEnd`), and the hero's
  entrance plays the signature so it carries on in the pool. The backdrop's ~15 fps settled redraw is
  gated on reveal time, not the wall clock, and a frozen frame always repaints the backdrop; the loop
  schedules before drawing. The Continue/Share row shows (dimmed, inert) as soon as a scene card is
  there, so its lower third is never blank. `filmstrip --reveal` waits for the reveal before freezing.
  e2e: every modal reveal ends on `idle`; the legendary backdrop holds around the settle.
- **Cold read**: `scripts/art-sheet.ts --cold [--golden]` → `artifacts/art/cold-read-{day,night}.png`
  (+ a key): every species' 54 px journal tile alone, by habitat, numbered, no names. A tile passes
  only if a cold reader names the species.
