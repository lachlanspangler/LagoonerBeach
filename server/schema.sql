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

-- Spent Endless run tokens (single use). Rows older than 72 h are pruned by the cron.
CREATE TABLE IF NOT EXISTS used_runs (
  run_id      TEXT PRIMARY KEY,
  player_id   TEXT NOT NULL,
  run_hash    TEXT NOT NULL,                 -- lets an identical retry succeed idempotently
  used_at     INTEGER NOT NULL
) WITHOUT ROWID;

-- Fixed-window rate counters keyed by 'route:installId' (no IP addresses are stored).
CREATE TABLE IF NOT EXISTS rate (
  key          TEXT PRIMARY KEY,
  window_start INTEGER NOT NULL,
  n            INTEGER NOT NULL
) WITHOUT ROWID;
