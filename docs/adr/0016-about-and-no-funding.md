# ADR 0016 — About page and the no-funding stance

- Status: accepted (wording and charity list pending the owner's sign-off) · Date: 2026-10-27
- Supersedes: ADR 0008's Supporter Pack and its ads option B (both **rejected**).
- Input: the owner's brief; `docs/research/CHARITIES.md` (verification evidence, store policy).

> "Concise, a few lines, signed by 'Lachlan Spangler, grew up in Laguna Beach', tied to the game's
> creatures. Says plainly 'I will not take any funding', then 'but you can donate to these charities /
> funds to help coastal wildlife' with 3–5 links."

## Decision
- **The game takes no funding of any kind.** No purchases, no ads, no tips and no sponsors. The
  store forms say "Contains ads: No" and "In-app purchases: No" (`docs/store/LISTING.md`).
- **About** ("A note from Lachlan") is a sheet in the lazy sheets chunk, reachable from Settings › About and from
  the title's About pill. It holds:
  - a short note: the Laguna tide pools, and the hermit crabs, sea stars and octopuses of the game;
  - the pledge in a tinted panel: "**I will not take any funding.** No ads, no purchases, no tips,
    no sponsors.";
  - the line "But you can donate to these charities and funds to help coastal wildlife:";
  - five charity cards and the signature.
- **The five charities**, in `src/meta/charities.ts`. Each is a US 501(c)(3), checked three ways:
  its own site's statement, IRS data (ProPublica Nonprofit Explorer), and its official donate page.
  `tests/unit/charities.test.ts` keeps the code and the evidence table in sync.
  1. Pacific Marine Mammal Center (Laguna Beach)
  2. Laguna Ocean Foundation (Laguna Beach)
  3. Surfrider Foundation
  4. Monterey Bay Aquarium (its sea otter surrogacy programme; swapped in for The Marine Mammal
     Center on 2026-10-28 so no two cards share a cause)
  5. Ocean Conservancy

  The Marine Mammal Center is verified too (see CHARITIES.md).
- **Each card** shows a creature from the game that lives where the charity works, always in full
  colour (2026-10-28: a grey silhouette read as a broken image; these stand for real animals, not
  journal secrets).
- **Links are plain anchors**: `target=_blank`, `rel="noopener noreferrer external"`,
  `referrerpolicy="no-referrer"`, and no query strings we add.
  - On the web they open a new tab.
  - In the native shells, Capacitor hands any off-app URL to the system browser
    (`WebViewDelegationHandler` → `UIApplication.open` on iOS, `ACTION_VIEW` on Android).
  - The game never sees or forwards money, and the charity doesn't even learn the tap came from us.
- **Store policy.** App Store Review Guideline 3.2.2(iv) allows a free app that raises money for
  charity if it collects funds only outside the app (Safari); we collect nothing at all.

## Consequences
- ADR 0008 is marked superseded. STATUS no longer asks the owner about a Supporter Pack. It asks
  for sign-off on the About wording and the charity list.
- Donate URLs drift when charities change platforms. Re-verify before each release (commands in
  CHARITIES.md).
