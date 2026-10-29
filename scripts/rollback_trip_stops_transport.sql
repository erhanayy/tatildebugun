-- TatildeBugun - Rollback Script: trip_stops tablosundan transport_type ve stop_type kolonlarının kaldırılması
-- Kural 8 (Reversible Migrations) uyarınca hazırlanmıştır.

ALTER TABLE "trip_stops" DROP COLUMN IF EXISTS "transport_type";
ALTER TABLE "trip_stops" DROP COLUMN IF EXISTS "stop_type";
