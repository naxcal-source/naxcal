-- Users profile table (extends Supabase auth)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT,
  phone TEXT,
  date_of_birth DATE,
  nationality TEXT,
  address TEXT,
  city TEXT,
  country TEXT,
  postal_code TEXT,
  kyc_status TEXT DEFAULT 'pending' CHECK (kyc_status IN ('pending', 'submitted', 'approved', 'rejected')),
  kyc_rejection_reason TEXT,
  tier TEXT DEFAULT 'bronze' CHECK (tier IN ('bronze', 'silver', 'gold')),
  balance NUMERIC(20,8) DEFAULT 0,
  total_deposited NUMERIC(20,8) DEFAULT 0,
  total_withdrawn NUMERIC(20,8) DEFAULT 0,
  total_profit NUMERIC(20,8) DEFAULT 0,
  referral_code TEXT UNIQUE,
  referred_by TEXT,
  auto_compound BOOLEAN DEFAULT false,
  withdrawal_pin TEXT,
  two_factor_enabled BOOLEAN DEFAULT false,
  is_admin BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  onboarding_complete BOOLEAN DEFAULT false,
  display_currency TEXT DEFAULT 'USD' CHECK (display_currency IN ('USD', 'GBP', 'EUR')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Transactions table (double entry ledger)
CREATE TABLE IF NOT EXISTS transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) NOT NULL,
  type TEXT NOT NULL CHECK (type IN (
    'deposit', 'withdrawal', 'profit', 'bonus', 'referral', 'fee',
    'adjustment_credit', 'adjustment_debit', 'stock_buy', 'stock_sell',
    'crypto_sell', 'swap'
  )),
  amount NUMERIC(20,8) NOT NULL,
  asset TEXT DEFAULT 'USDT',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  description TEXT,
  tx_hash TEXT,
  wallet_address TEXT,
  admin_note TEXT,
  balance_before NUMERIC(20,8),
  balance_after NUMERIC(20,8),
  idempotency_key TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  profit_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS transactions_user_idempotency_key_unique
  ON transactions (user_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

-- Daily profits table
CREATE TABLE IF NOT EXISTS daily_profits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  profit_percentage NUMERIC(8,4) NOT NULL,
  total_distributed NUMERIC(20,8) DEFAULT 0,
  users_credited INTEGER DEFAULT 0,
  notes TEXT,
  posted_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Profit posting fails closed until an authorised owner creates one versioned
-- policy after confirming the rate, calendar, basis, and compounding contract.
CREATE TABLE IF NOT EXISTS profit_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  effective_from DATE NOT NULL,
  effective_to DATE,
  rate_period TEXT NOT NULL DEFAULT 'daily' CHECK (rate_period = 'daily'),
  accrual_calendar TEXT NOT NULL DEFAULT 'weekdays' CHECK (accrual_calendar = 'weekdays'),
  compounding_mode TEXT NOT NULL
    CHECK (compounding_mode IN ('always', 'never', 'user_preference')),
  basis_method TEXT NOT NULL DEFAULT 'cash_plus_position_cost'
    CHECK (basis_method = 'cash_plus_position_cost'),
  enabled BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (effective_to IS NULL OR effective_to >= effective_from)
);

