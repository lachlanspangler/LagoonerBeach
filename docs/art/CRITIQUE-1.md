# Art critique, round 1 (independent art director, 2026-10-16)

Grade count: **11 A · 22 B · 13 C · 1 D**. The redraw is a big step up from the clip-art "before";
about a quarter is ship-ready next to a top-chart game. The bottom third fails the same few ways:
tiny faces on profile/long bodies, 30–45° tilted poses that read as drumsticks/tadpoles,
brown-on-sand palettes, signature traits invisible at tile size, and a cast-wide resting "sleepy"
face that reads grumpy.

Exemplars (the bar for every redo): **octopus, clownfish, puffer, whaleshark, turtle** (runners-up:
sanddollar, starfish, moonjelly, seasparkle).

## Systemic (kit-level) issues
1. **Resting `sleepy` reads grumpy/bored/skull/sunglasses** (R32 puts half the journal in sleepy on
   the "off" theme). Fix in face.ts: sleepy = closed downward-curved ‿ arcs (3 units, like blink but
   curved), tiny `o` or soft `smile` mouth, blush stays at 0.25, optional "z" only in detail view.
   Kraken: force idle (its brief).
2. **Eye-size floor relative to the face zone → long/profile bodies get 2–3 px eyes.** Add an
   absolute floor: eye ≥ 4 CSS px tall in a 54 px tile (eye height ≥ 9% of body-box height); profile
   fish default 22%. Affects wrasse, barracuda, sandeel, cuttle, flounder, minnow, blenny, moray,
   lanternfish, seadragon, gardeneel, shrimp, lionfish.
3. **Tilted poses** (blenny, lanternfish, moray, sandeel, butterfly, seadragon, shrimp at 25–45°)
   + fat-head/thin-tail taper = drumsticks, and break the calm shared baseline. Tilt cap ≤ 10° for
   fish/horse/long classes at rest (signatures may tilt temporarily); validate it.
4. **Size-class fill table too steep at the bottom, too flat at the top.** Proposal: XS 0.50, S 0.60,
   M 0.70, L 0.82, XL 0.95 + mandatory 2–4 px frame-break, XXL 1.15 cropped. Communicate small with
   tempo + the size line, not illegibility. XS species (limpet, periwinkle, hermit) are 22–30 px
   smudges in ~70 px tiles today; M/L/XL look the same size (dolphin vs parrot). Validate frame-break
   for every XL (manta, dolphin, hammerhead, sunfish, kraken).
5. **Patterns compete with the face or vanish.** Ink-coloured spots near the eye kill the face
   (boxfish, flounder); hairline patterns read as scribbles (barracuda chevrons, cuttle stripes,
   giant-clam "teeth", comb-jelly ribs) against R18's ≥ 6-unit rule. Lints: fail a pattern in the
   eye's colour within 1.5 eye-widths of the eye; pattern stroke ≥ 4 units; body chroma floor 0.08
   so browns stop sinking on Day.

Also: the `open` mouth rasterises as an "S" below ~6 px (damsel, lanternfish, parrot) → fall back
to a filled D or `o`. Blush on Night/brown bodies goes muddy → `#FF9DB0` α 0.45 on Night for
L < 0.65. **Review sheets must also render on the real journal tile colour (mint)** — several
contrast problems (blue species on mint) only show there. Day has a "brown cluster" problem
(cuttle, flounder, grouper, limpet, blenny, nautilus, otter melt into sand/mint).

## Per species
### A — ship it (minor notes)
- **clownfish** exemplar. **octopus** exemplar (sleepy fix is systemic). **turtle** exemplar.
  **puffer** exemplar. **whaleshark** exemplar. **starfish**, **moonjelly**, **sanddollar**: only the
  systemic sleepy fix.
- **angler**: open the idle eye 15% (eye height ~20%) — at 24–32 px it's a squint.
- **dolphin**: XL flukes should break the tile frame by 2–4 px.
- **seasparkle**: Night glow halo ~1.5× orb radius, α 0.35.

### B — small fixes
- **minnow**: body `#C3CDD6`, belly `#E4EAEF` (real silver, not baby-blue); lateral stripe 4 units,
  6 units below eye line, ending 4 units behind the eye (it smears the cheek); eye 22%.
- **periwinkle**: stalk-tip eyes 7 units (from ~4) + a face (blush, smile) on the foot front; XS fill.
- **hermit**: claw hides the face — lower claw 6 units, eyes up 4; eye 24%; face patch `#F2A27E`.
- **limpet**: face onto the cone flank at 60% height, eye 24%; chroma ~0.09 (`#C49A78`); cream skirt
  `#F1E2CC`.
