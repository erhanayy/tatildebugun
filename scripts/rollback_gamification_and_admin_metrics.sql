-- ===================================================================================
-- TatildeBugün / AllTripX - Rollback Gamification, Badges & Admin Analytics (Rule 8)
-- ===================================================================================

DROP TABLE IF EXISTS user_badges CASCADE;
DROP TABLE IF EXISTS badges CASCADE;
DROP TABLE IF EXISTS login_logs CASCADE;

ALTER TABLE users DROP COLUMN IF EXISTS traveler_score;
ALTER TABLE users DROP COLUMN IF EXISTS last_login_at;
