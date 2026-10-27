# Fleet artist 3: long and flat bodies

Nine species: sandeel, moray, gardeneel, seahorse, seadragon, flounder, stingray, manta, shrimp.
Final sheets are in `docs/media/art/<id>.jpg`. Every round below was rendered with
`scripts/art-sheet.ts` and looked at before the next change.

## Redo round (after CRITIQUE-1 and the kit pass)
CRITIQUE-1 graded this batch: sandeel C, moray C, seadragon C, flounder C; gardeneel, seahorse,
stingray, manta and shrimp B. All nine are now lint-clean (LINT.md ✓, no new deviations). They were
judged on the mint-tile sheets and in the whole-cast lineup, after rebasing on the full cast.

| id | was | now (self) | what changed |
|---|---|---|---|
| sandeel | C | A− | A level needle (84 × 24) with a big round head, a jaw jutting past the snout and a silver belly under sand `#D9C489`. Three seamless segments carry a travelling wave. Eye 9.4 u. |
| moray | C | A− | It leans out of a dark hole in a round rock (rock behind, front lip in front, both hidden in the leap). Huge head (1.4× the body), wide grin with two teeth, heavy brow, 5 yellow spots in 3 sizes. Body lifted to `#668A42` for the Night contrast check. |
| gardeneel | B | A | Head 1.8× the stalk, eye 9.6 u (24 %), upright. Warm cream `#EED595` sits off the mint tile. The mound is hidden in the leap. |
| seahorse | B | A− | Dorsal fan shrunk ~30 % and moved low (no ear), snout +15 %, eye 10.4 u. |
| flounder | C | A− | Two big eye turrets on the top edge, the back one 8 u higher, on their own seamless `eyes` layer so the pancake (2.4 : 1) rests level. `#B78A5C` body, spots kept off the face, pale rim, tail stub. |
| stingray | B | A | Cream rim along the leading edge instead of the belly "stain". Body `#7C9FD0` (C 0.08) reads on mint. |
| manta | B | A− | Wingspan ≈ 1.65× the body, a round head with two forward horns, wingtips breaking the XL frame by 2.3 px, slate `#5E82B5`. |
| shrimp | B | A | Level curl. Eye 11.2 u on the front-top of the head, clear of the curl. Antennae −20 %. |
| seadragon | C | A− | Upright S with a seahorse-sized head (eye 10.2 u), a small pipette snout and six big forked fronds at the outline (none over the face). Gold `#E0B84A`, leaves `#8AB17D`, rests `proud`, fronds sway in two lagging layers, then a bow. |

Lessons for the kit and fleet:
- **Self-crossing paths fill differently on WebKit.** A blob with two close points (a leaf's
  narrow stalk) or a capsule and an ellipse joined into one path made WebKit's `Path2D` fill
  differently from the rasteriser (mask parity 8.5–9.4 %, limit 8 %). Use one root point per leaf,
  and keep overlapping shapes as separate parts.
- **The e2e "draws something" floor still rejects true needles.** It needs more than 20 % of an 80 px
  box drawn, while the unit mask floor is now needle-friendly. The 84 × 20 needle the critique asked
  for drew 1206 px against a floor of 1280, so the sand eel is 84 × 24.
- **There is no way to scale a legendary up within its size class.** The critique's "1.05 bump over
  M" for the seadragon couldn't be authored. Wider fronds fill the tile instead.
- **A proud resting face reads as asleep at 54 px.** That's the critique's ask for the seadragon, but
  it's worth a second look in the lineup.

## Silhouettes (R12, 24 px masks, at hand-in, against the 5 pilots and each other)
- Eels (long class, limit 0.70): moray/sandeel 0.51, gardeneel/moray 0.19, gardeneel/sandeel 0.17.
- Seahorse/seadragon (long class): 0.38.
- Stingray/manta (wing class, limit 0.70): 0.65.
- Long-class pairs with the shrimp: moray 0.37, seahorse 0.29, gardeneel 0.24, sandeel 0.39, seadragon 0.40.
- Closest overall: clownfish/flounder 0.65 (fish class, limit 0.70), clownfish/manta 0.67 (limit 0.80),
  manta/turtle 0.64, flounder/turtle 0.64.

