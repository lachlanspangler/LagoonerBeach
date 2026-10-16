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
