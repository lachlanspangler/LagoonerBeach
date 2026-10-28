# Design critique: title screen, reef blocks, About (sessions 5–6)

Each round was run by a fresh, independent reviewer working from screenshots and the real sprite
code (`scripts/screens.ts`, `scripts/blocks-sheet.ts` with `--moments`, motion captures). Every fix
the reviewer asked for is in git history under "critic round N".

| Round | Scope | Result |
|---|---|---|
| 1 (2026-10-27) | Title, About | Title Day B+, Night B, small B, iPad C+; About B / B / B |
| 2 (2026-10-28) | Title, all six blocks, About | 2 A · 9 A− · 6 B+ · 2 B · 1 B− |
| 3 | same | 0 A · 10 A− · 5 B+ · 2 B (a stricter reviewer: "candy" materials, hand-off) |
| 4 | same, verifying round 3 | **11 A · 4 A−**, nothing below A− |
| 5 | verifying round 4's five A− fixes | see below |

## What moved the grades
- **Title:**
  - The light sources (a crisp sun, a warm, tight moon glow) and stars that stay off the type.
  - The shoreline spanning the full width.
  - The atoll vignette kept clear of the pills and of the shoreline.
  - Tablet scaling.
  - A real hand-off: Play is full strength from frame 0; the title lifts away in about 200 ms and
    the board and HUD come in after it, so the two never overlap above about 30%.
  - No focus ring after a tap.
- **Blocks:**
  - One shared hot glint made the set read as candy. Now only the porphyry pebble is damp; coral
    and stone are matte, and the glass is frosted.
  - Each material was made more specific:
    - sea glass: pitting, seed bubbles, a translucent edge;
    - porphyry: a granular groundmass with feldspar crystals;
    - sandstone: soft cross-bedding;
    - coralline: knobbly crust;
    - blue coral: matte growing tips.
  - A gentler lit state, and celebration words capped at 88% of the board.
  - Non-text contrast: every colour keeps a 3:1 boundary against the cell (tested).
- **About:**
  - The title matches the button that opens it.
  - One name and one sign-off, with "advocates for marine wildlife protection" set on its own line.
  - Full-colour creature tiles.
  - A distinct cause per card: Monterey Bay Aquarium replaced the second "Marine Mammal Center".
  - Night cards lift off the sheet (AA, tested).

## Left as decided
- Larger text stays 1.12× in sheets; the layouts are tested at that scale.
- The PMMC card keeps the dolphin; the game has no seal species, and the copy says marine mammals.
- The COMBO badge crossfade.
