# Fleet brief: drawing one Lagooner Beach creature

You are one artist in a fleet. Each of you redraws a few of the 47 species, one file per species,
with the shared creature kit (ADR 0011). You never edit shared files, so you never conflict with
each other. The bar: **an app used by millions**. Cute, charming, readable at 24 px, one cohesive
cast, each species with its own size, its own little motion and its own expression. Finding a new
one should feel like opening a present.

## 0. Before you draw (30 minutes, not optional)
1. Read `docs/research/CREATURE_ART.md` **§3 in full (rules R1–R39, binding)** and **your species' row
   in the §4 appendix** (size class, the 24 px silhouette feature, personality, signature idle,
   palette notes). Also read the "Silhouette disambiguation for the fish family" note if you draw a fish.
2. Read `docs/adr/0011-creature-art-pipeline.md` (how the pipeline works).
3. Open the five pilot sheets: `docs/media/art/pilot-{clownfish,octopus,sanddollar,hermit,turtle}.jpg`.
   They are the quality bar and the reference for line weight, eye size, blush, how patterns sit,
   and how lively an idle should be. Then read the pilot file closest to your species:
   | your body class | copy the structure of |
   |---|---|
   | fish, shark, eel/long, seahorse/dragon | `species/clownfish.ts` (profile, tail/fin groups, prop) |
   | octopus, squid, jelly, crab, otter (front-facing chibi) | `species/octopus.ts` |
   | small creature with a shell/home (snail, nautilus, clam, cockle, limpet) | `species/hermit.ts` |
   | star, urchin, dollar-like objects | `species/sanddollar.ts` |
   | turtle, ray, anything with a separate head | `species/turtle.ts` |

## 1. Setup (worktree)
```
ln -s ~/Desktop/Game/node_modules node_modules      # no npm install
npx vite --port <your dev port> --strictPort &       # e.g. 5600 + your number; never 5317/4317
export LB_URL=http://localhost:<your dev port>
```
Playwright tests: `PW_PORT=<4600 + your number>`.

## 2. The one file you create
`src/render/art/species/<id>.ts`. `<id>` is the species id from `src/meta/creatures.ts` (e.g.
`minnow`, `whaleshark`). The registry finds it automatically, and the game draws it with the new art
the moment it exists. **Do not edit** `kit.ts`, `render.ts`, `face.ts`, `motion.ts`, `palette.ts`,
`validate.ts`, `creature-art.ts`, the registry, `scene.ts`, `overlay.ts` or another species' file. If the kit
truly can't express something, write it in your report (what, and why) and do the best version the
kit allows.

```ts
import { blob, capsule, circle, defineArt, ellipse, join, rrect, tube, xform, waveTrack, within } from '../kit.ts';

export default defineArt({
  id: 'minnow',
  klass: 'fish',            // fish | shark | long | chibi | jelly | wing | object | horse | turtle | snail
  size: 'S',                // the appendix's class (tests check it against the size range, R27)
  feature: 'slim torpedo with a deep forked tail',          // R10, in words
  personality: ['eager', 'first', 'twitchy'],
  palette: { body: '#B8C4CF', accent: '#3D9BE9' },          // ≤ 3 authored colours; belly optional
  groups: [                 // back → front; ≤ 6; one must be 'body'
    { id: 'tail', pivot: [-30, 0], parts: [{ d: tailPath, role: 'body' }] },
    { id: 'body', parts: [
        { d: bodyPath, role: 'body' },
        { d: stripePath, role: 'accent', kind: 'pattern' },  // clipped to this group's silhouette
        { d: gillLine, role: 'ink', kind: 'line', w: 1.6 },  // interior detail line
    ] },
    { id: 'finA', pivot: [4, 8], parts: [{ d: finPath, role: 'body' }] },
  ],
  shine: ellipse(18, -10, 8, 3.5, -20),   // R17 highlight, upper-front (clipped to `body`, or `shineOn`)
  face: {
    eyes: [[12, 1]],        // 1 eye in profile, 2 when front-facing (+ front: true)
    eye: 10,                // eye HEIGHT in units: 14–24 % of the face zone height (R7)
    zone: [6, -20, 30, 40], // face zone [x, y, w, h]; eye centre at 55–62 % of its height
    mouth: { at: [31, 8], w: 7, shape: 'smile' },  // smile w o open flat pout none (+ grin underbite toothy)
    sweet: true,            // blush in idle (personality); blushInk: true for pink/red bodies
  },
  idle: {
    ambient: [ { m: 'bob', amp: 2.5, period: 2.4 }, { m: 'wag', g: 'tail', amp: 10, period: 0.8 } ],
    signature: { dur: 0.8, tracks: [ /* keyframes, see below */ ], face: [[0.3, 0.8, 'happy']] },
  },
  catch: { /* optional: plays at the leap apex */ },
});
```

