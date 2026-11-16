-- TatildeBugün - Akıştan Gezgin Gizleme (Feed Mutes) Tablosu
-- Geri alma: scripts/rollback_feed_mutes.sql

CREATE TABLE IF NOT EXISTS feed_mutes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  muted_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT feed_mutes_user_muted_unique UNIQUE (user_id, muted_user_id)
);

CREATE INDEX IF NOT EXISTS feed_mutes_user_idx ON feed_mutes(user_id);
CREATE INDEX IF NOT EXISTS feed_mutes_muted_user_idx ON feed_mutes(muted_user_id);
