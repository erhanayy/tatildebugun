-- Migration: TatildeBugun - users.phone_number tekillik (UNIQUE) indeksi
-- Tarih: 2026-11-09

CREATE UNIQUE INDEX IF NOT EXISTS users_phone_number_unique_idx 
ON users(phone_number) 
WHERE phone_number IS NOT NULL AND phone_number != '';
