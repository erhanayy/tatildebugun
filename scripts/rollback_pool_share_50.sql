-- DOWN Migration: 2026 Sezonu Kâr Havuzu Payını Geri Alma (%20)
UPDATE value_share_pools
SET pool_share_percentage = 20.0,
    updated_at = NOW()
WHERE year = 2026;
