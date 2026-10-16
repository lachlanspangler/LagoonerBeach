# Accessibility review — Lagooner Beach (2026-10-16)

Method: automated checks where possible (they run in CI so they can't regress), plus a manual
walk-through of each screen in both themes. Targets: WCAG 2.2 AA where it applies to a game, Apple
HIG / Material touch-target guidance.

## Results

| Area | Status | How it's checked |
|---|---|---|
| **Rules don't depend on colour** | ✅ | Pebble colours are cosmetic. "Will pop" is shown by water + white outlines + motion. |
| **Colour vision** | ✅ | `tests/unit/a11y.test.ts`: CVD simulation (Machado 2009). Default palette min ΔE 11.3 (deutan) after darkening orchid; **Glyph** style adds a distinct shape per colour (always available, never locked). |
| **Text contrast** | ✅ (fixed) | `tests/unit/contrast.test.ts`: body/score ≥ 10.8:1, secondary labels ≥ 3.5:1, points/chips ≥ 3.6:1. **Fixed:** white on the primary button was 2.97:1 (day) / 2.29:1 (night) → now 4.9 / 4.6. |
| **Touch targets** | ✅ (fixed) | `tests/e2e/a11y.spec.ts` sweeps game, menu, settings, game over, journal, species page, reef grid: every control ≥ 44×44 px. **Fixed:** settings switches (32 px), theme segments (34 px), style button (40 px), Settings link (43 px). Tray pieces have whole-column hit areas. |
| **Accessible names** | ✅ | Same sweep asserts every control has a name. Journal unknowns read "Unknown creature. Hint: …". |
| **Keyboard** | ✅ | Dialogs trap Tab, Escape closes dismissable ones, focus returns to the opener; focus rings only for keyboard users (`a11y.spec.ts`). |
| **Screen readers** | ⚠️ partial | Live region announces captures, new species, hints and game over; dialogs are labelled. The board itself is a canvas: the game is spatial and not playable by screen reader alone (true of the genre). |
| **Motor** | ✅ | Tap-to-place (tap piece, tap cell to preview, tap again) as an alternative to dragging; generous snap magnet; no time limits anywhere; one-handed layout. |
| **Motion** | ✅ | Follows `prefers-reduced-motion`, plus an in-game toggle: no shake, ~30% particles, no creature leaps or hint demo, static dashes. |
| **Audio / haptics** | ✅ | Separate Sound, Music and Haptics switches; nothing is communicated only by sound. |
| **Seizure safety** | ✅ | No flashing above 3 Hz; the jackpot sweep is a single soft band. |
| **Text size** | ✅ (added) | Settings → **Larger text** scales every canvas label and the menus (×1.2). OS dynamic type is not read inside the canvas. |
| **Language** | ✅ | Almost text-free play; menus are short English strings (localization-ready, not yet translated). |

## Known gaps (and why)
- **No full screen-reader play.** A spatial packing game can't be meaningfully played by audio alone
  without a different interface (e.g. a cell-cursor mode). Logged as an idea; not in v1.
- **OS dynamic type** isn't honoured inside the canvas.
