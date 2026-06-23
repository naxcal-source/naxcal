-- ============================================
-- NAXCAL RLS POLICIES — RUN IN SUPABASE SQL EDITOR
-- ============================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_profits ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE crypto_positions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if re-running
DO $$ BEGIN
  -- profiles
  DROP POLICY IF EXISTS "Users read own profile" ON profiles;
  DROP POLICY IF EXISTS "Users update own profile" ON profiles;
  DROP POLICY IF EXISTS "Users insert own profile" ON profiles;
  DROP POLICY IF EXISTS "Service role full access profiles" ON profiles;
  -- transactions
  DROP POLICY IF EXISTS "Users read own transactions" ON transactions;
  DROP POLICY IF EXISTS "Users insert own transactions" ON transactions;
  DROP POLICY IF EXISTS "Service role full access transactions" ON transactions;
  -- announcements
  DROP POLICY IF EXISTS "Anyone can read active announcements" ON announcements;
  DROP POLICY IF EXISTS "Service role full access announcements" ON announcements;
  -- daily_profits
  DROP POLICY IF EXISTS "Anyone can read daily profits" ON daily_profits;
  DROP POLICY IF EXISTS "Service role full access daily_profits" ON daily_profits;
  -- stock_positions
  DROP POLICY IF EXISTS "Users read own stock positions" ON stock_positions;
  DROP POLICY IF EXISTS "Service role full access stock_positions" ON stock_positions;
  -- crypto_positions
  DROP POLICY IF EXISTS "Users read own crypto positions" ON crypto_positions;
  DROP POLICY IF EXISTS "Service role full access crypto_positions" ON crypto_positions;
END $$;

-- ============================================
-- PROFILES
-- ============================================
CREATE POLICY "Users read own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Service role full access profiles" ON profiles
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================
-- TRANSACTIONS
-- ============================================
CREATE POLICY "Users read own transactions" ON transactions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users insert own transactions" ON transactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role full access transactions" ON transactions
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================
-- ANNOUNCEMENTS (public read, admin write)
-- ============================================
CREATE POLICY "Anyone can read active announcements" ON announcements
  FOR SELECT USING (is_active = true);

CREATE POLICY "Service role full access announcements" ON announcements
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================
-- DAILY PROFITS (public read, admin write)
-- ============================================
CREATE POLICY "Anyone can read daily profits" ON daily_profits
  FOR SELECT USING (true);

CREATE POLICY "Service role full access daily_profits" ON daily_profits
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================
-- STOCK POSITIONS
-- ============================================
CREATE POLICY "Users read own stock positions" ON stock_positions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role full access stock_positions" ON stock_positions
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================
-- CRYPTO POSITIONS
-- ============================================
CREATE POLICY "Users read own crypto positions" ON crypto_positions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role full access crypto_positions" ON crypto_positions
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================
-- MISSING COLUMNS (safe to re-run)
-- ============================================
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarding_complete BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS display_currency TEXT DEFAULT 'USD';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS withdrawal_pin TEXT DEFAULT NULL;

-- ============================================
-- TABLES THAT MAY NOT EXIST YET
-- ============================================
CREATE TABLE IF NOT EXISTS stock_positions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) NOT NULL,
  symbol TEXT NOT NULL,
  qty DECIMAL NOT NULL DEFAULT 0,
  avg_price DECIMAL NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, symbol)
);

CREATE TABLE IF NOT EXISTS crypto_positions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) NOT NULL,
  symbol TEXT NOT NULL,
  qty DECIMAL NOT NULL DEFAULT 0,
  avg_price DECIMAL NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, symbol)
);

CREATE TABLE IF NOT EXISTS daily_profits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  percentage DECIMAL NOT NULL,
  fee_percentage DECIMAL NOT NULL DEFAULT 0,
  total_distributed DECIMAL NOT NULL DEFAULT 0,
  users_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS admin_audit_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id UUID REFERENCES profiles(id),
  action TEXT NOT NULL,
  target_user_id UUID,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);
