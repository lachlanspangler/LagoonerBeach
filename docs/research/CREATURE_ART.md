# Creature art: research and the binding Creature Style Guide

Status: research + proposal (art direction). Date: 2026-10-16.
Inputs: ADR 0003 (visual identity), ADR 0007 (catch layer), `docs/research/COLLECTION.md`,
`src/meta/creatures.ts` (47 species), `src/render/creatures.ts` (current procedural art),
`artifacts/film/creatures-day.png`, `creatures-night.png`, `creatures-golden&sil.png`.

The owner's brief: the creatures are "fine" but need to become "insanely better: cute, charming,
instantly readable at small size, cohesive style, real personality; each species its own size,
its own little motion and expression; finding a new one should feel like opening a present."

Ground rule from `CLAUDE.md`: *original everything*. The references below teach principles
(proportion, eyes, silhouette, motion, rarity staging). We copy no character, shape or palette.

---

## 1. Where the current art stands (an honest audit)

From the three contact sheets (54 px journal tiles, Day and Night, plus silhouette/golden):

1. **One fish template for 11 species.** Silver Minnow, Tide Blenny, Clownfish, Blue Damsel,
   Parrotfish, Grouper, Barracuda, Lanternfish, Butterflyfish, Cleaner Wrasse and Lionfish all use
   `fish()`: same ellipse, tail, dorsal fin and eye spot. In the silhouette sheet they are
   **pixel-identical**. Only the colour tells them apart. That fails the most important test in
   this document (§2.4). Sand Eel, Moray and Garden Eel share one sine wave. Moon Jelly, Comb Jelly
   and Sea Sparkle share one dome. Hammerhead, Dolphin and Whale Shark share one shark.
2. **Googly eyes, wrong place, no face.** Eyes are a white disc with an off-centre black pupil,
   placed high and at the very front edge. That reads as "clip-art fish", not "character". There
   are no mouths and no blush. Jellies, the star, the urchin, the clam, the limpet and the sand
   dollar have no face at all, so they read as objects.
3. **No size.** Sea Sparkle (1–2 cm) and Whale Shark (8–12 m) fill the same 82 % of the tile.
   Size records are a core loop (COLLECTION.md §5), yet nothing on screen says "huge".
4. **Contrast fails on one theme or the other.** Light species (Sand Dollar `#E9DCC4`, Limpet,
   Sand Eel, Garden Eel, Moon Jelly) sink into the Day tile (`#E3D6C2`-ish on `#F4EDE2`). Dark
   species (Manta `#2E3B4E`, Anglerfish `#3B3240`, Whale Shark, Baby Kraken, Urchin) sink into the
   Night tile (`#15293A` on `#0B1622`). Manta on Night is nearly invisible in the screenshot.