- **shrimp**: eye lost in the curl → front-top of head (30% from snout), 24%; antennae −20% (bunny ears).
- **seahorse**: back fin reads as an ear — shrink 30%, move lower; snout +15% (not a duck bill); eye 22%.
- **boxcrab**: spiky = virus; 2 eye-stalk nubs on top + 3 rounded leg nubs per side (r ≥ 4); 3
  larger peach spots instead of 6 small.
- **boxfish**: polka dots = eye colour/size → face vanishes ≤ 32 px. Dots `#B08A1E`, 4 dots, out of
  the face zone; mouth `pout` 0.6 eye-heights below the eye (the "o" reads as a dot).
- **stingray**: white belly wedge reads as a stain → 3-unit cream rim along the front edge; body
  `#9FB0BF` (flat on mint).
- **damsel**: open mouth "S" (kit fallback); pectoral −30% and tipped back (seal flipper); fin tips
  `#9DB8FF` (missing).
- **parrot**: beak reads as a snout/megaphone → rounded wedge `#F5F1E6`, one ink parting line,
  slight overbite; pink stripes `#F06AA0`, 5 units, 2 stripes; silhouette currently = beluga.
- **manta**: slug with jet wings → wingspan 1.6× body length, head lobe 30% of span; cephalic fins
  curled inward as two clear horns; XL wingtips 3 px past the tile.
- **barracuda**: wavy chevrons = scribble → 6 filled chevron bands ≥ 6 units, `#5F7385`; a real
  jutting underbite (+6 units) with 2 white teeth visible at 54 px; eye 20%.
- **urchin**: Night half-lids on the pale disc = skull (systemic); face disc `#B9A0D6`.
- **firefly**: arm-tip glows invisible on Day → 2-unit `#9BF0FF` dot + `#3D9BE9` ring; Day sleepy (systemic).
- **lionfish**: locked silhouette = a hand → body ellipse +25% (≥ 45% of area), dorsal rays spread
  ±60°; eye 22%.
- **giantclam**: lower-shell hairlines = teeth (taco) → 4 wide wavy ridges; shell `#F3E3BC`.
- **sunfish**: scalloped clavus = bite mark → smooth frill, 3 big scallops; XL fins 3 px past the
  tile; warm sun-blush `#FFB3A0` always on.
- **otter**: Night sleepy = sunglasses (systemic); chest shell reads as a brain → cream `#F3E6D2`
  scallop with 3 ribs; face mask `#E6D2B8` +15% so the head pops at 24 px.
- **goldturtle**: spiked ridge reads as a famous video-game villain's shell — off-tone and an
  originality risk. Replace with 3 rounded jewel domes (`#FFF1C2`, `#7FD1E8` gem centres); pose
  distinct from the turtle (head up 15°, both flippers out like wings).
- **kraken**: recoloured octopus → head 1.3× the octopus's width, all 8 arms splayed outward with
  tips curling past the tile edge; a stubby "menacing" brow arc; never `sleepy` (force idle).
- **gardeneel**: head = stalk width (cane/periscope) → head 1.6× stalk width, eye 24%; drop the mound
  in the leap (a flying mound reads as a plunger).

### C — redo
- **blenny**: 30° tilt + taper = drumstick. Level (≤ 8°), body aspect 2.2:1, long low dorsal ridge
  as a continuous band, 2 tufts (capsules 6 thick × 10 tall); olive `#9AAE5E`, spots `#6E8240`; eye
  22% front-top; cheeky smirk.
- **cockle**: pink foot = tongue, silhouette = mushroom/squid, eyes in a slot. Wide heart-ish shell
  (1.25:1 wide) with 4 broad ribs `#B07A4E` on `#F1DDBB`, open ~10° with eyes in the gap (24%); drop
  the foot or a small cream side nub; keep the hum.
- **sandeel**: lost "long thin needle" (stubby S, collides with dolphin/minnow). Aspect ≥ 4:1 (box
  84×20), pointed jutting jaw, head 30% of length, smaller double wave; silver belly `#E8ECEF` vs
  sand `#D8C79A`; keep the tail-first dive. (Kit: the mask-area floor must allow true needles.)
