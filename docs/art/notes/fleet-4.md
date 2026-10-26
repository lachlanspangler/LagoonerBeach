# Fleet artist 4: notes

Species: boxcrab, starfish, cuttle, firefly, moonjelly, combjelly, seasparkle, kraken.
Sheets: `docs/media/art/<id>.jpg`. All pass the style-guide checks and the R12 IoU matrix.

## Box Crab (`boxcrab`): S, chibi. Grade B
- **Feature:** a rounded-square shell with both claws folded across the front like a box lid, two
  eye-stalk bumps on top, three leg nubs a side.
- **Signature:** lifts the lid (claws swing up and out), waves the right claw, folds back neatly
  and finishes on a proud face. It's prim.
- **Rounds:** 5.
  1. Box 92 wide. The claws swung down instead of up because I had the rotation sign backwards.
  2. Fixed the sign and the box.
  3. Added the eye-stalk bumps, which give the top edge a feature and read as cute little ears.
  4. Failed IoU against the sand dollar (0.87) and the octopus (0.72). The shape was too much of a
     rounded blob. I made the shell wider and shorter and spread the legs out with visible gaps.
  5. Splayed the legs into a fan to get the sand dollar down to 0.75.
- **Would improve:** the splayed legs and stalks make it read a bit spiky at 24 px. With more
  silhouette budget I'd use shorter stalks with round eye-knob tips.

## Sea Star (`starfish`): M, object. Grade A-
- **Feature:** five plump arms with round tips (root radius 16, tip radius 9.5), a pale bump on
  each arm, and the face in the middle.
- **Signature:** waves its upper-right arm hello three times, the body leans in, then a wink.
- **Rounds:** 3.
  1. The waving arm was a later group and covered the face. I moved it behind the body; the seam
     is invisible.
  2. Plumper arms, a bigger centre and bigger eyes.
  3. Bigger wave amplitude.
- **Would improve:** the sand dollar IoU is 0.67 against the 0.70 object limit. The two are close
  because both are compact centred masses.

## Cuttlefish (`cuttle`): M, chibi in profile. Grade B-
- **Feature:** a plump mantle inside a scalloped frill skirt (18 arcs), a four-arm tuft under the
  snout, three wavy cream zebra bands.
- **Signature:** a shifty backward scoot with a tilt. The arm tuft twirls up like a moustache,
  then a smug face and a wink.
- **Rounds:** 6.
  1. Read as a loaf with a mitten.
  2. Big round head and arms moved behind it, so the face is clear.
  3. Scalloped skirt: the frill finally reads.
  4. The cream stripes looked like bread scoring. Thin wavy lines fixed that.
  5. Bolder full-height zebra lines.
  6. Fourth arm, and a stronger signature.
- **Would improve:** it still has a faint pastry look in tan. The guide's W pupil and its colour
  ripple can't be done in the kit (see limitations), and those were the two things that would sell
  "cuttlefish" most.

## Firefly Squid (`firefly`): S, chibi, night. Grade A-
- **Feature:** a tall bullet mantle under a rounded arrowhead fin, four short arms whose tips are
  light organs, and five photophores on the mantle. The tips glow cyan on Night.
- **Signature:** blinks hello three times (blink face overrides), the arms flaring open on each
  blink, then a happy face.
- **Rounds:** 3: the first layout, then fixing the box and widening the fin, then checking
  Night/Day and the leap.
- **Would improve:** a real "3 flashes" needs the light organs to brighten on cue, and light
  brightness isn't animatable.

## Moon Jelly (`moonjelly`): M, jelly, night. Grade A-
- **Feature:** a translucent dome bell at 85 % alpha over its own outline (the arms show through)
  and a four-leaf clover of light organs on the crown that glows orchid on Night. Four wavy oral
  arms sway with a 120 ms lag.
- **Signature:** a deep pulse squash, then it drifts up 10 units, settles, and looks happy.
- **Rounds:** 3.
  1. Accent too close to the body (Δhue 58°), eyes too far apart, and IoU 0.83 against the sand
     dollar.
  2. Narrower bell, longer arms, darker orchid accent.
  3. Arms in the bell colour instead of white, which looks more cohesive.
- **Would improve:** the clover reads a bit like a flower.