## sandeel (Sand Eel)
- Size M. Feature: a long slim body in a quick double wave, an oversized round head, a pointed jutting
  lower jaw and a tiny forked tail.
- Signature: dives tail-first into the floor (rotates −72°, sinks 40 units), pops back up past rest,
  then happy and a wink.
- Rounds: 4. R1 was a straight 4 : 1 sausage that read as a sardine. R2 added a gentle S, but the
  masks test failed: area 81 against a floor of 144, because a thin needle covers too little of its
  24 px box. R3/R4 deepened the wave and thickened it (area 147), and added a low dorsal fin.
- Grade: B+. It's charming, more "zippy little eel" than "needle".
- Next time: the jaw jut is lost at 24 px. I'd try a slimmer body with a bigger burrowing-sand prop,
  if the area floor allowed it.

## moray (Moray Eel, rare)
- Size L. Feature: a thick sinuous tube rising like a "~" into a big blunt raised head, a wide grin
  with two rounded teeth (R8 exception), a back frill, and a sloping ink brow (grumpy brow, sunny grin).
- Signature: blink, then the head lifts with squash/stretch and the grin opens wide (happy), then a wink.
- Rounds: 4. R1 was a fat pickle with an invisible frill and the grin off the edge of the head. R2
  became the rising S with a bigger head. R3 merged everything into one group, because a separate
  tail layer drew an outline seam across the tube. R4 tapered the body and made the brow heavier.
- Grade: B. It reads as a friendly spotted eel. "Grumpy" only shows at detail size.
- Next time: a more angular moray head and a deeper jaw. The grin is small at 54 px.

## gardeneel (Garden Eel)
- Size M. Feature: a thin upright stalk rising out of a wide sand mound (part of the silhouette),
  hooked into a round head like a periscope.
- Signature: sinks behind the mound (the mound group is drawn in front; sy 0.16 about the stalk
  base), peeks back up surprised, then happy.
- Rounds: 3. R1 had a box of 88, and a two-ellipse head-and-snout that read as a lump. R2 used one
  smooth head blob and lowered the eye. R3 fixed the sweet blush and checked the motion.
- Grade: A−. It's the most readable silhouette of the batch.
- Leap: swimmers point along the arc, so it flies with its mound attached. That's funny, but odd.

## seahorse
- Size S. Feature: an S of big round head with a coronet bump and a stubby snout, a forward chest,
  and a tail curled into a spiral. Three orange bands.
- Ambient: bob plus a fast 0.12 s dorsal flutter. Signature: the dorsal flutters, the tail curls
  tighter, and a bubble prop rises from the snout. Proud face, then a wink.
- Rounds: 3. R1's snout was too long (duck bill) and the coronet was invisible. R2 gave a shorter
  snout, a bigger coronet and a softer belly patch, and dropped one tail stripe. R3 checked the
  expressions and night.
- Grade: A−. The bands are slightly busy at 54 px.

## seadragon (Leafy Sea Dragon, legendary)
- Size M. Feature: a seahorse laid level on a long pipette snout, wrapped in seven forked leaf
  fronds: a back crown of three, two belly fronds that trail backwards, and two on the tail.
- Fronds sit in two layers (back and front) that sway with 150 ms lag. Signature: the current sways
  the fronds front and back in overlapping action, then it bows, proud, and winks.
- Rounds: 5. R1 had green-bean ellipses and a duck snout. R2's leaf blades were too small and read as
  a puppy with legs. R3 slimmed the body and turned the belly leaves backwards. R4 split each leaf into
  two forked blades, which gave the leafy look. R5 made the fronds bigger.