- **moray**: spotted pickle/caterpillar; grin is a 2 px line. Head 1.4× body thickness, wide `grin`
  over 60% of head length with 2 white rounded teeth at 54 px; low back frill as a lighter band;
  rises from a rock-hole edge; 5 bigger spots `#E8D84A` in 3 sizes; body `#5E7D3C` ok.
- **cuttle**: bread roll / croissant with grill marks; arm tuft = a hand. Clean mantle oval 1.6:1
  with a thin uniform rippling fin skirt (6 units); face forward with a big W-pupil eye at 24% (kit
  needs a pupil-shape option); arm tuft = 4 short capsules like a beard; 3 bold cream bands `#F2E2CF`
  on `#A7765A`; a colour-ripple signature that really shows hue change.
- **flounder**: brown on brown on sand; stacked-eye joke is 2 px. Eyes are the R10 trait at 1.6×:
  two eyes on turrets, one 8 units higher, 24%, top edge; rim fin lighter band `#E9D4AE`; body
  `#B78A5C`, spots `#7A5636`; at 24 px "flat pancake with two bumps" — remove/shrink the tail 50%.
- **grouper**: lumpy brown potato; lips = paw; blotches = mould; doesn't feel L. Front-heavy wedge,
  head 60% of length; big clear `pout` lips `#C9A08A` ink-outlined, centred on the snout; rounded fan
  tail; half-lid as its personality default (kit: per-species resting expression); body `#9B7656`,
  3 large saddles `#C9AB86`.
- **hammerhead**: side-view capsule hammer = a shark holding a rolling pin. 3/4 front view so the
  hammer is a wide horizontal T (span 1.3× body width, frame-breaking 3 px), an eye at each tip (20%;
  kit: two eyes in profile), tall dorsal behind; keep the head-scan signature.
- **nautilus**: same silhouette as hermit; peach soft body = a human baby face. Shell side-on,
  opening right, hood + one big eye in the opening; 6–8 thin tentacles fanning forward; hood
  `#C98A5E`, tiger stripes `#C2603A` on `#F4E7D2`. (Must still clear cuttle/hermit silhouettes.)
- **lanternfish**: "biggest eye in the cast" is a tiny squint; 45° drumstick; photophores ~1 px.
  Level, head 50% of length, eye 24% with a visible highlight even in sleepy; 5 photophores of 5
  units `#9BF0FF` with an ink ring (read on Day); body `#2FB8D8` ok.
- **combjelly**: plain pink egg on Day; comb rows invisible. 8 bold vertical ribs ≥ 4 units cycling
  `#53C08C` `#3D9BE9` `#8E5BD8` `#F2B93B` (rainbow in a static tile); small apical nub; body 85% alpha
  like the moon jelly; signature = a hue ripple through the rib colours.
- **wrasse**: eye sits on the black stripe; featureless blue capsule. Stripe from behind the eye to
  the tail, widening 7 → 10 units at the tail; eye in clear body colour, 22%; front half `#BFE6F7`,
  back `#3D9BE9` (bluestreak cleaner wrasse; not the minnow's twin); happy "spa attendant" smile.
- **seadragon**: legendary that reads as broccoli; snout/head a thin line, face ~2 px. Restore the
  upright S-curve; seahorse-sized head (25–35% of length), eye 22%, smaller snout; 6 large leaf lobes
  at the outline only (never over the face) `#8AB17D` on body `#E0B84A`; default face `proud`; big
  leaf sway + bow; 1.05 scale bump over M.

### D — fails readability
- **butterfly**: the false eye-spot beats the real eye; slash band; lumpy outline; 25° tilt; white
  tail = nappy. Upright tall disc (0.85:1), level, straight tweezer snout (10 long × 5 thick); real eye
  in a dark vertical eye-band (classic mask), white-ringed (allowed sclera exception); false
  eye-spot = smaller ringed dot (`#2B2320` with `#FFF1C2` ring) on the rear fin; yellow `#F2D43B`,
  tail/fins `#FFF6D0`; keep spin-and-wink.

## Cast notes
- Cohesion strong: outline weight, gloss crescent, eye colour/highlights, golden variants, Night rim.
  Weak: face scale inconsistent (chibis big, profile fish tiny); blush muddy on Night/brown bodies.
- Size: only extremes land (whaleshark cropped, otter frame-breaking). XS too tiny; M/L/XL look alike.
- Off-model vs the best: the profile-fish group (blenny, lanternfish, butterfly, sandeel, wrasse);
  weak legendaries (seadragon, kraken); template collisions (nautilus≈hermit, kraken≈octopus).
