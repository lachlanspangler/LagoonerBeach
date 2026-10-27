# ADR 0002 — Platform: TypeScript + Canvas 2D PWA, wrapped with Capacitor for the stores

- Status: accepted
- Date: 2026-10-15

## Context
Needs: 60 fps on mid-range phones; App Store / Google Play path; fast iteration; heavy automated
verification (bots, headless screenshots, perf traces) run by an autonomous agent; tiny install.
The design doc leans toward Unity/Godot.

## Options
| Option | Pros | Cons |
|---|---|---|
| Unity | mature mobile pipeline, profiler | 30–60 MB builds, slow iteration, hard to verify headlessly from CLI |
| Godot | good 2D, light | mobile web export weaker; headless screenshot/e2e tooling immature |
| Flutter + Flame | great app shell | Dart-only; game feel effects need care |
| React Native + Skia | native shell | JS/UI-thread split; heavy toolchain |
| **TS + Canvas2D PWA → Capacitor** | URL-instant distribution, Playwright e2e + perf, tiny bundle, one language for logic/sim/UI | iOS Safari quirks (no vibration API, audio unlock), store wrapping step |

## Decision
TypeScript (strict) + Vite + a hand-written Canvas 2D renderer; no game framework. Installable PWA
(manifest + service worker, offline). Store builds via **Capacitor** (iOS/Android WebView shells) with
the Haptics plugin replacing `navigator.vibrate` on iOS. The pure game logic in `src/core` has zero
DOM imports, so a later native/engine port can reuse it (or re-implement against its tests).

## Why Canvas2D, not PixiJS/WebGL
The scene is ≤ 64 tiles + tray + ≤ ~300 particles. Canvas2D handles that at 120 Hz on modern phones;
we pre-render tile sprites to offscreen canvases to avoid per-frame gradient work. One fewer
dependency, simpler bundle. If perf tests show otherwise, the renderer is isolated behind an
interface and can be swapped.

## Consequences
- Perf is measured: Playwright with CPU throttling (4×) records frame times; CI asserts budget.
- Mobile realities handled explicitly: `pointercancel`, visibility changes, audio unlock on first
  gesture, safe-area insets, persisting the game on every move.
- `npm run build` produces a static `dist/` deployable anywhere; `cap sync` takes it to native.

## 2026-10-26 — initial bundle back under budget (lazy chunks, no budget raise)
After the UX/robustness/leaderboard merges `npm run size` failed: initial JS 67.3 KB gz (budget 64),
CSS 6.1 KB gz (budget 6). Code the first frame of Endless play doesn't need now loads lazily, each
chunk prefetched at idle and failure-safe (`retryable`: a rejected import is never cached; the
results card offers the retry chip): Reefs mode (`app/reefMode.ts`: reef source + endless generator
and its sync fallback, puzzle rules, hint solver, chapter names; loaded with the pack, 2.9 + 4.4 KB
shared with sheets), the results and reef-result cards (`ui/results.ts` + `results.css`, 3.5 KB JS +
1.4 KB CSS), the generative music (`audio/music.ts` behind `LazyMusic`, started on the first
gesture, 1.5 KB), and the leaderboard name filter (main no longer imports `meta/boards.ts`). Journal
tiles/pips/inline stats moved to `ui/tiles.css` (1.1 KB, shared by results, sheets and reveal);
the reef-error headline stays eager (it's what shows when a chunk can't load). Now: **initial JS
55.9 KB gz, CSS 4.6 KB gz**. First-frame screenshots (`scripts/screens.ts`) before/after differ only
within run-to-run noise. Still eager and the next candidates if we grow again: legacy creature art
(`render/creatures.ts`, ~3.4 KB), the full icon set (~2.5 KB), `platform/runlog.ts` (~1 KB).
