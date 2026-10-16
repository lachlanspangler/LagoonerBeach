# ADR 0008 — Monetization: light, cosmetic, never in the loop

- Status: proposed (owner decides before launch) · Date: 2026-10-16

## Principles (non-negotiable)
1. **Nothing pay-to-win.** No paid pieces, undos, revives, hints, lures or catch boosts. The dealer's
   "always a solution" guarantee and the solver-verified reefs are fairness promises money can't touch.
2. **Never mid-game.** No interstitials, banners or prompts while a game or reef is in progress.
3. **The board stays clean.** No ad slots, currency counters or shop buttons on the play screen.
4. **No data.** Any ad SDK must run without tracking (contextual only, no IDFA/AAID prompts) or it
   doesn't ship (see `docs/store/PRIVACY.md`).

## Recommendation for v1: free, ad-free, one optional "Supporter Pack"
- **Supporter Pack** (one-time IAP, e.g. $2.99): three extra pebble styles + two board themes
  (e.g. "Sunset", "Tide pool"), a supporter shell on the journal cover. Purely cosmetic; everything
  else stays free forever. Also works as a tip jar.
- Why: the game's identity is calm and generous; reviews of Block Blast-likes are dominated by ad
  fatigue. A small cosmetic IAP keeps the ratings high, needs no tracking, and is simple to build
  with StoreKit / Play Billing via a Capacitor plugin.

## If revenue later requires ads (option B, opt-in by the owner)
- Interstitial **only between games**, at most once every 3 games and never in the first 10
  minutes of a session or before game 5 for new players; skippable after 5 s; never on Daily or
  Reef results; removed by the Supporter Pack.
- **No rewarded ads** for revives or hints (they erode the fairness promise). If any rewarded ad
  exists, it may only grant a cosmetic (e.g. a day's trial of a style).
- Non-personalized ads only; privacy policy updated before release.

## Not doing
Energy/lives, loot boxes, currencies, battle passes, timed offers, push notifications for sales.

## Implementation notes (when the owner says go)
`@capacitor-community/in-app-purchases` or RevenueCat-free StoreKit/Billing wrappers; product id
`supporter_pack`; entitlement stored locally (and restorable via the store). Cosmetics already
exist as skins (`src/meta/unlocks.ts`), so the pack is a data change plus a purchase screen in
Settings.
