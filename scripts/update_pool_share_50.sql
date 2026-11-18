-- UP Migration: 2026 Sezonu Kâr Havuzu Payını %50'ye Yükseltme
UPDATE value_share_pools
SET pool_share_percentage = 50.0,
    updated_at = NOW()
WHERE year = 2026;
