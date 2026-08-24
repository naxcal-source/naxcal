-- Apply before deploying the matching application release.
-- Makes withdrawal creation atomic and adds a shared serverless-safe rate limiter.

ALTER TABLE transactions ADD COLUMN IF NOT EXISTS idempotency_key TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS notification_preferences JSONB NOT NULL DEFAULT '{"daily_profit":true,"deposit":true,"withdrawal":true,"security":true,"marketing":false,"announcements":true}';
CREATE UNIQUE INDEX IF NOT EXISTS transactions_user_idempotency_key_idx
  ON transactions(user_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE TABLE IF NOT EXISTS security_rate_limits (
  key TEXT PRIMARY KEY,
  hit_count INTEGER NOT NULL DEFAULT 0,
  reset_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE security_rate_limits ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS system_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'error')),
  message TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE system_events ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS system_events_type_created_idx ON system_events(event_type, created_at DESC);

-- All profile and transaction mutations must pass through guarded server routes.
DROP POLICY IF EXISTS "Users update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users insert own transactions" ON transactions;

CREATE OR REPLACE FUNCTION consume_security_rate_limit(
  p_key TEXT,
  p_limit INTEGER,
  p_window_seconds INTEGER
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  allowed BOOLEAN;
BEGIN
  INSERT INTO security_rate_limits AS limits (key, hit_count, reset_at, updated_at)
  VALUES (p_key, 1, NOW() + make_interval(secs => p_window_seconds), NOW())
  ON CONFLICT (key) DO UPDATE SET
    hit_count = CASE WHEN limits.reset_at <= NOW() THEN 1 ELSE limits.hit_count + 1 END,
    reset_at = CASE WHEN limits.reset_at <= NOW() THEN NOW() + make_interval(secs => p_window_seconds) ELSE limits.reset_at END,
    updated_at = NOW()
  RETURNING hit_count <= p_limit INTO allowed;

  RETURN allowed;
END;
$$;

CREATE OR REPLACE FUNCTION create_withdrawal_request(
  p_user_id UUID,
  p_amount NUMERIC,
  p_asset TEXT,
  p_wallet TEXT,
  p_idempotency_key TEXT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  profile_row profiles%ROWTYPE;
  existing_tx transactions%ROWTYPE;
  new_balance NUMERIC;
  lockup_days INTEGER;
  new_tx_id UUID;
BEGIN
  SELECT * INTO existing_tx
  FROM transactions
  WHERE user_id = p_user_id AND idempotency_key = p_idempotency_key;

  IF FOUND THEN
    RETURN jsonb_build_object('id', existing_tx.id, 'new_balance', existing_tx.balance_after, 'duplicate', true);
  END IF;

  SELECT * INTO profile_row FROM profiles WHERE id = p_user_id FOR UPDATE;
  IF NOT FOUND OR NOT profile_row.is_active THEN RAISE EXCEPTION 'Account unavailable'; END IF;
  IF profile_row.kyc_status <> 'approved' THEN RAISE EXCEPTION 'KYC approval required'; END IF;

  lockup_days := CASE lower(profile_row.tier) WHEN 'gold' THEN 30 WHEN 'silver' THEN 14 ELSE 7 END;
  IF profile_row.created_at + make_interval(days => lockup_days) > NOW() THEN
    RAISE EXCEPTION 'Account lockup period is active';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM transactions
    WHERE user_id = p_user_id AND type = 'deposit' AND status = 'completed'
      AND created_at >= date_trunc('month', NOW())
  ) THEN
    RAISE EXCEPTION 'A completed deposit is required this month';
  END IF;

  IF p_amount < 100 OR p_amount > profile_row.balance THEN
    RAISE EXCEPTION 'Insufficient withdrawable cash balance';
  END IF;

  new_balance := profile_row.balance - p_amount;
  UPDATE profiles SET balance = new_balance, updated_at = NOW() WHERE id = p_user_id;

  INSERT INTO transactions (
    user_id, type, amount, asset, status, wallet_address, description,
    balance_before, balance_after, idempotency_key
  ) VALUES (
    p_user_id, 'withdrawal', p_amount, p_asset, 'pending', p_wallet,
    'Withdrawal to ' || p_asset || ' wallet', profile_row.balance, new_balance,
    p_idempotency_key
  ) RETURNING id INTO new_tx_id;

  RETURN jsonb_build_object('id', new_tx_id, 'new_balance', new_balance, 'duplicate', false);
END;
$$;

REVOKE ALL ON FUNCTION consume_security_rate_limit(TEXT, INTEGER, INTEGER) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION create_withdrawal_request(UUID, NUMERIC, TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION consume_security_rate_limit(TEXT, INTEGER, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION create_withdrawal_request(UUID, NUMERIC, TEXT, TEXT, TEXT) TO service_role;

CREATE OR REPLACE FUNCTION resolve_withdrawal_request(
  p_admin_id UUID,
  p_transaction_id UUID,
  p_action TEXT,
  p_reason TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  tx transactions%ROWTYPE;
  current_balance NUMERIC;
  refunded_balance NUMERIC;
BEGIN
  IF p_action NOT IN ('approve', 'reject') THEN
    RAISE EXCEPTION 'Invalid withdrawal action';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = p_admin_id AND is_admin = true) THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  SELECT * INTO tx FROM transactions
  WHERE id = p_transaction_id AND type = 'withdrawal'
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Withdrawal not found'; END IF;
  IF tx.status <> 'pending' THEN
    RETURN jsonb_build_object('id', tx.id, 'status', tx.status, 'duplicate', true);
  END IF;

  IF p_action = 'approve' THEN
    UPDATE transactions SET status = 'completed', admin_note = COALESCE(NULLIF(p_reason, ''), 'Approved by admin')
    WHERE id = tx.id;
    RETURN jsonb_build_object('id', tx.id, 'status', 'completed', 'duplicate', false);
  END IF;

  SELECT balance INTO current_balance FROM profiles WHERE id = tx.user_id FOR UPDATE;
  refunded_balance := current_balance + tx.amount;
  UPDATE profiles SET balance = refunded_balance WHERE id = tx.user_id;
  UPDATE transactions SET status = 'failed', admin_note = COALESCE(NULLIF(p_reason, ''), 'Rejected by admin')
  WHERE id = tx.id;
  INSERT INTO transactions (
    user_id, type, amount, status, description, balance_before, balance_after, idempotency_key
  ) VALUES (
    tx.user_id, 'adjustment_credit', tx.amount, 'completed',
    'Withdrawal refund — request declined', current_balance, refunded_balance,
    'withdrawal-refund:' || tx.id::text
  ) ON CONFLICT (idempotency_key) WHERE idempotency_key IS NOT NULL DO NOTHING;

  RETURN jsonb_build_object('id', tx.id, 'status', 'failed', 'new_balance', refunded_balance, 'duplicate', false);
END;
$$;

REVOKE ALL ON FUNCTION resolve_withdrawal_request(UUID, UUID, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION resolve_withdrawal_request(UUID, UUID, TEXT, TEXT) TO service_role;
