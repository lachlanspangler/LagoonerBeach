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

## butterfly
- Size class: M. Feature: a disc taller than it is long (78 × 80, tall soft dorsal and anal fins),
  a thin tweezer snout, a small rounded tail; a dark band just behind the real eye and a
  white-ringed false eye-spot on the back of the body.
- Signature: the trick: it spins round (sx flips to −1) to show the false eye from the other
  side, hangs there `happy`, spins back and winks with the real eye. Catch: the default wiggle.
- Rounds: 4. (1) the false eye was big and on the fin, so it read as the real eye and the fish
  looked like it faced up-left; the real eye sat on the snout base. (2) shorter snout, eye moved
  back onto the disc, band behind it; the fins were swept back so the disc leaned like a sail.
  (3) fins brought upright and symmetric, thinner snout (it read as a duck beak), false eye moved
  onto the body. (4) the pectoral fin under the false eye made a second face; removed it (the
  ambient uses a soft breathe instead of a fin flutter).
- Grade: B. Still to improve: the disc outline is a little lumpy at the upper back; the false eye
  could be a touch smaller so the joke lands only on second look.

## damsel
- Size class: S. Feature: a short, deep body (deeper than the clownfish, 74 × 69 overall) with
  an upright dorsal sail, chest out, and a deep V swallow tail with splayed lobes; pale-blue tips
  on the tail lobes and the sail.
- Signature: the tiny defender: puffs up 1.1× with a `proud` face, tips its chin up, charges
  6 units with a tail flurry, then settles back `happy`. Catch hook: a proud puff.
- Rounds: 5. (1) a normal-length oval with a short fork: IoU 0.79 vs clownfish, and the dorsal
  read as a hump. (2) longer lobes and trailing fins: 0.72. (3) a 12° nose-up stance plus a
  front-to-back squeeze: IoU fine but the tail rotated into a single "arm" (it looked like a
  penguin). (4) back to a plain grid: a body that is short and deep by construction plus a V tail
  splayed at ~40°: 0.63 vs clownfish, and it reads as a stocky little fish. (5) a taller sail
  and bigger accent tips so the upright posture shows.
- Grade: B. Still to improve: the sail and anal fin merge into the body in the same blue (no
  interior line); a slightly lighter fin colour would help but costs the third authored colour.

## lionfish
- Size class: M. Feature: a small striped body inside a huge fan: five plump dorsal spines
  radiating up and five pectoral rays fanning down and back, all filled tapered capsules with
  round cream tips (R3: the danger is played as fabulous). The gaps between the rays are its 24 px
  signature; four thin cream bands on the body.
- Signature: the peacock: anticipation (everything tucks), then the fan swings open and
  scales up 1.1×, the spines rise 1.12×, the chin tips up 6° and it holds a `proud` face. The fan
  and spines also sway gently, phase-lagged, in the ambient idle. Catch: a smaller fan-flash, `proud`.
- Rounds: 4. (1) too tall (91 units). (2) shortened rays; the pectoral rays sat in front of the
  body from one point and read as a hand clutching the fish, covering the face. (3) the fan moved
  behind the body and spread over 100°; the bottom rays read as legs. (4) the fan now points back
  (180°–100°), and the bands got thinner and more numerous so it doesn't read as a red clownfish.
- Grade: B+. Still to improve: at 24 px it can read as a little sea urchin or bug; a translucent
  membrane between rays would say "fin", but it would fill the gaps that make the silhouette.
