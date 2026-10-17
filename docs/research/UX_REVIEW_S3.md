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
