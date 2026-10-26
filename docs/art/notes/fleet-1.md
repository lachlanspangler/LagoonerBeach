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
- Rounds: 6. (1) the false eye was big and on the fin, so it read as the real eye and the fish
  looked like it faced up-left; the real eye sat on the snout base. (2) shorter snout, eye moved
  back onto the disc, band behind it; the fins were swept back so the disc leaned like a sail.
  (3) fins brought upright and symmetric, thinner snout (it read as a duck beak), false eye moved
  onto the body. (4) the pectoral fin under the false eye made a second face; removed it (the
  ambient uses a soft breathe instead of a fin flutter). (5) against the full cast it was 0.71 vs
  the sunfish (same tall disc with fins): it now hovers nose-down at a 17° tilt, picking at the reef
  with its snout (dainty), 0.68 vs sunfish, 0.76 vs combjelly (cross-class limit 0.80). (6) the
  e2e "draws in every mode" test sampled the spin at its edge-on instant (a sliver of 221 px):
  the turn is now a quick 75 ms snap each way, which also reads snappier.
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

## grouper
- Size class: L. Feature: a front-heavy wedge resting nose-down (79 × 53): a massive blunt head and jowls
  narrowing to a thin tail root, a rounded fan tail, and a big jutting, downturned lower lip; tan
  saddle blotches on a lifted brown.
- Signature: the slow yawn: the lower lip (its own `jaw` group) drops 34° and swells while the head
  tips back and the face goes `happy` (open mouth), then it settles into heavy `sleepy` half-lids,
  its personality. Ambient: slow bob plus a breathe; the slowest fish in the batch.
- Rounds: 5. (1) a plump body with two lip ellipses: IoU 0.87 vs clownfish, and the lips read as a
  donut. (2) a stronger wedge and one jutting lower lip: 0.77. (3) taller forehead, thinner tail
  root, shorter dorsal: 0.74. (4) the whole fish flattened top-to-bottom (SY 0.74) into a long, low
  wedge: 0.68, and it finally looks "unbothered" rather than "plump". (5) a fatter, shorter lip (it
  read as a cigar) and a bigger yawn. (6) after rebasing on the full cast it hit the flounder
  (0.76, the flat oval): the wedge came back up (SY 0.86) and the grouper now rests nose-down at an
  18° tilt, chin toward the sand, which is both lazier and its own silhouette: 0.68 vs clownfish,
  0.67 vs cuttle, flounder off the list.
- Grade: B−. Still to improve: the lip still reads a little like something held in the mouth;
  clownfish (0.68) is the tightest margin in the batch.

## parrot
- Size class: M. Feature: a chunky body with a bumped, steep forehead over a big rounded beak
  (lighter belly tone, its own group) and a tall crescent tail whose two horns curve back; two pink
  stripes along the side, pink horn tips.
- Signature: the crunch: the beak chomps twice with a little nudge forward and a `happy` face, then
  a puff of three sand grains (prop) drifts down from the beak while it looks `proud`. Catch: a
  beak chomp and a tail flick.
- Rounds: 5. (1) chunky oval, dorsal + anal, small crescent: IoU 0.77 vs clownfish, 0.70 vs
  grouper. (2) taller horns: 0.73. (3) no dorsal/anal: clownfish fine but 0.71 vs minnow. (4) a
  bumphead forehead and a lower, bigger beak, which makes the front profile unique: 0.69–0.70.
  (5) taller horns, thinner tail root, removed the leftover fin-edge accent and moved the pectoral
  back: 0.69 / 0.68, and it reads as a happy bumphead.
- Grade: B. Still to improve: the crescent horns are thin; without a dorsal the back is a little
  bare; margins vs clownfish and grouper are tight (0.69 / 0.68).

## blenny
- Size class: S. Feature: a big blunt round head with two plump upright eyebrow tufts (cirri, own
  group), tapering like a tadpole into a slim body with one thin dorsal ribbon and a little round
  tail; propped nose-up at 20° (looking at you: nosy). Five darker olive spots.
- Signature: the peek: it ducks 34 units down out of the tile, hangs there, pops back up
  `surprised`, waggles its eyebrows (`waveTrack` on the tufts) `happy`, and ends on a wink. The
  tufts sway in the ambient idle too. Catch: an eyebrow waggle and a squash.
- Rounds: 4. (1) level tadpole with tufts: IoU 0.80 vs the flounder (its eye turrets sit where
  the tufts do). (2) a 12° nose-up prop: 0.76. (3) a stronger taper and a thinner dorsal (the
  ribbon was filling the back in): 0.71. (4) 20° nose-up: 0.65 vs flounder, 0.68 vs limpet
  (cross-class); the pectoral moved back (it read as a second mouth by the real one).
- Grade: B+. Still to improve: the tufts read a little like bunny ears (charming, not quite
  "eyebrows"); a fringe tip on each would say cirri.

