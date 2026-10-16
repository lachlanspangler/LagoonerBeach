# Lagooner Beach

**Close a loop of blocks and everything inside it pops.**

A mobile puzzle game in the Block Blast / Meowdoku tier. Drag pieces onto an 8×8 reef; any empty
space you seal off from the edge fills with water, and the ring of pebbles around it bursts. In every
other block puzzle, holes kill you. Here, holes are how you score.

- **Classic**: endless, gently ramping, one-more-round.
- **Daily**: the same deal for everyone each day, with streaks and an emoji share card.
- **Reef puzzles**: 360 solver-verified puzzles (56 needing a cascade). Place every piece so the board ends empty.

## Quick start
```sh
make setup   # deps + Playwright browsers + git hooks
make dev     # http://localhost:5317   (?debug=1 for test hooks, ?seed=N to fix the deal)
make check   # typecheck, lint, format, unit/property/balance tests
make e2e     # production build + browser tests (Chromium + WebKit), screenshots, perf, audio QA
make ios-sim # iOS Simulator build + screenshot (needs Xcode)
```

## Where things are
- `docs/STATUS.md`: what works right now and what's next
- `docs/DIARY.md`: everything I did, what broke, and why I decided what I decided
- `docs/adr/`: big decisions (mechanic, platform, visuals, puzzles, native)
- `docs/research/`: teardown, genre study, rubric, prototype data
- `docs/IDEAS.md`: the ideas ledger (generated from `docs/ideas_ledger.json`)
- `CLAUDE.md`: architecture map and conventions for whoever works on this next

All art and sound are original: sprites are drawn in code and every sound is synthesized with
WebAudio. There are no asset files.
