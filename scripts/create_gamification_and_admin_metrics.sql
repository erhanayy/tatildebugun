-- ===================================================================================
-- TatildeBugün / AllTripX - Gamification, Admin Analytics & Badges Migration (Rule 8)
-- ===================================================================================

-- 1. Users tablosuna son giriş zamanı ve toplam seyahat skoru eklenmesi
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS traveler_score INTEGER DEFAULT 0 NOT NULL;

-- 2. Giriş Logları Tablosu (DAU, WAU, MAU, YAU Analitiği için)
CREATE TABLE IF NOT EXISTS login_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    ip_address VARCHAR(50),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS login_logs_user_idx ON login_logs(user_id);
CREATE INDEX IF NOT EXISTS login_logs_created_at_idx ON login_logs(created_at);

-- 3. Rozet Kataloğu Tablosu
CREATE TABLE IF NOT EXISTS badges (
    id VARCHAR(50) PRIMARY KEY,
    title_tr VARCHAR(100) NOT NULL,
    title_en VARCHAR(100) NOT NULL,
    description_tr TEXT NOT NULL,
    description_en TEXT NOT NULL,
    icon VARCHAR(50) NOT NULL,
    category VARCHAR(30) DEFAULT 'travel' NOT NULL,
    required_points INTEGER DEFAULT 0 NOT NULL
);

-- 4. Kullanıcı Rozetleri Tablosu
CREATE TABLE IF NOT EXISTS user_badges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    badge_id VARCHAR(50) NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
    unlocked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT user_badges_unique UNIQUE (user_id, badge_id)
);

CREATE INDEX IF NOT EXISTS user_badges_user_idx ON user_badges(user_id);

-- 5. Başlangıç Rozetleri Kataloğu
INSERT INTO badges (id, title_tr, title_en, description_tr, description_en, icon, category, required_points)
VALUES
    ('world_citizen', 'Dünya Vatandaşı', 'Global Citizen', '5 farklı ülkeye seyahat bayrağı koy', 'Place travel flags in at least 5 different countries', '🌍', 'country', 500),
    ('history_hunter', 'Tarih Avcısı', 'History Hunter', 'En az 10 tarihi veya turistik mekana check-in yap', 'Check in to at least 10 historic or iconic sights', '🏛️', 'poi', 100),
    ('continental_pioneer', 'Kıta Hattı', 'Continental Pioneer', 'En az 2 farklı kıtada şehir ziyaret et', 'Visit cities across at least 2 different continents', '🚂', 'continent', 300),
    ('vacation_master', 'Tatildeyim Şampiyonu', 'Vacation Champion', 'Canlı gezi rehberinde bir rotanın tüm duraklarını tamamla', 'Complete all stops of an itinerary in the live travel guide', '🌴', 'trip', 150),
    ('visual_storyteller', 'Gözlemci', 'Visual Storyteller', 'Seyahatlerine en az 5 fotoğraf yükle', 'Upload at least 5 photos to your journeys', '📸', 'social', 50),
    ('travel_companion', 'Yol Arkadaşı', 'Travel Companion', 'En az 3 gezgin ile arkadaşlık veya aile bağı kur', 'Connect with at least 3 travelers as friend or family', '🧭', 'social', 50)
ON CONFLICT (id) DO NOTHING;