## lanternfish
- Size class: S. Feature: a chibi fish, the head is half of it, with the cast's biggest eye
  (24 % of the face zone), a short tapering body and a narrow forked tail; it swims steeply
  nose-up at 45° (lanternfish rise to the surface every night) with a row of six glowing
  photophores along the lower flank. `nocturnal: true` (awake at night, sleepy by day).
- Signature: the fairy lights: three pairs of photophore flashes (props) pop on in sequence, front
  to back, with a `surprised` face, then a little stretch and a `proud` look. Catch: front and back
  flashes plus a tail flurry.
- Rounds: 5. (1) level, photophores as `light` fill dots in three groups: the inked dots on the
  belly edge read as a toothy grin, and IoU 0.72 vs clownfish, 0.72 vs flounder. (2) a 28° rise and
  dots moved up: clears the round fish, but the tilted fork read as a kicking leg. (3) photophores
  became glow patterns (no outline) and the blink became prop flashes; 22–36° all hit the blenny
  (0.70, the other nose-up round head). (4) 45°: 0.62 vs blenny; a narrow fork that reads as one
  tail; the pectoral removed (it read as a mouth). (5) the flashes now scale from 0 (they were
  all visible for the whole performance).
- Grade: B. Still to improve: the flash props get the ink outline like every fill, so they read as
  beads more than light; a glow-only prop would be nicer (kit limitation in the report).

## Batch summary
- Within the fish batch (+ clownfish) the closest pairs are clownfish/parrot 0.69, clownfish/grouper
  0.68, barracuda/minnow 0.66, grouper/parrot 0.66; against the whole 47-species cast the closest
  fish-class pair is barracuda/flounder 0.70 and the closest cross-class one butterfly/combjelly
  0.76.
- Five fish separate by pose rather than outline (wrasse −14°, blenny −20°, lanternfish −45° nose-up;
  grouper +18°, butterfly +17° nose-down): with eleven-plus profile fish the centroid-aligned mask
  test leaves little room for level ovals, and each tilt was given a story (busy, nosy, rising at
  night, resting on the sand, picking at coral).
- Kit limitations hit: patterns clip to their own group's silhouette, so a light organ can't
  blink on its own without being an outlined fill (lanternfish uses prop flashes, which get the ink
  outline); `underbite` teeth scale with the R8-capped mouth width (≈ 1 px at tile size); no way to
  author a species' resting expression (the grouper's "half-lid idle" only shows at the end of its
  yawn and in the R32 sleepy state).

## Redo round (CRITIQUE-1 B notes: damsel, parrot, lionfish)

