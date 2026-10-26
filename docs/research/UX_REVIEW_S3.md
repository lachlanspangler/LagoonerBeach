# UX review, session 3 milestone (independent reviewer, 2026-10-16)

Overall: strong base (palette, Fraunces/Nunito, calm HUD, reduced motion, night theme, charming
creatures). What holds it back from the top-chart bar: store + leaderboard surfaces and weak peaks.
Items routed elsewhere: peak moments, word placement/stacking, legendary/golden reveal, share-card
look → celebration agent (ADR 0012 review fixes); "+N" formatting and "Classic" → robustness agent.

## Must-fix (for the polish pass)
1. **Leaderboards look fake:** "DEMO" badge, "Demo board…" footer, repeated names (DUNE ×3, CORAL
   ×2), a player called URCHIN (a species name). Apple may reject a screenshot of placeholder
   content. → Decision (lead): release builds without `VITE_LB_URL` hide every leaderboard entry
   point (as `VITE_LB=off`); the demo backend is dev/test only (`VITE_LB=demo`, default in dev and
   e2e). Demo names unique and never species names. No DEMO badge in any store asset.
2. **Store screenshots don't sell the hook:** shot 1 mid-explosion (lagoon unreadable); shot 2 shows
   "0 / BEST 12,480" behind the card; shot 4 = DEMO board; shot 5 static empty reef; every frame cream
   on cream with a near-white device frame (washes out in the App Store grid). → Open with the night
   shot's composition in Day (closed ring, water filling, readable +N); real mid-game scores; a
   saturated lagoon-cyan or sunset gradient behind the device; a creature on every shot; reef shot =
   reef map/progress + a cleared moment ("Hundreds of hand-checked reefs. Then endless."). Leaderboard
   shot only once the real backend exists (keep a generator for it).
3. **First run never says the goal:** no text; ghost U + grey dot "finger" (reads as a smudge); the
   first capture is a 1-cell lagoon that empties the board so the first word learned is "Spotless!".
   → One line in the chip strip: "Close a ring of blocks" before the first move, "That's a lagoon!"
   on the first capture; force the teaching capture's word to "Lagoon!" with a beat explaining water
   fills a closed ring; replace the grey circle with a real fingertip/hand glyph from the icon set.

## Should-fix
1. **NEW HIGH SCORE results:** confetti tiny and done in ~0.7 s; headline "No room left" frames a
   failure → on a record swap the headline to "New high score!" (mode stays as the eyebrow), confetti
   ~2 s from both card edges, gold ribbon keeps shimmering, "Post your score" becomes primary on a
   record.
2. **Name entry:** name shown twice (big gradient + slots) → keep only a larger slot row; use the
   space for a live preview of your leaderboard row ("#12 CORAL 3,766").
3. **Leaderboard:** pinned YOU row lets rows bleed through → solid fade mask; unnamed shows "You" not
   "YOU · YOU" (fixed on main); "Back to results" + "Close" duplicate → one primary + grabber/swipe;
   "Resets in 2d 4h" on Daily/This week; bigger shell medals + gold/silver row tint for the top 3.
4. **Reefs feel like a spreadsheet:** 5×4 beige number grid; difficulty only as faint border colours;
   Night cleared tiles dimmer than uncleared (inverted reward). → depth meter ("Depth 373 m", sinking
   per chapter) and named upcoming chapters; tinted tile fills per difficulty; a creature/shell sticker
   on cleared tiles; cleared tiles warmer/brighter than locked in both themes; Reef of the day as
   secondary style.
5. **Reef result + chapter moment:** "Cleared" is flat; "Chapter 2!" reads like *starting* chapter 2
   and is drawn over leftover blocks → "Chapter 2 complete · Ebbtide Bight" on a clean board; a small
   reward on the reef result (creature, shell, or "new depth").
6. **Journal:** art ~40 px in ~90 px cards; rarity pips ~6 px → art ~60% of the card; pips ≥ 10 px or
   a one-word rarity tag on epic+; "600 released" → "600 caught & released".
