-- ---------------------------------------------------------------------------
-- JASON REMIX — schema
--
-- Design notes that matter:
--   * Credits are never stored as a bare number that gets updated. `credit_balances`
--     is a cache; `credit_transactions` is the ledger, and every row records the
--     balance it produced so the history can be reconciled end to end.
--   * A CHECK constraint forbids a negative balance at the database level, so even a
--     bug in application code cannot overdraw an account.
--   * Idempotency keys are stored with their response, so a retried request returns
--     the original outcome instead of applying twice.
--   * Spotify tokens are stored encrypted; the columns hold ciphertext, never a token.
-- ---------------------------------------------------------------------------

PRAGMA foreign_keys = ON;

-- --- Identity ---------------------------------------------------------------

CREATE TABLE IF NOT EXISTS users (
  id            TEXT PRIMARY KEY,
  email         TEXT NOT NULL UNIQUE COLLATE NOCASE,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'USER' CHECK (role IN ('USER', 'ADMIN')),
  status        TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'BANNED', 'DELETED')),
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS user_profiles (
  user_id      TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  username     TEXT NOT NULL UNIQUE COLLATE NOCASE,
  display_name TEXT,
  avatar_url   TEXT,
  bio          TEXT,
  country      TEXT,
  -- Collected only where a giveaway legally requires an age check.
  birth_date   TEXT,
  push_enabled INTEGER NOT NULL DEFAULT 0 CHECK (push_enabled IN (0, 1)),
  completed_at TEXT,
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Refresh tokens are stored as hashes: a database leak must not hand out sessions.
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  revoked_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens(user_id);

-- --- Spotify ----------------------------------------------------------------

CREATE TABLE IF NOT EXISTS spotify_connections (
  user_id                TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  spotify_user_id        TEXT NOT NULL,
  display_name           TEXT,
  avatar_url             TEXT,
  product                TEXT,
  scopes                 TEXT NOT NULL DEFAULT '',
  -- AES-256-GCM ciphertext. Never a readable token.
  access_token_cipher    TEXT NOT NULL,
  refresh_token_cipher   TEXT NOT NULL,
  access_token_expires_at TEXT NOT NULL,
  connected_at           TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at             TEXT NOT NULL DEFAULT (datetime('now'))
);

-- --- Catalogue ---------------------------------------------------------------

CREATE TABLE IF NOT EXISTS albums (
  id           TEXT PRIMARY KEY,
  title        TEXT NOT NULL,
  artist       TEXT NOT NULL DEFAULT 'Jason Remix',
  cover_url    TEXT,
  release_date TEXT NOT NULL,
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS tracks (
  id           TEXT PRIMARY KEY,
  title        TEXT NOT NULL,
  artist       TEXT NOT NULL DEFAULT 'Jason Remix',
  album_id     TEXT REFERENCES albums(id) ON DELETE SET NULL,
  cover_url    TEXT,
  release_date TEXT NOT NULL,
  genre        TEXT,
  duration_ms  INTEGER,
  isrc         TEXT,
  featured     INTEGER NOT NULL DEFAULT 0 CHECK (featured IN (0, 1)),
  -- JSON object of platform -> url.
  links        TEXT NOT NULL DEFAULT '{}',
  position     INTEGER NOT NULL DEFAULT 0,
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at   TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_tracks_release ON tracks(release_date DESC);

CREATE TABLE IF NOT EXISTS news (
  id           TEXT PRIMARY KEY,
  category     TEXT NOT NULL CHECK (category IN ('RELEASE', 'TOUR', 'REWARD', 'ANNOUNCEMENT')),
  title        TEXT NOT NULL,
  body         TEXT NOT NULL,
  image_url    TEXT,
  link_url     TEXT,
  published_at TEXT NOT NULL DEFAULT (datetime('now')),
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_news_published ON news(published_at DESC);

-- --- Credits -----------------------------------------------------------------

CREATE TABLE IF NOT EXISTS credit_balances (
  user_id         TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  -- A balance can never go below zero, enforced here rather than only in code.
  balance         INTEGER NOT NULL DEFAULT 0 CHECK (balance >= 0),
  lifetime_earned INTEGER NOT NULL DEFAULT 0 CHECK (lifetime_earned >= 0),
  lifetime_spent  INTEGER NOT NULL DEFAULT 0 CHECK (lifetime_spent >= 0),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS credit_transactions (
  id            TEXT PRIMARY KEY,
  user_id       TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount        INTEGER NOT NULL CHECK (amount <> 0),
  type          TEXT NOT NULL CHECK (type IN ('EARN', 'SPEND', 'BONUS', 'ADMIN_ADJUSTMENT', 'REFUND')),
  description   TEXT NOT NULL,
  reference     TEXT,
  balance_after INTEGER NOT NULL CHECK (balance_after >= 0),
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_transactions_user ON credit_transactions(user_id, created_at DESC);

-- --- Missions -----------------------------------------------------------------

CREATE TABLE IF NOT EXISTS missions (
  id               TEXT PRIMARY KEY,
  type             TEXT NOT NULL CHECK (type IN (
                     'DAILY_CHECK_IN', 'CONNECT_SPOTIFY', 'COMPLETE_PROFILE',
                     'NEW_RELEASE', 'COMMUNITY', 'SPECIAL_EVENT')),
  title            TEXT NOT NULL,
  description      TEXT NOT NULL DEFAULT '',
  reward           INTEGER NOT NULL CHECK (reward > 0),
  cooldown_seconds INTEGER,
  repeatable       INTEGER NOT NULL DEFAULT 0 CHECK (repeatable IN (0, 1)),
  active           INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  starts_at        TEXT,
  ends_at          TEXT,
  position         INTEGER NOT NULL DEFAULT 0,
  created_at       TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at       TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS mission_completions (
  id             TEXT PRIMARY KEY,
  mission_id     TEXT NOT NULL REFERENCES missions(id) ON DELETE CASCADE,
  user_id        TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  transaction_id TEXT REFERENCES credit_transactions(id) ON DELETE SET NULL,
  awarded        INTEGER NOT NULL,
  completed_at   TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_completions_user ON mission_completions(user_id, mission_id, completed_at DESC);

-- --- Rewards ------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS rewards (
  id                TEXT PRIMARY KEY,
  title             TEXT NOT NULL,
  subtitle          TEXT,
  description       TEXT NOT NULL DEFAULT '',
  category          TEXT NOT NULL DEFAULT 'MERCH'
                      CHECK (category IN ('MERCH', 'COLLECTOR', 'TICKET', 'EXPERIENCE', 'DIGITAL')),
  cost              INTEGER NOT NULL CHECK (cost > 0),
  image_url         TEXT,
  stock             INTEGER,
  remaining         INTEGER CHECK (remaining IS NULL OR remaining >= 0),
  active            INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  requires_shipping INTEGER NOT NULL DEFAULT 0 CHECK (requires_shipping IN (0, 1)),
  min_level         INTEGER,
  position          INTEGER NOT NULL DEFAULT 0,
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at        TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS reward_redemptions (
  id             TEXT PRIMARY KEY,
  reward_id      TEXT NOT NULL REFERENCES rewards(id) ON DELETE CASCADE,
  user_id        TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  transaction_id TEXT REFERENCES credit_transactions(id) ON DELETE SET NULL,
  credits_spent  INTEGER NOT NULL CHECK (credits_spent >= 0),
  status         TEXT NOT NULL DEFAULT 'PENDING'
                   CHECK (status IN ('PENDING', 'APPROVED', 'FULFILLED', 'REJECTED', 'REFUNDED')),
  note           TEXT,
  created_at     TEXT NOT NULL DEFAULT (datetime('now')),
  fulfilled_at   TEXT
);
CREATE INDEX IF NOT EXISTS idx_redemptions_user ON reward_redemptions(user_id, created_at DESC);

-- --- Giveaways ------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS giveaways (
  id                   TEXT PRIMARY KEY,
  title                TEXT NOT NULL,
  subtitle             TEXT,
  description          TEXT NOT NULL DEFAULT '',
  image_url            TEXT,
  starts_at            TEXT NOT NULL,
  ends_at              TEXT NOT NULL,
  entry_cost           INTEGER NOT NULL CHECK (entry_cost > 0),
  total_entries        INTEGER,
  entries_used         INTEGER NOT NULL DEFAULT 0 CHECK (entries_used >= 0),
  max_entries_per_user INTEGER NOT NULL DEFAULT 1 CHECK (max_entries_per_user > 0),
  winner_count         INTEGER NOT NULL DEFAULT 1 CHECK (winner_count > 0),
  status               TEXT NOT NULL DEFAULT 'OPEN'
                         CHECK (status IN ('SCHEDULED', 'OPEN', 'CLOSED', 'DRAWN', 'CANCELLED')),
  terms                TEXT NOT NULL DEFAULT '',
  created_at           TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at           TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS giveaway_entries (
  id             TEXT PRIMARY KEY,
  giveaway_id    TEXT NOT NULL REFERENCES giveaways(id) ON DELETE CASCADE,
  user_id        TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  transaction_id TEXT REFERENCES credit_transactions(id) ON DELETE SET NULL,
  credits_spent  INTEGER NOT NULL CHECK (credits_spent >= 0),
  status         TEXT NOT NULL DEFAULT 'ACTIVE'
                   CHECK (status IN ('ACTIVE', 'WON', 'LOST', 'REFUNDED', 'VOID')),
  created_at     TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_entries_giveaway ON giveaway_entries(giveaway_id, status);
CREATE INDEX IF NOT EXISTS idx_entries_user ON giveaway_entries(user_id, created_at DESC);

-- A draw is recorded in full so it can be re-verified later: the seed's hash, the
-- entries that were in the pool, and who was selected.
CREATE TABLE IF NOT EXISTS giveaway_draws (
  id             TEXT PRIMARY KEY,
  giveaway_id    TEXT NOT NULL REFERENCES giveaways(id) ON DELETE CASCADE,
  drawn_by       TEXT NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  seed_hash      TEXT NOT NULL,
  entry_count    INTEGER NOT NULL,
  -- JSON array of winning entry ids.
  winner_entries TEXT NOT NULL,
  drawn_at       TEXT NOT NULL DEFAULT (datetime('now'))
);

-- --- Achievements -----------------------------------------------------------------

CREATE TABLE IF NOT EXISTS achievements (
  id          TEXT PRIMARY KEY,
  code        TEXT NOT NULL UNIQUE,
  title       TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  tier        TEXT NOT NULL DEFAULT 'STANDARD' CHECK (tier IN ('STANDARD', 'RARE', 'ELITE')),
  position    INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS user_achievements (
  user_id        TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  achievement_id TEXT NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
  unlocked_at    TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, achievement_id)
);

-- --- Notifications -------------------------------------------------------------

CREATE TABLE IF NOT EXISTS push_tokens (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token      TEXT NOT NULL UNIQUE,
  platform   TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS push_notifications (
  id        TEXT PRIMARY KEY,
  title     TEXT NOT NULL,
  body      TEXT NOT NULL,
  category  TEXT NOT NULL DEFAULT 'SYSTEM'
              CHECK (category IN ('NEW_RELEASE', 'NEW_GIVEAWAY', 'REWARD_UNLOCKED', 'SPECIAL_DROP', 'SYSTEM')),
  deep_link TEXT,
  sent_by   TEXT REFERENCES users(id) ON DELETE SET NULL,
  sent_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

-- --- Audit and idempotency ---------------------------------------------------------

CREATE TABLE IF NOT EXISTS admin_action_log (
  id          TEXT PRIMARY KEY,
  admin_id    TEXT NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  admin_email TEXT NOT NULL,
  action      TEXT NOT NULL,
  target_type TEXT,
  target_id   TEXT,
  metadata    TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_audit_created ON admin_action_log(created_at DESC);

-- A replayed request finds its key here and gets the original response back rather
-- than applying the operation a second time.
CREATE TABLE IF NOT EXISTS idempotency_keys (
  key        TEXT NOT NULL,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  endpoint   TEXT NOT NULL,
  response   TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (key, user_id, endpoint)
);
