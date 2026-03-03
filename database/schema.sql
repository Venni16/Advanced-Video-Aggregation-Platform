-- ════════════════════════════════════════════════
--  TAMIL GAMING VIDEO AGGREGATION PLATFORM
--  PostgreSQL Schema v1.1 — Dynamic Genre System
-- ════════════════════════════════════════════════

-- Extensions
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ══════════════════════════════════════
--  Genre Prompts (Dynamic — CLIP reference prompts per genre)
-- ══════════════════════════════════════
CREATE TABLE IF NOT EXISTS genre_prompts (
  id          SERIAL PRIMARY KEY,
  genre       VARCHAR(100)  UNIQUE NOT NULL,  -- e.g. "BGMI", "Free Fire"
  slug        VARCHAR(100)  UNIQUE NOT NULL,  -- e.g. "bgmi", "free-fire"
  prompts     TEXT[]        NOT NULL,         -- CLIP text prompts for this genre
  is_active   BOOLEAN       DEFAULT TRUE,
  auto_detected BOOLEAN     DEFAULT FALSE,    -- TRUE if discovered from YouTube tags
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- ── Videos Table (genre is now VARCHAR, not enum) ─
CREATE TABLE IF NOT EXISTS videos (
  id                   SERIAL PRIMARY KEY,
  video_id             VARCHAR(20)   UNIQUE NOT NULL,
  title                TEXT          NOT NULL,
  description          TEXT          DEFAULT '',
  thumbnail_url        TEXT,
  channel_name         TEXT,
  channel_id           TEXT,
  genre                VARCHAR(100)  NOT NULL DEFAULT 'Others',
  classification_score FLOAT         DEFAULT 0.0,
  live_status          VARCHAR(20)   NOT NULL DEFAULT 'none'
                         CHECK (live_status IN ('none','live','upcoming','ended')),
  view_count           BIGINT        DEFAULT 0,
  like_count           BIGINT        DEFAULT 0,
  comment_count        BIGINT        DEFAULT 0,
  duration             VARCHAR(20),
  published_at         TIMESTAMPTZ,
  fetched_at           TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  is_short             BOOLEAN       DEFAULT FALSE,
  tags                 TEXT[]        DEFAULT '{}',
  youtube_category_id  INTEGER,
  search_vector        TSVECTOR,
  FOREIGN KEY (genre) REFERENCES genre_prompts(genre) ON UPDATE CASCADE
);

-- ── Channels ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS channels (
  id               SERIAL PRIMARY KEY,
  channel_id       VARCHAR(50)  UNIQUE NOT NULL,
  channel_name     TEXT         NOT NULL,
  thumbnail_url    TEXT,
  subscriber_count BIGINT       DEFAULT 0,
  is_tamil_gaming  BOOLEAN      DEFAULT TRUE,
  fetched_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ── Classification Logs ───────────────────────────
CREATE TABLE IF NOT EXISTS classification_logs (
  id            SERIAL PRIMARY KEY,
  video_id      VARCHAR(20)  REFERENCES videos(video_id) ON DELETE CASCADE,
  genre         VARCHAR(100),
  score         FLOAT,
  all_scores    JSONB,
  classified_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ── API Quota Tracking ────────────────────────────
CREATE TABLE IF NOT EXISTS quota_usage (
  id         SERIAL PRIMARY KEY,
  date       DATE    NOT NULL DEFAULT CURRENT_DATE,
  units_used INTEGER NOT NULL DEFAULT 0,
  UNIQUE(date)
);

-- ══════════════════════════════════════
--  INDEXES
-- ══════════════════════════════════════
CREATE INDEX IF NOT EXISTS idx_videos_genre          ON videos(genre);
CREATE INDEX IF NOT EXISTS idx_videos_live_status    ON videos(live_status);
CREATE INDEX IF NOT EXISTS idx_videos_published_at   ON videos(published_at DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_videos_channel_id     ON videos(channel_id);
CREATE INDEX IF NOT EXISTS idx_videos_genre_published ON videos(genre, published_at DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_videos_live           ON videos(live_status) WHERE live_status = 'live';
CREATE INDEX IF NOT EXISTS idx_videos_search_vector  ON videos USING GIN(search_vector);
CREATE INDEX IF NOT EXISTS idx_videos_title_trgm     ON videos USING GIN(title gin_trgm_ops);

-- ══════════════════════════════════════
--  TRIGGERS
-- ══════════════════════════════════════
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER videos_updated_at
  BEFORE UPDATE ON videos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE OR REPLACE FUNCTION update_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector = to_tsvector('english',
    COALESCE(NEW.title, '') || ' ' ||
    COALESCE(NEW.description, '') || ' ' ||
    COALESCE(NEW.channel_name, '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER videos_search_vector
  BEFORE INSERT OR UPDATE ON videos
  FOR EACH ROW EXECUTE FUNCTION update_search_vector();
