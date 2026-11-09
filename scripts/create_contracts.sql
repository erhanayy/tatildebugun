-- TatildeBugun - Migration: Sözleşmeler (contracts) ve Kullanıcı Onayları (user_contracts) Tabloları

CREATE TABLE IF NOT EXISTS "contracts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "type" text NOT NULL,
  "version" varchar(50) NOT NULL,
  "title" text NOT NULL,
  "content" text NOT NULL,
  "is_active" boolean NOT NULL DEFAULT true,
  "created_at" timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "contracts_type_idx" ON "contracts" ("type");
CREATE INDEX IF NOT EXISTS "contracts_active_idx" ON "contracts" ("is_active");

CREATE TABLE IF NOT EXISTS "user_contracts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "contract_id" uuid NOT NULL REFERENCES "contracts"("id") ON DELETE CASCADE,
  "accepted_at" timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "user_contracts_user_idx" ON "user_contracts" ("user_id");
CREATE INDEX IF NOT EXISTS "user_contracts_contract_idx" ON "user_contracts" ("contract_id");
