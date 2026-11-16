-- TatildeBugün - İlişki Segmentasyonu, Kullanıcı Adı (Nickname) ve Hiyerarşik Gizlilik Sistemi
-- Kural 8: Reversible Migration

-- 1. users Tablosu Güncellemeleri
ALTER TABLE users ADD COLUMN IF NOT EXISTS username VARCHAR(50);
ALTER TABLE users ADD COLUMN IF NOT EXISTS show_full_name BOOLEAN DEFAULT true NOT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS show_email BOOLEAN DEFAULT true NOT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS show_phone BOOLEAN DEFAULT false NOT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false NOT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS search_privacy VARCHAR(20) DEFAULT 'public' NOT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS radar_privacy VARCHAR(20) DEFAULT 'public' NOT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS map_privacy VARCHAR(20) DEFAULT 'public' NOT NULL;

-- 2. travel_matches Tablosu Güncellemeleri (Önerilen İlişki Türü)
ALTER TABLE travel_matches ADD COLUMN IF NOT EXISTS relationship_type VARCHAR(20) DEFAULT 'friend' NOT NULL;

-- 3. visits ve trips Tabloları Visibility Standartlaştırması
-- (Eğer enum veya kısıt varsa text olarak esnetilir)
ALTER TABLE visits ALTER COLUMN visibility TYPE VARCHAR(20);
ALTER TABLE trips ALTER COLUMN visibility TYPE VARCHAR(20);

-- 4. user_connections Tablosu relationship_type Esnetilmesi
ALTER TABLE user_connections ALTER COLUMN relationship_type TYPE VARCHAR(20);

-- 5. users.username İçin Unique Index
CREATE UNIQUE INDEX IF NOT EXISTS users_username_unique_idx ON users(LOWER(username)) WHERE username IS NOT NULL;
