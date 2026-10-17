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

## giantclam (Giant Clam)
- Size class L, object (front view), epic. Feature: a huge cream shell parted like lips around a
  big teal mantle; the lid wears a crown of five round fluted lobes; V-notches where the valves meet
  at the sides. Eyes and smile on the mantle in the gap (R6), blue mantle spots (R18, 6 placed).
- Signature: the lid lifts slowly (11 units, a slight tilt) to reveal a pearl prop, `happy`, then
  closes with a soft squash and a smug `proud` smile. Ambient: the lid breathes open and shut by 1 unit.
  Catch: the lid pops open.
- Rounds: 4.
  1. Zig-zag scallop rim, mantle filling the whole gap: IoU vs sand dollar 0.88 (fail). Outline filled
     to a plain oval; eyes tiny (5.6 units in a thin gap); box 85 wide (R1).
  2. Taller gap (eye 8.6), narrower mantle: 0.74, still failing.
  3. Deep side notches (mantle rx 27, valves pinched at the sides): 0.66. But Catmull-Rom overshoot
     made the scallops spiky horns (R3 in spirit).
  4. Lid rebuilt as a dome plus five overlapping round lobes: soft scallops, and the crown pushes the
     silhouette further from a coin: sand dollar 0.64, octopus 0.70 (cross-class limit 0.80).
