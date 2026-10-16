-- Lagooner Beach leaderboards (Cloudflare D1 / SQLite).
-- Apply: npx wrangler@4.86 d1 execute lagooner-lb --remote --file=schema.sql
-- Idempotent (IF NOT EXISTS), so re-running it is safe.

-- One row per install that has posted. id = the random install id (128-bit hex), never shown.
CREATE TABLE IF NOT EXISTS players (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL CHECK (name NOT GLOB '*[^A-Z]*' AND length(name) BETWEEN 1 AND 7),
  avatar      TEXT,                          -- Beach Journal species id, optional
  created_at  INTEGER NOT NULL,              -- ms epoch
  updated_at  INTEGER NOT NULL,
  banned      INTEGER NOT NULL DEFAULT 0     -- moderation: 1 = submissions refused
) WITHOUT ROWID;

-- Best (Endless) or first (Daily) verified score per player per board.
CREATE TABLE IF NOT EXISTS scores (
  board       TEXT NOT NULL,                 -- 'daily:2026-10-16' | 'endless:all' | 'endless:w2026-42'
  player_id   TEXT NOT NULL,
  score       INTEGER NOT NULL,
  moves       INTEGER NOT NULL,
  at          INTEGER NOT NULL,              -- ms epoch of the submission; ties: earlier ranks higher
  seq         INTEGER NOT NULL,              -- insertion order within the board (final tie-break)
  visible     INTEGER NOT NULL DEFAULT 1,    -- 0 = shadow (implausibly fast / hidden by a moderator)
  seed        INTEGER NOT NULL,
  rules       INTEGER NOT NULL,              -- RULES_VERSION the log replays under
  log         TEXT,                          -- packed move log, for audit and re-verification
  PRIMARY KEY (board, player_id)
) WITHOUT ROWID;
CREATE INDEX IF NOT EXISTS scores_rank ON scores (board, visible, score DESC, at ASC, seq ASC);
CREATE INDEX IF NOT EXISTS scores_player ON scores (player_id);

-- Spent Endless run tokens (single use). Rows older than 72 h are pruned by the hourly cron.
CREATE TABLE IF NOT EXISTS used_runs (
  run_id      TEXT PRIMARY KEY,
  player_id   TEXT NOT NULL,
  run_hash    TEXT NOT NULL,                 -- lets an identical retry succeed idempotently
  used_at     INTEGER NOT NULL
) WITHOUT ROWID;

CREATE INDEX IF NOT EXISTS used_runs_at ON used_runs (used_at);

-- When an Endless run's first move was made (POST /v1/runs/:rid/start; the first call wins). The
-- "too fast to be human" check measures from here. Pruned 72 h after the start by the hourly cron.
CREATE TABLE IF NOT EXISTS started_runs (
  run_id      TEXT PRIMARY KEY,
  started_at  INTEGER NOT NULL
) WITHOUT ROWID;

-- Fixed-window rate counters keyed by 'route:installId' or 'route:ip-<salted hash>' (never an IP
-- address). Windows are at most 1 h; the hourly cron drops dead counters.
CREATE TABLE IF NOT EXISTS rate (
  key          TEXT PRIMARY KEY,
  window_start INTEGER NOT NULL,
  n            INTEGER NOT NULL
) WITHOUT ROWID;

-- Bounded sets for per-network caps: scope = 'ids:<UTC day>:ip-<hash>' (install ids per address per
-- day) or '<daily board>:ip-<hash>' (rows per address per Daily); member = a salted hash of the
-- install id. Neither an IP address nor an install id is stored. Rows go when they expire.
CREATE TABLE IF NOT EXISTS ip_sets (
  scope       TEXT NOT NULL,
  member      TEXT NOT NULL,
  expires_at  INTEGER NOT NULL,
  PRIMARY KEY (scope, member)
) WITHOUT ROWID;
CREATE INDEX IF NOT EXISTS ip_sets_exp ON ip_sets (expires_at);
