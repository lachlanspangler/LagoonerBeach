# Deploying the leaderboard server (owner steps)

The game ships with **on-device demo boards** until a server URL is built in. Everything below is a
one-time setup of about 20 minutes. Design and trade-offs: `docs/adr/0010-leaderboards.md` and
`docs/research/LEADERBOARDS.md`.

What you get: a Cloudflare Worker (`server/`) with a D1 (SQLite) database. It verifies every score
by replaying the game's moves with the game's own code, issues signed seeds for Endless runs, and
serves the Daily / This week / All-time boards.

## 0. Prerequisites
- **Node 20** (the repo's `.nvmrc`). Wrangler is pinned to **4.86.x** in `server/package.json`,
  the last line that runs on Node 20 (4.87+ needs Node 22). Don't add wrangler to the root
  `package.json`.
- `openssl` (preinstalled on macOS) for generating the secret.

## 1. Cloudflare account
1. Sign up at <https://dash.cloudflare.com/sign-up> (free).
2. **Before public launch**, subscribe to **Workers Paid ($5/month)**: Workers & Pages → Plans.
   The Free plan's 10 ms CPU limit is enough for a beta, but a long Endless game takes more than
   10 ms to replay. Paid also gives D1 30 days of point-in-time restore (Free: 7).
3. Set a billing notification (Manage Account → Billing → Notifications).

## 2. Install and log in (from `server/`)
```sh
cd server
npm install                 # installs wrangler 4.86.x locally (no global install)
npx wrangler login          # opens a browser; approve the OAuth prompt
```

## 3. Database
```sh
npx wrangler d1 create lagooner-lb
```
Copy the printed `database_id` into `server/wrangler.toml` (replace `REPLACE_WITH_DATABASE_ID`),
then create the tables:
```sh
npx wrangler d1 execute lagooner-lb --remote --file=schema.sql
```
(`schema.sql` is idempotent; re-running it is safe.)

## 4. Secret
```sh
openssl rand -base64 32 | npx wrangler secret put RUN_TOKEN_SECRET
```
Keep a copy in your password manager. Rotating it only invalidates Endless runs in progress (their
tokens stop verifying); scores already posted are unaffected.

## 5. Allowed origins
In `server/wrangler.toml` → `[vars]` → `ALLOWED_ORIGINS`, list where the game runs:
`capacitor://localhost` (iOS app), `https://localhost` (Android app), and your PWA origin (for
example `https://lagoonerbeach.example`). Use `*` only for testing.

## 6. Deploy
```sh
npx wrangler deploy
```
It prints the URL, for example `https://lagooner-lb.<your-subdomain>.workers.dev`. Smoke test:
```sh
curl https://lagooner-lb.<your-subdomain>.workers.dev/v1/health
# {"ok":true,"rules":[1]}
curl https://lagooner-lb.<your-subdomain>.workers.dev/v1/boards/endless:all/top
# {"board":"endless:all","total":0,"entries":[]}
```
Optional, recommended for launch: a custom domain (Workers & Pages → your worker → Settings →
Domains & Routes), for example `api.lagoonerbeach.example`. It needs a zone on Cloudflare.

## 7. Point the game at it
The client reads `VITE_LB_URL` at **build time**. Pass it on the release build's command line:
```sh
VITE_LB_URL=https://lagooner-lb.<your-subdomain>.workers.dev npm run build
npx cap sync                       # then build the iOS/Android apps as usual
```
With the variable unset, a release build ships **without** leaderboards (no menu entry, no results
button, no name entry, no network; ADR 0010 "Update 2026-10-26"). The on-device demo boards are for
dev and tests only (`VITE_LB=demo`: on in `vite` dev via `.env.development` and in the e2e build that
`playwright.config.ts` makes into `dist-e2e/`). Prefer the command line over a committed
`.env.production`: the e2e tests expect the demo boards (they must never post to the live server).

## 8. Before you ship that build (store + legal)
- Add the contact email to `docs/store/PRIVACY.md` and `public/privacy.html`, and host the page.
- Update the **App Store privacy label** and the **Play Data safety form** exactly as written in
  `docs/store/LISTING.md` → "Privacy". They change the moment `VITE_LB_URL` is set.
- Age rating questionnaires: answer yes to "user-generated content" (player names), noting names are
  7 letters A–Z, filtered, with no chat or messaging.

## Local development (no account needed)
```sh
cd server && npm run schema:local && npm run dev      # wrangler dev --local on :8787
# in another terminal, from the repo root:
VITE_LB_URL=http://localhost:8787 npx vite --port 5317
```
(Add `http://localhost:5317` to `ALLOWED_ORIGINS` or keep `*` for local use.) The unit tests
(`npm test` at the root) exercise the same handler with an in-memory store and need no wrangler.

## Operating it
- Live logs: `npx wrangler tail` (no IP addresses are logged by the Worker).
- Retention runs hourly at :07 (cron in `wrangler.toml`): dailies older than 30 days, weekly boards
  older than 8 weeks, spent run tokens and run starts once 72 h old, rate counters once their 1 h
  window has passed, per-network IP-hash sets when they expire (a day, or when that Daily closes).
  Each row outlives its limit by at most an hour; `docs/store/PRIVACY.md` states these numbers.
- Moderation (names are filtered on the client and the server, but nothing is perfect):
  ```sh
  # find a player by name
  npx wrangler d1 execute lagooner-lb --remote --command "SELECT id, name, updated_at FROM players WHERE name = 'XXXXX'"
  # hide all their rows (they still see themselves; nobody else does)
  npx wrangler d1 execute lagooner-lb --remote --command "UPDATE scores SET visible = 0 WHERE player_id = '<id>'"
  # refuse further submissions
  npx wrangler d1 execute lagooner-lb --remote --command "UPDATE players SET banned = 1 WHERE id = '<id>'"
  ```
- Deletion requests by email: `DELETE FROM scores WHERE player_id = '<id>'` and the same for
  `players` and `used_runs`, or `curl -X DELETE …/v1/players/<id>` (the in-app Erase does this).
- Backups: D1 Time Travel (`npx wrangler d1 time-travel info lagooner-lb`).

## Changing the rules
`src/core/version.ts` `RULES_VERSION` must be bumped whenever the dealer, scoring or pieces change
(a unit test fails otherwise). The server only accepts the version it was built with, so **deploy
the server and release the apps together**; older apps get "Update the game to post scores"
(`426 upgrade_required`) and keep playing offline normally.

## Cost (from docs/research/LEADERBOARDS.md §3.6, check current prices)
| Daily players | Monthly cost |
|---|---|
| up to ~1k | $0 on Free (beta) / **$5** on Workers Paid |
| ~100k | ~$27 |
| ~1M | ~$500–700 (then: edge-cache top-N, split D1 per board family; ADR 0010) |
