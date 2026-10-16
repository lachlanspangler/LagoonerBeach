# Workflow — the loop

Run this forever. Each pass should end with a commit and an updated diary/status.

1. **Orient** — read `docs/STATUS.md`, the latest `docs/DIARY.md` entries, and `make check` output.
   If anything is red, fixing it *is* the highest-value task (self-healing rule: never build on
   a broken base).
2. **Pick** the highest value/effort item: from STATUS "Next", or from `docs/ideas_ledger.json`
   (status `backlog`, highest value ÷ effort, gates not failed). Prefer feel and core-loop polish
   over new features until the core is addictive.
3. **Plan** — write 3–6 bullet steps in the diary entry you're about to fill in. If it's a big
   decision, write an ADR first.
4. **Build** — smallest change that delivers it. Core changes test-first.
5. **Test** — `make check`; for anything visual or input-related also `make e2e`.
6. **Play it for real** — run the build, drive it with real pointer drags (e2e/autoplay or the
   `scripts/shoot.ts` screenshot tool), look at screenshots, and write what felt good or bad.
   For balance changes run `make tune` and compare with the previous numbers in the diary.
7. **Record** — diary entry (what/why/what broke), STATUS update, ledger update (status, data),
   `make ideas`.
8. **Ideate** — add at least one new idea to the ledger (feature, polish, or a fix for something
   that felt off during play). Reject explicitly with a reason when appropriate.
9. **Commit** — one logical change per commit, descriptive message.
10. Repeat.

## Self-healing checks (what catches regressions)
| Risk | Net |
|---|---|
| Rule bugs (pockets, clears, cascades) | `tests/unit/rules.test.ts`, property tests in `game.test.ts` |
| Silent rule/dealer change | golden game snapshot + determinism replay test |
| Balance drift (too easy/hard, dominant strategy) | `tests/unit/balance.test.ts` bot bands |
| Unfair trays | dealer fairness test |
| Corrupted saves | `serialize.test.ts` (round-trip property + corruption cases) |
| Core purity | ESLint restricted globals/imports in `src/core`, `src/sim` |
| Broken UI / input | `tests/e2e` real-drag play-through, console-error guard |
| Visual bugs | e2e screenshots across phone sizes + light/dark (reviewed each loop) |
| Perf drop | `tests/perf` frame-time budget under 4× CPU throttle |

## Definition of done for a feature
Tests pass · played in the real build · screenshot looked at · diary + status updated · committed.
