-- Migration: TatildeBugun - Şehir Günlük Yürüyüş Rotaları (city_itineraries) tablosu
CREATE TABLE IF NOT EXISTS "city_itineraries" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "city_name" varchar(100) NOT NULL,
  "country_code" varchar(10) NOT NULL,
  "day_number" integer NOT NULL,
  "title" varchar(200) NOT NULL,
  "theme" varchar(100),
  "description" text,
  "total_distance_meters" integer NOT NULL DEFAULT 0,
  "estimated_steps" integer NOT NULL DEFAULT 0,
  "estimated_duration_minutes" integer NOT NULL DEFAULT 0,
  "stops" jsonb NOT NULL,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "city_itineraries_city_day_idx" ON "city_itineraries" ("city_name", "day_number");
CREATE INDEX IF NOT EXISTS "city_itineraries_city_country_idx" ON "city_itineraries" ("city_name", "country_code");