## Comb Jelly (`combjelly`): S, jelly, night. Grade B
- **Feature:** an upright egg (narrow top) with a little sense-organ knob on the pole, four
  visible beaded comb rows (light organs, glow cyan on Night), no tentacles.
- **Signature:** a slow twirl while four light sparks orbit around it and wink.
- **Rounds:** 4.
  1. A shimmer band of beads slid down over the face and looked like goggles. IoU against the
     firefly was 0.71.
  2. Egg shape, knob, and a fatter egg.
  3. Changed the sparks to orbit outside the body.
  4. Rebalanced the width so every jelly and chibi pair is under 0.70.
- **Would improve:** the IoU margins are thin (firefly 0.69, boxcrab 0.68, moonjelly 0.67). A
  plain egg is generic by nature. The rainbow ripple down the rows, its real signature, needs hue
  cycling (see limitations).

## Sea Sparkle (`seasparkle`): XS, jelly, night. Grade A-
- **Feature:** one big teal orb with the face (eye at 24 % of the face zone) and two little orbs at
  its shoulder that pulse out of phase. The glowing cores and rim specks are light organs.
- **Signature:** the little orbs pop bright in turn, the big one hops with squash and stretch, a
  rounded four-point twinkle star (a prop) spins in and out, then a wink.
- **Rounds:** 3: the first cluster, then the twinkle prop and a bigger core, then checking the
  jelly IoUs (combjelly 0.63, moonjelly 0.62).
- **Would improve:** the Day version is a soft teal, so the outline does the work, as the appendix
  says. The glow on Night is gentle. A bigger blur would help, but that lives in the shared
  renderer.

## Baby Kraken (`kraken`): legendary, chibi, drawn XL (★ override). Grade B+
- **Feature:** a three-point crown that is a light organ (glows gold on Night) on a round head.
  The two outer arms are held raised beside the head with the tips curled in, a "\o/" shape; the
  other arms splay low with their tips curled up. Pink belly and suckers.
