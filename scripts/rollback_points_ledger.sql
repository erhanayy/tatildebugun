-- DOWN Migration (Rollback): AllTripX Value-Share and Points Ledger (Section 81)

-- 1. Drop value_share_pools table
DROP TABLE IF EXISTS value_share_pools CASCADE;

-- 2. Drop user_points_ledger table and indexes
DROP TABLE IF EXISTS user_points_ledger CASCADE;

-- 3. Remove referral fields from users table
DROP INDEX IF EXISTS users_referral_code_unique_idx;
DROP INDEX IF EXISTS users_referred_by_idx;
ALTER TABLE users DROP COLUMN IF EXISTS referral_code;
ALTER TABLE users DROP COLUMN IF EXISTS referred_by;