7. **Home menu:** "Resume" above "Endless · New game" reads as two ways to do the same thing → "Resume
   Endless · 3,150"; the "25/47" badge collides with the Journal icon → a pill outside the icon.
8. **Settings:** theme control icons only → captions Auto / Day / Night; move font licences behind
   "Credits".

## Nice-to-have
- Daily HUD: date and "#12 today" under DAILY.
- Layout: ~130 px between board and tray, ~90 px dead below the tray → move the tray up a little or
  use the bottom for the chip strip.

## Keep
Reduced motion (in-place shrink + word cross-fade), contrast system + test, 48 px HUD targets,
~60 px rows, the near-miss bar, "58 to pass BODHI", journal silhouettes + section bars, calm normal
moves.

## What was done (2026-10-26, product design pass)
- **Must 1 — leaderboards:** a build shows boards only with `VITE_LB_URL` (real server) or
  `VITE_LB=demo` (dev/test); a plain release build hides the menu tile, results button and name
  entry exactly like `VITE_LB=off`. Demo is on in `vite` dev (`.env.development`) and in the
  `dist-e2e/` build Playwright makes, so `make e2e` keeps its leaderboard tests. Demo names: a
  190-name pool, shuffled per board (no repeats), none a species word (tested). `?nolb` previews the
  release look. ADR 0010 "Update 2026-10-26", CLAUDE.md, DEPLOY.md updated.
- **Must 2 — store shots:** five frames on saturated cyan / sunset / deep-sea gradients with dark
  device rims: (1) Day ring just sealed, water in, "Nice Lagoon! +227", score 4,543; (2) the Octopus
  reveal over a game at 3,150; (3) the journal; (4) the reefs map after Chapter 2 is cleared
  ("Hundreds of hand-checked reefs. Then endless."); (5) Night. A creature (rendered by the game's
  art code) rides every card. No board shot until the real backend (`--with-leaderboard`).
- **Must 3 — first run:** "Close a ring of blocks" stands in the strip until the first lagoon; the
  teaching capture's word is "Lagoon!", then the chips "That's a lagoon!" → "Water fills any closed
  ring". The grey dot is now a pointing-hand glyph (`tap` in the Tidemark set, `drawTap`).
- **Should 1:** record headline "New high score!" (mode stays the eyebrow), ribbon "PERSONAL BEST"
  with a looping shimmer, confetti ~2 s from both card edges (results.ts), "Post your score" primary.
- **Should 2:** name entry drops the gradient hero; one larger slot row; a live preview of your
  board row with the rank it would take ("#11 · CORAL · 1,734").
- **Should 3:** solid fade band around the pinned row, one primary button (+ a small × and the
  grabber), "Resets in 9h 16m" on Daily / This week (local midnight / Monday 00:00 UTC), 38 px
  shell medals and gold/silver/bronze row washes.
- **Should 4:** "Depth N m" (1 m per reef) in the header and per chapter ("21–40 m"), a depth gauge
  and a sea that darkens per chapter, the next two chapters named, tier-tinted tiles, shell (or
  gold star for no-hint) stickers, cleared tiles warm and bright in both themes, Reef of the day
  secondary.
- **Should 5:** the reef result names the chapter it completes ("Chapter 2 complete · Ebbtide
  Bight") and shows a reward line (shell sticker / no hints / new depth). The review shots now stage
  the chapter moment on a solved, clean board. **Not done:** the canvas word itself still reads
  "Chapter 2!" — it is built in `src/app/fx.ts` `chapterComplete()` (celebration owner's file);
  suggested text: "Chapter 2 complete" over the name.
- **Should 6:** journal art ~60% of the tile (70 px thumbs, taller tiles), 11 px pips, an EPIC /
  LEGENDARY tag, "600 caught & released".
- **Should 7:** "Resume Endless · 3,150" (or "Resume Reef 28"); the 25/47 pill sits beside the icon.
- **Should 8:** theme segments captioned Auto / Day / Night; font licences behind "Credits".
- **Nice:** Daily HUD "DAILY · OCT 26 · #11 TODAY" (rank once posted, boards on); the board→hand
  gap trimmed (1.9 → 1.6 cells of slack; layout tests unchanged).