5. **Hashed patterns.** Spots come from one hash (`i*37 % 9`), so every spotted species has the
   same dot layout. Real species have signature markings (clownfish's three bars, boxfish's
   polka dots, whale shark's grid of spots).
6. **Strokes as limbs.** Legs, arms, tentacles and antennae are `lineWidth` strokes at
   1–6 % of size. At 24 px they become 0.3–1.4 px hairlines that shimmer and vanish.
7. **Golden is a gradient overlay** (`source-atop`, 35–65 % alpha). It muddies the base colours
   rather than making a golden creature. It doesn't sparkle.
8. **Static.** Nothing blinks, breathes or emotes. In the leap the creature is a rigid sticker.

What's good and stays: everything is code (no asset pipeline, tiny bytes), facing right on a
centred origin, one call site per surface (`creatureThumb` in `src/ui/overlay.ts` at 52/54/150 px,
the leap in `src/render/scene.ts`), silhouette mode for locked entries, and a calm flat look that
fits ADR 0003.

---

## 2. What the references teach

### 2.1 Shape language and simplicity

- **Circles first.** Kirby's round design started as a placeholder that Sakurai kept because it
  "served the character better". Iwata said it got "a simple, circular design so that anyone would
  be able to draw him" ([Wikipedia: Kirby](https://en.wikipedia.org/wiki/Kirby_(character))).
  Circles read as soft, safe and friendly. That's the baseline vocabulary for a calm beach game.
- **Simplicity leaves room for imagination.** Animal Crossing: New Horizons' art director Koji
  Takahashi felt complicated, realistic art gives players "too much information". Simple designs
  leave an "imagination gap" that players fill in themselves
  ([Wikipedia: ACNH](https://en.wikipedia.org/wiki/Animal_Crossing:_New_Horizons)).
- **Few dots can carry a character.** Shigeru Miyamoto described early Tamagotchi graphics as "no
  more than 10 or 20 dots". The characters started as *heta-uma* ("charmingly clumsy") magazine
  drawings and were then reduced to pixels
  ([Wikipedia: Tamagotchi](https://en.wikipedia.org/wiki/Tamagotchi)). Our journal tile is 54 px
  and the smallest silhouette is about 20 px, so that's our scale.
- **Shape and mood.** Generation III Pokémon are described as having "jagged" designs compared
  with generation I's rounder, more natural look
  ([Wikipedia: Gen III list](https://en.wikipedia.org/wiki/List_of_generation_III_Pok%C3%A9mon)).
  Spikes and points add edge and danger. We use them only as accents on the "prickly" personalities
  (urchin, lionfish, barracuda's teeth, puffer's spines), always with rounded tips.
  - Our vocabulary: **circle/ellipse = friendly** (the default body). **Rounded square = sturdy and
    dependable** (boxfish, box crab, hermit's shell, turtle shell). **Rounded triangle = quick or
    proud** (fins, shark dorsal, the manta's wings, the lionfish's fan). Never a sharp corner: the
    minimum radius is 2 grid units.
- **Design from the animal, then push.** Ken Sugimori drew inspiration from aquariums and zoos and
  redrew each character many times, adjusting proportions until satisfied. For *Black and White* he
  drew every final design himself, a single guiding hand over 17 designers
  ([Wikipedia: Ken Sugimori](https://en.wikipedia.org/wiki/Ken_Sugimori)). For us, the
  "single hand" is this style guide plus one shared rig (eyes, mouth, blush) that every species
  uses.
- **Families share a look.** Squirtle's line was designed "backward from [the] final form", and
  critics read the three stages as one coherent set
  ([Wikipedia: Squirtle](https://en.wikipedia.org/wiki/Squirtle)). Our "families" are body classes
  (the 11 fish, 3 eels, 3 jellies). They share construction rules but must differ in silhouette.
- **Weakness is charm, and contrast sells rarity.** One book on gaming cultures argues that
  Magikarp's weakness helps "emphasize the exclusivity and strength of other, rarer creatures"
  ([Wikipedia: Magikarp](https://en.wikipedia.org/wiki/Magikarp)). Commons should be humble and
  sweet, so legends can be grand. Wailmer "can inflate into a ball to bounce", and Wailord is the
  series' largest common species at 14.5 m
  ([Gen III list](https://en.wikipedia.org/wiki/List_of_generation_III_Pok%C3%A9mon)). A
  whale-sized creature can still be built from one ball. Our whale shark will be.

### 2.2 Proportions: baby schema (Kindchenschema)

- Lorenz's baby schema is a set of features that make a creature look cute and trigger caregiving,
  among them "chubby cheeks" and large eyes. Borgi et al. list a rounder face, higher forehead,
  bigger eyes and a smaller nose and mouth. Jones describes juvenile animals as having "smaller
  snouts, higher foreheads and larger eyes"
  ([Wikipedia: Baby schema](https://en.wikipedia.org/wiki/Baby_schema)).
- Gould showed Mickey Mouse being redrawn over time with a bigger head, bigger eyes, a rounder
  forehead and shorter, pudgier legs. Etcoff: "cartoonists capitalize on our innate preferences
  for juvenile features" ([Baby schema](https://en.wikipedia.org/wiki/Baby_schema),
  [Cuteness](https://en.wikipedia.org/wiki/Cuteness)).
- In super-deformed (chibi) style the head is "between one third and one half the character's
  height", with stubby limbs, oversized eyes, minimal detail and an exaggerated signature trait
  ([Wikipedia: Super deformed](https://en.wikipedia.org/wiki/Super_deformed)). That last point,
  one exaggerated signature trait, is our silhouette strategy (§3, rule 9).
- The animation principle of *appeal* notes that likable characters often have "symmetrical,
  baby-like faces" ([Twelve basic principles](https://en.wikipedia.org/wiki/Twelve_basic_principles_of_animation)).

Translation for sea creatures (most have no neck):
- **The face zone is big.** On fish, the front 45–55 % of the body is "head". The eye sits low and
  back from the snout, which gives a "high forehead" above it.
- **Snouts shrink.** Barracuda, hammerhead and seahorse keep their signature snout, but shorter
  and rounder than in life.
- **Limbs are stubby nubs**, not strokes: crab legs as 3 short rounded capsules, octopus arms as
  fat tapering tubes.
- **Bodies are plump.** Fish aspect ratio drops toward 1.6:1 (from the current 1.8:1) except where
  long is the identity (eels, barracuda, sand eel).

### 2.3 Eyes, mouths, blush: Sanrio, Sumikko, Duolingo

- Hello Kitty's missing mouth lets people "project their feelings onto the character"
  ([Wikipedia: Hello Kitty](https://en.wikipedia.org/wiki/Hello_Kitty)). Pochacco, a white dog with
  black floppy ears, also has no mouth. Keroppi is defined by large eyes and a V-shaped mouth
  ([Sanrio characters list](https://en.wikipedia.org/wiki/Pochacco)). Cinnamoroll's signature is
  "chubby and pink" cheeks and long ears. He was voted most popular Sanrio character for 2017–18
  and again 2020–24 ([Wikipedia: Cinnamoroll](https://en.wikipedia.org/wiki/Cinnamoroll)).
  Lesson: **the mouth is optional, tiny and expressive. Cheeks (blush) and eyes do the work.**
- Observation (studied from the characters themselves; no source to cite): Sanrio faces put solid
  dark oval eyes wide apart and *below* the midline of the head, with a small nose or mouth
  between them, and no white sclera. This placement is the strongest single cuteness lever at
  icon size. A white sclera with a pupil reads as "googly" or "cartoon-wacky", not cute.
- Sumikko Gurashi shows that **personality can be one gentle quirk**. The characters are shy,
  "feel left out or anxious" and relax most in a corner. The line sold about 8 million plush toys
  by 2019 and won the Japan Character Awards' Grand Prize
  ([Wikipedia: Sumikko Gurashi](https://en.wikipedia.org/wiki/Sumikko_Gurashi)). Our flavour
  texts already have this voice ("Doubles in size when nervous. Relatable."). The art must
  act it out.
- Duolingo uses a fixed cast with strong, readable states. Its widget shows "Duo's mood at
  different parts of the day", and "he gets more and more desperate as it nears midnight". The
  team planned a set of 25 illustrations to showcase "Duo and his memorable personality"
  ([Duolingo blog: widget](https://blog.duolingo.com/widget-feature/)). The brand also has a
  named cast (Zari, Bea, Lily, Lucy, Oscar and others)
  ([Wikipedia: Duolingo](https://en.wikipedia.org/wiki/Duolingo)). I could not fetch a primary
  source on the 2022 character redesign itself (Duolingo's design pages now redirect).
  - From looking at the current Duolingo art (my observation, not a cited claim): characters are
    built from rounded geometric primitives, use flat fills with one shadow shape rather than
    gradients, and have large expressive eyes. The whole cast keeps the same treatment, so they
    read as one world. Lesson: **a named set of expressions, drawn identically across the cast.**

### 2.4 Silhouettes that read at 24 px

- Valve validated Team Fortress 2's nine classes by silhouette alone: "Even when viewed only in
  silhouette with no internal shading at all, the characters are readily identifiable", and this
  test "was used to validate the character design during the concept phase". Their conventions:
  "High frequency detail is omitted where possible", interior details "echo silhouette shapes",
  and "Silhouettes are emphasized with rim highlights rather than dark outlines"
  ([Valve, Illustrative Rendering in TF2, NPAR 2007](https://steamcdn-a.akamaihd.net/apps/valve/2007/NPAR07_IllustrativeRenderingInTeamFortress2.pdf)).
- Animal Crossing makes silhouettes a mechanic: "All fish have a shadow size that can be used to
  roughly identify them", and some (great white shark) have a fin
  ([Nookipedia: Fish](https://nookipedia.com/wiki/Fish)). Sea creatures also have a shadow that
  varies in size and "may move slowly, quickly, erratically, or be completely stationary"
  ([Nookipedia: Sea creature](https://nookipedia.com/wiki/Sea_creature)). So **size plus motion
  identifies the species before colour does.** Our locked journal entries are exactly this: a
  silhouette plus a hint.

### 2.5 Palette restraint and flat shading: Monument Valley, Alto

- Monument Valley drew on Japanese prints and minimalist sculpture. It "uses colors to signify
  where the player can interact", and Ken Wong wanted "each frame of the gameplay worthy of public
  display" ([Wikipedia: Monument Valley](https://en.wikipedia.org/wiki/Monument_Valley_(video_game))).
- Alto's Adventure's environments "change in lighting as time passes through the cycle of the day"
  ([Wikipedia: Alto's Adventure](https://en.wikipedia.org/wiki/Alto%27s_Adventure)). Alto's
  Odyssey targets 60 fps and uses lower-quality shaders on weaker hardware to keep performance
  steady ([Wikipedia: Alto's Odyssey](https://en.wikipedia.org/wiki/Alto%27s_Odyssey)).
- Lesson: few colours per object, colour that means something, light that shifts with the theme
  (Day / Night), and quality that degrades gracefully. Concretely: **2–3 colours per creature plus a
  shared ink and highlight, flat fills, one soft highlight, and no gradients on bodies.**
  Gradients muddy at 24 px and fight the flat pebble material of ADR 0003.

### 2.6 Collections, rarity and the "present" feeling

- Neko Atsume's 26 rare cats (of 86) appear only when certain items and foods are set out, and
  "each has a unique interaction with its items"
  ([Wikipedia: Neko Atsume](https://en.wikipedia.org/wiki/Neko_Atsume)). Rare means *behaves
  differently*, not just "has a different frame". Each of our species gets a signature idle.
- The Critterpedia registers a creature the first time you catch it and toggles between list and
  picture views ([Nookipedia: Critterpedia](https://nookipedia.com/wiki/Critterpedia)).
- Shiny Pokémon (since *Gold/Silver*, 1999) have a different palette and "a sparkle animation when
  they enter combat". *Sword/Shield* added squares in place of stars. Base odds are 1/8192, later
  1/4096 ([Wikipedia: Shiny Pokémon](https://en.wikipedia.org/wiki/Shiny_Pok%C3%A9mon)).
  Lesson for our 1/64 golden: **a real palette swap plus a sparkle at entry**, not a tint.
- Gacha games sort drops into rarity "tiers". Some flash a rare item before landing on a lesser
  one to give "the impression of being close"
  ([Wikipedia: Gacha game](https://en.wikipedia.org/wiki/Gacha_game)). We take the tiers and the
  staging, and **reject the fake-out**. Our reveal never lies about rarity. That matches the
  "never pay-to-catch" fairness promise in COLLECTION.md.
- Observation, not cited: the common gacha and loot convention is that colour rises with rarity
  (white/grey to green to blue to purple to gold or orange), with escalating frames, light rays
  and particle bursts at the top tiers. Players read it instantly, so we keep the order. We map it
  onto our own pebble palette and add a non-colour cue (pips) for colour-vision safety (ADR 0003).
- Meowdoku ([Google Play](https://play.google.com/store/apps/details?id=com.oakever.meowdoku&hl=en-US)),
  Cats & Soup, Animal Restaurant and Fishing Life: I could not fetch usable pages for these (search
  and store pages failed), so I don't cite them. From play-knowledge only: Cats & Soup and Animal
  Restaurant get most of their charm from **small looping idles** (stirring, kneading, napping) on
  very simple rounded bodies with dot eyes. Meowdoku uses cats as the reward face of a logic puzzle
  (ADR 0003 already credits this). Fishing Life shows a big catch staged against a size reference.
- Ooblets came from a two-person studio where one person (Rebecca Cordingley) was artist *and*
  programmer, built "visuals-first" ([Wikipedia: Ooblets](https://en.wikipedia.org/wiki/Ooblets)).
  Coherent, charming creature art from a tiny team is possible when one constrained system makes
  every species.

### 2.7 Motion

From the Twelve basic principles of animation
([Wikipedia](https://en.wikipedia.org/wiki/Twelve_basic_principles_of_animation)):
- **Squash and stretch** gives "a sense of weight and flexibility", with volume kept constant.
- **Anticipation** prepares the audience for an action.
- **Follow-through and overlapping action:** loose parts such as tails keep moving after the body
  stops.
- **Slow in, slow out** (easing).
- **Secondary action** (a fin flutter, a blink) "gives a scene more life", as long as it doesn't
  steal attention.

Weight follows timing: **big things move slowly, small things move quickly.** That's how the
same 54 px tile can feel like a shrimp or a whale.

---

## 3. The Creature Style Guide (binding)

Every species, present and future, must follow these rules. Where a rule names a number, that
number is the default. Deviations need a one-line reason in the species' art file.

### A. Construction

**R1. Artboard and grid.** Each creature is authored on a **100 × 100 unit artboard**, with the origin
at the centre and the creature facing right (as today). Coordinates snap to **2 units**. The
creature's *body box* (excluding tail tips, antennae and spines) fits inside 84 × 84 units. Size
class then scales the whole artboard on screen (R27), so the art itself is always drawn "full".

**R2. Primitives only.** Bodies are built from at most **12 parts**. Each part is a circle, ellipse,
rounded rectangle, rounded triangle (capsule-cornered) or a closed path of at most **24 cubic or quadratic
segments**. No open strokes as body parts. Limbs, tentacles, antennae and spines are **filled
capsules or tapered shapes**, at least 5 units thick (≈1.2 px at 24 px). The only stroked lines
allowed are the ink outline (R14) and fine detail lines at ≥ 3 units.

**R3. Minimum radius.** Every corner has a radius of at least 2 units. Spines and teeth get rounded tips. Nothing reads as
sharp, not even the "dangerous" species (barracuda, lionfish, urchin, hammerhead). Their danger
is performed with comedy.

**R4. Shape vocabulary.** Ellipse/circle = default body (friendly). Rounded square = sturdy (box
crab, boxfish, hermit's shell, turtle shell, giant clam). Rounded triangle = fins, wings,
dorsals (quick or proud). Each species picks **one dominant primitive** that makes up at least 60 % of its
silhouette area.

**R5. Proportions per body class** (head share = share of the body box treated as "face zone"):

| Body class | Species bodies | Head : body | Notes |
|---|---|---|---|
| Fish (profile) | fish, angler, shark, mola, flat, puffer | face zone = front 50–55 % of body length | aspect 1.4–1.8 : 1 (long species up to 3 : 1) |
| Chibi (front) | octo, crab, hermit, otter, jelly, squid | head 45–55 % of total height | stubby nubs, 2–3 heads tall max |
| Long (wave) | eel, horse, dragon, shrimp | head 25–35 % of length, round and oversized | body tapers to a rounded tip |
| Object-like | star, urchin, clam, dollar, limpet, snail, nautilus | the whole shape is the face | face sits on the largest flat area |
| Wing | ray (stingray, manta) | head bump 30 % of span | seen from above, face on the front edge |

**R6. The face is always present.** Every species gets eyes, including star, urchin, clam, limpet, sand
dollar, jellies and sea sparkle. Clams show eyes peeking from the shell gap. Sand dollar and star
get a face on the disc. This is what makes them characters, not objects.

### B. Eyes, mouth, blush (the shared face rig)

The rig is drawn by shared code from parameters, never per-species art. That's how 47 species get
one consistent face.

**R7. Eye spec.**
- Shape: solid oval, width : height = 0.85 : 1. Colour **`#2B2320`** (warm near-black, matching
  the UI text family; never `#000`).
- Size: eye height = **18 % of face-zone height** (range 14–24 %). XS species use 24 % so the
  eye survives at 20 px. Legendaries may go to 20 %, never above 24 %.
- Position: eye centre at **55–62 % of face-zone height from its top** (low-set, "high
  forehead"). Profile species show **one eye** at 30–38 % of body length back from the snout tip.
  Front-facing species show two eyes spaced **1.6–2.2 eye-widths apart** (centre to centre).
- Highlights (always two, colour `#FFFFFF`): primary disc **radius 30 % of eye width** at
  (−0.22w, −0.24h) from the eye centre. Secondary disc **radius 12 %** at (+0.2w, +0.26h). At
  rendered eye sizes below 3 px, drop the secondary and keep the primary at a minimum of 1 px.
- No white sclera, except two expressions: *surprised* (R21) and the angler's comedic bulge.

**R8. Mouth spec.** Width at most **0.9 × eye width** in profile, or at most **0.5 × eye spacing** front-on. Placed
0.5–0.8 eye-heights below the eye line, toward the snout. Drawn as an ink line, **width 0.5 × the
outline width**, round caps. Vocabulary (closed set): `smile` (shallow arc), `w` (cat-mouth),
`o` (small ellipse, ink fill), `open` (D-shape, ink fill with an inner tongue of `#F28C8C`),
`flat`, `pout` (grouper and boxfish lips: a small rounded bump in the body colour, ink-outlined).
Signature exceptions: moray `grin` (wide arc with two rounded teeth); barracuda `underbite`
(two rounded teeth); angler `toothy` (3–4 rounded white triangles).

**R9. Blush.** An ellipse **1.1 × eye width by 0.55 × eye height**, colour **`#FF8FA3`**, alpha
**0.45 on Day / 0.35 on Night**, centred 0.7 eye-heights below the eye and 0.3 eye-widths toward
the back. Shown in *happy*, *proud* and *new*, plus idle for personalities tagged "sweet" in the
appendix. Never on the sclera or outline. Skip it on species whose body is already pink or red
(coral-on-coral). For those, darken the blush to the ink at alpha 0.25.

**R10. One signature trait per species**, exaggerated 1.5–2× its real proportion: the hammer, the
lure, the clownfish bars, the seahorse curl, the mola's missing tail, the sea dragon's leaves. It
must be visible in the 24 px fill-only silhouette (R13). This follows the super-deformed rule:
simplify everything, exaggerate one thing.

### C. Silhouette

**R11. Silhouette first.** Design starts as a fill-only shape. Only then come colour, pattern and face.

**R12. Fill-only silhouette test at 24 px.** Render each species as one flat fill (no outline,
no interior detail) with its body box scaled to 24 px. Two checks:
- *Automated (CI):* pairwise mask IoU after aligning centroids and normalising scale. IoU must be **under 0.80 for every
  pair**, and **under 0.70 within the same body class**. Today the 11 fish score IoU = 1.0
  against each other.
- *Human/agent review:* on a sheet grouped by habitat, the reviewer names each silhouette.
  Every miss is a bug.

**R13. The locked-journal silhouette is that same fill-only mask**, in the theme's ink
(Day `#3B3229` at 22 % alpha, Night `#E8EEF2` at 18 %), with no interior strokes (today the
interior strokes leak through). Since the silhouette must identify the species, this rule makes
the hint plus silhouette a solvable riddle.

### D. Outline, palette, shading

**R14. Outline rule: same-hue ink outline, drawn behind.** Every creature gets one outer ink
outline. Its width is **k = 3.5 % of the rendered body-box height**, clamped to **[1.25 px, 3 px]**. It's drawn
by stroking each part at 2k in the creature's *ink* colour first, then filling all parts on top.
Internal joins disappear and only the outer contour shows. Interior lines (shell rims, gill arcs,
mouth) use 0.5k.

*Why an outline, and why this one:*
1. It is the only option that passes on **both** themes (R16). Light species on Day sand and dark
   species on Night navy both get a defined edge without changing their colours.
2. At 24 px an outline is what keeps a silhouette crisp against the tile. Without it, value
   contrast alone must carry the edge. We measured the opposite in §1.4.
3. Same-hue ink (not black) keeps it soft and cohesive. Black lines would read as "sticker
   clip-art" and fight the flat pebble material.
4. For an AI author, the stroke-behind trick hides small overlaps and seams between primitives,
   so the construction can stay simple.

TF2 prefers rim highlights over dark outlines, but that's for 3D characters with lighting. We
use their rim idea on Night only (R15).

**R15. Night rim.** On the Night theme, add a **1 px rim** outside the ink. Colour `#CFEFFF`,
alpha 0.30 (0.45 for species with body lightness L < 0.5). It's drawn as a 2k + 2 px stroke behind the ink
stroke. It doubles as the faint bioluminescence of ADR 0003. Night-habitat species (lanternfish,
jellies, firefly, angler's lure, sea sparkle) also get a soft glow on their light organs only
(`shadowBlur` baked into the cache, never live).

**R16. Palette per creature: body + accent + (optional) belly, plus derived ink. Shared: eye
`#2B2320`, highlight `#FFFFFF`, blush `#FF8FA3`.**
- **Body:** OKLCH lightness **0.55–0.90**, chroma **0.03–0.18**. Dark-identity species (manta,
  angler, whale shark, kraken, urchin) are lifted to L of at least 0.45 and get a light belly (L ≥ 0.85).
  For example, the manta's top becomes a slate-blue `#3E5068`-ish with a white belly visible on the wing edge.
- **Accent (pattern):** differs from the body by ΔL ≥ 0.15 *or* Δhue ≥ 60°, so the pattern
  still shows in greyscale.
- **Belly:** body lightness + 0.08–0.12, chroma × 0.6 (countershading, the lower 35 % of the body).
- **Ink:** derived, never authored: `ink = oklch(L × 0.42, C × 0.9 + 0.02, hue − 8°)`
  (darker, slightly richer, slightly cooler). The clamp keeps ink L in 0.20–0.32.
- **Contrast checks (CI):** ink against the Day tile ΔL ≥ 0.45. On the Night tile, the brighter of
  body or rim against the tile ΔL ≥ 0.30. Body against accent per the rule above.
- At most **3 authored colours** per species. Clownfish `#F2792E` plus white bars plus ink is the model.

**R17. Shading: flat, plus one soft highlight, plus one shade shape.** No gradients on bodies.
- Highlight: one rounded crescent or ellipse on the upper-front of the body, `#FFFFFF` at 28 %
  alpha (Day) / 18 % (Night). It echoes the top-left light of the pebbles (ADR 0003).
- Shade: the belly line or a lower crescent, in ink at 12 % alpha. Optional.
- Golden variants are the one place a gradient appears (R33).

**R18. Patterns (closed set), each placed per species, never hashed.**
`bands` (1–4 vertical bars that follow body curvature, e.g. clownfish 3, butterfly 2, barracuda 6
chevrons), `stripes` (horizontal, wrasse 1 bold line, parrot 2), `spots` (an authored list of dot
positions and sizes, 3–9 dots, at least 6 units each, e.g. whale shark grid, boxfish polka dots),
`saddle` (one large patch, e.g. the turtle's scute plates, grouper blotches), `rings` (shells:
periwinkle, nautilus), `ribs` (comb jelly rainbow rows, cockle and clam ridges as 3–5 ridges,
never 7 hairlines), `glow` (light organs: lanternfish, firefly, sea sparkle), `plain`. A pattern
must survive at 54 px. At 24 px, patterns are dropped below 3 px feature size.

### E. Expressions

**R19. The face rig has a closed expression set.** Every species supports all of them, with
species-specific *overrides* allowed only for mouth shape and one prop (bubble, sparkle).

| Expression | Eyes | Mouth | Blush | Body | When |
|---|---|---|---|---|---|
| `idle` | oval, normal | species default (`smile`/`flat`/none) | per personality | idle loop | journal tile, detail view |
| `blink` | 2-unit ink arc (closed) | unchanged | unchanged | — | 120 ms, every 2.5–6 s (seeded jitter) |
| `happy` (caught) | upward arcs `^ ^`, 3 units thick | `open` | on, alpha × 1.3 | squash 0.92/1.08, then bounce | leap apex, journal re-visit |
| `surprised` (new) | 1.15× eye with a white sclera ring 15 % plus two big highlights | `o` | on | stretch 1.1 vertical, then a small hop | first discovery reveal |
| `proud` (rare+) | closed smug arcs `‿` | `w` or `smile` | on | chin-up tilt −8°, chest out 1.04 | rare/epic/legendary reveal, golden |
| `sleepy` (night) | half-lid: top 45 % of eye covered by a body-coloured lid with an ink lid line | `flat` or tiny `o` | off | breathing slows ×1.6, bob halves; optional "z" bubble | day-habitat species shown in the journal on the Night theme |
| `shy` (locked → found hint) | eyes look down 20 % | none | on | — | detail view of a species found once only |

**R20. The face rig is anatomy-agnostic.** Eye position and face zone are per-species parameters;
expression code never touches species art. Adding an expression means touching one file.

**R21. Expressions change only eyes, mouth, blush and a body transform.** Never the silhouette.
That keeps the cache small (R39) and the species always recognisable.

### F. Motion

**R22. Every species has one ambient idle (always-on in the detail view) and one signature idle
(an occasional "performance").**

**R23. Idle vocabulary per body class.** Timings are at size class M. Scale periods by the size
factor in R24.

| Class | Ambient idle (loop) | Signature idle examples (every 4–8 s, 0.6–1.5 s long) |
|---|---|---|
| Fish | bob ±2.5 units, 2.4 s sine. Tail wag ±8°, 0.8 s. Pectoral fin flutter ±14°, 0.45 s | dart forward 6 units + glide back; puff (puffer 1.35×); spin (butterfly); yawn (grouper) |
| Shark/large fish | bob ±1.5, 3.2 s. Tail sweep ±6°, 1.4 s | slow turn-and-look at the viewer (eye moves to centre) |
| Eel / long | travelling wave along the spine, wavelength 0.8 × length, 1.4 s | peek: body retracts 30 % then pops out (garden eel, sand eel); grin (moray) |
| Chibi (octo, crab, hermit, otter) | breathe scale 1 ± 0.025, 3.0 s. Limb sway, phase-offset 90 ms per limb | crab claw clack ×2; hermit hides into its shell and peeks out; otter paw rub; octo ink-puff heart |
| Jelly | pulse squash (0.92 w / 1.08 h, back to 1.06 w / 0.94 h), 1.6 s, tentacles lag 120 ms | glow ripple down the ribs (comb jelly); twinkle (sea sparkle) |
| Wing (rays) | wing flap: tip rotation ±10°, 2.0 s, tail lags 150 ms | barrel roll squash (manta); flat glide shimmy (stingray) |
| Object-like | breathe 1 ± 0.015, 3.6 s. Blink | star waves one arm; clam opens 15° and shows a pearl; limpet scoots 2 units; urchin spines ripple; sand dollar rolls 360° like a coin |
| Horse/dragon | upright bob ±2, 2.0 s. Dorsal-fin flutter ±10° at 0.12 s (seahorses really do this) | tail curl tighten; leaves sway (dragon) |
| Turtle | flipper paddle ±18°, 1.8 s, front and back opposite in phase | head tucks into the shell and peeks out |
| Snail/nautilus | eye-stalk bob ±2, 1.4 s | slide 3 units; nautilus jets backward with a bubble |

**R24. Size sets tempo.** Period multiplier: XS 0.6, S 0.8, M 1.0, L 1.25, XL 1.5, XXL 1.8.
Amplitude, in artboard units, scales inversely (XS ×1.3 … XXL ×0.6). Tiny creatures fidget. Huge
ones drift.

**R25. Squash and stretch** on every jump, land and pop. Volume is preserved (`sx × sy ≈ 1`).
Extremes: 0.85/1.18 for XS–S, 0.9/1.1 for M–L, 0.95/1.05 for XL–XXL (big = heavy). Easing:
anticipation 80 ms ease-in, action ease-out-back (overshoot 1.08, matching ADR 0003's place
token), settle 120 ms.

**R26. Leap and release choreography** (the scene's existing parabola plus homing):
1. *Splash-out:* 60 ms anticipation (squash 0.9) at the lagoon surface, then launch with stretch 1.12.
2. *Apex:* switch to `happy` for 250 ms. For a new species, switch to `surprised` and add the existing
   gold ring (keep it, and add 4 sparkle ticks).
3. *Fall/dive:* stretch along velocity. Tail and fins follow through. On re-entry, a splash scaled by size
   class. Released creatures do a tiny wave (tail flick) before vanishing.
4. *To the journal:* homing arc as today. The creature turns to face its direction and shrinks.
   The journal button does a 1.1 bounce on arrival.
- Size class changes the leap: XS do a quick double-hop (two short arcs, 0.75× duration). XL do a
  slow, high, heavy arc (1.2× duration, bigger splash; no screen shake, per ADR 0003). XXL breach: 1.35× duration, and a body larger than the lagoon is fine. It's the moment.
- Reduced motion: no squash, no hops, crossfade expressions, the leap becomes a 200 ms
  fade-and-rise.

### G. Size

**R27. Six size classes** (presentation property, stored per species; default derived from the
geometric mean of `size`, overrides allowed):

| Class | Typical size | Journal tile fill (share of tile height) | Leap scale (× today's) | Reference shown in detail view |
|---|---|---|---|---|
| XS | < 4 cm | 0.38 | 0.55 | "¼ pebble" next to one board pebble |
| S | 4–12 cm | 0.52 | 0.75 | "1–3 pebbles" |
| M | 12–40 cm | 0.66 | 1.0 | a row of pebbles |
| L | 40–150 cm | 0.80 | 1.3 | "about one board" (8 pebbles ≈ 32 cm) |
| XL | 1.5–5 m | 0.92 | 1.6 | "N boards long" |
| XXL | > 5 m | 1.15, *bleeds out of the tile* (clipped by the tile's rounded mask, tail cut off) | 2.0 (cap 3.2 cells) | "30 boards long" plus a tiny pebble beside the head |

**R28. Communicating size in the grid** (three cues, no text):
1. scale within the tile (above);
2. **frame-breaking** for XL/XXL: fins or tentacle tips overlap the tile edge by 2–4 px, and XXL is
   cropped. "It doesn't fit" is the funniest, clearest way to say huge;
3. tempo (R24): the whale shark drifts, the shrimp fidgets.
The detail view adds a **size line** under the art: a pebble icon (our board block, which every
player knows intimately) at true relative scale, with "Biggest: 11.4 m · about 36 boards". We
choose 1 pebble ≈ 4 cm as a fixed, playful unit. Records already exist in the journal.

### H. Rarity presentation

**R29. Five tiers plus golden, each signalled by frame, background, pips (non-colour) and
motion.** Colours come from the pebble palette (ADR 0003), in the conventional rising order.

| Tier | Journal tile | Detail view | Discovery reveal (first catch) |
|---|---|---|---|
| Common | plain tile, 1 pip | plain | 600 ms: bubble pops, `surprised` to `happy`, 6 foam dots |
| Uncommon | 1.5 px kelp `#53C08C` inner frame, 2 pips | soft kelp radial behind the creature (12 % alpha) | 800 ms, plus a ring wave |
| Rare | 2 px lagoon `#3D9BE9` frame, 3 pips, faint radial glow | radial glow plus 3 slow sparkles | 1100 ms: anticipation wobble ×2, pop, 12 sparkles, `proud` |
| Epic | 2 px orchid `#8E5BD8` frame with rounded corner notches, 4 pips, 2 static sparkles | glow plus a slow-rotating soft light ray disc (8 rays, 20 s/rev) | 1400 ms: wobble ×3, light rays fan open, `proud`, bigger chime |
| Legendary | 2.5 px sun `#F2B93B` frame, wave-scalloped edge, 5 pips, sparkles | rays plus drifting motes plus a name ribbon | 2000 ms (tap to skip): bubble glows from within, cracks, rays sweep, creature rises slowly (tempo of its size), `proud` then `happy`, full chime |
| Golden (any species, 1/64) | the creature itself is golden (R33). Frame unchanged, plus a glint sweep every 4 s | glint plus 3 orbiting sparkles | Pokémon-style entry sparkle: 5 star-twinkles around the creature, 500 ms, added to the normal reveal |

- Pips are tiny shells under the name, so rarity never relies on hue alone (ADR 0003's
  colour-vision rule).
- Locked tiles show the **frame and pips** of their tier with the silhouette. Players know a
  legendary is waiting, and that pull is visible incompleteness (COLLECTION.md §2).
- Honesty rule: the reveal's tier is known when it starts. **No fake-out escalation.**

**R30. The "present".** The first catch of a species is staged as a gift, on the game-over card
"New in your journal" row (and the journal's first open after). It never happens mid-board, since
the board stays clean (ADR 0007).
1. A **bubble-pearl** (the wrapper: a translucent sphere tinted by tier) sits in the slot with a
   gentle wobble. The silhouette is faintly visible inside.
2. Tap, or auto after 400 ms: anticipation squash, then the bubble pops into foam (reuse the ring-pop
   particles).
3. The creature springs out with stretch 1.15, shows `surprised` for 300 ms, then its tier expression
   and its **signature idle once**.
4. The name types in (30 ms per char) with the hint line flipping to the flavour line: the riddle
   answered.
5. Sound: the capture "bloop" plus the pentatonic chime, one step higher per tier.
Multiple new species queue one at a time (consistent with CLAUDE.md's "one channel" rule).

**R31. Re-catch delight is small.** Duplicate catches only play `happy` in the leap. A new size
record gets a "+3 cm!" ribbon and the `proud` face on the game-over card.

**R32. Night versions.** Day-habitat species viewed on the Night theme show `sleepy` in the
journal. Night-habitat species are awake, glowing and slightly brighter. On Day, night species
show `sleepy` and their glow is off. The journal gets a living day/night mood (the Alto lesson)
at no extra art cost.

**R33. Golden variants are a palette remap, not an overlay.** body → `#F2C14E`, accent →
`#FFF1C2`, belly → `#FFE08A`, ink → `#8A5A12`. Pattern preserved. Plus a 2-stop linear gradient
highlight (the only gradient allowed), a glint sweep and sparkles (R29). The Golden Turtle
legendary uses a *rose-gold* remap when golden (`#F2A65A`/`#FFE3C2`) so it stays distinct.

### I. Performance

**R34. Vector at authoring, raster at runtime.** Each species × expression-independent part set ×
size bucket × DPR × theme is rasterised once into an offscreen canvas (as ADR 0003 does for
pebbles). Size buckets are 24, 32, 48, 64, 96 and 160 CSS px.

**R35. Rig split for animation:** at most **6 cached layers** per animated creature (body, tail/fin
A, fin B or limbs, light organs, face-free head detail, shadow). The face rig (eyes, highlights,
mouth, blush) is drawn live: 2–8 arcs per frame, which is cheap and keeps the expressions free.

**R36. Draw-cost budget** at 4× CPU throttle (`tests/perf`, whole-frame p95 < 8 ms):
**≤ 0.12 ms per animated creature**, **≤ 1.0 ms for all creatures combined** in any frame.
**No `Path2D` construction, `shadowBlur`, `filter` or gradient creation per frame.**

**R37. Concurrency caps:**
- Leap: at most 6 animated creatures (cascade plus multi-pocket). Extras merge into the "+N" chip.
- Journal grid: all visible tiles run blink and bob from cache, at most 30 fps, paused when hidden.
  **At most 1 signature idle** plays at a time on a random visible found tile, every 3–5 s.
  The grid feels alive like a Neko Atsume yard without 47 rigs running.
- Detail view: 1 full rig.
- Reduced motion: static `idle` frames, blinks only.

**R38. Cache memory cap** of 12 MB (LRU), measured as w × h × 4 × DPR². Grid tiles use one
composite sprite per species. Rigs are built only for the detail view and the leap.

**R39. Lazy art.** All species art lives in a lazily loaded chunk (§5). Prefetch it with
`requestIdleCallback` after first paint so it's ready before the first capture. Until it loads,
the leap uses today's generic leaping fish (it already exists in `scene.ts`).

---

## 4. Appendix: per-species direction (all 47)

Size class from R27 (geometric mean of `size`). Overrides are marked ★ (Baby Kraken is drawn
XL: "baby" by kraken standards, and the brief asks for a huge kraken). Palette notes use the
existing `colors` where they work and propose fixes where they fail on a theme.

| id | Class | Key silhouette feature (24 px) | Personality (3 words) | Signature idle | Palette notes |
|---|---|---|---|---|---|
| minnow | S | slim torpedo, deep forked tail, tiny body | eager, first, twitchy | darts forward and back in a blink | silver `#B8C4CF`, belly lighter, one lagoon-blue lateral stripe as accent (makes it read on Day) |
| periwinkle | XS | round spiral shell, two tiny eye-stalks | slow, content, homebody | eye-stalks bob, then a 2-unit slide | brown shell with 3 cream `rings`. Foot cream. Eyes on stalk tips |
| hermit | XS | big spiral shell, crab face and one big claw poking out | brave, borrowed, cocky | ducks into its shell, then peeks out with a claw wave | coral body `#E0784E`, sun shell `#F2C14E`. Oversize the right claw |
| limpet | XS | low rounded cone (volcano), skirt line | clingy, stubborn, sweet | hunker-squash (holds on tight), then a tiny scoot | ribs as 3 ridges only. Raise body L for Day (outline does the rest). Eyes at cone base |
| sanddollar | S | flat disc with a 5-petal flower | calm, coin-like, polite | rolls 360° on its edge like a coin | body `#E9DCC4` passes only with the outline. Petals in accent. Face under the flower |
| shrimp | XS | C-curl comma with a fan tail and two long antennae (filled, at least 5 units) | jumpy, startled, silly | the backward flick: snaps tail and recoils 8 units | pink `#F59A8B` with cream `bands` (4). Big eye (24 %) |
| blenny | S | blunt round head with two eyebrow tufts (cirri), long low dorsal | nosy, cheeky, peeky | peeks up from below the tile edge, eyebrows waggle | olive body, darker olive `spots` (5). Tufts are its signature |
| cockle | XS | heart-ish ribbed shell, wider than tall | dreamy, musical, round | opens 10° and "hums" (3 little note particles) | warm cream with 4 brown `ribs`. Eyes in the shell gap |
| sandeel | M | very long thin needle with a pointed nose | zippy, shy, sandy | dives tail-first into the tile floor and pops back up | sand `#D8C79A` needs the outline on Day. Add a silver belly |
| moray | L | thick long tube, big open grin, low frill fin | toothy, grinning, friendly | the grin: mouth opens wide with two rounded teeth, then a wink | green `#5E7D3C` with yellow `spots` (7, varied size). The face zone is the head only |
| gardeneel | M | vertical stalk rising from a sand burrow (only the top half visible) | swaying, social, timid | retracts into the burrow and rises again | cream body with 3 dark `spots`. Draw the burrow mound as part of the silhouette |
| seahorse | S | S-curve, snout, curled tail, dorsal-fin bump | gentle, devoted, proud | dorsal flutter, then tail curl tighten. Holds a tiny bubble | sun `#F2B93B` with orange `bands` (3) |
| boxcrab | S | rounded-square shell, claws folded in front like a box lid | tidy, neat, prim | unfolds its claws, waves, folds back | `#C9503A` shell with peach `spots` (4). Legs as 3 nubs a side |
| boxfish | M | near-cube rounded square, tiny fins, pout mouth | earnest, chunky, polite | tiny fins whir furiously (0.12 s) while the body barely moves | yellow `#F2D43B`, black polka dots (6, authored). Ink derived dark gold |
| starfish | M | 5 plump rounded arms (radius ≥ 6), face in the middle | relaxed, huggy, slow | waves one arm, hello | coral `#F2795B` with pale-peach bump `spots` along the arms |
| cuttle | M | oval mantle with a fin skirt, short arm tuft at the front, W-pupil eye | moody, clever, shifty | colour ripple: a band slides across the body in the accent colour | tan `#B48A6E`, cream zebra `stripes` (3). Pupil may be a "W" (signature) |
| flounder | M | flat oval with a rim fin, both eyes on the top edge (one higher) | wry, flat, watchful | eyes swivel, then it "flops" flat (squash 1.1/0.85) | sand with brown `spots`. Eyes stacked: the joke |
| stingray | L | kite/diamond from above, long whip tail | serene, gliding, aloof | slow wing ripple, glide across the tile | grey-blue `#8C9BA8`. Lighten it, white belly on the edge. Pale `spots` |
| clownfish | S | rounded body, rounded fins, 3 white bars with ink edges | chatty, cheerful, clingy | wiggles into a tiny anemone tuft (prop) and out | orange `#F2792E`, white `bands` ×3 with ink trim |
| damsel | S | deep oval, swallow tail, tall upright posture | brave, small, bold | puffs up its chest and charges 4 units (tiny defender) | `#3D6FE9` blue, pale-blue fin tips. Needs the night rim (mid-dark) |
| puffer | M | ball with short spines (rounded, at least 5 units) and a small tail | nervous, dramatic, relatable | the puff: 1.0 to 1.35 (spines extend), embarrassed blush, deflate | sand `#D9C27A`, brown `spots`. `surprised` face while puffed |
| parrot | M | chunky body, beak-like front, crescent (lunate) tail | crunchy, busy, chill | crunches (beak chomps twice) and leaves a little sand puff | teal `#3BC9A0` with pink `stripes` (2). Beak in a lighter tone |
| grouper | L | massive head, huge downturned lips, rounded tail | unbothered, enormous, grumpy-sweet | a slow, huge yawn (mouth `open` to 1.5×), then half-lids | brown `#8A6A4E` with tan `saddle` blotches. Half-lid idle is its personality |
| octopus | L | big round mantle head, 6 visible plump arms curling outward | mischievous, clever, playful | hides behind two arms, then peekaboo with a wink. A tiny ink heart puff | `#C2506B` with pink suction-cup `spots` on the arm tips |
| manta | XL | wide wing triangle with two head fins (cephalic lobes), short tail | majestic, friendly, waving | waves one wingtip (it "waves back") | lift the body to slate `#3E5068`, white belly on the wing edge, ink rim on Night |
| turtle | L | dome shell, front flippers, round head | wise, steady, homeward | the head tucks into the shell and peeks out, smiling | green shell with tan scute `saddle` plates (5, hexagonal-rounded). Skin `#C9B47A` |
| barracuda | L | very long torpedo, underbite jaw, forked tail | sleek, toothy, aloof | a fast lunge of 10 units, then pretends nothing happened | silver with 6 dark chevron `bands`. Two rounded teeth |
| hammerhead | XL | T-shaped hammer head with eyes at the tips, tall dorsal | earnest, curious, wide-eyed | turns its head side to side, scanning ("sees every direction") | grey `#7E8C99`, white belly. Frame-breaking hammer tips |
| nautilus | M | coiled shell with tiger stripes, a little tentacle tuft at the opening | ancient, polite, unhurried | jets backward 6 units with a bubble trail | cream with orange-brown `rings`/stripes. A big eye at the shell opening |
| dolphin | XL | sleek curved body, beak, curved dorsal, flukes | joyful, friendly, showy | a little spin-leap inside the tile, plus its smile | blue-grey `#7FA8C9`, white belly. Mouth curve is a permanent smile |
| urchin | S | ball with radiating rounded spines (12, long), face in the middle | prickly, shy, huggable | spines ripple in a wave around the ring | lift `#5B3A7A` to L 0.48, lighter spine tips `#9C7AC9`. Night rim needed |
| lanternfish | S | small fish, big eye (24 %), row of glowing photophores | earnest, tiny, glowing | photophores blink in sequence front to back | `#2FB8D8` body, `#9BF0FF` `glow` dots (baked glow). Awake at night, sleepy by day |
| moonjelly | M | translucent round bell, 4-leaf clover marks, short frilly arms | floaty, carefree, dreamy | slow pulse, then drifts up and settles back down | `#C9D6FF` bell at 85 % alpha over its own ink outline. Four-leaf marks in accent |
| combjelly | S | oval egg (not a dome), 8 rib rows, no tentacles | shimmery, delicate, quiet | rainbow ripple runs down the ribs (hue cycle, cached in 6 steps) | pink body. Ribs cycle through the pebble palette. Glow at night |
| firefly | S | slim squid mantle with arrowhead fins, glowing arm tips | blinky, social, bright | blinks hello: 3 blue flashes | blue `#3D9BE9`, `glow` spots `#9BF0FF` |
| angler | L | big round head-body, huge underbite with teeth, lure on a stalk | gruff, secretly sweet, hosty | the lure brightens, it beams, offers the light to the viewer | lift `#3B3240` to L 0.45 purple-grey, lure `#F2E97A` glow, white rounded teeth. Night rim |
| seasparkle | XS | a cluster of 3 tiny glowing orbs (one big with a face) | twinkly, tiny, starry | twinkle: orbs pulse out of phase | `#7DF9E8` with white core. Glow essential. On Day: soft teal with outline |
| butterfly | M | tall disc body, pointed snout, false eye spot on the tail | dainty, tricky, sunny | spins to show its false eye, then winks with the real one | yellow `#F2D43B`, dark `bands` (eye band plus a tail eye-spot) |
| wrasse | S | slim cigar, one bold black stripe nose to tail | helpful, busy, tidy | a little "scrub" wiggle with a bubble-sparkle (spa service) | blue `#3D9BE9`. Replace `#1A1A1A` with derived ink. One `stripes` line |
| lionfish | M | big fan of rounded feathery fins and spines (5 rounded rays a side) | fabulous, vain, dramatic | fans its fins open like a peacock, then a `proud` face | `#C9503A` with cream `bands` (5). Fin rays as filled tapered capsules |
| giantclam | L | huge wavy-edged shell, lips open showing a colourful mantle | wise, sleepy, ancient | slowly opens to reveal a pearl, then closes with a satisfied smile | teal mantle `#3BC9A0` with blue `spots`. Shell lip in cream. Eyes on the mantle |
| sunfish | XL | tall disc, no tail (the clavus), long top and bottom fins | sunny, dopey, gentle | flops onto its side to sunbathe, then rights itself | silver-grey `#B7C3CF`. Add a warm sun-blush. Fins frame-break |
| otter | L | floating on its back, round head with ears, paws on its chest, tail | cuddly, sleepy, loving | rubs its paws, or holds a shell up, then hugs it | brown `#7A5A3E`, cream face `#D9C2A6`. Blush always on |
| whaleshark | XXL | wide flat head with a huge wide mouth, cropped by the tile | gentle, huge, kind | an enormous slow blink and a tiny smile. Plankton specks drift into its mouth | lift `#3E5A73` to L 0.5, white `spots` in an authored grid, white belly. Cropped tail |
| seadragon | M | seahorse S-curve covered in 6–8 leaf-shaped lobes | regal, leafy, shy | leaves sway in a current (overlapping action), then it bows | gold `#C9A53B` body, green leaves `#8AB17D`. Legendary, so `proud` is its default |
| goldturtle | L | turtle with a crown-like shell ridge and longer flippers | serene, radiant, rare | slow "flight" paddle with a light trail | sun gold `#F2C14E`, cream `#FFF1C2` plates. Golden variant = rose gold (R33) |
| kraken | XL ★ | huge round head with 8 curling arms, tips breaking the frame | adorable, menacing-ish, babyish | tries a scary pose (arms up), then giggles and blushes | `#5B3A7A` lifted to L 0.48, pink `#E86FB0` suckers. Night rim. `sleepy` impossible: it's a night creature |

**Silhouette disambiguation for the fish family** (the biggest current failure):
minnow = slim + fork. Blenny = blunt head + tufts. Clownfish = round + round fins. Damsel = deep oval + swallow
tail, upright. Parrot = beak + crescent tail. Grouper = huge head + lips. Barracuda = 3 : 1 needle +
underbite. Lanternfish = big eye + tiny body. Butterfly = tall disc + snout. Wrasse = cigar.
Lionfish = fan of fins. No two share body aspect, tail type and fin profile at once.

---

## 5. Art pipeline options and recommendation

| | A. Drawn in code (Canvas2D calls, today) | B. Authored SVG path data rendered via `Path2D` | C. Pre-rendered sprite atlas (PNG/WebP) |
|---|---|---|---|
| Quality ceiling | medium. Every curve is hand-typed arithmetic, so the art drifts to "ellipse + triangle" | high for flat, vector, character art (our style) | highest *if a human illustrator paints*. An agent cannot paint |
| Bundle | smallest (~10 KB gz today, in the initial bundle) | ~0.5–0.9 KB gz per species of path data, plus ~6 KB gz rig. **≈ 35–45 KB gz total, lazy-loaded** | 47 species × expressions × sizes × DPR × theme: 300–800 KB, and it never covers every DPR crisply |
| 60 fps at 4× throttle | fine if cached (today it isn't cached in the leap) | fine: rasterise once per bucket (R34), then `drawImage` | fine: `drawImage` only |
| Animation and expressions | free (parameters) | free: parts have pivots, the face rig is live (R35) | each expression or frame is another image. Idles need frame sequences |
| AI agent as the artist | can write it, but tuning bezier control points through arithmetic is slow and opaque | **best fit**: SVG path `d` strings are the lingua franca of vector art. The agent can write and edit them, render PNGs via Playwright, look, iterate, and diff text | the agent would need an image generator. Results won't share one construction system, and edits are opaque binaries |
| Theme handling | code | code (ink, rim, sleepy face generated) | needs Day/Night variants or runtime tinting |
| Testability | good | **excellent**: masks, IoU, contrast and part counts are computed from the same data | silhouette tests are possible, structure checks aren't |

**Recommendation: B, a "parts as SVG path data + shared code rig" hybrid, lazy-loaded and
rasterised to caches.**

- Each species is a small data module in `src/render/creatures/`: named parts (`d` string on the
  100-unit grid, fill role `body|accent|belly|light|ink`, z-order, pivot, idle channel), face
  placement (eye centre(s), face-zone box, mouth anchor), size class, signature-idle id and
  palette. Rendering uses `new Path2D(d)` (SVG path-string constructor), filled through the shared
  stroke-behind outline (R14). Parse once per session, then cache rasters. Verify the `Path2D(string)`
  constructor in the WebKit e2e run, since iOS WKWebView is a ship target.
- The **face rig, patterns, outline, night rim, golden remap, sleepy lids and expression set are
  code**, shared by all species. That's what guarantees cohesion (the "single guiding hand").
- Chunk: `import('./creatures/index.ts')` on idle after first paint (R39). The initial bundle stays
  at ~41.6 KB gz, well under the 64 KB budget. The art chunk target is ≤ 45 KB gz, with a CI size check.
- The silhouette mask, the bounding box (size class), part and segment counts, and contrast are all
  computed from the same data in Vitest. R12/R16 checks become unit tests, not opinions.
- **Agent workflow (the artist loop):** edit one species file, then let the gallery tool
  (`tools/gallery`) render 5 sheets via Playwright:
  (1) Day and Night tiles at 54 px;
  (2) 24 px fill-only silhouettes grouped by habitat;
  (3) the expression strip (idle, blink, happy, surprised, proud, sleepy);
  (4) a size lineup at true relative scale, with the pebble;
  (5) before/after.
  Look at the PNGs, iterate, and log in the diary. Redraw like Sugimori: proportions get adjusted
  until satisfied, not accepted on the first pass.
- Keep A only as the fallback (the existing generic leaping fish) and for particles. Keep C
  out unless a human illustrator joins later. Even then, author the art as SVG and feed it into B.

**Suggested order of work:** (1) shared rig + outline + palette derivation + caches on 3 pilot
species (clownfish, octopus, sand dollar: one fish, one chibi, one object), reviewed on both
themes. (2) the silhouette and contrast tests. (3) the 11 fish (the biggest win). (4) everything
else by habitat. (5) idles and the present reveal. (6) rarity frames and golden. Write an ADR when
the pilot lands ("0008: creature art system"), since this is a big decision per `CLAUDE.md`.