CREATE TABLE IF NOT EXISTS profit_policy_rates (
  policy_id UUID NOT NULL REFERENCES profit_policies(id) ON DELETE CASCADE,
  tier TEXT NOT NULL CHECK (tier IN ('bronze', 'silver', 'gold')),
  rate_percent NUMERIC(10,6) NOT NULL CHECK (rate_percent > 0 AND rate_percent <= 100),
  PRIMARY KEY (policy_id, tier)
);

ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_profit_weekdays_only;
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_profit_date_required;
ALTER TABLE transactions ADD CONSTRAINT transactions_profit_date_required CHECK (
  type <> 'profit' OR profit_date IS NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS transactions_user_profit_date_unique
  ON transactions (user_id, profit_date)
  WHERE type = 'profit' AND profit_date IS NOT NULL;

-- Announcements table
CREATE TABLE IF NOT EXISTS announcements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  type TEXT DEFAULT 'info' CHECK (type IN ('info', 'warning', 'success', 'urgent')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Testimonials table
CREATE TABLE IF NOT EXISTS testimonials (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_name TEXT NOT NULL,
  location TEXT,
  profit_amount NUMERIC(20,8),
  quote TEXT NOT NULL,
  tier TEXT,
  rating INTEGER DEFAULT 5,
  avatar_initials TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Referrals table
CREATE TABLE IF NOT EXISTS referrals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  referrer_id UUID REFERENCES profiles(id),
  referred_id UUID REFERENCES profiles(id),
  bonus_amount NUMERIC(20,8) DEFAULT 0,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_profits ENABLE ROW LEVEL SECURITY;
ALTER TABLE profit_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE profit_policy_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE testimonials ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;

-- Financial profile and ledger access is server-mediated.
REVOKE ALL PRIVILEGES ON TABLE profiles FROM anon, authenticated;
REVOKE ALL PRIVILEGES ON TABLE transactions FROM anon, authenticated;
GRANT ALL PRIVILEGES ON TABLE profiles TO service_role;
GRANT ALL PRIVILEGES ON TABLE transactions TO service_role;
REVOKE ALL PRIVILEGES ON TABLE profit_policies FROM PUBLIC, anon, authenticated;
REVOKE ALL PRIVILEGES ON TABLE profit_policy_rates FROM PUBLIC, anon, authenticated;
GRANT ALL PRIVILEGES ON TABLE profit_policies TO service_role;
GRANT ALL PRIVILEGES ON TABLE profit_policy_rates TO service_role;
CREATE POLICY "Anyone can view active announcements" ON announcements FOR SELECT USING (is_active = true);
CREATE POLICY "Anyone can view active testimonials" ON testimonials FOR SELECT USING (is_active = true);
CREATE POLICY "Users can view own referrals" ON referrals FOR SELECT USING (auth.uid() = referrer_id);

-- Function to auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, referred_by, referral_code)
  VALUES (
    NEW.id,
    NEW.email,
    NULLIF(BTRIM(COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'name')), ''),
    NULLIF(UPPER(BTRIM(NEW.raw_user_meta_data ->> 'referred_by')), ''),
    upper(substring(replace(gen_random_uuid()::text, '-', ''), 1, 8))
  ) ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
-- Configured account / EVM wallet migration architecture
-- This keeps on-chain wallet data separate from the internal investment ledger.

CREATE TABLE IF NOT EXISTS wallets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) NOT NULL,
  wallet_type TEXT NOT NULL CHECK (wallet_type IN ('evm', 'bitcoin', 'solana', 'tron')),
  address TEXT NOT NULL,
  ownership_status TEXT NOT NULL DEFAULT 'unverified'
    CHECK (ownership_status IN ('unverified', 'verification_required', 'verified', 'rejected')),
  source TEXT NOT NULL DEFAULT 'admin_migration',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, wallet_type, address)
);

CREATE TABLE IF NOT EXISTS migration_runs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) NOT NULL,
  wallet_id UUID REFERENCES wallets(id),
  administrator_id UUID,
  wallet_address TEXT NOT NULL,

  status TEXT NOT NULL DEFAULT 'PENDING'
    CHECK (status IN (
      'PENDING',
      'VALIDATING',
      'OWNERSHIP_VERIFICATION_REQUIRED',
      'IMPORTING',
      'PROCESSING',
      'RECONCILING',
      'COMPLETED',
      'PARTIAL',
      'FAILED',
      'PAUSED'
    )),

  migration_started_at TIMESTAMPTZ,
  migration_completed_at TIMESTAMPTZ,

  transactions_discovered INTEGER DEFAULT 0,
  transactions_imported INTEGER DEFAULT 0,
  balances_discovered INTEGER DEFAULT 0,
  tokens_discovered INTEGER DEFAULT 0,
  last_processed_block BIGINT,

  error TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS wallet_chain_states (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  wallet_id UUID REFERENCES wallets(id) NOT NULL,

  chain TEXT NOT NULL,
  chain_id INTEGER NOT NULL,
  address TEXT NOT NULL,

  has_activity BOOLEAN,
  native_balance NUMERIC(38,18),
  token_count INTEGER DEFAULT 0,
  transaction_count INTEGER DEFAULT 0,

  last_synced_block BIGINT,
  last_synced_at TIMESTAMPTZ,
  sync_status TEXT NOT NULL DEFAULT 'PENDING'
    CHECK (sync_status IN ('PENDING', 'SYNCING', 'COMPLETED', 'PARTIAL', 'FAILED', 'PAUSED')),

  error TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(wallet_id, chain_id)
);

