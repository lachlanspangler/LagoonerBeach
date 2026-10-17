# Fleet artist 5 — big animals and legends

Species: hammerhead, dolphin, whaleshark, angler, otter, goldturtle. Sheets in `docs/media/art/<id>.jpg`.

## hammerhead (epic) — XL, shark
- **Feature (R10):** a wide T-shaped hammer across the front, standing up like a face plate, with
  the eye on its top lobe and a smile under it; tall rounded dorsal; crescent shark tail.
- **Signature:** scans: the hammer swings one way, then the other (it narrows, as if turning), with
  `surprised` wide eyes, then a pleased nod and `happy`. Catch: tail thrash plus a hammer wag.
- **Rounds (3):**
  1. Hammer as a straight capsule pill: read as a "battery" stuck to the snout, with a gap at the
     top, and a belly dot at its foot that looked like a second eye.
  2. Hammer as a crescent blob fused with the snout: one piece now, but too thick, so it read as a
     droopy dog ear and the T vanished in the silhouette.
  3. A narrow bar again, joined to a body that tapers into a neck so the T reads at 24 px; the bar
     made wider so the eye (now 9 units, "wide-eyed") and the smile both sit on it, so the hammer *is*
     the face. Box 83 × 64, IoU vs clownfish 0.66 (limit 0.70).
- **Deviation:** R7 (eye at the hammer tip, per the appendix, not 34 % back along the body).
- **Self-grade:** B+. The silhouette is unmistakable and the face is friendly.
- **Would improve:** the bar is still a bit stiff and flat-fronted; a second, far eye on the lower
  lobe (the rig only supports one profile eye) would sell "sees every direction" much better.

## dolphin (rare) — XL, shark
- **Feature (R10):** a plump arched body with a round melon forehead and a short stubby beak, a
  low hooked dorsal swept back (a shark's stands tall), whale-style flukes, white belly to the chin.
- **Signature:** a spin-leap inside the tile: dip, hop 12 units with a full 360° roll, splash-settle,
  `happy` throughout. Catch: fluke thrash and a flipper flap.
- **Rounds (3):**
  1. Read as a shark: tall triangular dorsal, thin needle beak, body slanting nose-down, and the
     flipper sitting right under the eye.
  2. Round melon and stubby beak, level body, flipper moved back behind the eye, bigger eye (8),
     whale-style fluke lobes. Now unmistakably a dolphin, and sweet.
  3. Dorsal tip swept further back and lower so its outline differs from the hammerhead's.
- **Self-grade:** A-. Joyful and readable; the spin is the most fun signature in my set.
- **Would improve:** the permanent smile is only the rig's small `smile` (capped at 0.9 × eye
  width); a longer mouth crease along the beak would sell "permanent smile" better.

## whaleshark (legendary) — XXL, shark
- **Feature (R10):** a flat, blunt, front-heavy head with a long gentle mouth line across the
  front, an authored grid of 9 white spots, small dorsal, big crescent tail.
- **Crop (R27/R28):** the back half of the body and the tail are `extra` parts, so the body box is
  the front 73 units only; tiles frame the big head and the tail runs off the left edge. It doesn't
  fit, on purpose, and the leap is a breach bigger than the lagoon.
- **Dark identity (R16):** `#3E5A73` lifted to `#5F7F9C` (L 0.58; the validator's floor is 0.55, and
  the Night check needs ≥ 0.30 ΔL), white belly, white spots.
- **Signature:** three plankton specks (prop) drift into the mouth during an enormous slow blink,
  then a smug little `proud` smile and a contented swallow (sy). Catch: a heavy tail sweep.
- **Rounds (4):**
  1. A generic deep fish oval: IoU 0.76 vs the dolphin and 0.72 vs clownfish (fail); the mouth sat on
     the tile edge and the tile cropped head and tail equally.
  2. Flat near-vertical front face and a long, lower body: passes (0.68) but still a "big fish".
  3. Front half as the only non-extra part: the tile showed nothing but a head, and the leap was
     enormous. Too far.
  4. Non-extra part extended back to x −26 (box 73 units): head, spots, fin and dorsal all in
     frame, tail cropped. Pectoral made smaller and moved behind the face. Closest: clownfish 0.65.
- **Self-grade:** A-. It feels big and kind; the crop is the joke.
- **Would improve:** the detail view still clips the front 3 units (centred crop), so the wide
  mouth line is partly at the tile edge; a kit option to anchor the XXL crop to the head would fix it.

