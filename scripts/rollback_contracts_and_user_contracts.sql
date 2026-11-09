-- TatildeBugun - Rollback Script (Geri Alma Betiği) - Kural 8
-- Sözleşmeler (contracts) ve Kullanıcı Onayları (user_contracts) tablolarını güvenle kaldırır.

DROP TABLE IF EXISTS "user_contracts" CASCADE;
DROP TABLE IF EXISTS "contracts" CASCADE;