### Kit cheat-sheet
- **Coordinates**: 100-unit artboard, origin at the centre, facing **right**, y **down**. The body box
  (fill parts, excluding `extra: true` parts such as antennae) must fit in **84 × 84** and have a long
  side ≥ 60 ("draw full"; the size class scales it on screen). Everything must stay inside ±50.
- **Shapes** (all return path strings): `ellipse(cx, cy, rx, ry, rotDeg)`, `circle`, `rrect(x, y, w, h, r)`,
  `capsule(x1, y1, r1, x2, y2, r2)` (tapered limb/spine/fin), `blob(points, tension)` (smooth closed
  curve through 5–13 points; the workhorse for bodies), `tube([[x, y, r], …])` (tapered tentacle/tail
  along a spine, ≤ 10 points), `join(...)` (several subpaths as one part), `xform(d, { sx: -1 })`
  (mirror/move/rotate). Raw SVG `d` strings work too (`M L C Q A Z`, absolute or relative).
- **Roles**: `body`, `belly` (secondary skin or countershade; derived when omitted), `accent`
  (pattern), `white` (shared #FFF), `ink` (derived, darker same-hue), `light` (light organs: glow at night).
- **Kinds**: `fill` (default; outlined; part of the silhouette), `pattern` (clipped to its **own
  group**; dropped when a feature is under 3 px), `line` (ink stroke, clipped). Budgets: ≤ 12 fill
  parts, ≤ 24 parts total, ≤ 24 segments per subpath.
- **Groups**: each is one cached layer that can move about its `pivot`. The face draws right after its
  group (`face.g`, default `body`), so **later groups cover the face** (the octopus hides its eyes this
  way). A group with `prop: true` is hidden at rest, shown only while a performance animates it, drawn
  outside the root transform, and never part of the silhouette (clownfish anemone, octopus heart).
- **Ambient channels** (`m`): `bob`/`glide` (units), `breathe`/`pulse` (fraction), and rotations
  `wag flutter sway paddle wave` (degrees). `g` takes a group or a list (`lag` seconds per item for
  tentacle waves). Periods are at size M; the kit scales tempo by size class (R24).
- **Signature / catch / release**: `{ dur, every?, tracks: [{ g?, p: 'tx'|'ty'|'rot'|'s'|'sx'|'sy', k: [[u, v], …] }], face?: [[u0, u1, expr|'wink']] }`.
  No `g` = the whole creature. Values are eased in-out between keys. Presets: `dart`, `hop`, `snap`,
  `waveTrack`, `hideTrack`, `wiggleTrack`, and `within(track, u0, u1)` to place one inside a longer
  performance. Signature dur must be 0.6–1.5 s.
- **Deviations**: `deviations: { R7: 'one-line reason' }` waives that rule's checks for your species.
  Use it only when the guide's own words allow it (the turtle's eye on a separate head is the example).

## 3. The loop (repeat ≥ 3 rounds; the pilots took 3–4)
1. **Silhouette first (R11).** Block the fill parts only. Aim for the appendix's 24 px feature, one
   dominant primitive (R4), and the R5 proportions (plump, big face zone, stubby limbs as filled
   capsules ≥ 5 units, never strokes).
2. **Render the sheet**: `npx tsx scripts/art-sheet.ts <id>` → `artifacts/art/sheet-<id>.png`. Read
   the PNG. The sheet shows the checks at the top (red = fix), the detail view Day/Night/golden/locked,
   the old art, all 7 expressions, the journal tile and 24–64 px, the silhouette, a lineup with every
   redrawn species, ambient and signature frames, the catch/release hooks, and the leap exactly as the
   game draws it.
3. **Face, palette, pattern, shine.** Then motion: ambient first (always on), then the signature from
   the appendix, then a catch hook if the default wiggle doesn't suit it.
