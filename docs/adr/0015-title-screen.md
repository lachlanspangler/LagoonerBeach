# ADR 0015 — Title screen and launch flow

- Status: accepted · Date: 2026-10-27
- Input: the owner's brief ("shows on launch, one tap into play, never in the way of a fast player or a
  daily share link; a quiet path to the about section"), `docs/research/INTRO_SCREEN.md` (teardowns
  of 14 games, the spec in §5).

## Decision
- **A cold launch shows the title.** That means the "Lagooner Beach" wordmark (ADR 0013), the
  tagline "Close a loop. Water fills it.", one large **Play** button, and two quiet pills:
  **About** (ADR 0016) and **Settings**.
- **No Daily, Reefs or Journal entries on the title.** Those players arrive by link or are one tap
  away in the menu, and the screen keeps one primary action.
- **Play says what happens next.**
  - With nothing in progress it reads "Play".
  - With a run in progress it reads "**Continue**", over a small line saying what it continues
    ("Endless · 3,150", "Reef 28").
  - It never says "New game", so nothing destructive is on the title.
- **One tap, zero waiting.** The title is static HTML and CSS in `index.html`, painted before the
  bundle runs. The game boots fully behind it, so Play hands off in about 260 ms and the board
  takes input at once.
  - The tap is also the gesture that unlocks audio. It plays `sfx.titlePlay` (a pebble drops in,
    the lagoon answers in the music's pentatonic) and the music starts.
- **When it never shows.** An inline script decides before first paint, so the title never
  flashes in or out. `shouldShowTitle` in `src/ui/title.ts` has the same rule, and
  `tests/unit/title.test.ts` runs the inline script to prove the two agree. It skips for:
  1. a deep link: `?mode=` or `?seed=` (a shared Daily is zero taps);
  2. Settings › **Open straight into the game**;
  3. a **warm return**: the app was hidden less than 10 minutes ago (an app switch or an OS kill);
  4. automated runs (`navigator.webdriver`). `?title` forces it on, and `?titlerules` applies the
     real rules (e2e).

  Coming back from the background without a reload, after game over, or after closing a sheet
  never shows it either: it's a cold-launch screen only.
- **The scene.** The game's own idea drawn large: a closed ring of the board's own block sprites
  standing in the sea, calm lagoon water inside, and a fish turning slow lazy-eights.
  - It's a **lazy chunk** (`titleScene.ts`, 2.8 KB gz) that fades in once it lands, so the initial
    bundle grew by only about 1 KB.
  - Static layers are drawn once; a frame is 2 blits, about 17 arcs and a fish, capped at 30 fps
    and stopped when hidden or when Play is tapped.
- **Accessibility.**
  - Structure: a real `<h1>` (one name, "Lagooner Beach"), buttons, and `nav` "More".
  - Play gets focus, so Enter plays. The focus ring appears only after a key is used.
  - On Play, the screen reader announces where you are ("Endless. Score 3,150." or "New game.").
  - Reduced motion: a static scene and an instant hand-off.
  - Larger text scales the tagline, button and pills. Targets are ≥ 44 px, and Play is about
    300 × 76.
- **Day and Night** follow the theme. Night adds stars and a crescent moon, and its Play is the
  inverted cyan button.

## Amendment (2026-10-28, owner)
The title is just the wordmark, the tagline, the atoll and Play: the About and Settings pills and the
fish are gone ("remove about and setting and the fish … from intro screen"). About is reached from
the home menu (Menu › About) and Settings; "Open straight into the game" lives in Menu › Settings.

## Consequences
- `#title` lives inside `#ui` at z 20. While it shows, sheets open above it (`.veil` z 40) and
  close back to it.
- `atoll.v1.title` stores `{ at, off }`. Erase-all clears it along with every other `atoll.` key.
- A Day cold launch in the native shells goes from the native splash (`#0B1622`) to cream. This
  is checked on the simulator (see STATUS); the theme is already set before first paint.
- Open questions for the owner, with defaults chosen: the 10-minute warm window (default kept); a
  fish rather than "your latest catch" (simpler; the latest catch can come later); not suggesting
  "Open straight into the game" proactively.
