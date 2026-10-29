-- TatildeBugun - Rollback Script: users tablosundan base_country ve base_city kolonlarının kaldırılması
-- Kural 8 (Reversible Migrations) uyarınca hazırlanmıştır.

ALTER TABLE "users" DROP COLUMN IF EXISTS "base_country";
ALTER TABLE "users" DROP COLUMN IF EXISTS "base_city";
