# Art critique, round 3 (independent art director, 2026-10-26)

**38 A · 9 B · 0 C · 0 D** (r2: 27 / 15 / 5 / 0). Verdict: close — a solid B+ to A−; the reveal now
feels like opening a present. Night dormitory fixed; legendary reveal fixed (kraken ends eyes open).

## Must-do to reach "app used by millions"
1. Redraw the 4 misreads: limpet, moray, cuttle, seadragon (incl. eyes open in its detail view).
2. Fix the 3 upright pairs (bunny-ear budget ≤ 2): blenny cirri, periwinkle eye-stalks, boxcrab eye nubs.
3. Unique palettes for the 4 Reef species + lints: no two species share a body hex or sit within
   ΔE 6; habitat hue lint (≤ 40% of a habitat within 30° hue) — forces barracuda/wrasse off the
   blue cluster and one Shallows species off warm-orange.
4. Golden remap more orange `#E9A93A` + glint for yellow bases (palette.ts GOLDEN).
5. Butterfly face.

## Per species (non-A, with fixes)
- **blenny (B):** cirri became Y-antlers ~40% body height (jackalope) → cirri ≤ 18% of body height,
  2 forks of 4×6 u, splayed ±30°, rooted *over* the eye; pectoral hangs like a leg → rotate 35°
  back, −30%, tuck to the flank; resting smirk (one-sided 3 u upturn).
- **cuttle (B):** one oval with parallel pink stripes = grub/pill bug → separate round head (45% of
  length, 4 u neck notch) from the mantle; 3 cream `#F7E6EE` chevrons tapering to 0 at the fin edge,
  off the head; eye 13 u on a plain head; arms = 4 splayed capsules ±20° (not a mitten). Keep
  `#CC8AA8` and the W eye.
- **limpet (B):** green dome + red-brown ribs = watermelon slice / mini turtle shell; golden = cheese
  wedge → body slate-buff `#B8A88E`, ribs `#7E6450`, 2 small algae dabs `#8DB069`; face at 55%
  height, eyes ≥ 9 u.
- **sandeel (B):** featureless baguette, 2 px eye → eye 10 u 18% back from the snout; cream belly
  line `#F3EAD2` along 70%; rest with the tail tip in a 3-dot sand puff; signature dive-and-peek.
- **moray (B):** green + yellow spots + lower fangs draped on a grey rock = croc/dino toy on a potato
  (24 px = dog bone) → the rock is a *hole*: 40×30 u rock ring with a dark `#3A3230` oval opening
  the eel emerges from at 30° up; 2 upper fangs (4 u) only; body −15% thickness behind the head;
  golden: don't gild the rock.
- **barracuda (B):** teeth/underbite unreadable at 54; too deep (submarine); blue cluster → silver
  `#C4CED6`, dark back `#3F5568`, 4 dark slanted bars; depth −15%, snout tapered over the front
  18%; 2 white upper teeth 5 u, underbite +6 u; flat aloof brow.
- **butterfly (B):** eye inside the dark band + trumpet snout; false eye-spot invisible; body =
  boxfish hex → band 4 u behind the eye (eye on yellow); snout −30%; false eye-spot 7 u `#2B2320` with
  `#FFF1C2` ring on the rear dorsal; body `#F7C531`, edge `#FFF6D0`.
- **wrasse (B):** pale-blue cigar ≈ minnow; body = firefly hex `#3D9BE9` → front half cream
  `#F3EED8`, back electric blue `#2F6FE0`; stripe near-black `#1E2740` 3 u at the eye → 10 u into the
  tail; "busy" 2-dot sparkle at the snout in the signature; spa smile.
- **seadragon (B, legendary):** duck/hoopoe in a shrub; coin silhouette = a bush; detail rests
  eyes-closed (`restExpression: 'proud'`) → snout 1.3× head length, 4 u thick, straight, 2 u tube
  tip; 5 *bigger* forked fronds at the extremities (crest, mid-back, belly, 2 on the tail) — spiky,
  dragon-like; detail rest `idle`, `proud` as a 1-in-5 s signature; body bronze-olive `#B39234`,
  fronds sea-green `#7FB08A` (off the gold cluster). Must be one of the best tiles in the book.
## A with notes
- periwinkle: eye-stalks still upright → splay ±25°, −20% length. boxcrab: eye nubs → splay ±25°.
- cockle: 24 px silhouette is a potato → scallop the top edge into 4 lobes (pending owner OK for
  the cockle file; see STATUS).
- grouper: eye +15%. flounder: closed-eye turrets read as a frog (minor). damsel: chest-out frown.
- Reef palette copies: lionfish = boxcrab `#C9503A` → maroon-red `#B8423F` + cream `#FFF1E6`;
  giantclam = parrot `#3BC9A0` → mantle `#2FB7C4` + violet spots `#6A5AE0`.
- Hue twins: urchin/kraken (269°); urchin, kraken, manta = three violets 247–269°. Legendaries should
  own hues nobody else uses (goldturtle 41° and seadragon 45° are both gold).

## Systemic
- Fixed: Night dormitory; legendary reveal; "31.4 cm" leak; most IoU-missed twins (minnow/wrasse
  remain).
- Reveal: confirm the seadragon card settles to `idle` (lands `happy` eyes-closed at 2.1 s); a kraken
  run had no rays at t = 2500 ms (beige board behind the card) — possible ray dropout; the lower ~35%
  of the legendary card is blank while waiting for Continue.
- Colour clusters remain (Deep 4/8 in 189–213°; Night 3/6 in 174–207°; Lagoon 4 tans 32–45°;
  Shallows 6/10 warm 8–39°). No hue-histogram lint yet; golden remap unchanged.
- Distinct resting mouths: grouper pout + moray grin done; blenny smirk, wrasse spa smile, damsel
  frown still the shared content smile.
- Process: add a cold "what is it?" read at 54 px per tile; pass only if the answer is the species.
