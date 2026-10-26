# ADR 0010 — Leaderboards: replay-verified scores behind one interface

- Status: accepted (built; the online server waits for the owner's Cloudflare account) · Date: 2026-10-16
- Research: `docs/research/LEADERBOARDS.md` (options, prices, anti-cheat), `docs/research/UI_DESIGN.md`
  §6.4–6.5 (rows, name entry). Owner steps: `docs/server/DEPLOY.md`.

## Decision
Daily and Endless (Classic) leaderboards with a 7-letter A–Z name, built behind a
`LeaderboardBackend` interface with two implementations:

- **MockBackend** (`src/platform/lbmock.ts`): on-device, the default while `VITE_LB_URL` is unset.
  It runs the same checks as the server and seeds each board with deterministic demo players, so the
  boards look alive offline and in demos. Boards from it are labelled **Demo** (chip + footer).
- **HttpBackend** (`src/platform/leaderboard.ts`) → a **Cloudflare Worker + D1** in `server/`
  (TypeScript, no framework) that bundles our own `src/core` and **replays every move log** before
  ranking it.

Swapping is a build flag: `VITE_LB_URL=https://… npm run build`. Nothing above `createLeaderboardUi`
knows which backend it talks to.

## Boards
- `daily:YYYY-MM-DD`: the player's **local** date, the same key as the Daily seed (`today()` in
  `src/app/env.ts`, `dailySeed()` in `src/core/daily.ts`). The server accepts a date from 14 h before
  its UTC midnight to 14 h after its UTC end (about 52 h), which covers UTC+14…UTC−12 plus offline
  grace; then the board is final (`410 board_closed`). **The first finish counts** per install id,
  and one salted IP hash may add at most 3 rows to a Daily board. This limits casual grinding; it
  does not stop a determined cheater (see "Not stopped" below).
