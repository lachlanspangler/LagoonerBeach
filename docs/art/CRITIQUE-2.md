# Art critique, round 2 (independent art director, 2026-10-16)

**27 A · 15 B · 5 C · 0 D** (round 1: 11 / 22 / 13 / 1). Exemplars (the bar): octopus, clownfish,
puffer, turtle, whaleshark, boxfish, hermit, starfish. Ship-blockers: the 5 C's, the Night
"dormitory", the reveal's size/eyes-closed ending. Note: several committed sheets in
docs/media/art/ were stale — always regenerate before judging.

## Per species (r1 → r2, fix)
### C — redo
- **blenny** (C→C): drumstick again (head 2× rear height, stub tail). Caudal peduncle ≥ 55% of head
  height + a rounded fan tail (18 u tall, accent `#5F7436`). Tufts = branched cirri (2 short forks
  each, 6×8) set *over* the eye, splayed ±25° (today: parallel upright capsules = rabbit ears). Long
  dorsal as a lighter band `#B9C987` along the whole back. Eye 12.5.
- **cockle** (C→C): dumpling / sauce boat; twins the limpet. Heart-ish *rounded* fan 1.3:1 wide, top
  edge a smooth arc (no apex), 4 broad ribs ≥ 6 u fanning from a bottom-centre hinge; drop the nub;
  warmer/pinker `#F2C9A8`, ribs `#C27A5A`.
- **cuttle** (C→C): still a brown bread roll with grill marks; W pupil < 3 px at 54. Head 45% of
  length, round, eye 13 u with a clearly drawn W. Mantle dusty rose `#C98FA8` (own the
  colour-changer hue), 3 cream bands `#F7E6EE` that taper and follow the curvature (not parallel
  rectangles); fin skirt 4 u lighter tone; arm beard = 4 capsules splayed in a fan (today a fist).
- **grouper** (C→C): trumpet silhouette (thin stalk + flared fan); lips stick 12 u past the snout =
  boxing glove; reads M. Peduncle ≥ 45% of body height, flat belly line; pout within R8 (≤ 0.9
  eye-widths) sat on the snout `#C9A08A` ink-outlined; coral-grouper red `#C0674A` with pale-blue
  `#BFE6F7` spots (3–5, ≥ 6 u); reads L; `drowsy` only in the detail view (half-lid + blush at 54 px
  reads tipsy).
- **lanternfish** (C→C): "biggest eye" is cast-average (11.2) → eye 16 u (break the 24% cap with a
  one-line R10 reason), both highlights always visible; peduncle ≥ 40% of head height; small
  dorsal + anal fins; Night glow = 5 discrete photophore halos (r = 1.4× dot), not a belly smear.

### B — small fixes
- **limpet**: twins the cockle. Low dome 2.2:1, apex 10% back, 5 radial ribs `#946043` at 4 u, face
  on the front flank at 55% height.
- **sandeel**: lower jaw juts ≥ 6 u past the snout; eye ≥ 9 u; off the minnow's silver-blue: belly
  `#E8ECEF`, back `#D8C79A`, no blue stripe.
- **moray**: mouth rises 6 u at the corner (grin, not scowl), 2 *upper* white teeth; drop the brow
  in idle (villainous on Night); rock ≤ 35% of the box, warm `#B7A58E`.
- **gardeneel**: 2 spots not 4 (giraffe); head 1.8× stalk; face tilted 15° toward the viewer.
- **flounder**: body `#C79A68`, rim fin `#EED9B4` (rim currently same value as body), ≤ 4 spots
  `#7A5636`, tail −50%.
- **damsel**: pectoral −35%, tucked against the flank 30° back (hangs like an arm); fin tips `#9DB8FF`.
- **manta**: 61×84 portrait reads bird/plane → landscape, span 1.6× length, wings level; cephalic
  fins as inward curls *in front of* the face, not ears on top; pale `#E9EEF5` leading-edge rim.
- **barracuda**: 2 white teeth ≥ 5 u visible at 54 px; underbite +6 u; pointed snout (round melon =
  dolphin).
- **hammerhead**: hammer is a thin bar = goggles → tips 1.3× body depth tall with rounded lobes,
  eyes at the extreme tips; far lobe 12% ink so it reads 3D.
