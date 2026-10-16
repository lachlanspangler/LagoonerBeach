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
