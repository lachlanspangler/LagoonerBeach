# Fleet artist 3: long and flat bodies

Nine species: sandeel, moray, gardeneel, seahorse, seadragon, flounder, stingray, manta, shrimp.
Final sheets are in `docs/media/art/<id>.jpg`. Every round below was rendered with
`scripts/art-sheet.ts` and looked at before the next change.

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
