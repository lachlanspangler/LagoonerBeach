# Beach Journal: showing unlock requirements and progress (research + design proposal)

Status: research and proposal. No code changed. Builds on `docs/research/COLLECTION.md` (why
collection loops work) and ADR 0007. Code read: `src/meta/creatures.ts`, `src/meta/catch.ts`,
`src/meta/journal.ts`, `src/meta/catchTuning.ts`, `src/ui/sheets.ts` (`showJournal`,
`showSpecies`), `src/app/main.ts:199,257`.

**Problem.** The journal groups 47 species under 6 habitat headers with "8/10" and a bar
(`showJournal`), but a header never says what the habitat *needs*. Several habitats have a hard gate
the player can't guess: Night needs the Night theme, and Reef needs Reef puzzles. Hints are
hand-written strings that already drift from the real predicates (§3.3).

---

## 1. How the best collection screens show requirements and progress

Linked points were verified on the web in this pass. Points marked **(play)** come from playing the
games: the wiki hosts (Bulbapedia, Fandom, Nookipedia, Stardew wiki, IGN) refused automated fetches
(HTTP 402/403), so those details are not web-verified here.

| Game / screen | What it shows for *locked* entries | Progress display | Requirement style | Lesson for us |
|---|---|---|---|---|
| **Pokédex** | (play) Seen-only entries show the sprite and the area seen, but no details; unseen are "???" with a number | (play) Seen / Caught counters per region | Implicit: *where* (habitat/area map) | Two states per entry (seen vs caught) give progress *before* the catch. The dex is "a fictional encyclopedia of all Pokémon species", and filling it is the post-game goal ([Wikipedia: Gameplay of Pokémon](https://en.wikipedia.org/wiki/Gameplay_of_Pok%C3%A9mon)) |
| **Animal Crossing NH: Critterpedia, museum** | (play) Uncaught = grey silhouette; caught shows months and hours, and an owl icon marks museum donation | (play) Count per category; "available now" filter | **When and where** (months, time, location); "season-dependent", "limited time of the year" ([Wikipedia](https://en.wikipedia.org/wiki/Animal_Crossing:_New_Horizons)) | Requirements are *conditions of play* (time, season, place). Ours are too: theme, mode, shape. Show them as calm facts, not tasks |
| **Hades: Codex** | (play) Locked entries show a progress bar ("encounter N more times") and no text | (play) Bar per entry; text unlocks in chunks | Repetition counter | A **per-entry progress bar toward unlock** without spoilers. Our version is "eligible chances so far" (§4.4) |
| **Stardew Valley: Community Center bundles** | (play) Item slots shown as silhouettes; already-delivered slots filled; "N of M items needed" | (play) Slots plus a reward icon; ticks when complete | **Explicit list** | Bundles are sets of goods delivered to unlock areas ([Wikipedia](https://en.wikipedia.org/wiki/Stardew_Valley)). A *set with ticks and a completion reward* motivates finishing a group. That is our habitat tick |
| **Slay the Spire: Compendium** | (play) Unseen cards are face-down or locked; seen ones are full | (play) Count per colour | None (discovery is the requirement) | Showing totals per category is enough when unlocking is luck |
| **Neko Atsume: album / Catbook** | (play) Unmet cats are silhouettes | (play) Count | Rare cats appear "only when certain items and foods are placed" ([Wikipedia](https://en.wikipedia.org/wiki/Neko_Atsume)) | The rule is learnable but *not spelled out*: players experiment. The hint level is a design choice |
| **Zelda TOTK: Hyrule Compendium** | (play) Unregistered entries are blank slots with numbers; photos register them | (play) % per category | None, plus an optional purchasable photo | A numbered gap tells you something exists. We already show "No. N" |
| **Genshin Impact: achievements** | (play) Hidden achievements show "???"; visible ones show criteria and a progress bar "3/10" | (play) % per category; ticks; reward per item | Explicit counters | Use "hidden" sparingly, only for the legends where the reveal is the fun |
| **Duolingo: quests** | (play) Each quest shows a progress bar "7/10" and a deadline | (play) Bars plus chest | Explicit and short | One line of requirement plus a bar is the most readable mobile pattern |
| **Dorfromantik: tile quests** | n/a | Number on the tile | Explicit target ("a railway line … with a minimum length", [Wikipedia](https://en.wikipedia.org/wiki/Dorfromantik)) | A requirement can be one number on the thing itself |

### Spoiler-free hint patterns (synthesis)
1. **Silhouette + number + rarity:** something is here, and this is how rare it is (Critterpedia, Zelda,
   our tiles today).
2. **Condition, not answer:** say *where and when* (Animal Crossing), not "make a 3×3 square on move 60".
3. **Progressive reveal:** the hint gets more specific with effort (Hades bars, Pokédex seen → caught).
4. **Category gate stated once at the header:** "Only after dark" belongs at the section level,
   not repeated on each tile (Animal Crossing's per-category filters, Stardew rooms).
5. **Hidden on purpose, rarely:** "???" is fine for legends (Genshin hidden achievements), but
   every hidden entry still needs a nudge, or the player gives up.
6. **Ticks reward completion:** a set that finishes deserves a mark and a small moment (Stardew).

---

## 2. Our real rules (from the code)

### 2.1 How a catch happens (`src/meta/catch.ts`)
- Every captured lagoon becomes a `CatchContext` (`contextsFor`/`catchCapture`): `area`, `shape`
  (`classify`: dot, pair, hline, vline, square2, square3, rect, plus, island, corner, blob), `w`, `h`,
  `wave`, `pockets`, `streak`, `moves`, `clean`, `night`, `mode`, `tier`, `reefWin`.
- `night` is **the theme at capture time**: `night: scene.palette.name === 'night'` (main.ts:199).
  The theme is `settings.theme`, or with `'auto'` the OS dark mode
  (`darkQuery.matches ? 'night' : 'day'`, main.ts:257).
- `rollCatches`: `eligible = SPECIES.filter((s) => s.when(ctx))`. Specials (non-common), rarest
  first, each get `CHANCE_BY_ID[id] ?? CHANCE[rarity]` (`{ uncommon: 0.07, rare: 0.025, epic: 0.016,
  legendary: 0.12 }`). For unfound species this is multiplied by
  `pity = Math.min(2, 1 + Math.max(0, journal.dry - 150) / 150)`. Otherwise an everyday (common, else
  uncommon) species is picked by `weight`.
- **Golden:** `golden: journal.has(sp.id) && rng.next() < 1 / 64`. This is per caught creature,
  only for species already in the journal (including ones found earlier in the same capture).
  Chance of at least one golden of a given species after n more catches of it is 1 − (63/64)^n:
  50% at 44 catches and 90% at 146.
- Count per lagoon: `catchCount`: 1 for area ≤ 2, 1 or 2 (30%) for 3–11, 2 for ≥ 12.

### 2.2 Habitats: the exact rule each one implies

Helpers: `small = area <= 2`, `mid = 3..5`, `big = 6..11`, `huge = area >= 12`, `day = !c.night`.

| Habitat (n) | Is there a single gate? | Exact rule (union of the species' `when`) |
|---|---|---|
| **Night** (6) | **Yes: `c.night`.** Every species starts with `c.night && …` | Only while the game is in the **Night theme** (setting, or Auto with the OS in dark mode), any mode. lanternfish `c.night && c.area <= 4`; moonjelly `c.night && c.area >= 3`; combjelly `c.night && (hline \|\| vline)`; firefly `c.night && c.pockets >= 2`; angler `c.night && huge(c)`; seasparkle `c.night && dot && c.streak >= 6` |
| **Reef** (4) | **Yes: `c.mode === 'puzzle'`** | Only in **Reef puzzles**. butterfly `c.mode === 'puzzle'` (any pool); wrasse `… && c.wave >= 2`; lionfish `… && !!c.reefWin && (c.tier === 'deep' \|\| c.tier === 'abyss')`; giantclam `… && !!c.reefWin && c.tier === 'abyss'` |
| **Legends** (4) | **No.** Four different special conditions | whaleshark `c.wave >= 3` (a 3-wave cascade, any mode); seadragon `c.clean && c.mode !== 'puzzle'` (clear the whole board, not in Reefs); goldturtle `c.shape === 'island' && huge(c)`; kraken `c.night && huge(c) && c.streak >= 5` (also needs Night) |
| **Shallows** (10) | **No.** Mostly small pools, any mode, with 2 exceptions | minnow `small && day`; periwinkle `dot && day`; hermit `pair`; limpet `dot`; sanddollar `small && day`; shrimp `area <= 4`; blenny `mid`; cockle `mid`; urchin `dot && streak >= 6`; **otter `mode === 'daily' && streak >= 8 && area >= 3`** (Daily only) |
| **Lagoon** (15) | **No.** Pool *shapes* and multi-pool moves, any mode | sandeel `hline`; moray `hline && w >= 5`; gardeneel `vline`; seahorse `vline && h >= 4`; boxcrab `square2`; boxfish `square3`; starfish `plus`; cuttle `corner`; flounder `rect && w > h`; stingray `rect && area >= 6`; clownfish `pockets >= 2`; damsel `pockets >= 3`; puffer `mid && blob`; parrot `area >= 6 && day`; grouper `big` (6–11) |
| **Deep water** (8) | **No.** Big or late moments | octopus `huge`; manta `rect && huge`; turtle `island`; barracuda `area >= 6 && moves >= 60`; hammerhead `huge && moves >= 90`; nautilus `wave >= 2`; dolphin `streak >= 12 && area >= 6`; **sunfish `mode === 'daily' && area >= 6`** (Daily only) |

**Hidden day-gates.** Four species can **never** be caught in Night: minnow, periwinkle, sanddollar,
parrot (`day(c)`). A player whose phone is always in dark mode, with Auto on, can't finish Shallows or
Lagoon and is never told why. This is the most important requirement to surface.

**Mode gates outside their habitat:** otter (Shallows) and sunfish (Deep) are Daily-only. Seadragon
(Legends) is *not* available in Reefs.

### 2.3 Copy that has already drifted from the code
| Species | Hint today | Real rule | Drift |
|---|---|---|---|
| minnow | "Any little pool." | `small && day` | missing "by day" |
| periwinkle | "A single-cell pool." | `dot && day` | missing "by day" |
| parrot | "A big pool, six cells or more." | `area >= 6 && day` | missing "by day" |
| grouper | "A big pool, six cells or more." | `big` = 6..**11** | 12+ never yields it; same hint as parrot |
| shrimp | "A small pool." | `area <= 4` | "small" elsewhere means ≤ 2 |
| lanternfish | "A small pool, after dark." | `night && area <= 4` | same |
| barracuda | "A big pool, late in a long game." | `moves >= 60` | "late" is unquantified (fine as flavour, but not testable) |

Hand-written copy next to code will keep drifting. The fix is structural (§3).

---

## 3. Design: one source of truth for rules, copy and progress

### 3.1 A structured requirement per species
Replace the free `when` lambda with data. Derive `when` from the data, and generate the hint from the
same data (with an optional hand-written flavour line).

```ts
// src/meta/req.ts (pure)
export interface Req {
  area?: readonly [number, number];          // inclusive, Infinity allowed
  shape?: readonly Shape[];
  minW?: number; minH?: number; wGtH?: true;
  pockets?: number; wave?: number; streak?: number; moves?: number;
  theme?: 'day' | 'night';                   // c.night === (theme === 'night')
  mode?: readonly Mode[]; notMode?: readonly Mode[];
  tier?: readonly string[]; reefWin?: true; clean?: true;
}
export const matches = (r: Req, c: CatchContext): boolean => /* field by field */;
export const describe = (r: Req): string[] => /* ["after dark", "a long flat pool", "5+ cells"] */;
```
`Species` gets `req: Req` in place of `when`, and `when = (c) => matches(sp.req, c)`. `rollCatches`
stays unchanged, so catch odds, `catchTuning.ts` and `scripts/catch-sim.ts` keep working.
Example: `grouper: { area: [6, 11] }`, `parrot: { area: [6, Infinity], theme: 'day' }`,
`kraken: { theme: 'night', area: [12, Infinity], streak: 5 }`.

### 3.2 A requirement per habitat
```ts
export const HABITAT_REQ: Record<Habitat, { gate?: Req; line: string }> = {
  night:    { gate: { theme: 'night' },   line: 'Only after dark: play in the Night theme' },
  reef:     { gate: { mode: ['puzzle'] }, line: 'Only in Reef puzzles' },
  shallows: { line: 'Small pools, one to five cells' },
  lagoon:   { line: 'Shaped pools: lines, squares, plus, L, rectangles' },
  deep:     { line: 'Huge pools, islands, cascades, long games' },
  legend:   { line: 'Rare feats: deep cascades, clean boards, huge islands' },
};
```
Mode and theme exceptions inside a habitat (otter, sunfish, the four day-only species) are shown
**on the tile**, from `describe(sp.req)`, as a small badge: ☀ Day, ☾ Night, Daily, Reef.

### 3.3 Tests so copy can't drift (`tests/unit/journalReq.test.ts`)
1. **Gate implication (property test):** for every species with a habitat `gate`, and for every
   context in the enumerated space (all shapes × areas 1..20 × w/h fitting × wave 1..4 × pockets 1..3 ×
   streak 0..14 × moves {0,59,60,89,90} × night × mode × tier × reefWin × clean, ~10⁵ contexts,
   well under 1 s), `matches(sp.req, c) ⇒ matches(gate, c)`. A Night species without `theme: 'night'`
   fails.
2. **Habitat line truth:** each `line` lists keywords from `describe(req)` of its own species. Each
   keyword must be produced by at least one member (no "islands" in Deep without turtle).
3. **Hint is generated:** the tile hint equals `describe(sp.req).join(', ')` (capitalised). Hand
   copy can only add `flavor`. This fixes all of §2.3 by construction.
4. **Equivalence (migration only):** before deleting the old lambdas, assert
   `old.when(c) === matches(new.req, c)` over the same enumerated space for all 47. Drift found
   here means a balance change and must go through `scripts/catch-rates.ts --write`.
5. Keep the existing "every lagoon has an everyday species" test (`tests/unit/catch.test.ts:129`).

### 3.4 Progress values (all from data the game already has)
- `got/total` per habitat from `j.entries` (exists).
- **Golden per habitat:** count of species with `entries[id].golden > 0` (exists per tile).
- **Eligible chances per undiscovered species** (new, Hades-style progress without spoilers):
  `catchCapture` already computes `eligible`. Add `j.chances[id]++` for each unfound eligible
  special, and persist it in the journal save (validated like `count`). It shows that the player is on the
  right track, with no odds and no answer.

---

## 4. UI

### 4.1 Habitat header (one line plus a tick)
```
Night                         ☾  4/6       (✓ chip appears at 6/6)
Only after dark: play in the Night theme
[███████████░░░░░]  2 golden
```
- Title, gate icon (☾ Night, ⛰ Reef), `got/total` (`num` font), and a **✓ tick chip** once
  `got === total`. That tile row gets the existing `track.full` style plus a one-time "Habitat
  complete" chip in the strip (ADR 0012 queue), never a new modal.
- Requirement `line` under the title in `ink.2` (≥ 4.5:1 on surface, already tested).
- **Gate mismatch nudge:** if a gate isn't met right now (e.g. Day theme and Night incomplete), add
  a text button "Switch to Night" that opens Settings → Theme. Same for Reef: "Open Reefs". It is
  the only call to action in the journal.
- After complete: the line becomes "Golden 2/6" (the long tail).

### 4.2 Tiles
- **Caught:** art, name, rarity pips; epic/legendary word (exists); ✦ golden sparkle (exists). Add a small
  condition badge when the species has a theme or mode gate different from its habitat (☀ for the
  four day-only species, "Daily" for otter and sunfish).
- **Undiscovered:** silhouette at 45% ink (exists), `???`, rarity pips (exists), plus:
  - **Hint level 1** (default): generated condition, e.g. "A long, flat pool · after dark".
  - **Progress:** if `chances[id] > 0`, show "Close: 3 chances" (no odds). It signals "keep doing this".
  - **Legends:** hint hidden behind "Tap to reveal hint" (opt-in spoiler). The tile still shows
    "Legendary" and the pips.
- Accessible name (exists) gains the requirement: "Unknown rare creature. Needs: long flat pool,
  after dark. 3 chances so far."

### 4.3 Golden variants
- Explain once on the species page: "Golden: 1 in 64 of your catches of a species you've already
  found." That is honest, and it matches `1 / 64`.
- Per tile: the sparkle. Per habitat: "Golden 2/6" after completion. Top ring stays found/47, with
  "3 golden" in the subtitle (exists).
- Don't show per-species golden odds or progress bars. It's a lottery, and a bar would mislead.

### 4.4 Rarity
- Keep the pips and frame colours (common → legendary). Don't show raw catch chances
  (`CHANCE_BY_ID` ranges from 0.0045 to 0.57). They are tuned and change with `catch-rates.ts`.
  The only number shown is the effort count (`chances`).

### 4.5 Wireframe: 390×844 (iPhone 14-class), full-height sheet
```
┌──────────────────────────────────────────┐ 0
│  (25/47 ring)  Beach Journal        (×)  │ 16–96   ring 64px, title-l, close 44×44
│               3 golden                    │
│               600 caught & released       │
├──────────────────────────────────────────┤ 112
│ Shallows                         8/10    │ title-s left, overline num right
│ Small pools, one to five cells           │ ink.2 13px, 1 line (ellipsis never; wraps to 2)
│ [██████████████████░░░░]                 │ 4px track, full width minus 24px margins
│ ┌──────┐┌──────┐┌──────┐┌──────┐         │ 4 cols: (390-2·20-3·10)/4 = 80px tiles, 120 tall
│ │ art  ││ art ☀││  ??  ││ art  │         │ ☀ badge 16px top-left = day-only
│ │Minnow││Peri. ││ ???  ││Limpet│         │
│ │◆◇◇◇◇ ││◆◇◇◇◇ ││◆◇◇◇◇ ││◆◇◇◇◇ │         │
│ └──────┘└──────┘└──────┘└──────┘         │ locked: "A one-cell pool · streak 6"
│  …                       Close: 3 chances │   (2 lines max, 11px, ink.2)
├──────────────────────────────────────────┤
│ Night  ☾                         4/6     │
│ Only after dark: play in the Night theme │
│ [██████████████░░░░░░]  Switch to Night ›│ text button, ≥ 44px tall hit area
│ …tiles…                                   │
├──────────────────────────────────────────┤
│ Reef  ⛰                       4/4  ✓     │ tick chip (success token) when complete
│ Golden 1/4                                │ line swaps after completion
│ …                                         │
├──────────────────────────────────────────┤
│ Legends                          1/4     │
│ Rare feats: deep cascades, clean boards…  │
│ ┌──────┐ locked legend: "Tap for hint"    │
└──────────────────────────────────────────┘ 844 (scrolls; safe-area bottom padding)
```
Order stays as `HABITATS` (Shallows, Lagoon, Deep water, Night, Reef, Legends). Sections a player
can't progress *right now* (gate unmet) keep their place, with the nudge shown inline, so the layout
doesn't jump between themes.

---

## 5. Rollout
1. `req.ts` plus the equivalence test (no behaviour change). Then migrate `creatures.ts` to `req`.
2. Generated hints. This fixes the §2.3 drift. The grouper/parrot hint split and the day badges are
   copy-only changes.
3. Habitat lines, ticks and the gate nudge in `showJournal`. Run `scripts/screens.ts journal` in
   Day and `--night`. (Note: `docs/media/after/screen-journal-night.jpg` currently looks identical to
   the Day shot, so re-capture it.)
4. `chances` counter (save format change: validate and default to 0 in the journal loader).
5. Decide separately whether day-only species should stay day-only. The alternative is a Day
   habitat counterpart to Night, which would make the gate symmetric and explainable.