4. **Test**: `npx vitest run tests/unit/art.test.ts` (style-guide checks for every species, plus the R12
   silhouette IoU matrix: < 0.80 for every pair, < 0.70 within a body class). It prints the closest
   pairs. If your species collides, change **your** silhouette, never someone else's.
5. **See it in the game**: `npx tsx scripts/art-journal.ts <id>` → `artifacts/art/journal-{day,night}.png`
   and `species-{day,night}.png`. `npx tsx scripts/gallery.ts` → `compare-*.png` and `silhouettes.png`.
6. **Self-critique in writing** (in your report, one paragraph per round): answer the questions in §5
   honestly, list what you changed, re-render, look again.

## 4. Checklist (all must be true before you hand in)
- [ ] Appendix row honoured: size class, silhouette feature visible in the 24 px mask, personality,
      signature idle, palette notes (dark-identity species lifted to L ≥ 0.45 with a light belly).
- [ ] R1/R2: body box ≤ 84 × 84, long side ≥ 60, ≤ 12 fill parts, no stroked limbs, limbs ≥ 5 units thick.
- [ ] R3: no sharp corners anywhere (spines and teeth have rounded tips).
- [ ] R6–R9: eyes are the rig's (never draw your own eyes), low-set, 14–24 % of the face zone (XS: 24 %),
      mouth tiny, blush where the personality says "sweet" (`blushInk` on pink/red bodies).
- [ ] R12: `tests/unit/art.test.ts` passes. You can name your species from its silhouette sheet alone.
- [ ] R16: ≤ 3 authored colours, accent differs by ΔL ≥ 0.15 or Δhue ≥ 60°, contrast checks pass on
      both themes (the validator prints the numbers).
- [ ] R18: patterns are placed by hand (never hashed); 3–9 spots of ≥ 6 units; ribs as 3–5 ridges.
- [ ] R19–R21: every expression reads on the sheet (happy `^ ^`, surprised whites, proud smug, sleepy
      lids, shy eyes down) and none changes the silhouette.
- [ ] R22–R24: an ambient idle that is alive but calm, plus a signature that is *funny or sweet*, not
      just "moves". Big species drift, small ones fidget (the kit scales tempo, so author at size M).
- [ ] Night: reads on the navy tile (rim visible); night-habitat species set `light` parts for glow.
- [ ] `make check` is green. Commit: `render: <species> art (ADR 0011)`, one species per commit,
      with the sheet's verdict in the body. Don't push.

## 5. Self-critique questions (the quality bar)
Look at the sheet at 100 % and at the 54 px tile, then answer:
1. **Squint test**: at 24 px, is it obviously *this* species and not its neighbours (the lineup row)?
2. **Charm**: would someone screenshot it? Does it look like it belongs next to the pilots: same line
   weight, same eye language, same softness? If it looks like clip-art, simplify and round it more.
3. **Personality**: from the idle and signature frames alone, could a stranger guess its three words?
4. **Lumps**: are the outlines smooth? Wobbly `blob`s (too many or uneven points) read as potatoes;
   use fewer, evenly spaced points, or an `ellipse`/`rrect` (the sand dollar lost its notches for this).
5. **Faces**: is anything covering the face at rest (claws, fins, bars)? Is the mouth inside the head?
6. **Size**: does the tile fill feel right next to the others (an XS is small on purpose; an XXL is
   cropped by the tile on purpose)?
7. **Motion**: watch the signature frames in order. Does it read in 1 s? Is there anticipation, a clear
   action, and a settle? Does the face change at the right moment (a wink at the end is cheap and good)?

## 6. Gotchas the pilots hit
- Patterns are clipped to **their own group**: a tail stripe must live in the tail group (the
  clownfish's tail tip first vanished this way).
- A front-facing creature's arms or claws in front of the head will cover the eyes if they're in a later
  group. That's the peekaboo trick, but at rest keep them below the eye line.
- The body box includes every fill part except `extra` ones; fins and tails count, so leave room.
- Patterns may extend past the fill (they're clipped) without breaking the artboard check.
- Leaps: fish, sharks, eels, seahorses and rays point along the arc; everything else leans 30 %. You
  don't control this, but check the leap strip on your sheet.
- Profile species: one eye, 30–38 % of the body length back from the snout (the validator measures it
  on the full body box including the tail).
- The validator is a floor, not the bar. Passing it is round zero; each pilot still needed 2–3 rounds
  of looking (lumpy rims, a fin crossing a bar, front arms that read as clasped hands, a claw over the face).
