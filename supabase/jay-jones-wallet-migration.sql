-- Jay Jones / EVM wallet migration architecture
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
