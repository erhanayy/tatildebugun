-- UP Migration: AllTripX Value-Share and Points Ledger (Section 81)

-- 1. Alter users table to add referral fields
ALTER TABLE users ADD COLUMN IF NOT EXISTS referral_code VARCHAR(30) UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES users(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS users_referral_code_unique_idx ON users(referral_code) WHERE referral_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS users_referred_by_idx ON users(referred_by);

-- 2. Create user_points_ledger table (Event-Sourcing Ledger Pattern)
CREATE TABLE IF NOT EXISTS user_points_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    action_type VARCHAR(50) NOT NULL,
    base_points INTEGER NOT NULL,
    multiplier DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    final_points INTEGER NOT NULL,
    reference_id VARCHAR(100),
    reference_type VARCHAR(50),
    year INTEGER NOT NULL DEFAULT 2026,
    rule_version VARCHAR(20) NOT NULL DEFAULT 'v1.0',
    description TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Indexes for lightning fast queries and aggregation
CREATE INDEX IF NOT EXISTS user_points_ledger_user_idx ON user_points_ledger(user_id);
CREATE INDEX IF NOT EXISTS user_points_ledger_year_idx ON user_points_ledger(year);
CREATE INDEX IF NOT EXISTS user_points_ledger_action_type_idx ON user_points_ledger(action_type);
CREATE INDEX IF NOT EXISTS user_points_ledger_user_year_idx ON user_points_ledger(user_id, year);
CREATE INDEX IF NOT EXISTS user_points_ledger_created_at_idx ON user_points_ledger(created_at);

-- 3. Create value_share_pools table (Season Profit & Simulation Pools)
CREATE TABLE IF NOT EXISTS value_share_pools (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    year INTEGER UNIQUE NOT NULL,
    season_title_tr VARCHAR(100) NOT NULL,
    season_title_en VARCHAR(100) NOT NULL,
    estimated_net_profit INTEGER NOT NULL DEFAULT 1000000,
    profit_currency VARCHAR(10) NOT NULL DEFAULT 'TRY',
    pool_share_percentage DOUBLE PRECISION NOT NULL DEFAULT 20.0,
    status VARCHAR(30) NOT NULL DEFAULT 'active',
    total_pool_points INTEGER NOT NULL DEFAULT 0,
    rule_version VARCHAR(20) NOT NULL DEFAULT 'v1.0',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Seed 2026 default season pool if not exists
INSERT INTO value_share_pools (year, season_title_tr, season_title_en, estimated_net_profit, profit_currency, pool_share_percentage, status, rule_version)
VALUES (
    2026,
    '2026 AllTripX Kurucu Sezonu',
    '2026 AllTripX Founder Season',
    1000000,
    'TRY',
    20.0,
    'active',
    'v1.0'
)
ON CONFLICT (year) DO NOTHING;
