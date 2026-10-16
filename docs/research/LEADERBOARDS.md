# Leaderboards: research and recommendation

_Researched 2026-10-16. Prices and limits come from the cited vendor pages as fetched today. Anything
not confirmed from a page is marked **(unverified)**. Check prices again before committing; they change._

## 0. TL;DR

- **Recommendation:** a small **custom backend on Cloudflare Workers + D1**. The Worker bundles our
  own `src/core` and replays every submitted move log before ranking it. The client talks to a
  `LeaderboardBackend` interface. A `MockBackend` (in-memory, same core, same name filter) is the
  default until the owner creates accounts.
- **Why not Game Center / Play Games as the main board:** no custom 7-letter names, two separate
  boards per platform, nothing on the web/PWA, and Play's daily boards reset at UTC-7. Our Daily rolls
  over at *local* midnight, so a Play daily board would mix two different daily seeds. Their
  Capacitor plugins are also either abandoned or Capacitor 8-only, and we are on Capacitor 7.
- **Cost:** about $5/month (Workers Paid minimum) up to ~100k DAU. Roughly $25–30/month at 100k DAU
  and ~$500–700/month at 1M DAU (§3).
- **Anti-cheat:** replay verification stops forged scores. It does **not** stop bots. Server-issued
  HMAC run tokens for Endless prevent seed shopping and give us a free elapsed-time sanity check
  without per-move telemetry.
- **Privacy:** leaderboards are opt-in (the player chooses a name). We collect the name, scores, move
  logs and a random player id, and keep no IPs. The privacy policy, App Store label and Play Data
  safety form must change **before** the version with leaderboards ships.

## 1. What the game gives us (why server verification is cheap here)

From the code (`src/core/*`):

- `newGame(seed, opts)` + a list of `Move {slot, x, y}` fully determines the game. `replay()`
  (`src/core/replay.ts`) re-applies the moves and throws on the first illegal one. Core is integer-only,
  has no DOM, no clock and no `Math.random` (ESLint-enforced), so it runs unchanged in a Worker isolate.
- `slot ∈ 0..2`, `x, y ∈ 0..7`, so a move packs into **one byte** (`slot<<6 | x<<3 | y`).
- **Daily:** `dailySeed(isoDate)` = FNV-1a of `atoll-daily-v1:<date>` (`src/core/daily.ts`). The date
  is the player's **local** calendar date (`today()` in `src/app/env.ts`), so "2026-10-17" starts in
  Kiribati (UTC+14) about 26 hours before it starts in Hawaii (UTC-10). A daily board is therefore
  keyed by the *date string* and stays open for roughly 50 hours of UTC time.
- **Classic/Endless:** `freshSeed()` uses `crypto.getRandomValues` on the client. The first-ever game
  passes `teach: true` (scripted teaching tray), and that flag changes the replay, so it must travel
  with the submission.
- **Rules drift:** `DEFAULT_RAMP`, scoring and the piece catalog define the game. Changing them changes
  the replay of every old log and every daily seed's game (CLAUDE.md says so). Submissions therefore
  need a `rules` version, and the server must bundle the matching core.
- **No move log is persisted today.** `GameState` holds `moves` (a count), not the list. The app needs
  to append each `Move` to a log stored next to the save (`saveDaily`/`saveGame` in
  `src/platform/storage.ts`) so a resumed game can still be submitted.

**Measured** (this machine, Node 20, `npx tsx`, the `search` bot from `src/sim/bots.ts`):

| game length | replay time | packed log (1 B/move, base64) |
|---|---|---|
| 695 moves | 8.3 ms | 928 chars |
| 2,234 moves | 31 ms | 2,980 chars |
| 3,000 moves (cap; bot never died) | 36–42 ms | 4,000 chars |

