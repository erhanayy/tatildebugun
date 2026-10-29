-- Rollback: TatildeBugun - country_code sütun genişliğini varchar(2)'ye geri alır.
ALTER TABLE "visits" ALTER COLUMN "country_code" TYPE varchar(2);
ALTER TABLE "trip_stops" ALTER COLUMN "country_code" TYPE varchar(2);
