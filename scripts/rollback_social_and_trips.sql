-- Rollback Script (Geri Alma Betiği) - Kural 8
-- Amaç: trips, trip_stops, reactions, comments, travel_matches tablolarını kaldırır.

BEGIN;

DROP TABLE IF EXISTS travel_matches CASCADE;
DROP TABLE IF EXISTS comments CASCADE;
DROP TABLE IF EXISTS reactions CASCADE;
DROP TABLE IF EXISTS trip_stops CASCADE;
DROP TABLE IF EXISTS trips CASCADE;

COMMIT;
