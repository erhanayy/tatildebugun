-- Rollback Script (Geri Alma Betiği) - Kural 8
-- Amaç: visits tablosundaki district_name kolonunu kaldırır ve date_type kısıtını geri alır.

BEGIN;

-- 1. district_name kolonunu kaldır
ALTER TABLE visits DROP COLUMN IF EXISTS district_name;

-- 2. stay_duration_days varsayılan değerini temizle
ALTER TABLE visits ALTER COLUMN stay_duration_days DROP DEFAULT;

COMMIT;