- **nautilus**: 7 tentacles at 5 u, +40% longer and curving (not 5 stubby fingers = mitten); hood
  spots → one darker hood band (spots = cookie).
- **combjelly**: a pale face window (body colour, 92% alpha, 40% of width, upper-middle) where the
  ribs fade, so the eyes don't sit on stripes.
- **butterfly**: dorsal hook = quiff/banana → −40%, `#F2D43B` with `#FFF6D0` edge; false eye-spot
  = 7 u `#2B2320` dot with `#FFF1C2` ring on the rear dorsal; signature spin min x-scale 0.15.
- **wrasse**: stripe starts 3 u behind the eye at 4 u, widening to 10 at the tail, following the body
  curve into the tail fin (today = tape strip); fill 0.60.
- **seadragon**: twins the seahorse → olive-gold `#C9A53B`, leaves +30% carrying ≥ 45% of the
  silhouette, snout −20% thickness; rest `idle` eyes open (`proud` only in the reveal); scale 1.05
  over M. A legendary must be one of the best tiles in the book.
- **kraken**: locked silhouette = crowned crab/spider (all arms curl down) → raise 2 arms over the
  head at rest ("scary pose"), curl 2 tips up; brow ≤ 12° (reads angry).
### A with minor notes
- periwinkle: eye-stalks = bunny ears → splay ±25°, −20% length. shrimp: antennae sweep back over the
  body as thin arcs. boxcrab: eye nubs read as ears (splay). stingray: L reads M → fill 0.82.
  firefly: arm-tip glow faint on Day. lionfish: lower rays slightly legs. otter: Night `w` mouth
  under ‿‿ = moustache.

## Systemic
- Fixed: sleepy faces, tilts. Mostly fixed: eye floor (needle species still ~3 px at 54 → the floor
  must be on *rendered px*, ≥ 4 CSS px), patterns vs face. Partly: size fill (L reads M for long/flat
  shapes → fill by body-box *area* for aspect > 1.8, or a 2 px tail frame-break for L).
- Add lint: "peduncle ≥ 40% of max body height" for fish/long.
- **NEW 1 — Night journal is a dormitory** (~41/47 eyes closed on Night; the Night row sleeps on Day).
  Use `drowsy` (half-open, highlights visible) as the Night rest and keep `sleepy` for the detail view,
  and/or wake a random ~30% that blink-open and look at the player every 3–5 s (within the
  one-signature-at-a-time budget). Seadragon/grouper rest heavy-lidded on both themes → fix.
- **NEW 2 — bunny-ear motif** (periwinkle, shrimp, blenny, boxcrab, manta): paired dorsal appendages
  must splay ≥ 25° or sweep back; ≤ 2 species may keep upright pairs.
- **NEW 3 — colour clusters**: 7 browns (cuttle, flounder, grouper, limpet, cockle, otter, nautilus);
  14 blues (Deep Water almost all blue); seahorse ≈ seadragon gold; golden variants of yellow species
  barely differ → hue-histogram lint per habitat (no habitat > 40% within 30° hue); golden remap for
  base hue within 25° of `#F2C14E` → more orange-metallic `#E9A93A` + glint.
- **NEW 4 — twins the IoU misses**: limpet/cockle, seahorse/seadragon, sandeel/minnow/wrasse. Review a
  24 px sheet grouped by habitat by eye.
- **NEW 5 — the reveal undersells the present**: the legendary XL kraken appears at the same ~35%
  card width as an S seahorse; reveals *end* eyes-closed (proud/happy ^^); the bubble phase leaves
  the lower 55% of the card blank white; both reveals show "31.4 cm" (fixture leak?). Scale the
  reveal creature by class (S 0.9 → XL 1.3; legendary XL breaks the card top by 8–12 px); end on
  `idle` eyes open + one blink after `proud`; placeholder shimmer for the name/how area.
- **NEW 6 — stale review media**: regenerate all sheets before the next round.
- Personality spread: too many share the content smile + ‿‿ rest → distinct resting mouths per
  personality (moray grin, grouper pout, blenny smirk, wrasse spa smile, damsel chest-out frown).