CREATE TABLE IF NOT EXISTS onchain_native_balances (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  wallet_id UUID REFERENCES wallets(id) NOT NULL,
  user_id UUID REFERENCES profiles(id) NOT NULL,

  chain TEXT NOT NULL,
  chain_id INTEGER NOT NULL,

  asset_symbol TEXT NOT NULL,
  raw_balance NUMERIC(78,0),
  normalized_balance NUMERIC(38,18),

  last_checked_block BIGINT,
  last_checked_at TIMESTAMPTZ DEFAULT NOW(),

  raw_provider_payload JSONB,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(wallet_id, chain_id)
);

CREATE TABLE IF NOT EXISTS onchain_token_balances (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  wallet_id UUID REFERENCES wallets(id) NOT NULL,
  user_id UUID REFERENCES profiles(id) NOT NULL,

  chain TEXT NOT NULL,
  chain_id INTEGER NOT NULL,

  token_contract_address TEXT NOT NULL,
  token_symbol TEXT,
  token_name TEXT,
  token_decimals INTEGER,

  raw_balance NUMERIC(78,0),
  normalized_balance NUMERIC(38,18),

  balance_source TEXT,
  last_checked_block BIGINT,
  last_checked_at TIMESTAMPTZ DEFAULT NOW(),

  raw_provider_payload JSONB,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(wallet_id, chain_id, token_contract_address)
);

CREATE TABLE IF NOT EXISTS onchain_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  wallet_id UUID REFERENCES wallets(id) NOT NULL,
  user_id UUID REFERENCES profiles(id) NOT NULL,

  chain TEXT NOT NULL,
  chain_id INTEGER NOT NULL,

  tx_hash TEXT NOT NULL,
  block_number BIGINT,
  block_hash TEXT,
  transaction_index INTEGER,

  from_address TEXT,
  to_address TEXT,

  status TEXT DEFAULT 'unknown'
    CHECK (status IN ('success', 'failed', 'pending', 'unknown')),

  native_value NUMERIC(38,18),
  gas_used NUMERIC(38,18),
  gas_price NUMERIC(38,18),
  transaction_fee NUMERIC(38,18),

  timestamp TIMESTAMPTZ,

  raw_provider_payload JSONB,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(chain_id, tx_hash)
);

CREATE TABLE IF NOT EXISTS onchain_transfers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  transaction_id UUID REFERENCES onchain_transactions(id),
  wallet_id UUID REFERENCES wallets(id) NOT NULL,
  user_id UUID REFERENCES profiles(id) NOT NULL,

  chain TEXT NOT NULL,
  chain_id INTEGER NOT NULL,

  tx_hash TEXT NOT NULL,

  transfer_type TEXT NOT NULL DEFAULT 'unknown'
    CHECK (transfer_type IN ('native', 'erc20', 'erc721', 'erc1155', 'unknown')),

  asset_symbol TEXT,
  token_contract_address TEXT,
  token_id TEXT,

  from_address TEXT,
  to_address TEXT,

  raw_amount NUMERIC(78,0),
  normalized_amount NUMERIC(38,18),

  timestamp TIMESTAMPTZ,
  block_number BIGINT,

  raw_provider_payload JSONB,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS migration_audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  migration_id UUID REFERENCES migration_runs(id),
  user_id UUID REFERENCES profiles(id),
  wallet_id UUID REFERENCES wallets(id),

  administrator_id UUID,
  chain TEXT,
  wallet_address TEXT,

  action TEXT NOT NULL,
  status TEXT NOT NULL,
  message TEXT,
  error TEXT,

  metadata JSONB,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS migration_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  migration_id UUID REFERENCES migration_runs(id) NOT NULL,
  user_id UUID REFERENCES profiles(id) NOT NULL,
  wallet_id UUID REFERENCES wallets(id) NOT NULL,

  report JSONB NOT NULL,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE migration_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_chain_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE onchain_native_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE onchain_token_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE onchain_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE onchain_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE migration_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE migration_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own wallets"
ON wallets FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can view own migration runs"
ON migration_runs FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can view own native balances"
ON onchain_native_balances FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can view own token balances"
ON onchain_token_balances FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can view own onchain transactions"
ON onchain_transactions FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can view own onchain transfers"
ON onchain_transfers FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can view own migration reports"
ON migration_reports FOR SELECT
USING (auth.uid() = user_id);
