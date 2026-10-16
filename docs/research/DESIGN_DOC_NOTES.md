# Notes on "Meowdoku & Block Blast — An engineering-level anatomy"

Source: `~/Desktop/Meowdoku_Block_Blast_Engineering_Design.docx` (Oct 2026, ~3,000 words, no images).
Read in full before any other work. This file summarizes it, records where I agree, where I
disagree, and what it leaves out. It is a **key input**, not a spec: it describes two existing
games; our job is a third, original one.

## Summary (section by section)

**Executive perspective.** A tiny rules engine can carry a premium experience. The hard part is
coherence across art, input latency, feedback timing, fairness, assets, frame pacing and
progression. Shared foundation: deterministic state, data-driven content, independent VFX,
tight responsiveness. The doc flags that its numbers are *reconstructions*, not studio facts.

**At a glance.** Meowdoku = calm/clever, constraint satisfaction, tap-mark-eliminate, reward on
cat placement/completion, hotspot is generation + human-solvability. Block Blast = tactile/vivid,
spatial packing on a bitboard, drag-preview-snap-release, reward on line clear/combo, hotspot is
gesture UX + effects + shape distribution.

**1. Meowdoku visual language.** Softness as a *system*: warm canvas, muted region hues, whitespace,
rounded cells, one detailed focal element (the cat). One radius family (cells 10–14, cards 14–18,
board 18–24, pills fully round), 4–7 px gutters instead of grid lines, 44 pt touch targets. Three
information channels (position, color, symbol) and never hue alone. Characters have states (idle,
blink, happy, celebrate); placement 150–250 ms, celebration 0.5–1.0 s; restraint over explosions.

**2. Meowdoku puzzle engineering.** Rules model independent of UI (`c[r]` per row → one per row by
construction; distinct columns/regions; no diagonal touching). Generation pipeline: sample a
solution → grow regions around it → solve independently and reject non-unique → check
*human* solvability → grade difficulty by technique/steps. Backtracking with bitmasks, count to 2
for uniqueness. Module boundary: GameSession / Input+Undo / Validator / Solver / Generator+Rater /
Progression / Repository; presentation = Board/Cell/Sprite renderers, HUD, Timeline+Audio+Haptics.

**3. Block Blast visual language.** Faux-3D tiles from layered 2D lighting (outline, top-left
highlight, saturated face, darker lower/right bevel, contact shadow) via nine-slice or shader; one
consistent light direction. Dark recessed board vs bright pieces. Strict render order: background →
grid → static blocks → moving piece → preview → clear overlays → particles → HUD. Shapes must read
as one silhouette (constant pitch, uniform bevel, one color per piece). Effects are choreographed
(~600 ms: flash 0–90, removal 65–180, particles 80–470, score pop 150–390, combo 180–570). Logical
clear is instant; the renderer stages it.

**4. Block Blast bitboards & input.** 8×8 = 64 bits; `(B & P) == 0` to place, `B | P` to commit;
precomputed line masks, union all completed lines and clear simultaneously (intersection bug
class). Drag state ≠ board state. Touch: lift the piece above the finger, preserve grab offset,
hysteresis on snapping, preview validity before release, acknowledge commit immediately, handle
cancel/interrupt/focus loss. Piece scheduling: uniform random causes spikes; a scored selector
(mobility, legal placements, near-term clears, dead-end probability) can balance tension; validate
schedulers with thousands of simulated agents; longer playtime ≠ satisfaction.

**5. Rendering/runtime.** Stack comparison (Unity, Godot, Flutter+Flame, RN+Skia, Web/Pixi). Leans
to Unity/Godot/GPU 2D for phone-first. Atlases and batching; separate static board from transient
FX; logical coordinates + safe areas; time-based tweens; critically damped springs; scale particles
down on weak devices without touching gameplay. Asset pipeline with source/runtime separation,
density buckets, motion tokens.

**6. Sound, haptics, pacing.** Feedback encodes state changes. Input-to-feedback latency matters more
than fidelity: acknowledge on the *first presented frame*. Never block input with loading, solver
work or telemetry. Accessibility: reduced motion, separate SFX/music, non-color cues, scalable
targets.

**7. Testing.** Pure domain tests, property tests (unique puzzles, no overlaps, valid states after
clears), simulation (difficulty distribution, scheduler fairness), input tests, visual regression,
device profiling, analytics. Especially: simultaneous row+column clears; zero/multi-solution boards.

**8. Build plan.** M1 rules + replayable action log → M2 miniature design system (tokens) → M3 one
perfect interaction → M4 event-driven effects dispatcher (`PiecePlaced`, `LinesCleared`,
`InvalidMove`, `PuzzleSolved`) → M5 content generation, simulation, real-user tuning, device QA.

**9. What makes them feel expensive.** Consistency: one visual language, fast acknowledgment,
clear spatial semantics, layered materials, deliberate timing, rules that produce satisfying
decisions. The last 10% of polish costs as much as the first 90%.