## angler (epic, night) — L, fish
- **Feature (R10):** one big round head-body (ellipse, the dominant primitive), a crescent underbite
  jaw jutting past the upper lip with three rounded white baby teeth, and a glowing lure bulb on a
  thick curved stalk (`extra`, so it doesn't shrink the body).
- **Dark identity (R16):** `#3B3240` lifted to purple-grey `#8A7494` (L 0.59), pale lilac belly
  `#D9CCE0` (L 0.86), lure `#F2E97A` as a `light` part: baked glow at night. Nocturnal by habitat:
  awake on Night, `sleepy` on Day.
- **Signature:** the lure dips, then swings forward and swells (offering its light), the jaw drops
  into a beam, `happy`, and a wink to finish. Catch: lure wag plus a chomp.
- **Rounds (3):**
  1. Charming at once, but IoU 0.73 vs clownfish (fail), Night ΔL exactly 0.30, and the pectoral
     sat on the jaw seam like an ear.
  2. Taller, rounder ball body, jaw jutting further, lighter body: still 0.72.
  3. Smaller stubby tail, thicker stalk and a bigger bulb so the lure carries the silhouette
     (clownfish 0.66); pectoral turned into a small swept-back fin.
- **Self-grade:** A-. Cute-spooky: the teeth read as baby teeth, the lure glows.
- **Would improve:** the rig mouth isn't used (the jaw is the mouth), so `happy` only adds a small
  open mouth behind the teeth; a jaw-drop driven by the expression would read better.

## otter (rare) — L, chibi (front-facing face)
- **Feature (R10):** floats on its back: a plump body lying along the water, a big round head with
  small side ears at the right end, cream muzzle with a dark button nose and whiskers, two plump
  feet up, a long flat tail (`extra`), and paws on its chest holding a pink scallop shell.
- **Palette:** `#7A5A3E` lifted to `#9A7656` (L 0.59, the validator floor is 0.55), cream
  `#E6D2B8`, shell `#F4A7AE`. Blush always on (sweet). Shallows species: `sleepy` at night, which
  suits "sleepy".
- **Signature:** lifts the shell up to show you (`surprised`, a little wobble), then hugs it to its
  chest (`happy`, paws squeeze in, head tilts), and a wink. Catch: shell up, tail flick.
- **Rounds (3):**
  1. Adorable but a teddy bear: high round ears on a round head; the shell and paws covered the
     left cheek.
  2. Wider head, small ears set low on the sides, whiskers, muzzle lowered; shell and paws moved
     onto the chest, clear of the face. Now an otter.
  3. Plumper, shorter feet with cream pads (they read as raised fingers before).
- **Self-grade:** A-. The cutest of my set; the back-float reads at 24 px.
- **Would improve:** it's wide and short, so the L tile fill (by long side) makes it look smaller
  than the turtle; a hint of a water line under it would sell "floating" (no kit part for scenery).

## goldturtle (legendary) — L, turtle
- **Not a recolour of the sea turtle:** (1) silhouette: a tiara of three rounded points on the
  dome (middle one tallest, a jewel in each), the whole pose tilted 10° nose-up into a glide, the
  head held chin-up, and a long wing-like front flipper; (2) pattern: a cream diamond medallion
  with a white gem and a border of pearls along an ink-trimmed rim (the pilot has scute spots);
  (3) motion: a grand slow "flight" stroke instead of the head tuck; (4) a star sparkle prop.
- **Palette:** sun gold `#E8B23E` (deepened from `#F2C14E` so the cream accent clears ΔL 0.15),
  cream `#FFF1C2`, ivory skin `#F5E2B0`. Golden variant is rose gold (`golden: 'rose'`, R33).
- **Signature:** both flippers make one big stroke, it rises 6 units, the head lifts, a sparkle
  star twinkles and turns above its head; slow blink into `proud`. Catch: the stroke plus sparkle.
- **Rounds (4):**
  1. Round bumps for a crown (read as warts or a mushroom), a big ring medallion that looked like an
     eye, too many plates; IoU 0.80 vs the sea turtle (fail).
  2. Crown as pointed rounded triangles, pearl border instead of plates: 0.78, still failing.
  3. The whole pose tilted 10° nose-up (`xform` rot on every path): 0.64, and it now looks like it
     is flying. But the points were too tall: a spiny dragon.
  4. Lower, wider tiara points; diamond medallion with no ink ring. Turtle IoU 0.66.
- **Self-grade:** B+. Clearly its own legend, and it glides; regal more than cute.
- **Would improve:** there's no way to make `proud` its resting face (the rig's idle is fixed), and
  regal leans on it; the far (second) front flipper raised as a wing would sell flight better.

---

# Redo round (CRITIQUE-1, kit Amendment 1)

## hammerhead — C → redo, 3/4 front view
- **Brief:** 3/4 front view, wide horizontal T (span 1.3× body), an eye at each tip, frame-break
  2–4 px, tall dorsal behind, keep the scan.
