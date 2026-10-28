# Charities for the About page — evidence and picks

Researched 2026-10-27. The game makes one promise: **"I will not take any funding."** The About page
then points players to coastal-wildlife charities they can give to directly. We never handle money,
never use affiliate or referral links, and never add tracking parameters.

## How each one was verified
1. **The official site states its status.** Fetched each organisation's own homepage and quoted its
   501(c)(3) or tax-ID statement.
2. **IRS data.** Cross-checked the EIN against the ProPublica Nonprofit Explorer API, which mirrors
   the IRS Business Master File: `https://projects.propublica.org/nonprofits/api/v2/organizations/<EIN>.json`.
   `subsection_code 3` means 501(c)(3).
3. **The donate URL is the one the site links to.** Used the organisation's own donate link, with
   campaign and tracking query strings removed, and checked that it resolves with `curl -L`
   (HTTP status below).

| Organisation | Where | EIN | IRS (ProPublica) | Site's own statement | Donate URL we link | `curl -L` |
|---|---|---|---|---|---|---|
| **Pacific Marine Mammal Center** | Laguna Beach, CA | 95-3680896 | "Friends Of The Sea Lion Inc", Laguna Beach CA, subsection 3, ruling 1982-08 (PMMC's founding name) | "a non-profit 501(c)(3) organization tax-ID number 95-3680896" ([pacificmmc.org](https://www.pacificmmc.org/)) | https://apps.pacificmmc.org/donate | 200 |
| **Laguna Ocean Foundation** | Laguna Beach, CA | 71-0953427 | "Laguna Ocean Foundation", Laguna Beach CA, subsection 3, ruling 2004-09 | "is a 501(c)(3), nonprofit organization" ([lagunaoceanfoundation.org](https://www.lagunaoceanfoundation.org/)) | https://lagunaoceanfoundation.org/donate/ | 200 |
| **Surfrider Foundation** | San Clemente, CA (HQ) | 95-3941826 | "Surfrider Foundation", San Clemente CA, subsection 3 | "As a non-profit 501(c)(3) organization, donations to the Surfrider Foundation are tax-exempt" ([surfrider.org/501c3-compliance](https://www.surfrider.org/501c3-compliance)) | https://www.surfrider.org/donate | 200 |
| The Marine Mammal Center | Sausalito, CA | 51-0144434 | "Marine Mammal Center", Sausalito CA, subsection 3 | "Federal Tax ID Number: 51-0144434" ([marinemammalcenter.org](https://www.marinemammalcenter.org/)) | https://www.marinemammalcenter.org/donate (redirects to its own donate.marinemammalcenter.org) | 200 |
| **Ocean Conservancy** | Washington, DC | 23-7245152 | "Ocean Conservancy Inc", Washington DC, subsection 3 | "Ocean Conservancy is a 501(c)3 – Donations are 100% tax-deductible as allowed by law." ([oceanconservancy.org](https://oceanconservancy.org/)) | https://oceanconservancy.org/donate/ | 403 to curl (bot wall on donate.oceanconservancy.org); the redirect target is its own donation platform. Opens fine in a browser. |
| **Monterey Bay Aquarium** | Monterey, CA | 94-2487469 | "Monterey Bay Aquarium Foundation", subsection 3 | "The Monterey Bay Aquarium is a 501(c)(3) nonprofit organization" ([montereybayaquarium.org](https://www.montereybayaquarium.org/)) | https://www.montereybayaquarium.org/support-us/donate (301 → its own tickets.montereybayaquarium.org/donate, heading "Donate", checked 2026-10-28) | 405 to curl (a bot filter); opens in a browser |

Mission lines, quoted from each homepage:
- **PMMC:** a marine mammal teaching hospital inspiring "ocean stewardship and conservation through
  rescue, rehabilitation, research, and education", since 1971.
- **Laguna Ocean Foundation:** protects and restores "marine habitats and coastal ecosystems"
  through conservation science, education and community engagement. It runs the Laguna tide-pool
  educator programme.
- **Surfrider:** "dedicated to the protection and enjoyment of the world's ocean, waves, and
  beaches, for all people".
- **The Marine Mammal Center:** "advances ocean health through marine mammal rescue and
  rehabilitation, research, and education."
- **Ocean Conservancy:** "securing a healthy ocean and a thriving planet, forever and for everyone."
- **Monterey Bay Aquarium:** "to inspire conservation of the ocean."

## Picks (5)
All six verify. We link five, in this order:
1. **Pacific Marine Mammal Center.** Laguna Beach itself; sea lions and seals.
2. **Laguna Ocean Foundation.** Laguna's tide pools, which are the game's Shallows: hermit crabs,
   sea stars, limpets and periwinkles.
3. **Surfrider Foundation.** Clean water and beaches on the same coast.
4. **Monterey Bay Aquarium.** Its sea otter programme "pioneered an approach of pairing orphaned
   southern sea otter pups with surrogate mothers" (homepage, 2026-10-28); sea otters and kelp.
5. **Ocean Conservancy.** Ocean trash and the International Coastal Cleanup; sea turtles.

**Swapped on 2026-10-28: The Marine Mammal Center → Monterey Bay Aquarium.** An independent design
review pointed out that two "Marine Mammal Center"s side by side (PMMC and TMMC, both rescuing seals)
read as one cause twice. TMMC is still a verified 501(c)(3) (above), but the aquarium's sea otter
surrogacy programme gives the otter card its own cause: kelp forests. Our first pass had left the
aquarium out because its giving runs through ticketing; its donate page is a plain donation form.

All five are US 501(c)(3)s. Players outside the US can still give, but tax treatment differs.
The copy says nothing about tax.

## Logos (added 2026-10-28, owner's request)
Each card shows the charity's own logo, unaltered, fetched from its website on 2026-10-28 and only
trimmed and resized (`public/charities/<id>.png`, ≤ 40 KB each, bundled so nothing is hot-linked):
PMMC and Monterey Bay Aquarium publish white artwork for dark headers (shown on a navy badge); Laguna
Ocean Foundation, Surfrider and Ocean Conservancy (its colour stacked logo) on white. Use is
nominative — to identify the charity next to a link to its own donation page, with no endorsement
implied — but most nonprofits have brand guidelines: **the owner should confirm with each charity
(or drop the logos) before release** (STATUS).

## How the links behave in the app
- Plain `<a href target="_blank" rel="noopener noreferrer">` links, with no query strings we add.
- **iOS and Android:** a tap is routed to the system browser. WKWebView and Android WebView do not
  navigate the app away, so we never lose the game.
- `referrerpolicy="no-referrer"` is set, so the charities don't even learn the click came from us.
  The links stay "untracked" in both directions.

## How indie games handle sincere cause pages
- **Alba: A Wildlife Adventure** (ustwo games) plants one tree per copy downloaded or sold, with
  Ecologi and Eden Reforestation Projects, aiming for 1 million trees. ustwo also joined Playing
  for the Planet in 2020 ([albawildlife.com/environment](https://www.albawildlife.com/environment)).
  This is a concrete, countable promise from the studio itself.
- **Playing for the Planet Alliance** (UNEP-backed): "Activating players globally to protect and
  restore our planet". Its Green Game Jam puts environmental content inside live games
  ([playing4theplanet.org](https://www.playing4theplanet.org/)).
- **Beyond Blue** (E-Line Media) was "inspired by the BBC's Blue Planet II" and leans on education
  inside the game ([Wikipedia](https://en.wikipedia.org/wiki/Beyond_Blue_(video_game))).

**Lessons for our page:**
- Be personal and short.
- Name real places and the creatures players already know.
- Don't guilt.
- Make no claims we can't keep. We make none about our own money, because we take none.
- Link straight to each charity's own page and let it make its case.
- Keep it out of the play loop: the About page is reached from the intro and from Settings only.

## Re-verify before each release
Run `curl -s https://projects.propublica.org/nonprofits/api/v2/organizations/<EIN>.json` for each
EIN, and check `curl -sL -o /dev/null -w '%{http_code}'` for each donate URL. Donate URLs change
when charities switch platforms, and `tests/e2e` only checks that our hrefs match this list.