### damsel
- Round 1 (review of the previous artist's WIP): accent → `#9DB8FF`, anal fin deepened, pectoral
  shrunk to a 4.4 × 2.4 ellipse. Kept the palette and the deeper anal; the tiny outlined ellipse
  read as an `o` mouth under the eye at 54 px, and the fin tips were invisible.
- Round 2: pectoral as a swept-back capsule, tips enlarged. The capsule was a bar next to the eye,
  and the flat-topped dorsal/anal made the body a box with a round nose.
- Round 3: dorsal and anal now sweep back into rounded trailing points past the tail root, tips
  `#9DB8FF` on both trailing points and both swallow-tail lobes; pectoral smaller (≈ −30 %), in the
  belly tone, tipped back behind the gill line. The mouth stays `smile`, and the kit already falls
  back from `open`. Closest pair: damsel/sanddollar 0.74 (cross-class), damsel/lionfish 0.67 and
  butterfly/damsel 0.66 within the fish class. Grade A−: the brave puff-and-charge signature reads
  well; the deep oval is a little soft next to the clownfish.

### parrot
- Round 1: domed forehead + snout + small mint beak = beluga (the critique was right). Rebuilt as a
  chunky oval with a steep, blunt forehead running straight into a cream `#F5F1E6` rounded wedge,
  a 3-unit ink parting line that turns up at the back (it doubles as the smile; the rig mouth hides
  under the beak), and the upper bill overhanging the lower. Stripes `#F06AA0`, 5 units, two.
- Round 2: the outlined pectoral (between the stripes) read as a pill-shaped second mouth/eye on
  Night. It is now cream and unoutlined, low behind the gill; the beak front is blunter, the body
  is a touch shallower, and the eye went up to 9.6 u.
- Round 3: chomp 12° → 18° so the double crunch reads in the frames. Closest: limpet/parrot 0.69
  (cross-class), clownfish/parrot 0.67 (fish). Grade A−: the beak and the crescent tail read at
  24 px; the body is still a little ball-like (the 84-unit box is shared with a long beak + tail).

### lionfish
- Round 1: body +25 % (snout 36, ±22), five spines radiating ±60° from one hub, eye 22 % (9.9 u).
  No longer a hand, but it became a striped ball with bristles; at 24 px it was a spider.
- Round 2: webbing between the spines and the pectoral rays. The pectoral fan read as a paw with
  five toes; the crown web was hidden behind the body.
- Round 3: the pectoral became one scalloped wing (a blob through the tips and the notches) with
  cream ray lines and tips, sweeping back and down rather than down; the crown web was dropped
  (spine gaps keep the mask distinct). Then I tuned it against the full cast:
  lionfish/sanddollar went 0.80 → 0.73, clownfish/lionfish 0.75 → 0.68, lionfish/puffer
  0.70 → 0.67 (shorter body + tail, longer spines, a wing reaching past the tail root). Bands: four
  5-unit cream bands behind the eye, plus the cream tail band (five in total). Body = 52 % of the
  silhouette area. Grade A−: fabulous at 54 px, and the fan-open signature works; at 24 px the
  spines are still thin.
- All three: lint ✓, `tests/unit/art.test.ts` green, e2e + perf art specs green (Chromium + WebKit).

## Round 3 (CRITIQUE-2: blenny fix, grouper C, damsel, barracuda, butterfly, wrasse, sandeel)

IoU numbers are the unit rasteriser; the browser masks (tests/e2e/art.spec.ts) run about +0.015.

### blenny
- Main failed R12 on blenny/flounder 0.713. Kept the deep peduncle and the branched cirri; made the
  cirri taller and splayed wider (antlers, not ears), the fan tail taller (±15) and the perch fin
  longer. blenny/flounder 0.678. Grade B+/A−.

### grouper
- The previous artist's WIP (coral `#C0674A`, `#BFE6F7` spots, small lips, deep oval) failed R12 at
  clownfish 0.81: every deep oval with a fan tail lands on the clownfish/boxfish. A wedge fixes the
  IoU but goes back to the critique's trumpet. What works: a 70 u helmet head on a thick, level trunk
  (tail root 31 u = 45 % of depth), a long low dorsal, a broad fan tail (±23), and a recessed upper
  and lower snout so the pout lips are the front. I tuned it with a small parameter search against
  every fish mask. Lips sit on the snout and stay inside 0.9 eye widths; the pectoral has no outline
  (the outlined one read as a second mouth); the gill line read as a scar, so it's gone.
- Rest face: the critique wanted `drowsy` only in the detail view, but `tests/unit/art-kit.test.ts`
  (shared) requires `restExpression: 'drowsy'` on the tile. I kept drowsy and dropped the blush,
  which is what made it read tipsy. Lead: please decide.
- Closest: clownfish 0.694 (browser 0.689), boxfish 0.683. Grade B+/A−: reads as "big boss head"
  at 24 px; a bit helmet-like at 100 %.

### damsel
- Pectoral −35 %, unoutlined, flat on the flank and swept back. Dorsal/anal trailing points are
  shorter, so they no longer run parallel to the tail lobes (the four-pronged X). Eye 9.2 → 10.4.
  Resting mouth is a flat little frown (brave); `pout` drew a kissy `o`. Closest: lionfish 0.679.
  Grade A−.

### barracuda
- The round melon became a pointed upper snout. The jaw juts about 6 u past it, and the two white
  teeth are taller (5.4 u) and sit on the jaw tip. Chevrons moved back off the face. Closest:
  wrasse 0.681 (browser 0.687). Grade A−.

### butterfly
- Dorsal hook and pennant −40 %, in the body yellow with the cream margin. The false eye is a 7 u
  dark dot in a cream ring on the rear dorsal. The spin snaps from x-scale 0.15 to −0.15, so it is
  never edge-on. The tweezer snout is longer and thicker, with the smile at its tip; the fan tail is
  bigger. Browser butterfly/puffer was 0.701 and is now 0.681. Grade A−.

### wrasse
- The stripe starts 3 u behind the eye at 4 u, arcs with the midline, reaches 10 u at the tail root
  and fans through the tail fin. It is now a navy accent `#23528F`, not ink, so R18E allows it near
  the eye. The front half moved to the belly role. Wider spa smile. Closest: barracuda 0.681.
  Grade A−.

### sandeel
- The jaw juts 6 u past a shorter snout. Belly `#E8ECEF`. The back is `#DCC58A`: the critique's
  `#D8C79A` is chroma 0.06 and fails R16S, so I nudged it to 0.08. The blue stripe is now a darker
  sand band `#A08A50`, and the head is slimmer (it read as a dolphin). The body is +0.4 u because
  the e2e "every species draws" coverage floor needs > 1280 px. Grade A−/B+.

### cockle (lead's extra, NOT done)
- Browser cockle/nautilus is 0.709 Chromium / 0.700 WebKit, which fails e2e. A trial of
  `OPEN = -48` (back valve tipped further) plus `S = 0.785` (to stay inside 84) took unit
  cockle/nautilus from 0.692 to 0.660 and cockle/sanddollar to 0.663. The permission classifier
  blocked further edits to another species' file, so I reverted it. Needs a go-ahead.