- **Build:** a 70-unit hammer bar (lobes `extra`) across the front of a plump body that recedes
  back-left; `face.profile: true` puts an eye on each lobe (eye 8.4, 23 % of the zone); a belly chin
  under the middle carries the smile. The right lobe breaks the XL frame by 3.7 px. The dorsal is
  its own layer so the body rests level (R5T 5°). Body `#6889BA` (C 0.083, R16S).
- **Rounds (3):**
  1. Reads at once: a T with two eyes and a smile. But R5T 27° (the dorsal inside the body group
     tilted the body's axis) and a 3.5 px break that sat right at the edge.
  2. Dorsal moved to its own layer (5°), right lobe trimmed. Lint-clean.
  3. Bigger, lower lobes so both tips bulge past the body outline and the T reads in the 24 px mask;
     eye 8 → 8.4.
- **Self-grade:** A-. Earnest and wide-eyed; the scan swings the hammer with both eyes.
- **Tight pair:** dolphin 0.697 (limit 0.70), so the dolphin redo moves away from it.

## dolphin — A, frame-break + lint
- **Fixes:** flukes are `extra` and break the XL frame by 3.7 px (R28); the dorsal moved to its own
  layer and the body was lengthened to ~2 : 1 with a slim tail stock, so it rests level (13° → 4°,
  R5T); body `#74A6D2` (chroma 0.084, R16S).
- **Rounds (2):** (1) extra flukes + level body, but the smaller body box made it as round as the
  clownfish (IoU 0.74, fail); (2) longer, slimmer body: clownfish 0.63, hammerhead 0.66, flounder
  0.68. Lint-clean.
- **Self-grade:** A. Same joyful dolphin, now big in the tile with its flukes past the edge.

## whaleshark — A (exemplar), lint only
- **Fixes:** spots ≥ 6.2 units (R18W), mouth line 3 units (R2L), the hairline gill marks dropped,
  body `#5A84B5` (chroma 0.089, R16S; L 0.60). The kit's head-anchored XXL crop now keeps the long
  mouth in frame. Lint-clean; closest clownfish 0.65.
- **Self-grade:** A. Unchanged in spirit; slightly bluer than the slate of round 1.

## angler — A, open the eye
- **Fixes:** idle eye opened 15 % (10 → 11.5 units, 24 % of a slightly taller zone) so it's no
  longer a squint at 24–32 px; lure highlight 6.2 units (R18W); body `#8E6E9F` (chroma 0.082,
  R16S). Lint-clean; closest sanddollar 0.73 (cross-class, limit 0.80), fish all < 0.67.
- **Self-grade:** A.

## otter — B → fixes
- **Fixes:** the chest shell (read as a brain) is now a cream `#F3E6D2` scallop fan with 3 soft
  ribs; the face mask is 15 % bigger so the head pops at 24 px; eye 7.6 (floor 7.4); body
  `#A07448` (chroma 0.082); pads, inner ears and nose ≥ 6 units; the ink nose became a body-brown
  nose (R18E: no eye-coloured pattern beside the eyes); hairline whiskers dropped (R2L).
- **Rounds (3):** (1) lint fixes + shell + mask, whiskers at 3 u; (2) on Night the sleepy arcs plus
  whiskers read as a moustache: whiskers removed, nose bigger; (3) the two closed arcs still met in
  the middle (moustache again): eyes spread to 2.1 eye-widths. Night now reads contented.
- **Self-grade:** A-. Lint-clean; closest flounder 0.71 (cross-class), cuttle 0.67 (chibi, < 0.70).
- **Would improve:** the back-float is wide and short, so it still fills less of the tile than the
  other L species.

## goldturtle — B → redo of the crest and pose
- **Brief:** the spiked ridge read as a famous video-game villain's shell (originality risk) →
  3 rounded jewel domes (`#FFF1C2`, `#7FD1E8` gem centres); a pose distinct from the turtle (head
  up 15°, both flippers out like wings).
- **Build:** cream domes with blue gems along the shell top; palette is now gold body, cream
  `#FFF1C2` (skin, domes, pearls, medallion) and gem blue `#7FD1E8` (gems, medallion gem), still 3
  colours. Body tilted 10° nose-up, head lifted another 15° at the neck (face anchors computed
  through the same transforms), the far front flipper raised up-back behind the shell as a second
  wing (new `wing` group, strokes with the near flipper in the signature), eye 7.4 (floor 7.06),
  pearls/gems ≥ 6 units, rim line 3 units. Sparkle is now white.
- **Rounds (2):** (1) the raised far flipper was wide with a round tip and read as a bunny ear;
  (2) tapered and tip-curled like a flipper, domes enlarged so the gems sit inside cream jewels.
- **Self-grade:** A-. Lint-clean; it now flies. Closest: sunfish 0.66 (cross-class); the sea turtle
  is no longer among its 10 closest.