- Self-grade: A-. Reads as a clam with a creature inside; the pearl reveal is sweet.
- Would improve: blush (#FF8FA3) reads greyish on teal; a per-species blush tint isn't in the kit.

## cockle (Cockle)
- Size class XS, object (front view). Feature: a ribbed fan-shaped lid with a round umbo knob, a lower
  valve ending in four round scallops, a pink mantle in the gap with the eyes peeking out under the
  brim, and the cockle's jumping foot poking out (a little "blep"). Four brown ribs (R18).
- Signature: the lid lifts 10° and rocks while three little notes float up (prop), `happy`, ending
  with a wink. Catch: the lid pops with an XS-sized squash (0.86/1.14).
- Rounds: 5.
  1. Round shell with umbo and scalloped lip: IoU vs sand dollar 0.875 (fail). Any plump round shell is a coin.
  2. Fan (narrower top): 0.74.
  3. Heart variant (two lid lobes and a rounded point, per the appendix's "heart-ish"): 0.83, worse;
     the dip between the lobes is too small to matter at 24 px. Reverted.
  4. Foot positions: downward-right foot helps (0.70); a sideways foot hid behind the scallops.
  5. Straighter fan sides plus deeper notches between the scallops: sand dollar 0.67, clownfish 0.70
     (cross-class, limit 0.80).
- Self-grade: B. Charming and readable, but the fan shape reads a bit like a little hat, and it is
  closer to square (81×79) than the appendix's "wider than tall": every rounder/wider version
  collided with the sand dollar.
- Would improve: a true side-view heart would need a silhouette metric that rewards interior notches;
  with centroid IoU the cheapest distinctness lever was the triangle.

## periwinkle (Periwinkle)
- Size class XS, snail (profile, facing right). Feature: a round brown spiral shell (one cream
  semicircle spiral = 3 `rings`) perched high on a long tapered cream foot, a neck rising in front with
  two eye-stalks; the eyes sit on the stalk tips (appendix), mouth on the neck.
- Signature: the stalks stretch up (1.14×) and bob with a `surprised` face, then it creeps forward
  3 units (squash-and-creep, shell wobble) and settles `happy`. Ambient: stalk bob ±2 at 1.4 s plus a
  slow sway (R23 snail row). `ground: true` so squashes sit on the foot.
- Rounds: 3.
  1. Big shell sitting on the foot, short stalks: box 85 wide (R1) and IoU vs sand dollar 0.75 (fail).
  2. Taller stalks, tapered tail, five-arc spiral simplified to four: still 0.75.
  3. Shell moved back and up so a clear notch opens between shell and neck; thinner foot: 0.66.
- Self-grade: B+. Reads instantly as a little snail at 24 px; content and slow.
- Would improve: blush lands on the stalk knobs (the rig puts it under the eyes); a "blush on the
  head, eyes on stalks" option would read sweeter. It's also a touch "garden snail"; a real periwinkle
  is rounder with a lower spire.

## nautilus (Nautilus)
- Size class M, snail (profile, facing right), deep and `nocturnal` (awake at night, sleepy by day,
  R32). Feature: a round cream coil with five hand-placed orange-brown tiger stripes on its back
  half and a whorl line to the navel, a peach hooded head at the opening (the brown hood cap is a
  pattern), and a splayed tuft of four tentacles. One big eye (23 % of the face zone).
- Signature: jets backward 7 units (tentacles stream: squash 0.55 tall, 1.2 long), three bubbles rise
  from the opening (prop), `surprised`; drifts back, a polite blink, then `happy`.
  Catch: the tentacles wave.
- Rounds: 3.
  1. Shell r 32 with a tight tentacle tuft: drew outside the artboard (bubble prop at x 50), and IoU
     vs sand dollar 0.77, clownfish 0.80.
  2. Added a hood jutting forward over the head as a fill part (the textbook nautilus profile): worse,
     0.79; it filled the notch between shell and tentacles.
  3. Smaller shell set further back, hood demoted to a pattern, tentacles longer and fanned from
     -8 to +31: sand dollar 0.66, clownfish 0.72 (cross-class, limit 0.80).
- Self-grade: B+. Polite and old-fashioned; the stripes and tuft read at 54 px.
- Would improve: the tentacle tuft reads a little like a hand; more, thinner tentacles would be more
  accurate but break the ≥ 5 unit thickness rule at this scale.

## limpet (Limpet)
- Size class XS, object (side view). Feature: a low, wide rounded volcano cone (83×47) with a soft
  apex, inset over a flared cream skirt of foot; three tapered ridges from the apex (appendix: 3 only),
  kept off the face. Body lifted and warmed to `#D5B397` (the old `#A99C8C` fails the R16 chroma floor).
  Eyes low at the base of the cone, sweet blush.
- Signature: hunkers down (squash 0.84/1.14, holds on tight with a tiny tremble and squeezed `happy`
  eyes), then pops up and scoots 2.6 units with a hop, smug `proud`. Ambient: breathe plus the skirt
  gliding a hair. `ground: true` so all squashes stay on the rock.
- Rounds: 3.
  1. Cone 80×44 with a skirt as wide as the cone: box 85 (R1), eyes 2.35 widths apart (R7), the
     middle ridge ran between the eyes like a nose, and IoU vs nautilus 0.73 (fail, same class).
  2. Lower cone, ridges moved off the face, cone inset over a wider skirt (a step at the base): 0.68.
  3. Ridges as tapered accent tubes (the 3 px lines vanished at 54 px), warmer palette.
- Self-grade: B. Sweet and clearly a limpet next to the cockle, but it reads a little like a dumpling.
- Would improve: a small rock under it (clingy!) would sell the personality; props are hidden at rest,
  so there is no way to show a resting prop without making it part of the silhouette.

## Summary
| species | size | grade | closest pair (IoU, limit) |
|---|---|---|---|
| puffer | M | B+ | clownfish 0.68 (0.70), sanddollar 0.68 (0.80) |
| boxfish | M | B+ | sanddollar 0.73 (0.80), puffer 0.67 (0.70) |
| sunfish | XL | B+ | clownfish 0.68 (0.70), puffer 0.67 (0.70) |
| urchin | S | A- | sunfish 0.63 (0.80) |
| cockle | XS | B | clownfish 0.70 (0.80), sanddollar 0.67 (0.70) |
| giantclam | L | A- | octopus 0.70 (0.80), sanddollar 0.64 (0.70) |
| periwinkle | XS | B+ | sanddollar 0.66 (0.70) |
| nautilus | M | B+ | clownfish 0.72 (0.80), turtle 0.70 (0.80), limpet 0.68 (0.70) |
| limpet | XS | B | turtle 0.69 (0.80), nautilus 0.68 (0.70) |

Worst same-class pair overall among mine: clownfish/sunfish 0.684 and limpet/nautilus 0.679 (limit
0.70). Worst cross-class: boxfish/sanddollar 0.728 (limit 0.80). Art chunk with 14 species: 18.5 KB gz.

### Kit limitations hit
- **The R12 metric favours spiky/notched shapes over round ones.** Masks are scaled by the long side
  and centroid-aligned, so any plump round shell or round fish normalises to nearly the same disc as
  the sand dollar. Every round species in this batch needed a lever that adds or removes mass outside
  a disc (spines, notches, a foot, a triangle). The cockle's "heart-ish, wider than tall" and a rounder
  periwinkle were not reachable without failing against the sand dollar.
- **No per-part scale**: scaling a group scales stroke thickness too, so the puffer's extending spines
  get fat; I had to keep the extra spine scale small (1.14).
- **Profile eye placement includes tails/stalks in the body box**, which pushes the boxfish's eye
  further from its snout than looks best.
- **Blush colour is fixed** (`#FF8FA3`, or ink for pink bodies): on teal (giant clam) it reads grey.
- **Props are hidden at rest**, so a resting prop (a rock under the limpet) isn't possible without
  making it part of the silhouette.
- Pectoral fins drawn as outlined ellipses next to a low-set profile eye read as a second mouth at
  54 px (puffer, boxfish); worth a line in the fleet brief's gotchas.

## nautilus, round 4 (after the fleet merge)
- With 38 species on main, the old nautilus (round coil + forward tentacle tuft, 84×64) scored
  IoU 0.877 against the cuttlefish (oval mantle + arm tuft, 84×56). Grid search over shell size,
  head height and tentacle fans was stuck between neighbours: wider/flatter hit the cuttle (≥ 0.77),
  taller hit the hermit crab (0.78–0.81), head-high hit the turtle (0.78–0.83).
- Fix: the whole nautilus now hangs **nose-down by 40°** (a single `xform` on every part, ×0.96), the
  way a real nautilus hovers with its opening forward and down. Coil up and back, hooded head and
  tentacles below-front. Face anchors, pivots, shine and bubbles were re-placed by hand; the jet now
  goes up-and-back (tx −7, ty −5). R7 deviation: the eye sits 41 % back along the tilted box.
- New closest pairs: hermit 0.70, combjelly 0.68 (cross-class, limit 0.80), cockle 0.66 (same class,
  limit 0.70); cuttle dropped out of the top list. Every fish is ≤ 0.65 against it.
- Self-grade stays B+: it reads as a little nautilus peering down, and the coil stripes still lead.

# Redo round (after CRITIQUE-1 and the kit pass)

## puffer (graded A, lint only)
- R18W: the six spots are now all ≥ 6.4 units across (the two smallest were 5–5.8).
- R2L: the pectoral fin rays are 3-unit lines at 30 % alpha (soft detail; they were 1.4 u).
- Lint clean; silhouette unchanged (closest: combjelly 0.73 cross-class, clownfish 0.68 same class).

## boxfish (graded B → redo)
- Polka dots are now 4, in the body's own dark gold `#B08A1E` (was near-black `#4A3A22`), 7–9 units,
  all behind the face zone, so the eye is the only dark dot on the face at 24–32 px.
- `pout` moved to 0.6 eye-heights below the eye and close under it (it read as a stray dot at the
  snout); eye up to 12.3 (22 % of the zone).
- Lint clean; IoU unchanged (sanddollar 0.73 cross-class, puffer 0.67 same class). Self-grade A-.

## sunfish (graded B → redo)
- Clavus rebuilt as a smooth frill of three big round scallops (the many-point blob read as a bite mark).
- XL frame-break: each long fin ends in a short `extra` capsule that pokes 3.5 px past the tile's
  art box (lint overhang 3.5 px); the fins themselves stay in the body box so the silhouette keeps
  its tall proportions (making the whole fins `extra` re-scaled the mask and hit the sand dollar at 0.81).
- Warm sun-blush `#FFB3A0` always on (`face.blush`), eye 9.4 (22 %), mouth `o` a touch larger.
- R16S deviation: silver identity at chroma 0.05 (the mola is silver-grey); it reads on sand and mint.
- IoU: lionfish 0.68, clownfish 0.68 (same class, limit 0.70). Self-grade A-.
