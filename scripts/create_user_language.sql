-- TatildeBugun / AllTripX - Kullanıcı Dil Tercihi (preferred_language) Kolonu
-- Sürüm: v1.7.0
-- Tarih: 2026-11-14

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS preferred_language VARCHAR(5) DEFAULT 'tr' NOT NULL;
