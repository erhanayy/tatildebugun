-- TatildeBugün - İlişki Segmentasyonu, Kullanıcı Adı ve Gizlilik Sistemi Geri Alma (Rollback) Scripti
-- Kural 8: Reversible Migration

DROP INDEX IF EXISTS users_username_unique_idx;

ALTER TABLE users DROP COLUMN IF EXISTS username;
ALTER TABLE users DROP COLUMN IF EXISTS show_full_name;
ALTER TABLE users DROP COLUMN IF EXISTS show_email;
ALTER TABLE users DROP COLUMN IF EXISTS show_phone;
ALTER TABLE users DROP COLUMN IF EXISTS onboarding_completed;
ALTER TABLE users DROP COLUMN IF EXISTS search_privacy;
ALTER TABLE users DROP COLUMN IF EXISTS radar_privacy;
ALTER TABLE users DROP COLUMN IF EXISTS map_privacy;

ALTER TABLE travel_matches DROP COLUMN IF EXISTS relationship_type;
