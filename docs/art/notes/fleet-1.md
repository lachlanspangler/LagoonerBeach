# Fleet artist 1: fish batch notes

Species: minnow, blenny, damsel, parrot, grouper, barracuda, lanternfish, butterfly, wrasse, lionfish.
Reference: the clownfish pilot (not edited). Silhouette plan, from the research's fish
disambiguation note: every fish gets a different combination of body aspect, tail type and fin
profile, so the centroid-aligned 24 px masks stay apart (R12 limit < 0.70 within the fish class).

## minnow
- Size class: S. Feature: slim torpedo (≈ 1.9 : 1 with the tail) with an oversized, deeply forked
  V tail; one lagoon-blue lateral stripe from behind the eye.
- Signature: a twitchy dart: 9 units forward with a stretch, a startled `surprised` face,
  glides back past its start, then settles `happy`. Catch hook: fast tail flurry with a squash.
- Rounds: 3. (1) the fork was two capsules: read as scissors or a propeller, and the stripe ran
  through the eye. (2) one forked fan blob with a rounded notch, stripe starts behind the eye;
  box 85 wide, so the snout came in. (3) eye moved back to 31 % (validator), dorsal lowered (it
  read as a shark fin), pectoral moved behind the blush (it read as a second mouth).
- Grade: B+. Still to improve: the pectoral's outline is a little busy at 54 px; the silver body
  is pale on the Day tile, carried by the outline and stripe.

## barracuda
- Size class: L. Feature: a long needle (84 × 36 with fins, ≈ 3 : 1 for the body alone) with a stepped, jutting underbite
  chin, a crisp forked tail and six thin chevrons on the back (R18 bands).
- Signature: lunges 10 units with a stretch (`surprised`), glides back, then tilts its nose up
  6° with a smug `proud` face: "I meant to do that". Catch hook: a stretch and a tail sweep.
- Rounds: 4. (1) the chevrons were heavy and dense (read as a tiger), box 87 wide. (2) chevrons
  thinner, lighter and kept to the back; bigger eye (8) in a taller face zone. (3) a real step
  under the snout so the underbite reads in the silhouette, not only in the mouth. (4) the test's
  "mask is non-trivial" floor (> 25 % of the 24 px square) failed at 3 : 1, so the body got
  thicker (±12.5) and the dorsal/anal fins taller; it still reads as the needle of the cast.
- Grade: B. Still to improve: the `underbite` teeth scale with the mouth width, which R8 caps at
  0.9 × eye width, so the two teeth are ≈ 1 px at tile size (kit limitation, noted in the report).

## wrasse
- Size class: S. Feature: a slim cigar that always swims nose-up at a jaunty 14° tilt, with a
  rounded fan tail (no fork) and one bold ink stripe from behind the eye into the tail.
- Signature: the "scrub": a fast six-beat wiggle with a `happy` face, then a little cluster of
  bubble sparkles (prop) rises off its nose while it looks `proud` of the job. Catch: a wiggle
  and a squash.
- Rounds: 4. (1) a level cigar with a long low dorsal: IoU 0.79 vs barracuda and 0.72 vs minnow:
  three level elongated fish can't separate on aspect alone. (2) an arched spine with the tail
  tipped up: 0.67, but it read as a whale or a plane. (3) finless, gentler arch: 0.69, still a
  blimp. (4) a straight cigar with the whole fish tilted nose-up: 0.60 / 0.59, and it reads as busy
  and on its way somewhere, which is the personality. Smaller pectoral, stripe starts later.
- Grade: B. Still to improve: the tilt makes it sit a little high-right in the tile; a dorsal
  ribbon would add charm but pushed it back toward the barracuda.
