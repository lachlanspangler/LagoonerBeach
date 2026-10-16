# Fleet artist 2: round, puffy and shelled species

Species: puffer, boxfish, sunfish, urchin, cockle, giantclam, periwinkle, nautilus, limpet.
Main challenge: silhouette distinctness. Round bodies normalise to near-identical discs in the R12
mask (scaled by the long side, centroid-aligned), so each species got one shape lever that moves
mass *outside* a disc or an ellipse (spine rays, square corners, tall fins, a foot, a flat cone).

## puffer (Pufferfish)
- Size class M, fish (profile). Feature: a perfect ball ringed with short rounded spine nubs, tiny fan tail.
- Signature: the puff. A gulp (squash 0.94), balloons to 1.35× with the spines extending, trembles
  with the fin whirring and a `surprised` face, then deflates into `shy` (eyes down, blush): embarrassed.
  Catch: a mini puff (1.2×) with a happy face.
- Rounds: 4.
  1. Even short spines all round, ball 31×29, long tail. IoU vs clownfish 0.78 (fail). The round
     pectoral ellipse in the middle of the body read as a big "o" mouth; the real mouth vanished.
  2. Longer spines, smaller tail: 0.68, but at rest it read as a sun/urchin, not a fish.
  3. Spine length varies with the angle (short at snout and tail, longer on back and belly, like a
     real bristling puffer); ball slightly taller than wide (27×30); tail shrunk; pectoral became
     a small fan with two ink rays, set back and low. Mouth a `pout` at the snout. IoU 0.676.
  4. The puff scaled the spines 1.32× on top of the 1.35× root, so they became fat tubes (spider).
     Spines now extend only 1.14× on top of the root scale.
- Self-grade: B+. The puff is funny and reads in 1 s; the rest pose reads as "puffer" at 24 px.
- Would improve: the pectoral fan still competes a little with the face at 54 px; a kit
  "per-part scale" (lengthen spines without thickening them) would make the puff crisper.

## boxfish (Yellow Boxfish)
- Size class M, fish (profile). Feature: a near-cube rounded square (54×58, r 10) with tiny fins and
  a fan tail on a thin stalk. Six hand-placed dark polka dots, pale belly band, `pout` lips.
- Signature: the tiny dorsal, anal and tail fins whir furiously (±24–26°, ~0.05 s per swing) while
  the box creeps 3 units forward with a `surprised` effort face, then a satisfied nod and `happy`.
  Catch: the same whir with a squash.
- Rounds: 4.
  1. 58×52 box, big tail, pectoral beside the eye. IoU vs clownfish 0.755 (fail). The pectoral read as
     a second, bigger mouth (same trap as the puffer).
  2. Square box 56×56: clownfish 0.67 but sand dollar 0.79 (a square normalises close to a coin).
  3. Grid search on box size/radius and tail stalk; a thin long stalk plus taller dorsal/anal fins
     set forward put mass where neither a disc nor the clownfish has it: clownfish 0.67, puffer 0.67,
     sand dollar 0.73.
  4. Dropped the pectoral entirely (it read as a beak next to the low eye anywhere I put it); the
     anal fin got its own group so the whir still has three fins. Mouth moved inside the box.
- Self-grade: B+. Instantly a boxfish at 24 px; dots and square read at 54 px.
- Would improve: the face sits a little far from the snout because the validator wants the eye
  30–38 % back on a box that includes the tail stalk; a face zone on the box alone would look cuter.

## sunfish (Ocean Sunfish)
- Size class XL, fish (profile). Feature: a tall disc with no tail, a scalloped clavus frill and long
  swept-back fins straight up and down (darker accent tips). Silver-blue body with chroma raised to
  0.035 (the old `#B7C3CF` was below the R16 chroma floor), pale belly, sweet sun-blush.
- Signature: flops onto its side, snout to the sky, with blissful `sleepy` lids (sunbathing), then
  rights itself with a small overshoot and a `happy` face. Ambient: slow dorsal/anal sculling in
  opposite phase. Catch: fins flare.
- Rounds: 3.
  1. Disc 60×54, fins to ±44: body box 89 tall (R1 fail). The flop rotated it face-down (read as tumbling).
  2. Shortened fins: IoU rose to 0.72 vs boxfish and 0.71 vs clownfish (fail): without the tall fins it
     is just another round fish. Flop direction reversed so the face points up.
  3. Smaller disc (56×48), fins kept long (±40) and slightly narrower: the fins now dominate the
     normalised mask. clownfish 0.68, puffer 0.67, boxfish 0.67.
- Self-grade: B+. Gentle and dopey; the up-down fins make it nameable at 24 px.
- Would improve: XL frame-breaking (R28) only happens in the leap; in the tile it fits. A sun
  sparkle prop during the sunbathe would sell the joke further.

## urchin (Sea Urchin)
- Size class S, object (front-facing). Feature: a halo of 12 long spines, each with a fat rounded
  lighter tip (accent `#C8ACE9`), around a small ball.
- Dark identity: `#5B3A7A` (L 0.42) lifted to `#8A68AE` (L 0.58; the guide says ≥ 0.45, the validator's
  body floor is 0.55) plus a pale lavender face patch (belly, L 0.92) so the eyes and blush read on
  both themes. Night rim visible.
- Signature: the spine ripple. The spines are three interleaved groups (every third spine) that
  swell 1.14× one after another, twice round the ring, with a `surprised` face, then `shy`.
  Ambient: the three sets sway with a 0.25 s lag (a slow shimmer). Catch: the same wave, faster.
- Rounds: 3.
  1. Spines as `extra` (outside the body box): the ball drew at S size and the spines blew far past
     the tile; it read as a large creature. IoU fine (0.59 vs sand dollar).
  2. Spines counted in the box, ball 26: spines too short and stubby, it read as a gear/flower.
  3. Ball 23, spines out to 41.6 (ratio 1.8): reads as an urchin, small and prickly, face still
     readable at 54 px. IoU: sunfish 0.63, clownfish 0.62, sand dollar < 0.6.
- Self-grade: A-. Charming, shy and instantly nameable.
- Would improve: the face is small at 24 px (the price of long spines inside an 84 box).