- **Palette:** deep purple at L 0.49, as the R16 dark-identity rule in the appendix allows (≥ 0.45).
  Night ΔL is 0.32 thanks to the brighter rim for L < 0.5. Deviations: R27 (XL) and R16 (the
  validator's 0.55 lightness floor).
- **Nocturnal**, so it is never sleepy at night.
- **Signature:** the scary pose (every arm up, puffed to 1.05, smug face), then it can't hold it,
  giggles with a wobble, and blushes happy.
- **Rounds:** 5.
  1. Front arms clasped like the octopus pilot. IoU 0.85 against the sand dollar.
  2. Reworked the arms.
  3. The raised-arm layout, which makes it clearly not the octopus.
  4. Fixed the rotation signs; the scary pose now reads.
  5. Taller crown, then darkened the body for the rim.
- **Would improve:** octopus IoU is 0.68, under the limit, and the two look plainly different
  (crown, arms up, palette). I'd still like more margin, for example lower arms that splay more
  horizontally.

## Final silhouette numbers (24 px masks, centroid-aligned)
- **Highest, any pair involving my species:**

  | pair | IoU | limit |
  |---|---|---|
  | clownfish/cuttle | 0.77 | 0.80 |
  | boxcrab/sanddollar | 0.75 | 0.80 |
  | sanddollar/seasparkle | 0.75 | 0.80 |
  | cuttle/turtle | 0.74 | 0.80 |
  | kraken/sanddollar | 0.72 | 0.80 |
  | moonjelly/sanddollar | 0.72 | 0.80 |
  | combjelly/sanddollar | 0.71 | 0.80 |
  | combjelly/firefly | 0.69 | 0.70 |
  | kraken/octopus | 0.68 | 0.70 |

- **Jellies against each other:** combjelly/moonjelly 0.67, combjelly/seasparkle 0.63,
  moonjelly/seasparkle 0.62.

## Kit limitations hit
- **Eye shape:** there is no per-species pupil, so the cuttlefish's W pupil can't be drawn (the
  face rig owns the eyes).
- **Animated colour:** colour can't be animated. The comb jelly's rainbow ripple (hue cycling), the
  cuttlefish's colour-band ripple and the firefly's three flashes all need either a light-intensity
  channel or a pattern that moves inside its group's clip. I approximated them with props and body
  motion.
- **One light colour:** `light` is always the accent colour, so a species can't have an accent
  pattern and a differently coloured glow. The kraken uses gold for both crown and glow, and puts
  its pink suckers on the authored belly colour.
- **Props:** props are outlined like any fill and drawn outside the root transform. Sparkle props
  get an ink ring (fine for beads, heavy for tiny glints) and drift off the body when it moves.
- **Perf test:** `tests/perf/art.spec.ts` frame p95 is borderline (0.7–0.8 ms alone, 1.1–1.5 ms
  when it runs in parallel with the e2e workers on this busy machine). It passes with `--workers=1`
  and when run alone. Per-creature mean stays at 0.03–0.05 ms (budget 0.12).

## Round 3 (CRITIQUE-2 legendaries: kraken, seadragon, seahorse)

Picked up two interrupted WIPs: the kraken WIP was kept and pushed further. The seadragon WIP had
gone horizontal (a level pipefish with leaves); in the lineup it read as a leafy fish with a small
face, so I went back to main's upright drawing and applied the critique's numbers to it. Sheets:
`docs/media/art/{kraken,seadragon}.jpg`. Both pass the style guide, the R12 matrix (closest pairs
are elsewhere: cuttle/nautilus 0.77), the art-kit resting-face test, and have no self-crossing fill
subpaths (checked by flattening every fill part).

### Baby Kraken (`kraken`): B → **A-**
- **Scary pose at rest:** two arms raised over the head with the tips flourishing outward ("rawr").
  The locked silhouette is now a crowned monster with its arms up, not a crab or spider.
- **Tips up:** the upper side arms curl their tips up. The lower side arms ripple out and down with
  loose open hooks, so the skirt reads as tentacles rather than six crab feet.
- Crown 1.25× wider and taller (it reads in the 24 px mask), brow 11° (≤ 12°), fang grin,
  `neverSleepy`, XL frame-break on every side. Signature: puffs up into the scary pose (proud), can't
  hold it, giggles (happy), then shy.
- Rounds: (1) WIP as-is: raised arms good, the lower arms still crab feet, crown lost at 24 px;
  (2) re-curled the lower arms, made the crown `extra` and taller: the drawing grew and the tile
  clipped the arms; (3) crown back in the body box at −43, tips pulled inside the ±50 artboard.
- Reveal (`--reveal kraken`): big, breaks the card top; it reads as the present.

### Leafy Sea Dragon (`seadragon`): B → **A-**
- Olive-gold `#C9A53B` (off the seahorse's orange `#F2B93B` with red stripes), sea-green leaves with
  pale (white 45 %) veins in place of grey ink ribs, so the fronds look fresh, not scratched.
- **Leaves +30 %, seven fronds, 56 % of the silhouette** (measured on a 0.5-unit grid: leaf pixels
  not under the body ÷ all fill pixels; it was 41 %).
- Snout −20 % thickness (4.4/3.2 → 3.5/2.6). The tail now sweeps **back** (the seahorse curls
  forward into a spiral), with a leaf at the tip.
- Rest: `restExpression: 'proud'` stays, because the kit (CRITIQUE-2 NEW 1) shows it in the detail
  view only. Journal tiles rest eyes-open, as the critique asked and `art-kit.test.ts` requires.
- Feels bigger than M: the crown and tail fronds are `extra` and the tail sits higher, so the box
  went from 80×79 to 74×74. The kit scales it about 7 % up, and the leaves break the frame.
- Rounds: (1) +30 % fronds: the belly frond read as an arm holding lettuce; (2) split it into two
  fronds angled down along the belly, like a leafy skirt, and swapped to pale veins; (3) frame-break
  extras. Fill parts are at the 12 cap: the main and sister blades must stay in separate parts
  (WebKit), so a frond list costs 2 parts.

### Seahorse (`seahorse`): unchanged, A-
At 24 px and in the cast it's an orange S with red bands and a forward spiral tail. The dragon is
now an olive head on a green leaf mass with its tail swept back. They no longer twin on colour,
pose or silhouette, so I didn't touch the seahorse.

### Checks
`make check` green on each commit. `npm run build` OK. `tests/perf/art.spec.ts` passes. In
`tests/e2e/art.spec.ts` the Path2D parity passes for every species, but the silhouette pair
**cockle vs nautilus** fails (0.709 Chromium, 0.700 WebKit, limit 0.70). Neither is my species, and
the IoU of that pair doesn't depend on kraken or seadragon, so it's an issue on main.
