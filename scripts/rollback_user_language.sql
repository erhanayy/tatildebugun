-- TatildeBugun / AllTripX - Kullanıcı Dil Tercihi Geri Alma (Rollback) Scripti
-- Sürüm: v1.7.0
-- Tarih: 2026-11-14

ALTER TABLE users 
DROP COLUMN IF EXISTS preferred_language;
