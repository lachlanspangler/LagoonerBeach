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