That is about 12–14 µs per move. A typical human game takes 50–80 moves (`artifacts/tune.json`:
human-like bot median 52, greedy 77) and replays in under 1 ms. A strong bot can play
**indefinitely**: the search bot hit the 3,000-move cap at about 400k points. This affects anti-cheat (§6)
and the Workers plan (the Free plan's 10 ms CPU limit, §3).

## 2. Option (a): Apple Game Center + Google Play Games Services

### What they offer
- **Game Center leaderboards** come in two types. *Classic* boards never reset. *Recurring* boards
  restart on a schedule you set with a start date, a duration and a restart interval; occurrences don't
  overlap. A 24 h duration with a 24 h interval gives a daily board
  ([Creating recurring leaderboards](https://developer.apple.com/documentation/gamekit/creating-recurring-leaderboards)).
  The constraints are a "minimum recurrence of five minutes, a maximum recurrence of 30 days", 100
  boards per app (500 with sets), and boards "must be approved" and "can't be deleted" once live
  ([App Store Connect: configure leaderboards](https://developer.apple.com/help/app-store-connect/configure-game-center/configure-leaderboards)).
  The recurring-capable API (`GKLeaderboard.type`, `submitScore(_:context:player:leaderboardIDs:)`,
  `loadEntries(for:timeScope:range:)`) is **iOS 14.0+** per Apple's API availability metadata
  ([GKLeaderboard.type](https://developer.apple.com/documentation/gamekit/gkleaderboard/type)).
- **Play Games Services v2** creates "daily, weekly, and all-time versions of every leaderboard"
  automatically. However, "Daily leaderboards reset at UTC-7 … all year long" and weekly boards reset
  "between Saturday and Sunday" in the same zone. Limits: up to 70 leaderboards, optional min/max score
  limits, `Players.hide` for cheaters, and **tamper protection** that "checks for suspected tampered
  scores and hides them automatically … Android games only"
  ([PGS leaderboards](https://developer.android.com/games/pgs/leaderboards)). PGS v2 sign-in is
  automatic and documented for Android only
  ([PGS Android sign-in](https://developer.android.com/games/pgs/android/android-signin)).

### Against our requirements
| Requirement | Game Center / PGS |
|---|---|
| Custom name, 7 letters A–Z, filtered | **No.** Game Center shows the player's alias/display name ([GKPlayer.alias](https://developer.apple.com/documentation/gamekit/gkplayer/alias)). PGS names "may contain Unicode characters" ([PGS](https://developer.android.com/games/pgs/leaderboards)). We can't impose our name rules. |
| Daily reset matching our local-date seed | **No.** PGS daily = fixed UTC-7. A recurring GC board resets at one global instant. Our Daily changes at each player's local midnight, so one occurrence would mix two seeds. A per-date board is impossible (70/100 board caps; GC boards need approval). |
| Endless all-time + this week | Yes (PGS weekly is built in; GC needs a 7-day recurring board). |
| "Rank + who's just above me" | Yes (`loadEntries` with a rank range; PGS "player-centered" scores). |
| Cross-platform single board | **No.** Two disjoint populations, iOS and Android. |
| Web/PWA | **No** practical path. Game Center is Apple-only; PGS lists a Web REST API, but sign-in is Android-native. |
| Server-side verification by replay | **No.** Scores are submitted from the device. PGS tamper protection is a black box; GC documents nothing comparable. |
| Cost | Free beyond developer accounts: Apple $99/yr ([Apple Developer Program](https://developer.apple.com/programs/whats-included/)), Google $25 one-time ([Play Console](https://support.google.com/googleplay/android-developer/answer/6112435)). We need both accounts to ship anyway. |

### Capacitor plugins (checked on the npm registry today)
| Package | Latest | Peer `@capacitor/core` | Notes |
|---|---|---|---|
| `@openforge/capacitor-game-connect` | 5.0.2 (2023-12-04) | `^5.0.0` | GC + PGS. Stale for ~3 years; won't install cleanly on Cap 7. |
| `capacitor-play-games-services` | 2.0.1 (2023-07-04) | `^5.0.0` | Android only. Stale. |
| `@idleflowgames/capacitor-play-games` | 0.3.1 (2026-10-12) | `^8.5.1` | PGS + GameKit; created 2026-06; 0.x; ~317 downloads/week. |
| `@modbender/capacitor-play-games` | 0.5.0 (2026-09-12) | `^8.0.0` | Android only, web no-op. |
| `@byvik/capacitor-play-games` | 0.1.1 (2026-10-07) | `>=8.0.0` | Android only, 9 days old. |

The only maintained plugins are young 0.x releases that require **Capacitor 8**. We are on
`@capacitor/cli` 7.6.9 (`package.json`), so adopting one means a Capacitor major upgrade first. A
plain Swift/Kotlin plugin of about 100 lines each is the alternative.

### Privacy
Apple: "You are not responsible for disclosing data collected by Apple"
([App privacy details](https://developer.apple.com/app-store/app-privacy-details/)). Game Center's own
policy says that for games with global leaderboards, "scores, and Arcade subscription state are visible to all Game Center
users", and that children's activity "can be shared only with their Game Center friends"
([Game Center & Privacy](https://www.apple.com/legal/privacy/data/en/game-center/)). Google Play:
you must disclose "data collection or sharing carried out by such third-party code", including the
Play Games SDK ([Data safety](https://support.google.com/googleplay/android-developer/answer/10787469)).

**Verdict:** good for achievements and free friend notifications. Wrong as the primary board for this
game.

## 3. Option (b): a small custom backend

Load model from the brief, with a 30-day month:
- Per DAU per day: 5 submissions, 10 board reads, and about 5 run-token requests (Endless starts),
  giving **~20 requests/DAU/day**.
- 1k DAU = 0.6 M req/month; 100k DAU = 60 M; 1M DAU = 600 M (~230 req/s average, assume ~1k req/s peak).
- Writes happen only when a submission improves a board ("best per player per board"). Assume about
  1.5 improved boards per DAU per day (daily first finish, plus sometimes the weekly/all-time) plus 1
  single-use-token row per Endless submission.

### 3.1 Cloudflare Workers + D1 (or Durable Objects)
- **Pricing** ([Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/)):
  - Free: 100k req/day and 10 ms CPU per invocation.
  - Paid: **$5/month** minimum, which includes 10 M req (then $0.30/M) and 30 M CPU-ms (then $0.02/M CPU-ms). No egress charges.
  - D1 Free: 5 M rows read/day, 100k rows written/day, 5 GB.
  - D1 Paid: 25 B rows read/month (then $0.001/M), 50 M rows written/month (then $1.00/M), 5 GB (then $0.75/GB-month).
  - Durable Objects are on the Free plan with SQLite storage and use the same row pricing.
- **Limits** ([Workers limits](https://developers.cloudflare.com/workers/platform/limits/),
  [D1 limits](https://developers.cloudflare.com/d1/platform/limits/)):
  - CPU: Free **10 ms**; Paid default 30 s.
  - Startup capped at 1 s; 128 MB memory.
  - D1: 10 GB per database (Paid), 50k databases, 1,000 queries per invocation.
  - **Each D1 database is single-threaded**: "A 1 ms average query allows about 1,000 queries per second".
  - Time Travel (point-in-time restore) is always on: 30 days on Paid, 7 on Free ([Time Travel](https://developers.cloudflare.com/d1/reference/time-travel/)).
  - `batch()` runs statements sequentially as a transaction and rolls back on failure ([D1 API](https://developers.cloudflare.com/d1/worker-api/d1-database/)).
- **Our core server-side:** yes. Wrangler bundles TypeScript, and the Worker imports
  `../src/core/replay.ts` directly. HMAC is available through `crypto.subtle`, and so is
  `crypto.subtle.timingSafeEqual` ([Web Crypto](https://developers.cloudflare.com/workers/runtime-apis/web-crypto/)).
- **CPU caveat:** a ~700-move replay costs ~8 ms on a laptop (§1). A long Endless game would blow
  the Free plan's 10 ms. **Use Workers Paid at launch.** Free is fine for a closed beta.
- **Cold starts:** V8 isolates. Startup is capped at 1 s, and there is no container spin-up. Not a
  practical concern.
- **Built-ins we use:**
  - Rate-limiting binding: period 10 or 60 s, "permissive, eventually consistent", per-location counters, and keyed by an id rather than IP per the docs ([Rate limit](https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/)). Needs wrangler ≥ 4.36.
  - Cron Triggers, which run in UTC ([Cron](https://developers.cloudflare.com/workers/configuration/cron-triggers/)).
  - The Cache API, which is per data center and functional on custom domains ([Cache](https://developers.cloudflare.com/workers/runtime-apis/cache/)).
- **Tooling gotcha:** current wrangler (4.151) requires **Node ≥ 22**. The last line that accepts our
  Node 20 is **4.86.x** (4.77–4.86 declare `>=20.3.0`; 4.87 moved to `>=22`, per the npm registry). So
  either pin `wrangler@4.86` in `server/package.json` or give `server/` its own `.nvmrc` with 22.
- **Ops burden:** very low. There is no server to patch, and backups are automatic (Time Travel).
  Logs come through `wrangler tail`.

### 3.2 Supabase (Postgres + Edge Functions)
- Free: $0, 500 MB DB, 500k Edge Function invocations, **paused after 1 week of inactivity**.
- Pro: from $25/month, 8 GB, 2 M invocations then $2/M, 250 GB egress then $0.09/GB.
- Compute add-ons: Small $15 (2 GB), Medium $60, Large $110, XL $210
  ([Supabase pricing](https://supabase.com/pricing)).
- Edge Functions: 256 MB, **2 s CPU** per request, 20 MB bundle
  ([limits](https://supabase.com/docs/guides/functions/limits)). Our core would run there.
- Postgres is the best fit of all the options for rank queries (B-tree `COUNT`, window functions).
- Ops: moderate (schema migrations, RLS policies, connection pooling, compute sizing).
- Owner setup: account, project, a service-role key as a secret, and the Supabase CLI.

### 3.3 Firebase (Firestore + Cloud Functions)
- Free quota: 50k reads, 20k writes and 20k deletes per day, 1 GiB.
- Cloud Functions' free tier (2 M invocations/month, then $0.40/M) is listed only under the **Blaze**
  (pay-as-you-go) plan ([Firebase pricing](https://firebase.google.com/pricing)).
- Rank cost is the problem. `count()` is billed "one read operation for each batch of up to 1000 index
  entries" ([Firestore pricing](https://firebase.google.com/docs/firestore/pricing)), so a player
  ranked #500,000 costs ~500 reads per rank lookup. A top-20 + around-me view costs ~27 more.
- Per-read prices didn't render from Google's page. At an assumed ~$0.03–0.06 per 100k reads
  **(unverified)**, 1M DAU (~84 B reads/month including counts) would cost thousands of dollars per
  month. The structure is a poor match for leaderboards.

### 3.4 Fly.io / Render tiny server + SQLite
- **Fly:** shared-cpu-1x 256 MB costs **$2.19/month**, volumes $0.15/GB-month, outbound $0.02/GB
  (NA/EU). New orgs get a trial only, not a free tier ([Fly pricing](https://docs.fly.io/about/pricing)).
  - SQLite in-process makes `COUNT` over an index nearly free, since rows read aren't billed. An
    in-memory order-statistic tree would also be easy.
  - Our core runs on plain Node.
  - Cheapest at scale, but **we own the ops**: a single machine/region, backups (e.g. Litestream to
    object storage), OS/runtime updates, uptime, and deploys.
- **Render free:** spins down after 15 min idle with a cold start of "about 1 minute", **no persistent
  disk** on free, and free Postgres "expire[s] 30 days after creation"
  ([Render free](https://render.com/docs/free)). Unsuitable.

### 3.5 AWS Lambda + DynamoDB (+ Redis for rank)
- Lambda: 1 M req + 400k GB-s free per month, then $0.20/M req and $0.0000166667/GB-s on x86
  ([Lambda pricing](https://aws.amazon.com/lambda/pricing/)).
- API Gateway HTTP API: $1.00/M. Its free tier is for new customers, 12 months only
  ([API GW](https://aws.amazon.com/api-gateway/pricing/)).
- DynamoDB on-demand: $0.625/M writes, $0.125/M reads, $0.25/GB-month, 25 GB free
  ([DynamoDB](https://aws.amazon.com/dynamodb/pricing/on-demand/)).
- DynamoDB has **no cheap "count items with score > X"**. A GSI query still consumes reads for every
  item scanned, so rank needs a sorted set in Redis, e.g. Upstash at $0.20 per 100k commands
  ([Upstash](https://upstash.com/pricing/redis)), where `ZREVRANK` is one command
  ([docs](https://upstash.com/docs/redis/sdks/ts/commands/zset/zrevrank)).
- Lambda cold starts on Node are a known issue: typically a few hundred ms **(unverified)**.
- Ops: IAM, API GW, two data stores. The most moving parts of any option.

### 3.6 Monthly cost estimate (order-of-magnitude)

| | 1k DAU | 100k DAU | 1M DAU |
|---|---|---|---|
| **Workers + D1** | $0 (Free, beta) / **$5** | **~$27**: $5 + $15 req + ~$2 CPU; D1 writes ~23 M and reads ~15 B are both inside the included amounts | **~$500–700**: req ~$182, CPU ~$23, D1 writes ~375 M → ~$325, reads ~150 B → ~$125, storage <$10 |
| Supabase | $0 (Free; 600k invocations would exceed the 500k, so route reads via SQL RPC instead) | ~$70–110 (Pro + Small/Medium compute + ~13 M edge invocations) | ~$500–650 (Pro + Large/XL + ~150 M edge submits ≈ $300 + ~1.2 TB egress ≈ $85) |
| Firebase | ~$5 (Blaze; ~300k reads/day > free 50k) | hundreds of $ **(unverified per-read price)** | thousands of $ **(unverified)** |
| Fly + SQLite | ~$3 | ~$5–15 | ~$50–100 (bigger VM, ~1.2 TB egress ≈ $24) plus our time |
| Lambda + Dynamo + Upstash | ~$0–5 | ~$200 | ~$2,000 (API GW $600, Upstash ~$1,200) |

D1 at 1M DAU has two real constraints. First, **one database is single-threaded (~1k q/s)**. Second,
it is capped at **10 GB**. Both have planned answers (§7.6): edge-cache top-N, keep move logs only
for top rows, and split into one D1 per board family or move each board into its own Durable Object.
The `BoardStore` seam in the server makes that a local change.

## 4. Option (c): hybrid

Use the custom backend as the source of truth for names, cross-platform boards and the web. Add
Game Center / PGS later only for **achievements** (Beach Journal milestones, a "Clean Reef"), plus an
optional mirror of Endless all-time to a *classic* platform board for the free friend notifications.
**Never mirror the Daily** (reset-time mismatch, §2).

Costs of doing this:
- a Capacitor 8 upgrade or two small native plugins;
- the Play SDK's data collection in our Data safety form;
- two more consoles to configure.

Worth it after launch if retention data says social nudges matter. Not for v1.

## 5. Recommendation

**Cloudflare Workers + D1, Workers Paid ($5/month) at launch, with a MockBackend now.**

1. It is the only option where the **verification code is literally `src/core`**. The isolate has no
   Node-isms, which matches core's purity, and esbuild bundles it.
2. **Cheapest operationally:**
   - no machines, no sleeping free tier, no pausing (unlike Supabase Free);
   - no per-request cold start worth mentioning;
   - automatic 30-day point-in-time restore.
3. **Cost is flat until real success:** $5/month to ~100k DAU, and a known path past that.
4. **SQLite rank queries** use indexed `ORDER BY` with `LIMIT`. D1 bills rows read, so §7.4 uses a
   score histogram to keep `COUNT`s small.
5. The owner's setup is one account, one CLI login and two secrets (§10).

Fly + SQLite is the runner-up: cheapest at 1M DAU, but someone has to run it. Supabase is a fine
alternative if the owner later wants Postgres analytics.

## 6. Anti-cheat

| Threat | Mitigation | Residual |
|---|---|---|
| Forged score / edited save | **Server replays the move log** with bundled core. Illegal move → `422 replay_invalid`. Final state must be `over`. Server score must equal the claim (else `422 score_mismatch`, logged as a bug or tamper signal). The server's score is the only one stored. | none |
| Seed shopping in Endless (simulate millions of seeds offline, submit the best) | **Server-issued run token**: `POST /v1/runs` returns `{runId, seed, issuedAt, mode, teach, rules, playerId}` + HMAC-SHA256 (`RUN_KEY`). Tokens are **single-use** (`used_runs` table), expire after 72 h, are rate-limited (e.g. 30/hour/player), and are bound to `playerId`. | Abandoning bad starts is still possible. The seed is known only after issue, and the dealer is "fair" (`trayClearable`), so the gain is small. |
| Retrying the same seed after learning it | Single-use token. A second submission for the same `runId` → `409 duplicate_run`, which is idempotent and returns current standings. | none |
| **Bots / solvers** (Daily seed is public; the search bot plays Endless indefinitely) | Replay can't tell a human from a bot. Cheap signal without telemetry: the token's `issuedAt` vs arrival time. Require `elapsed ≥ moves × 0.6 s` (tune from real data). Implausible runs are stored **hidden** (shadow) rather than rejected, so cheaters don't learn the threshold. Daily: count only the **first** finished daily per player per date, so solver grinding gives nothing extra. | A patient bot that plays at human speed wins. We accept this. Per-move timing would help a little, but we prefer minimal data; revisit only if boards get spammed. |
| Fake identities / ban evasion | Random `playerId` per install, HMAC-signed bearer token. `banned`/`hidden` flags. Admin endpoint behind `ADMIN_TOKEN`. Shadow-hide by default. | Reinstall = new id. Unavoidable without attestation. |
| Flooding | Rate-limit binding keyed on `playerId:route` (submit 10/60 s, reads 60/60 s, register 5/60 per player and a coarse per-colo key). Body cap **16 KB** (≈12k moves packed); `moves.length ≤ 12000`. `413 payload_too_large`. | Rate limiter is "permissive". Fine for this. |
| Client-embedded "API key" | Don't pretend. Any key in the app or PWA is extractable. Security rests on replay + tokens. | — |
| Modified app binaries | **Later:** App Attest (attest a Secure-Enclave key per install, assert critical requests; check `isSupported` and degrade gracefully, per [Apple](https://developer.apple.com/documentation/devicecheck/establishing-your-app-s-integrity), [server side](https://developer.apple.com/documentation/devicecheck/validating-apps-that-connect-to-your-server)). Play Integrity (default quota "10,000 total requests per day across all installs", [overview](https://developer.android.com/google/play/integrity/overview)), used only at registration. No equivalent for the PWA. | Weeks of work, server-side CBOR/cert parsing. Defer until cheating is observed. |
| Rules mismatch (old app, new ramp) | Submissions carry `rules` (a hash constant exported by core). The server keeps a map `rules → core build` for every version still in the wild. Unknown → `426 upgrade_required`. Board ids are per rules version if rules ever change mid-season. | Keep rule changes rare after launch. |

**Name moderation** (one shared pure module, e.g. `src/meta/names.ts`, used by client and Worker):
- Normalize to upper case. Must match `^[A-Z]{1,7}$` (owner may raise the minimum to 3).
- Reject if any **substring** is in a denylist. Seed it from the English list of
  [LDNOOBW](https://github.com/LDNOOBW/List-of-Dirty-Naughty-Obscene-and-Otherwise-Bad-Words)
  (CC BY 4.0, so credit it) and add short-word entries by hand.
- Keep a small allowlist for false positives such as `CLASSIC` and `GRASS`.
- Reserved names: `ADMIN MOD MODS STAFF OWNER DEV SYSTEM LAGOON LAGOONR APPLE GOOGLE NULL GUEST`.
- Letters only means no digits, URLs, emoji, homoglyphs or leetspeak. Names can't carry contact info.
- The server re-checks every name and can force-rename to `PLAYER` (the `hidden_name` flag).

## 7. Concrete design

### 7.1 Board ids and periods
- `daily:YYYY-MM-DD`, the player's local date that produced the seed. Accepted while the server's UTC
  time is in `[D 00:00 − 14 h, D+1 24:00 + 12 h]`. This covers UTC+14…UTC-12 plus ~12 h of grace for
  queued offline submissions. After that the board is **final**: `410 board_closed`.
- `endless:all`, all-time.
- `endless:wYYYY-WW`, the **ISO week in UTC** of the run token's `issuedAt`. Server time is used, so a
  run started Sunday 23:59 UTC counts for that week even if finished Monday.
- Each submission updates at most: Daily → `daily:D`; Endless → `endless:all` + `endless:w…`.

### 7.2 HTTP API (JSON, `https://api.<domain>/v1`)
Auth: `Authorization: Bearer <playerId>.<sig>`, where `sig = base64url(HMAC-SHA256(PLAYER_KEY, playerId))`.
It is verified statelessly with `timingSafeEqual`. CORS allows `capacitor://localhost` (iOS) and
`https://localhost` (Android), which follow from Capacitor's default scheme and hostname settings
([Capacitor config](https://capacitorjs.com/docs/config)), plus the PWA origin.

| Method & path | Request | 2xx response |
|---|---|---|
| `POST /v1/players` | `{ "name": "SANDY" }` | `201 { "playerId": "p_8f3c…", "token": "p_8f3c….Zk1…", "name": "SANDY" }` |
| `PUT /v1/players/me/name` | `{ "name": "CORAL" }` | `200 { "name": "CORAL" }` |
| `DELETE /v1/players/me` | — | `202 { "deleted": true }` |
| `POST /v1/runs` | `{ "mode": "endless", "teach": false, "rules": 3141592653 }` | `201 { "runToken": "eyJ…​.sig", "seed": 2752143011, "issuedAt": 1792180800000, "expiresAt": 1792440000000 }` |
| `POST /v1/scores` | see below | `200` standings (below) |
| `GET /v1/boards/{board}/top?limit=20` | — | `200 { "board": "endless:w2026-42", "total": 81234, "entries": [ { "rank": 1, "name": "REEFY", "score": 48210, "moves": 212 } ] }` (`Cache-Control: public, max-age=30`) |
| `GET /v1/boards/{board}/around/me?above=3&below=3` | — | `200 { "board": "…", "total": 81234, "me": { "rank": 4021, "name": "SANDY", "score": 6120, "moves": 81, "approx": false }, "entries": [ … 3 above, me, 3 below … ] }` |
| `GET /v1/boards/{board}/me` | — | `200 { "rank": 4021, "total": 81234, "score": 6120, "percentile": 95.1, "approx": false }`, or `404 not_ranked` |
| `GET /v1/health` | — | `200 { "ok": true, "rules": [3141592653] }` |

`POST /v1/scores` request:
```json
{
  "mode": "endless",
  "runToken": "eyJyIjoicl8…",
  "date": null,
  "seed": 2752143011,
  "teach": false,
  "rules": 3141592653,
  "moves": "QkNEUVJT…",
  "claimedScore": 6120,
  "clientSubmissionId": "c_5d1e…"
}
```
- `moves` is base64url of one byte per move, `slot<<6 | x<<3 | y`.
- For Daily: `mode: "daily"`, `date: "2026-10-16"`, no token. The seed must equal `dailySeed(date)`.

Response:
```json
{
  "verifiedScore": 6120,
  "boards": [
    { "board": "endless:all", "rank": 18452, "total": 401223, "best": 9870, "improved": false,
      "above": { "rank": 18451, "name": "KELP", "score": 9875 }, "approx": true },
    { "board": "endless:w2026-42", "rank": 4021, "total": 81234, "best": 6120, "improved": true,
      "above": { "rank": 4020, "name": "TIDE", "score": 6125 }, "approx": false }
  ]
}
```

Errors are always `{ "error": { "code": "...", "message": "...", "retryAfter"?: s } }`:

| HTTP | code | client action |
|---|---|---|
| 400 | `bad_request` | drop and log |
| 401 | `unauthorized` | re-register (keeps local data) |
| 403 | `banned` | show "Leaderboards unavailable"; drop the queue |
| 404 | `board_not_found` / `not_ranked` | show empty state |
| 409 | `duplicate_run` | treat as success (body carries standings) |
| 410 | `board_closed` | drop (daily is final) |
| 413 | `payload_too_large` | drop |
| 422 | `replay_invalid` / `score_mismatch` / `name_rejected` / `token_invalid` / `token_expired` / `seed_mismatch` | drop (names: show "Try another name") |
| 426 | `upgrade_required` | keep in queue; prompt to update |
| 429 | `rate_limited` | retry after `retryAfter` |
| 503 | `overloaded` | retry with backoff (D1 "overloaded") |

### 7.3 Schema (D1 / SQLite, `server/migrations/0001_init.sql`)
```sql
CREATE TABLE players (
  id          TEXT PRIMARY KEY,            -- 'p_' + 128-bit random, base32
  name        TEXT NOT NULL CHECK (name GLOB '[A-Z]*' AND length(name) BETWEEN 1 AND 7),
  created_at  INTEGER NOT NULL,            -- ms epoch
  banned      INTEGER NOT NULL DEFAULT 0,
  hidden      INTEGER NOT NULL DEFAULT 0   -- shadow: visible only to self
) WITHOUT ROWID;

CREATE TABLE scores (                       -- best per player per board
  board       TEXT NOT NULL,               -- 'daily:2026-10-16' | 'endless:all' | 'endless:w2026-42'
  player_id   TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  score       INTEGER NOT NULL,
  moves       INTEGER NOT NULL,
  achieved_at INTEGER NOT NULL,            -- tie-break: earlier wins
  bucket      INTEGER NOT NULL,            -- histogram bucket of score (7.4)
  visible     INTEGER NOT NULL DEFAULT 1,  -- 0 = hidden/shadow/implausible
  seed        INTEGER NOT NULL,
  rules       INTEGER NOT NULL,
  log         TEXT,                        -- packed moves; pruned for non-top rows (7.6)
  PRIMARY KEY (board, player_id)
) WITHOUT ROWID;
CREATE INDEX scores_rank ON scores (board, score DESC, achieved_at ASC) WHERE visible = 1;

CREATE TABLE hist (                         -- count of visible rows per (board, bucket)
  board  TEXT NOT NULL,
  bucket INTEGER NOT NULL,
  n      INTEGER NOT NULL,
  PRIMARY KEY (board, bucket)
) WITHOUT ROWID;

CREATE TABLE used_runs (run_id TEXT PRIMARY KEY, used_at INTEGER NOT NULL) WITHOUT ROWID;
```
SQLite supports `DESC` index columns and partial indexes
([CREATE INDEX](https://www.sqlite.org/lang_createindex.html)). If D1 doesn't enforce FK cascades,
deletion uses an explicit batch (§8).

### 7.4 Rank, top N and around-me queries
**Top N** reads N index entries. It is edge-cached for 30 s, since it is the same for everyone:
```sql
SELECT p.name, s.score, s.moves FROM scores s JOIN players p ON p.id = s.player_id
WHERE s.board = ?1 AND s.visible = 1
ORDER BY s.score DESC, s.achieved_at ASC LIMIT ?2;
```

**Rank of (score S, time T).** A plain `COUNT(*) … WHERE score > S` reads O(rank) index rows. That
is fine at 1k DAU, but at 1M it means ~500k billed rows per lookup. Instead keep a histogram with
**16 buckets per power of two**, which is integer-only:
`bucket(S) = S < 16 ? S : (bitlen(S) << 4) | ((S >>> (bitlen(S) - 5)) & 15)`. That gives about 6%
width, and at most ~460 buckets cover every uint32 score.
```sql
-- players strictly above my bucket (a few hundred rows at most; cacheable for 60 s)
SELECT COALESCE(SUM(n), 0) FROM hist WHERE board = ?1 AND bucket > ?2;
-- inside my bucket: exact count of better rows (bounded by bucket population)
SELECT COUNT(*) FROM scores
WHERE board = ?1 AND visible = 1 AND bucket = ?2
  AND (score > ?3 OR (score = ?3 AND achieved_at < ?4));
```
`rank = 1 + above + inBucket`. If my bucket holds more than ~5,000 rows (only near the median at large
scale), skip the exact count. Instead interpolate linearly inside the bucket and return
`approx: true`, which the UI shows as "≈ #48,200 · top 12%". Top players (sparse buckets) always get
an exact rank.

**Around me / who's just above.** Two short index scans:
```sql
-- k rows above me (nearest first)
SELECT p.name, s.score, s.moves FROM scores s JOIN players p ON p.id = s.player_id
WHERE s.board = ?1 AND s.visible = 1
  AND (s.score > ?2 OR (s.score = ?2 AND s.achieved_at < ?3))
ORDER BY s.score ASC, s.achieved_at DESC LIMIT ?4;
-- k rows below me
SELECT p.name, s.score, s.moves FROM scores s JOIN players p ON p.id = s.player_id
WHERE s.board = ?1 AND s.visible = 1
  AND (s.score < ?2 OR (s.score = ?2 AND s.achieved_at > ?3))
ORDER BY s.score DESC, s.achieved_at ASC LIMIT ?4;
```
Neighbour ranks are `myRank − 1, −2, …` and `myRank + 1, …`. A hidden (shadow) player sees their own
row spliced in at the rank they *would* have, and nobody else sees it.

### 7.5 Verification flow (`POST /v1/scores`)
1. Check `Content-Length ≤ 16384`. Parse the body and validate types.
2. Verify the bearer token → `playerId`. Load the player; `banned` → 403.
3. Rate-limit `playerId:submit`.
4. Check `rules` is supported (else 426). Decode moves, ≤ 12000.
5. Determine the seed.
   - **Endless:** verify the token HMAC, `token.playerId == playerId`, not expired, and
     `seed/teach/rules` equal the token's. Then `INSERT INTO used_runs … ON CONFLICT DO NOTHING`; if 0
     rows changed → 409 `duplicate_run`.
   - **Daily:** check the date window (§7.1) and `seed == dailySeed(date)`.
6. `s = replay({ seed, opts: { mode, teach }, moves })` from bundled core. A throw →
   422 `replay_invalid`. `!s.over` → 422 `replay_invalid` (only finished games rank).
   `s.score !== claimedScore` → 422 `score_mismatch`.
7. Plausibility (Endless): if `now − issuedAt < moves × MIN_MS_PER_MOVE`, set `visible = 0` and keep
   going (shadow).
8. **Daily first-finish rule:** if a `daily:D` row exists for the player, don't replace it (return
   standings).
9. For each target board, in one `batch()`:
   - upsert where `excluded.score > scores.score`;
   - if the row changed, `hist` gets −1 on the old bucket and +1 on the new one.
10. Compute rank + `above` per board (§7.4) and return.

### 7.6 Retention, cleanup and scale (Cron Trigger, daily 00:30 UTC)
- Delete `daily:*` boards older than **30 days** and `endless:w*` older than **8 weeks**, along with
  their `hist` rows.
- Delete `used_runs` older than 72 h.
- Null `log` for rows outside each board's top 1,000 after 7 days. Logs are kept for audit and for
  re-verification after a core bug fix.
- `endless:all` is kept indefinitely.
- At scale:
  - (1) edge-cache top-N and the histogram;
  - (2) split into one D1 database per board family (`daily`, `endless`) or per month;
  - (3) if one board's write rate nears D1's ~1k q/s single-thread ceiling, move that board into its own
    **Durable Object** with SQLite (same SQL and the same row pricing).
  Behind a `BoardStore` interface on the server, this is a local change.

### 7.7 Client interface (TypeScript sketch, `src/platform/leaderboard.ts`)
```ts
import type { Move } from '../core/game.ts';

export type BoardId = `daily:${string}` | 'endless:all' | `endless:w${string}`;

export interface BoardEntry {
  readonly rank: number;
  readonly name: string;
  readonly score: number;
  readonly moves: number;
  readonly me?: boolean;
  readonly approx?: boolean;
}
export interface Standing {
  readonly board: BoardId;
  readonly rank: number;
  readonly total: number;
  readonly best: number;
  readonly improved: boolean;
  readonly above: BoardEntry | null;
  readonly approx: boolean;
}
export interface RunTicket { readonly runToken: string; readonly seed: number; readonly expiresAt: number }
export interface SubmitInput {
  readonly mode: 'daily' | 'endless';
  readonly date?: string;          // daily only (local YYYY-MM-DD)
  readonly runToken?: string;      // endless only
  readonly seed: number;
  readonly teach: boolean;
  readonly rules: number;
  readonly moves: readonly Move[];
  readonly claimedScore: number;
}
export interface SubmitResult { readonly verifiedScore: number; readonly boards: readonly Standing[] }

export type LeaderboardErrorCode =
  | 'offline' | 'unauthorized' | 'banned' | 'not_ranked' | 'duplicate_run' | 'board_closed'
  | 'payload_too_large' | 'replay_invalid' | 'score_mismatch' | 'name_rejected' | 'token_invalid'
  | 'token_expired' | 'seed_mismatch' | 'upgrade_required' | 'rate_limited' | 'overloaded' | 'bad_request';
export class LeaderboardError extends Error {
  constructor(readonly code: LeaderboardErrorCode, readonly retryAfterS?: number) { super(code); }
  get retryable(): boolean {
    return ['offline', 'rate_limited', 'overloaded', 'upgrade_required'].includes(this.code);
  }
}

export interface LeaderboardBackend {
  /** Creates the pseudonymous player on first opt-in; idempotent if already registered. */
  register(name: string): Promise<void>;
  rename(name: string): Promise<void>;
  /** Endless: a signed seed. Returns null when offline (the game is then played unranked). */
  startRun(opts: { teach: boolean; rules: number }): Promise<RunTicket | null>;
  submit(input: SubmitInput): Promise<SubmitResult>;
  top(board: BoardId, limit?: number): Promise<readonly BoardEntry[]>;
  around(board: BoardId, above?: number, below?: number): Promise<{ me: BoardEntry | null; entries: readonly BoardEntry[] }>;
  myRank(board: BoardId): Promise<Standing | null>;
  /** Server-side erase (part of "Erase all progress"). */
  eraseMe(): Promise<void>;
}

/** In-memory backend: same core replay and same name filter as the Worker, injectable clock. */
export class MockBackend implements LeaderboardBackend { /* Map<BoardId, Map<playerId, Row>>,
  verifies with replay(), issues unsigned run tickets, optional latency/failure injection for e2e */ }
export class HttpBackend implements LeaderboardBackend { /* fetch() to VITE_LB_URL, maps error JSON */ }
```
- **Offline queue** (`src/platform/lbQueue.ts`): persist `SubmitInput[]` (max 20) in storage.
  - Flush on startup, on `online`, and on visibility-resume, with exponential backoff.
  - Drop non-retryable errors.
  - Drop Daily items whose board has closed.
- **Offline Endless:** with no ticket, the run uses `freshSeed()` and shows "Unranked (offline)".
  Prefetching one spare ticket when online covers most cases. It is single-use and expires after 72 h.
- **Pure helpers:** `packMoves`/`unpackMoves`, `bucket()`, `isoWeekId()` and the name filter go in
  pure modules shared by client, Mock and Worker, with property tests (pack/unpack round-trip, bucket
  monotonic).
- **Core addition:** core exports `RULES_VERSION` (a hash of `DEFAULT_RAMP`, scoring constants and the
  piece catalog), pinned by a golden test.

## 8. Privacy and compliance

**What's collected, and only after the player opts in by choosing a name:**
- chosen name (public);
- scores and move counts (public);
- move logs and seeds (not public);
- a random player id plus a token (no device identifiers, no advertising ID);
- the timestamps `issuedAt`/`achievedAt`.

**IP addresses** are seen transiently by Cloudflare to serve the request. We don't store them or key
rate limits on them. Keep Workers logs off or free of IPs.

**Documents to update before release** (PRIVACY.md promises "updated before that version ships" and
"anything involving data will be opt-in"):
- `docs/store/PRIVACY.md` + `public/privacy.html`: a "Leaderboards (optional)" section covering what
  is sent, what is public, the processor (Cloudflare), retention (§7.6), deletion, and that backups
  roll off within 30 days (D1 Time Travel).
- **App Store privacy label.** Apple defines *Gameplay Content* ("saved games, multiplayer matching or
  gameplay logic, or user-generated content in-game") and *User ID* ("screen name, handle, … assigned
  user ID") ([Apple](https://developer.apple.com/app-store/app-privacy-details/)).
  - Declare **User ID** + **Gameplay Content**, purpose **App Functionality**, **not used for tracking**.
  - Conservatively mark them *linked to the user* (pseudonymous but persistent).
  - Optional-disclosure doesn't apply: the data is collected on an ongoing basis after opt-in.
- **Play Data safety:** "collection" means "transmitting data from your app off a user's device"
  ([Play](https://support.google.com/googleplay/android-developer/answer/10787469)).
  - Declare Personal info → **Name** ("nickname"), App activity → **Other actions** ("gameplay"), and
    **Device or other IDs** (our random id).
  - Collected, not shared, encrypted in transit, deletion available, optional.

**GDPR/CCPA basics:**
- The lawful basis is consent at opt-in. Right to erasure applies "without undue delay"
  ([Art. 17](https://gdpr-info.eu/art-17-gdpr/)).
- **"Erase all progress"** calls `DELETE /v1/players/me` (queued if offline, sent before the local
  token is wiped). It removes the player, all `scores` rows (with `hist` decrements) and `used_runs`.
- Also offer a web path: the settings screen shows a short "player code" the user can email to the
  contact address.
- CCPA applies only above thresholds ($25 M revenue, 100k CA consumers, or 50% revenue from selling
  data; [CA OAG](https://oag.ca.gov/privacy/ccpa)), but the same deletion path covers it.

**Children (4+ rating):**
- COPPA's personal information includes "a screen or user name that functions as online contact
  information" and persistent identifiers. A persistent identifier used solely for internal operations,
  with no other personal information, has a disclosure exception
  ([FTC COPPA FAQ](https://www.ftc.gov/business-guidance/resources/complying-coppa-frequently-asked-questions)).
- Our design minimizes exposure:
  - A–Z ≤ 7 names can't hold contact info;
  - there is no messaging or free text;
  - the name filter and moderation apply;
  - the id is random and only used to operate the board;
  - no age gate is needed for a general-audience app.
- This is **not legal advice**. If the owner targets kids specifically or uses the Kids category,
  get a review first.

## 9. UX notes (to keep the calm identity)
- The first game-over with leaderboards on shows a single card: "Put your score on the beach board?",
  a 7-letter field with a letter keypad, and "No thanks".
- After choosing a name, game over shows "#4,021 this week · 5 points behind TIDE". The `above`
  entry exists for this line.
- Boards screen: tabs **Today / This week / All time**, top 20 + "around you" (3 above, 3 below).
  Offline shows the last cached view with a "saved for later" chip.

## 10. What the owner must set up (exact checklist)

1. **Cloudflare account**: free signup at dash.cloudflare.com. Before launch, subscribe to **Workers
   Paid ($5/month)** (needed for >10 ms CPU replays and 30-day Time Travel).
2. **Domain (recommended):** add a zone to Cloudflare, e.g. `api.lagoonerbeach.example`. Custom
   Domains need an active Cloudflare zone you own
   ([docs](https://developers.cloudflare.com/workers/configuration/routing/custom-domains/)). The
   Cache API used for top-N is functional on custom domains. The free `*.workers.dev` URL works for a
   beta.
3. **CLI**, from `server/`. Use wrangler pinned `4.86.x` on our Node 20, or Node 22 + latest:
   ```sh
   npm install
   npx wrangler login
   npx wrangler d1 create lagooner-lb        # paste database_id into server/wrangler.jsonc
   npx wrangler d1 migrations apply lagooner-lb --remote
   openssl rand -base64 32 | npx wrangler secret put PLAYER_KEY
   openssl rand -base64 32 | npx wrangler secret put RUN_KEY
   openssl rand -base64 32 | npx wrangler secret put ADMIN_TOKEN
   npx wrangler deploy
   npx wrangler tail                          # live logs
   ```
   Command forms are from [D1 commands](https://developers.cloudflare.com/workers/wrangler/commands/d1/)
   and [Workers commands](https://developers.cloudflare.com/workers/wrangler/commands/workers/).
   Keep the three secrets in a password manager too. Rotating `PLAYER_KEY` logs everyone out of
   leaderboards.
4. **Client config:** set `VITE_LB_URL=https://api.<domain>/v1` in the release build. Set the allowed
   CORS origins (`capacitor://localhost`, `https://localhost`, PWA origin) in `wrangler.jsonc` `vars`.
5. **Optional CI deploys:** create a Cloudflare API token scoped to Workers Scripts + D1 edit, and
   store it as `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID` CI secrets.
6. **Legal/store:**
   - add the contact email to PRIVACY.md (still "owner to add");
   - update the privacy policy, the App Store privacy label and the Play Data safety form (§8);
   - credit LDNOOBW (CC BY 4.0).
7. **Moderation duty:** check the admin "recent names" list now and then.
   `POST /v1/admin/players/{id}/hide|ban|rename` with `ADMIN_TOKEN`.
8. **Cost:** $5/month until ~100k DAU. Set a Cloudflare billing notification.
9. **Not needed for v1:** Game Center / Play Games configuration, App Attest, Play Integrity
   (revisit per §4/§6).

## 11. Build order (for us, before accounts exist)
1. Core + pure modules: `RULES_VERSION`, pack/unpack, `bucket`, `isoWeekId`, the name filter, and a move
   log persisted with saves.
2. `LeaderboardBackend` + `MockBackend` + offline queue + UI, all tested with Vitest and e2e on the Mock.
3. `server/`: Worker + migrations + `BoardStore` (D1), with tests that replay the same golden logs as
   the client. Run locally with `wrangler dev`; the D1 binding has a `--local` mode.
4. Owner runs §10. Flip `VITE_LB_URL`. Closed beta on Workers Free, then Paid at launch.