- Grade: B+. It reads as a leafy dragon and is clearly not the seahorse, but it isn't yet "wow".
- Next time: translucent or lighter frond tips, and a curl at the tail tip. The flat leaf green with
  a heavy ink outline is the limit (see the kit notes below).

## flounder
- Size M. Feature: a wide flat oval (about 2 : 1) in a scalloped pale rim fin, with both eyes on
  turrets along the top edge, one higher (R7 deviation: the stacked eyes are the joke). It has a fan
  tail and no round body or spines, so it never reads as a puffer.
- Signature: the eyes glance down (shy), then surprised, then it flops flat (squash 1.1 / 0.85) and winks.
- Rounds: 3. R1's IoU against the clownfish was 0.77 (fish class limit 0.70). R2 flattened the body and
  raised the turrets (0.65). R3 scalloped the rim fin, because a plain ellipse rim read as a pie dish.
- Grade: A−. It's frog-eyed and wry.

## stingray
- Size L. Feature: a plump rounded kite seen from above with a long thin whip tail. The tail counts
  in the body box, so the tile doesn't crop it. Pale spots, a white belly on the wing edge, and a
  face on the disc (two eyes, front: true).
- Signature: a forward glide with a wing-ripple shimmy and a tail flick, with an aloof proud face.
- Rounds: 3. R1 was a near-circle: IoU 0.85 against the sand dollar (limit 0.80) and a cropped tail.
  R2 made a pointier kite, but then it collided with the manta (0.69). R3 settled on a rounder kite
  with the tail in the box (manta 0.65, sand dollar 0.53).
- Grade: A−.

## manta (Manta Ray, epic)
- Size XL. Feature: a tall swept-back chevron of rounded wings, two short curled head fins, and a stub
  tail. The dark identity is lifted per R16 to slate `#6681A6` (L 0.60, Night ΔL 0.32), with a white
  belly on the wing edges and white shoulder patches.
- Ambient: the wings flap in opposition and the tail lags. Signature: it waves the top wingtip back
  (three swings), happy, then winks.
- Rounds: 3. R1's long sausage body and forward "arms" read as a plane or bat. R2 built a broad
  diamond body with short forward horns curling in. R3 used thicker, rounder lobe tips.
- Grade: A−. It's majestic and friendly. The wing/body layer seam reads as a body ridge.

## shrimp (Shore Shrimp)
- Size XS. Feature: a plump C-curl comma with a big round head, a fan tail tucked under, two long
  filled antennae (extra, 5 units thick) and four cream radial bands. The eye is 24 % of the face
  zone, and blushInk is on (pink body).
- Signature: the backward flick. The tail snaps, it recoils 8 units, surprised, then it grins.
- Rounds: 3. R1 had three legs under the chin that read as teeth. R2 moved two legs back under the
  curl. R3 checked night and the XS tile.
- Grade: A−.

## Kit limitations hit
1. **Travelling waves on eels.** Groups have no hierarchy and each group is outlined separately, so
   splitting a tube into segments draws an outline seam across the body. The moray is one group, and
   the sand eel only gets a tail wag behind its front body. A real spine wave (R23 "Eel/long") needs
   either chained groups or a per-frame path bend.
2. **The mask-area floor versus "very long thin needle".** The test needs 144 px of the 24 px box, so
   a needle-thin eel fails. The sand eel became a deeper wave.
3. **Leap orientation.** `long` swimmers point along the arc, so the garden eel leaps with its mound
   attached. A per-species "lean like a non-swimmer" option would help (garden eel, maybe flounder).
4. **Two-eye spacing is measured in x only.** A ray from above with its head to the right would
   naturally have its eyes stacked vertically. The rays use a face on the disc (like the sand dollar).
   The flounder needed an R7 deviation for its stacked eyes.
5. **Fill colours.** Fronds and fins can't be translucent or lighter at the tips. The seadragon's
   leaves use the `belly` role as a third authored colour (leaf green), so the accent stays free for
   the stripes.

