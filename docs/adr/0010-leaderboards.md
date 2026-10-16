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
  grace; then the board is final (`410 board_closed`). **The first finish counts**: the Daily seed
  is public, so grinding replays (or a solver) earns nothing.
- `endless:all` and `endless:wYYYY-WW` (ISO week, UTC, of the run's start). Best score per player.
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
  submit(entry: ScoreSubmission): Promise<SubmitResponse>;     // → { verifiedScore, boards: Standing[] }
  top(board: BoardRef, n: number): Promise<TopResponse>;
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
  tickets (the first submitter claims them), rate-limited by a salted IP hash, so even a first-ever
  Endless game can be ranked. The client keeps one spare ticket; a classic game started without one
  (offline) plays normally and is shown as unranked.
- **Too fast to be human** (less than 250 ms per move since the token was issued): stored as a
  shadow row that only its owner sees, so cheaters don't learn the threshold.
- Rate limits per install id (submit 10/min, reads 120/min, runs 30/h); `players.banned` refuses
  submissions; moderators can hide rows (SQL in DEPLOY.md).
- Not stopped: a patient bot playing at human speed. Accepted (research §6); App Attest / Play
  Integrity can come later if boards get spammed.

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
random install id and app version are not. No IP addresses are stored. Retention: dailies 30 days,
weeks 8 weeks, all-time until deleted, spent tokens 72 h. **Erase all progress** wipes local data
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
- Shipping the mock in production shows labelled demo players. If that's unwanted before the server
  exists, build with `VITE_LB=off`: no menu entry, no results button, no network.
- The install id is a bearer secret sent in the body or URL. It is never returned by any endpoint,
  but URLs can appear in logs; a signed player token (research §7.2) is the upgrade path.
- Game Center / Play Games: not used (no custom names, separate populations, the Daily's local-date
  reset can't map onto them). They may come later for achievements only.
