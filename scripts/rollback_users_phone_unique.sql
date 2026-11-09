-- Rollback: TatildeBugun - users.phone_number tekillik (UNIQUE) indeksini kaldırır
-- Tarih: 2026-11-09

DROP INDEX IF EXISTS users_phone_number_unique_idx;