## Round 5 (CRITIQUE-4)
Exemplars checked: whaleshark, octopus, clownfish. Sheets in `docs/media/art/<id>.jpg`.

### seadragon (legendary, B+ → redo)
- R1: laid the dragon level (a gently arched trunk drifting right) to kill the upright "kiwi on legs":
  head + a 1.0 × head-length tube snout (5 u, 3 u flared mouth), emerald `#3FAE6A`, eight three-pronged
  fronds. Read as a spiky hedgehog: the prongs were spines, the fronds overlapped into a hedge, the
  bands were zebra, the box was 87 u.
- R2: seven stalked leaves (crest, neck, back, belly, three on the tail), all sweeping back so none
  hangs straight down like a leg; two body bands + one tail band; tail fronds `extra`; box 82 u. Read as
  a seadragon, but the round paddles still made a gecko's feet.
- R3: leaves got two rounded side lobes and a round tip (lettuce, not paddles), dark veins (ink 65 %
  ≈ `#2F6B45`), the tail flattened, bands 4 u (R18W). R4: softer lobe notches, a pink blush (the
  default blush on emerald mixed to a grey eye-bag), tail shortened so the box is 79 u (fuller tile).
- Eye 12 u, `neverSleepy` (a legendary is never found asleep; detail views open-eyed on both themes).
  Signature: the current reaches each leaf group in turn (crest, belly, back, tail; ±15°, staggered
  0.08 s), then a royal bow, `proud`, a wink. Golden: gold with cream leaves, reads.
- Cold read: "a leafy sea dragon / pipefish wearing leaves" — no longer a bird. Still small in the
  tile at M fill; the 1.25 tile scale (other agent) is what it needs. Grade: A− (A with the scale).
- **Reveal (filmstrip, no reveal code edited):** at 1.7 s and 2.1 s it is still eyes-closed `happy`
  (catch hook face) → the reveal must settle to `idle` (open eyes) by 1.7 s. The card art box is
  square, so a horizontal legendary renders small on the card (≈ 40 % of its width): it needs a
  wider art box like the kraken's, or the 1.25 scale applied there too. The Continue button still
  looks disabled (muted blue-grey) on the card.

### seahorse (A−)
- Tangerine `#F29A3B`, stripes `#CF5826`: the critique's `#D9622B` is ΔL 0.13 (R16A error < 0.15), so
  nudged 0.02 darker. Golden (gold + cream stripes) now clearly differs from the base and the
  goldturtle. 2 rounds. Grade: A.

### urchin (A−)
- Berry `#B0589A` (off the kraken), pale pink face patch `#E3A6CF`, spine bases `#F2BEDF`. Reads on
  both themes (Night ΔL 0.32). Grade: A.

### moray (A−)
- 4 u light lip (white line, 85 %) around the hole: the opening reads as a burrow at 24 px.
- **Kit option needed:** the golden rock can't stay grey `#8E8A80`. The rock is `white` under an ink
  wash, and golden swaps the ink to golden brown, so it goes tan. It needs a part colour exempt from
  the golden remap (e.g. `Part.fixed: '#8E8A80'` or `Group.golden: false`). Grade: A− until then.

### barracuda (A−)
- White belly band `#EEF2F5` along 70 % (drawn over the bars, which now stop above it), black-tipped
  tail lobes (derived ink at 88 % ≈ `#2B3440`), eye 10 u (zone 42 u keeps 24 %). Grade: A.

### wrasse (A−)
- Snout tapers over the front 15 %; the caudal is a true round fan 1.2 × (the root moved forward 2 u
  so the box stays 84 u); body 1 u plumper; eye + stripe start back 2 u (eye position, R18E).
- The first fan had pointed lobe tips: the e2e Path2D/rasteriser area parity at 24 px went to 0.089
  (limit 0.08). Rounded fan → 0.053. Grade: A.