- `endless:all` and `endless:wYYYY-WW` (ISO week, UTC, of the server's clock **when the score
  arrives**, never the ticket's issue time). Best score per player.
- Ranking: score desc, then the earlier submission, then insertion order. Exact ranks via an indexed
  `COUNT` of better rows, which reads O(rank) index entries. That's fine to roughly 100k DAU.
  **At scale:** keep a score histogram (16 buckets per power of two, research §7.4), count whole
  buckets above you, then count exactly only inside your bucket, returning `approx` for huge median
  buckets. Also edge-cache top-N and split D1 per board family. The `Store` seam makes that a local
  change.

## Interface
```ts
interface LeaderboardBackend {
  readonly kind: 'mock' | 'http';
  startRun(installId: string | undefined, teach: boolean): Promise<RunTicket | null>;
  markStarted(runId: string, runToken: string): Promise<void>;  // first move of a ticketed run
  submit(entry: ScoreSubmission): Promise<SubmitResponse>;     // → { verifiedScore, boards: Standing[] }
  top(board: BoardRef, n: number, installId?: string): Promise<TopResponse>; // rows carry `me`
  around(board: BoardRef, installId: string, window: number): Promise<AroundResponse>; // me, above, rows
  myRank(board: BoardRef, installId: string): Promise<Standing | null>;
  deletePlayer(installId: string): Promise<void>;
}
```
`ScoreSubmission` = name, installId, mode, seed, date (Daily), runToken (Endless), teach, rules,
packed moves, score, clientVersion, avatar. `Standing` carries rank, total, best, improved and
`above` (the row just above you: "142 to pass CORAL"). Wire types and the shared checks live in
`src/meta/boards.ts` and are imported by the app, the mock and the Worker.

`LeaderboardClient` wraps a backend for the UI: random install id (created on first post, kept in the
profile), last name, a persisted **offline queue** (retry with exponential backoff and jitter, 2 s →
5 min, `Retry-After` honoured, max 20 items / 14 days, non-retryable errors dropped), composed board
views with an offline cache, Endless ticket prefetch and erase.

## Anti-cheat
- **Replay verification** (`src/core/verify.ts`, used by the server, the mock and the client's
  "can this be posted?" check): the log must replay legally from the seed, the game must be over,
  and the recomputed score must equal the claim (`422 replay_invalid / score_mismatch`). The stored
  score is the server's.
- **Packed move log** (`src/core/movelog.ts`): 1 byte per move (`slot<<6 | x<<3 | y`), base64url,
  capped at 4,000 moves (~5.3 KB); bodies over 16 KB are refused (`413`).
- **Rules version** (`src/core/version.ts`): `RULES_VERSION` travels with every submission and run
  request; a mismatch is `426 upgrade_required` (the app says "Update the game to post scores").
  A unit test pins a fingerprint of the ramp, scoring, pieces, teaching tray, daily salt **and three
  golden games**, so a rules change without a version bump fails `make check`.
- **Daily**: the seed must equal `dailySeed(date)`, and the date must be inside its window.
- **Endless run tokens**: `POST /v1/runs` returns a server-chosen seed plus an HMAC-SHA256 token
  (secret `RUN_TOKEN_SECRET`) binding seed, teach flag, rules, issue time and the install id when the
  player has one. Tokens are **single use** (`used_runs`; an identical retry is idempotent, anything
  else is `409 duplicate_run`) and expire after **72 h**. Players who haven't opted in get unbound
  tickets (the first submitter claims them), so even a first-ever Endless game can be ranked. When
  online, a new classic game asks for a fresh ticket (2 s budget); the one spare ticket the client
  keeps is the fallback, and a game started without either (offline) plays normally and is shown as
  unranked. The ticket is saved with the game, so a reload before the first move keeps it ranked. A
  run finished after its ticket expired is shown as "Unranked: this run's ticket expired" and is
  never queued; queued posts whose ticket expires while waiting are dropped with a note.
- **Too fast to be human**: at the first move the client sends `POST /v1/runs/:rid/start {runToken}`
  (the first call wins; the token proves the caller holds the ticket). On submit, a run with a
  recorded start and less than 250 ms per move since that start is stored as a shadow row that only
  its owner sees, so cheaters don't learn the threshold. **What this checks:** that a run whose
  client reported its start took a human amount of time from its first move. **What it doesn't:**
  runs with no recorded start (an offline start, or a modified client that never calls it) are not
  speed-checked at all, and the issue time is never used (tickets are prefetched hours ahead). It
  is a tripwire for naive bots driving the stock client, not a defence against a modified one.
- Rate limits: every limited route counts per install id **and** per salted IP hash (submit 10/min
  per id, 30/min per IP hash; runs 30/h and 60/h; reads 120/min and 300/min; run starts 120/h per
  IP hash), so rotating install ids doesn't escape the address limit. Runs and submissions also cap
  the distinct install ids one IP hash may use per UTC day at 5. A Daily board takes at most 3 rows
  per IP hash (`429 board_limit`, not retried). Shared addresses (carrier-grade NAT, schools) can
  hit these caps; they are constants in `server/src/handler.ts` / `LB_LIMITS`.
  `players.banned` refuses submissions; moderators can hide rows (SQL in DEPLOY.md).
- **Not stopped:** a patient bot playing at human speed; a modified client (the Daily seed is
  public, so it can play offline best-of-N with a solver and post only its best, and it can skip the
  run-start call); many addresses (a botnet or a VPN pool passes every per-IP cap). Accepted
  (research §6); App Attest / Play Integrity can come later if boards get spammed.

## Name policy (`src/meta/names.ts`, shared by client and server)
- 1–7 letters A–Z, stored uppercase. Live input folds accents and full-width letters (JOSÉ → JOSE)
  and drops everything else. A name can't hold digits, spaces, URLs or emoji, so it can't carry
  contact details.
- Reserved: staff/system/game names (ADMIN, MOD, SUPPORT, SYSTEM, OFFICIA…, NULL, UNDEFIN, ANON,
  LAGOON, ATOLL, YOU…).
- Profanity: our own curated list of roots (English plus common Spanish, French, German, Italian,
  Portuguese, Dutch, Polish and Russian transliterations), stored ROT13 in `nameData.ts`. LDNOOBW
  wasn't used, so no attribution is needed. Every name is checked in three spellings:
  - lookalike families mapped (PH→F, C/Q→K, X→KS, Y→I, V→U) with letter runs capped at two;
  - the same with runs collapsed (FUUUK → FUK);
  - reversed, for the worst roots.
  Each root is tagged with the spelling that is safe for it. For example, the double-S roots only
  match uncollapsed, so ASH, SPLASH and CLASSIC stay legal.
- Vowel-dropped spellings are listed explicitly. Matching every root's consonant skeleton blocked
  CENT, SCENT and FICKLE.
- A Scunthorpe allowlist masks innocent words that contain a root: COCKLE, GRAPE, TORPEDO, SHIITE,
  HEARSE, CANCER… Tuning was measured against `/usr/share/dict/words` and `propernames` (1 of 1,175
  first names blocked: DICK, deliberately).
- The UI requires a valid name before Post; the server re-checks (`422 name_rejected`).

## UI (`src/ui/leaderboard.ts`, CSS section "Leaderboards" in `style.css`)
- **Results card:** a secondary button. When the player has no name yet it reads "Post your score"
  and opens name entry. Once they have posted, later games post automatically and the button shows
  "Leaderboard · #37 this week". The hook is a single `leaderboard` option on `showGameOver`, so the
  results-card redesign can keep it.
- **Name entry:** a bottom sheet with a Fraunces gradient hero preview, seven pebble slots, an
  on-screen QWERTY A–Z keypad (44 px hit boxes overlapping the gaps), live filtering of hardware
  keys and pastes with a shake, the remaining letters, inline reasons, "Surprise me" and "No thanks".
  It also states what posting shares, with a link to the privacy policy.
- **Boards:** Daily / This week / All-time tabs (arrow keys), a "just above you" target card ("142
  to pass CORAL" with a progress bar; gold "You're on top" at #1), medals for 1–3, avatars (your
  first-caught creature), your row tinted and pinned (sticky), and a window around you.
  States: skeleton loading, empty, offline (your queued or local best pinned), not-named (a "Choose
  a name" row) and stale cache.
- Reachable from the menu ("Leaderboards"). The whole feature is lazy-loaded (12.6 KB gz). The eager
  bundle gains only the move log.

## Privacy
Only after the player posts: the name, score, moves count and avatar are public; the move log, seed,
random install id and app version are not. No IP addresses are stored, only salted hashes (rate
counters; per-network sets of salted install-id hashes). Retention (hourly cron, so each limit plus
at most an hour): dailies 30 days, weeks 8 weeks, all-time until deleted, spent tokens and run
starts 72 h, rate counters 1 h, per-network sets 24 h (Daily boards: until the Daily closes, ≤ 52 h).
**Erase all progress** wipes local data
and writes a one-id tombstone. The next launch sends `DELETE /v1/players/:id`, then drops the
tombstone. Store labels for both build kinds are in `docs/store/LISTING.md`; the policy is in
`docs/store/PRIVACY.md` and `public/privacy.html`.

## Saves
The packed move log (plus teach flag and run token) is saved **inside** the classic/daily save
record, so a resumed game can still be posted. Older saves without it load as before; they just
can't be posted (tests: `tests/unit/storage.test.ts`). The profile gains `lb: {installId?, name?}`.

## What is stubbed / not built
- No live server yet: the Worker is complete and unit-tested through `handle()` with an in-memory
  store, but the **D1 SQL** (`server/src/d1.ts`) has not run against a real D1 (there is no SQLite
  in the Node 20 toolchain). Smoke-test it with `wrangler dev --local` per DEPLOY.md before launch.
- No admin endpoint (moderation is SQL via wrangler); no Cache API for top-N; no histogram ranks.
- The mock never ships (see "Update 2026-10-26" below): without `VITE_LB_URL` a release build has no
  leaderboards at all, exactly as `VITE_LB=off`.
- The install id is a bearer secret sent in the body or URL. It is never returned by any endpoint,
  but URLs can appear in logs; a signed player token (research §7.2) is the upgrade path.
- Game Center / Play Games: not used (no custom names, separate populations, the Daily's local-date
  reset can't map onto them). They may come later for achievements only.

## Update 2026-10-16 — name filter hardening (review finding #1)
A review found 47 offensive names passing `validateName` (letter-family swaps such as Q/C/G for
K, vowel variants of slur roots, and sexual/hate compounds only blocked as whole names). Added a
"severe" layer matched on a skeleton spelling (CK→K, lookalikes, G→K, runs ≤ 2) plus compound
roots; all 47 are now regression tests (ROT13). False positives measured against
`/usr/share/dict`: 1/1,175 first names (unchanged), 0.45% of ≤7-letter words (14 newly blocked,
all archaic/offensive-adjacent; RACHEL, CLINCH, FLINCH and SEXLESS were caught in testing and fixed).
**Known limit:** a fuzz of vowel swaps / dropped vowels on the slur roots still finds variants that
pass. A hand-written filter is a floor, not moderation. Before the real backend launches, the owner
should add server-side moderation: a maintained third-party list or moderation API on submit, a
report/ban path (the `banned` flag exists), and periodic review of the boards (DEPLOY.md lists the
SQL). Names are A–Z ≤ 7, so the exposure is short strings only.

## Review fixes (2026-10-16)
A code review of the leaderboards + endless reefs merge found ten issues; all are fixed, each with a
regression test (server: `server/test/handler.test.ts`, `schema.test.ts`; client:
`tests/unit/lbclient.test.ts`, `reefSource.test.ts`; UI: `tests/e2e/leaderboard.spec.ts`, `a11y.spec.ts`).
1. **Weekly board = submit week.** It used the ticket's issue time, so a spare ticket from Sunday
   23:00 UTC posted on Monday landed on last week's board while the UI said "#N this week". The
   server now uses its own clock at submission; the client prefers a fresh ticket at game start when
   online; the results label and the boards sheet use the board ids the server returned.
2. **Speed check from a server-recorded start** (`POST /v1/runs/:rid/start`, table `started_runs`),
   not from the issue time that prefetched tickets made meaningless. Exactly what is and isn't
   checked is in "Anti-cheat" above: offline starts are not speed-checked.
3. **Rate limits were keyed on a caller-chosen install id** (100/100 tickets from one IP with
   rotating ids). Every limited route now also counts per salted IP hash, and one IP hash may use at
   most 5 install ids per UTC day (table `ip_sets`).
4. **Daily "first finish counts" was bypassable by minting ids**: at most 3 rows per IP hash per Daily
   board (`board_limit`). The ADR now says what is still possible (public seeds, offline best-of-N).
5. **Expired Endless tickets** (a resumed game finished > 72 h after issue) said "This score
   couldn't be verified". They are now detected on the device (the token's public `exp`), shown as
   "Unranked: this run's ticket expired", never queued, and queued ones are dropped with a note on
   the next board. Rejection texts are per reason (`rejectionText`).
6. **Wrong row tagged "You"**: top was cached `public, max-age=30` and the client matched rows by
   rank. `top?installId=` now tags the caller's row `me` and is `no-store`; the client uses only that.
7. **schema.sql name CHECK** constrained only the first character: now
   `name NOT GLOB '*[^A-Z]*' AND length(name) BETWEEN 1 AND 7`. No live D1 exists yet; on one that
   already has the table, re-running the schema would not change the CHECK (it needs a table
   rebuild). `src/ui/leaderboard.ts` puts every server-provided value in with `textContent` /
   `setAttribute` (rows, target card, medals, notes), and formats numbers only if they are numbers.
8. **Privacy text vs retention**: the cron is now hourly, rate counters are pruned once their 1 h
   window passes, and `PRIVACY.md` / `privacy.html` give each limit (plus "within an hour").
9. **Reef generation could hang** ("Charting…" forever) when the worker replied `{error}` and the
   synchronous generator also threw: the fallback now uses try/finally, keeps pumping the queue,
   rejects the waiter (a later `ensure()` asks again) and the UI shows a "Try again" card.
10. (a) A Daily finished after local midnight opens the board of its own date (labelled
   "yesterday"); (b) a ticket taken for a new game is saved with it before the first move;
   (c) "Choose a name" on a boards sheet posts the last finished game unless the player declined it
   with "No thanks"; (d) the dialog focus trap skips inactive tabs and hidden/inert controls;
   (e) `version.ts` points at the fingerprint pin in `tests/unit/movelog.test.ts`.

## Update 2026-10-26 — the demo backend is dev/test only (UX review S3, must-fix 1)
A review found the demo boards read as fake (a "Demo" badge and footer, repeated names, a player
called URCHIN) and that Apple may reject screenshots of placeholder content. Decision (lead):
- **Build modes** (`LB_ON` in `src/app/main.ts`): `VITE_LB_URL` set → the real server;
  `VITE_LB=demo` → the on-device `MockBackend`; anything else → **no leaderboards** (no menu tile,
  no results "Post your score", no name entry, no network), the same as `VITE_LB=off` (which also
  wins over a URL). So `npm run build` without a URL is safe to ship today.
- **Demo where it's useful:** `vite` dev loads `.env.development` (`VITE_LB=demo`), so `make dev`,
  `scripts/screens.ts`, `lb-shots.ts` and `store-shots.ts --with-leaderboard` see boards; Playwright's
  web server builds its own `dist-e2e/` with `VITE_LB=demo` (`make e2e`'s leaderboard tests keep
  running). Debug `?nolb` hides the boards on a demo build (the release look; store shots use it).
- **Demo names** are drawn from a 190-name pool by a seeded shuffle per board, so no name repeats on a
  board; none is a species word (`lbclient.test.ts` checks both against `src/meta/creatures.ts`).
- No store asset shows a board until the real backend exists (`store-shots.ts` skips that shot unless
  `--with-leaderboard`).