## What I'm adopting directly

- Pure deterministic domain layer, seeded RNG, replayable action log; renderer subscribes to
  domain **events** and never implements rules (§2.1, §8 M4).
- Drag model separated from game state; grab offset, finger-lift, hysteresis, preview, immediate
  commit acknowledgment, robust cancel (§4.2–4.3).
- Simultaneous clear resolution with a union mask, with explicit tests for intersections (§4.1, §7).
- Choreographed, staged clear effects with the logical result applied instantly (§3.4).
- One radius family, gutters instead of lines, 44 pt targets, never hue-alone (§1.2).
- Simulation-driven tuning of the piece scheduler with many bot agents (§4.4).
- Motion/audio as tokens, time-based animation, adaptive particle budget (§5.3–5.4).
- The milestone order M1→M5 maps closely onto the user's own "core loop first" brief.

## Where I disagree (and why)

1. **`bigint` bitboards in TypeScript.** Correct in spirit, slow in practice: `bigint` ops allocate,
   and our bots/solvers will evaluate millions of placements. I'll store the 8×8 board as eight
   8-bit **row masks** (plain numbers, or a `Uint8Array`) and pieces as per-row masks. Placement is
   8 ANDs; line checks are trivial; column checks use a transposed copy or a bit loop. Same
   semantics, ~10–50× faster in V8, no allocation in hot loops.
2. **`phase: "clearing"` in domain `GameState` (§4.2).** Clearing is a presentation concern. The
   domain resolves a move atomically and emits events; the view animates. Putting "clearing" in the
   domain invites input-blocking bugs and makes replay/bots slower. Input must stay live during
   clear animations (the next drag can start immediately).
3. **Stack recommendation (Unity/Godot first).** For *this* project the deciding constraints are
   iteration speed, automated verification (headless browser screenshots, scripted play, perf
   traces in CI), tiny bundle, and instant distribution (a URL). A TypeScript + Canvas2D PWA wrapped
   with Capacitor for the stores meets the 60 fps bar for a 64-cell board with particles. Full
   reasoning in `docs/adr/0002-platform.md`. The doc's own point — keep the logic portable —
   means a later engine port stays cheap.
4. **Palette tokens.** The doc lists approximate colors of the two games. We will **not** reuse
   them: originality is a hard requirement. Our palette is derived independently (ADR on visuals).
5. **"Excessive screen shake would undermine the calm aesthetic."** True for Meowdoku. Our game
   sits between the two moods; I'll use a *tiny* shake reserved for big multi-clears and give it a
   reduced-motion off switch rather than ruling it out.
6. **Meowdoku-specific modelling (`c[r]` per row).** Elegant, but only relevant if our core idea is
   a one-per-row CSP. The *transferable* lesson is "encode a constraint by construction in the data
   model"; I'll apply that to whatever we pick.

## Gaps the doc doesn't cover (and how I'll fill them)

- **The core idea itself.** The doc is anatomy, not invention. It says nothing about what makes a
  mechanic *novel yet instantly legible*. → `RUBRIC.md` + 50+ ideas + bot-tested prototypes + ADR 0001.
- **Retention & session design.** No session-length targets, daily structure, streaks, or "one more
  round" psychology (near-miss, best-score proximity, fast restart). → `TEARDOWN.md`, `RUBRIC.md`.
- **Monetization & ethics.** Not covered. Our rule: nothing pay-to-win, nothing in the core loop
  (cosmetics only; documented in TEARDOWN and later ADRs).
- **Fail-state fairness.** It mentions scheduler tuning but not "never deal an unplayable tray
  unless the board earned it" or seeded fairness for daily challenges. → simulated in prototypes.
- **Mobile web realities.** iOS Safari has **no Vibration API**; WebAudio needs a user-gesture unlock;
  PWAs can be killed in background so we must persist mid-game state on every move; 120 Hz ProMotion
  vs 60 Hz; `pointercancel` from system gestures; safe-area insets; text-free UI for localization.
- **Determinism across platforms.** Seeded RNG must be integer-based (no `Math.random`, no float
  drift) so a daily seed gives identical trays everywhere.
- **Performance measurement method.** "60 fps on mid-range" needs a concrete harness: CPU-throttled
  headless Chrome frame-time capture with a budget asserted in CI. → `tests/perf`.
- **Self-healing dev loop.** Regression nets for generation (unsolvable/degenerate trays), perf
  drops and visual drift. → golden-seed tests, bot regression bands, screenshot checks.
- **Privacy.** Analytics are mentioned without data minimization. We ship with **no** telemetry by
  default; any future analytics must be opt-in and documented.

## Doc caveat worth remembering
The doc itself says its timings and pipelines are *reconstructions*. I treat its numbers as starting
values to tune by feel and measurement, not as targets.
