-- Rollback: TatildeBugun - Turistik Yerler (places_of_interest) ve Tur Ziyaretleri (trip_place_visits) tablolarını kaldırır.
DROP TABLE IF EXISTS "trip_place_visits" CASCADE;
DROP TABLE IF EXISTS "places_of_interest" CASCADE;
