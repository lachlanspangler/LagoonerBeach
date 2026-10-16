# Lagooner Beach — Privacy Policy

_Last updated: 2026-10-16_

**Lagooner Beach has no accounts, no ads, no analytics, no tracking and no third-party SDKs that
phone home.** The only data that ever leaves your device is for the **optional leaderboards**, and
only after you choose a name and post a score.

## What stays on your device
Your progress is saved **only on your device** (browser local storage, or the app's private
storage on iOS/Android): best scores, settings (sound, music, haptics, theme, style), daily streaks,
reef puzzles cleared, your Beach Journal, and your leaderboard name. Deleting the app (or clearing
the site's data) deletes it.

## Leaderboards (optional)
Nothing is sent until you tap **Post** on a leaderboard name screen. When you post a score, the game
sends our leaderboard server:

| Data | Public? | Why |
|---|---|---|
| The name you chose (1–7 letters A–Z) | Yes, on the boards | To show your rank |
| Your score and number of moves | Yes | The leaderboard itself |
| A creature from your Beach Journal (your avatar) | Yes | Shown next to your name |
| The moves of that game and its game seed | No | The server replays them to check the score is real |
| A random player id, created on your device the first time you post | No | To keep one row per player, and to delete your data |
| The app version | No | To refuse scores from versions with different rules |

The random id is not your device id or an advertising id and isn't linked to anything else about
you. Names are limited to 7 letters A–Z (no digits, spaces or symbols, so they can't carry contact
details) and pass a word filter on your device and on the server.

After you've posted once, the game posts your later Daily and Classic results automatically under
the same name, so your rank appears on the results screen. You can change your name on the
leaderboard screen; **Erase all progress** stops posting and deletes everything (below).

**Seeds for Classic (Endless) games.** When you're online, the game asks the leaderboard server for
a game seed for your next Classic game, so that game can be ranked fairly. Before you have posted,
that request carries no identifier; after, it carries your random player id.

**Demo boards.** Builds without an online leaderboard show boards that run entirely on your device,
with sample players, labelled "Demo". They send nothing.

## Where it's stored, and for how long
The leaderboard runs on Cloudflare (Workers and D1), which processes it on our behalf. Your IP
address is seen by Cloudflare to deliver each request; we don't store it. For seed requests made
before you've posted, a salted, one-way hash of the address is kept as a rate-limit counter for at
most a day.

- Daily boards: kept for 30 days, then deleted.
- Weekly boards: kept for 8 weeks, then deleted.
- All-time board: kept until you delete it.
- Used game seeds: 72 hours. Rate-limit counters: one day.
- Database backups (point-in-time restore) roll off within 30 days.

We don't sell or share leaderboard data with anyone, and we don't use it for advertising.

## Deleting your data
**Settings → Erase all progress** deletes everything on your device and asks the server to delete
your player, your name and all your scores. If you're offline, the request is sent the next time
the game starts with a connection. You can also email us (below) to ask for deletion.

## Sharing
If you tap **Share** after a Daily, the game hands a short text (date, score, streak, a small emoji
picture) to your device's share sheet. Where it goes is up to you; the game doesn't send it anywhere
itself.

## Children
The game is suitable for all ages. Leaderboards are optional; names are 7 letters A–Z and filtered;
there is no chat, messaging or friend system, and the player id is random and used only to run the
boards.

## Changes
If this changes (for example, optional purchases), this policy will be updated **before** that
version ships, and anything involving data will be opt-in.

## Contact
Questions or deletion requests: _owner to add a contact email before publishing._
