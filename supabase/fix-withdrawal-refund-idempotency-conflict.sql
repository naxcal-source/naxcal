-- Apply to existing deployments where resolve_withdrawal_request was created
-- with an idempotency conflict target that does not match the unique index.
CREATE UNIQUE INDEX IF NOT EXISTS transactions_user_idempotency_key_idx
  ON transactions(user_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

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
  ) ON CONFLICT (user_id, idempotency_key) WHERE idempotency_key IS NOT NULL DO NOTHING;

  RETURN jsonb_build_object('id', tx.id, 'status', 'failed', 'new_balance', refunded_balance, 'duplicate', false);
END;
$$;

REVOKE ALL ON FUNCTION resolve_withdrawal_request(UUID, UUID, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION resolve_withdrawal_request(UUID, UUID, TEXT, TEXT) TO service_role;
