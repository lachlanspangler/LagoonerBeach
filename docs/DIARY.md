# Diary

Append-only. Newest at the bottom. Format: `## YYYY-MM-DD HH:MM TZ — title`, then what I did, what
broke, what I decided and why.

## 2026-10-15 23:00 CDT — Kickoff
- Read the full design doc (`~/Desktop/Meowdoku_Block_Blast_Engineering_Design.docx`) by unzipping
  `word/document.xml` and stripping tags (no pandoc / python-docx on this machine). No images in it.
  Notes in `docs/research/DESIGN_DOC_NOTES.md`.
- `git init -b main` in `~/Desktop/Game`. No remote (user will add).
- **Broke:** the machine's default npm registry (`npmpm.corp.amazon.com`) fails TLS ("unable to
  verify the first certificate"). **Decision:** project-local `.npmrc` pins
  `registry=https://registry.npmjs.org/`. This only affects this repo.
- **Broke:** `npm i vite vitest` crashed with an arborist `edgesOut` error; root cause was latest
  vitest 5 requiring Node ≥22 while the machine default is Node 20.20. **Decision:** pin
  Vite 7.3.7 + Vitest 3.2.7 (support Node 20.19+), `.nvmrc` = 20. Revisit when Node 22 is default.

## 2026-10-15 23:10 CDT — Research
- Wrote `TEARDOWN.md` (Block Blast + Meowdoku), `GENRE.md` (20 games, what works / what kills),
  `RUBRIC.md` (14 tests, 5 gates).
- 60 ideas in `docs/ideas_ledger.json` (source of truth) → `docs/IDEAS.md` via `scripts/render-ideas.ts`.
- Shortlist (est.): Hollow, Skid, Flip, Exact Count, Overgrowth.

## 2026-10-15 23:20 CDT — Bot prototypes
- Built a throwaway harness (`prototypes/sim`): shared 37-piece catalog, 4 bots
  (random / firstFit / greedy / beam search), 15 mechanic variants, parallel runner (12 procs).
- First surprise: **Hollow is too forgiving** — greedy almost never dies (accidental pockets
  self-clean messy boards). Second: its skill gradient is the biggest of all candidates.
- Tried knobs: ring4 vs ring8, no monomino, heavy catalog, min pocket area 2, ramps. A ramp
  (no monomino early, chunkier pieces from move 10→100) gives greedy 80 / search 488 median moves.
- Found a ring4 flaw by reasoning, confirmed by the rule: board **corners can never clear** under
  ring4 (their orthogonal neighbors are border cells, which can't be pockets). → ring8.
- Skid, Flip, Exact all fail a measured gate (fairness / planning depth / endless). Overgrowth ≈
  baseline (fails novelty).

## 2026-10-15 23:28 CDT — Playable prototypes
- The Playwright MCP browser was locked by another session → installed `@playwright/test` locally
  and wrote `prototypes/play/playtest.ts`, which plays the ugly prototype page with **real pointer
  drags** chosen by a bot and screenshots mid-drag.
- Felt: Hollow's preview (pocket + ring lit before release) teaches the rule; big rings are thrilling
  relative to pinches. Skid died with half the board empty (unfair). Flip became checkerboard noise.

## 2026-10-15 23:31 CDT — Decision: Hollow
- ADR 0001 (core mechanic), ADR 0002 (TS + Canvas2D PWA → Capacitor).
- **Working title: "Atoll"** — a ring of land that encloses a lagoon is literally the mechanic.
  Visual identity: calm sea palette, sand/coral blocks; a sealed pocket fills with lagoon light and
  the ring bursts into foam. Dark mode = night reef with bioluminescence. Name availability on the
  stores is **not verified** (needs the user; noted in STATUS).
