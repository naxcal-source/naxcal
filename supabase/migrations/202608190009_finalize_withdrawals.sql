BEGIN;

-- This column is already used by the application. Keeping the prerequisite in
-- this additive migration makes the RPC's admin assertion safe on older stacks.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

-- A partial unique index cannot satisfy `ON CONFLICT (dedupe_key)` unless each
-- insert repeats its predicate. PostgreSQL UNIQUE indexes already allow more
-- than one NULL, so make this a normal unique index. This also repairs the
-- conflict handling used by the earlier withdrawal-review RPC.
DROP INDEX IF EXISTS public.notifications_dedupe_key_unique;
CREATE UNIQUE INDEX notifications_dedupe_key_unique
  ON public.notifications (dedupe_key);

-- A fee is part of the user's original withdrawal terms, not a value an
-- operator may choose during settlement. Missing fee metadata means zero.
CREATE OR REPLACE FUNCTION public.protect_withdrawal_fee_agreement()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  v_old_fee_text TEXT;
  v_new_fee_text TEXT;
  v_old_fee NUMERIC;
  v_new_fee NUMERIC;
BEGIN
  IF TG_OP = 'UPDATE'
     AND OLD.type = 'withdrawal'
     AND NEW.type <> 'withdrawal' THEN
    RAISE EXCEPTION 'A withdrawal transaction type cannot be changed';
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.type = 'withdrawal' AND (
    NEW.user_id IS DISTINCT FROM OLD.user_id
    OR NEW.amount IS DISTINCT FROM OLD.amount
    OR NEW.asset IS DISTINCT FROM OLD.asset
    OR NEW.wallet_address IS DISTINCT FROM OLD.wallet_address
    OR NEW.balance_before IS DISTINCT FROM OLD.balance_before
    OR NEW.balance_after IS DISTINCT FROM OLD.balance_after
    OR NEW.idempotency_key IS DISTINCT FROM OLD.idempotency_key
  ) THEN
    RAISE EXCEPTION 'Withdrawal request financial details cannot be changed';
  END IF;
  IF NEW.type <> 'withdrawal' THEN
    RETURN NEW;
  END IF;

  v_new_fee_text := COALESCE(NEW.metadata ->> 'agreed_payout_fee_usd', '0');
  IF v_new_fee_text !~ '^[0-9]+([.][0-9]+)?$' THEN
    RAISE EXCEPTION 'Withdrawal agreed fee is invalid';
  END IF;
  v_new_fee := v_new_fee_text::NUMERIC;
  IF v_new_fee < 0
     OR v_new_fee > 10000000
     OR round(v_new_fee, 8) <> v_new_fee
     OR v_new_fee >= NEW.amount THEN
    RAISE EXCEPTION 'Withdrawal agreed fee is outside the supported bounds';
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.type = 'withdrawal' THEN
    v_old_fee_text := COALESCE(OLD.metadata ->> 'agreed_payout_fee_usd', '0');
    IF v_old_fee_text !~ '^[0-9]+([.][0-9]+)?$' THEN
      RAISE EXCEPTION 'Existing withdrawal agreed fee is invalid';
    END IF;
    v_old_fee := v_old_fee_text::NUMERIC;
    IF v_old_fee IS DISTINCT FROM v_new_fee THEN
      RAISE EXCEPTION 'A withdrawal agreed fee cannot be changed after request creation';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_withdrawal_fee_on_insert ON public.transactions;
CREATE TRIGGER protect_withdrawal_fee_on_insert
  BEFORE INSERT ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.protect_withdrawal_fee_agreement();
DROP TRIGGER IF EXISTS protect_withdrawal_fee_on_update ON public.transactions;
CREATE TRIGGER protect_withdrawal_fee_on_update
  BEFORE UPDATE ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.protect_withdrawal_fee_agreement();

REVOKE ALL ON FUNCTION public.protect_withdrawal_fee_agreement()
  FROM PUBLIC, anon, authenticated;

CREATE TABLE IF NOT EXISTS public.withdrawal_payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  withdrawal_id UUID NOT NULL UNIQUE REFERENCES public.transactions(id),
  user_id UUID NOT NULL REFERENCES public.profiles(id),
  reference_type TEXT NOT NULL CHECK (reference_type IN ('provider', 'blockchain')),
  reference_namespace TEXT NOT NULL,
  payout_reference TEXT NOT NULL,
  reference_key TEXT NOT NULL,
  output_index BIGINT,
  settlement_asset TEXT NOT NULL,
  settlement_network TEXT NOT NULL,
  settlement_amount NUMERIC(36,18) NOT NULL CHECK (settlement_amount > 0),
  requested_amount_usd NUMERIC(20,8) NOT NULL CHECK (requested_amount_usd > 0),
  fee_usd NUMERIC(20,8) NOT NULL DEFAULT 0 CHECK (fee_usd >= 0),
  net_amount_usd NUMERIC(20,8) NOT NULL CHECK (net_amount_usd > 0),
  implied_rate_usd NUMERIC(48,18) NOT NULL CHECK (implied_rate_usd > 0),
  completed_by UUID NOT NULL REFERENCES public.profiles(id),
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (
    (reference_type = 'provider' AND output_index IS NULL)
    OR (reference_type = 'blockchain' AND output_index IS NOT NULL AND output_index >= 0)
  ),
  CHECK (
    (settlement_asset = 'USDT' AND settlement_network = 'TRON (TRC-20)' AND round(settlement_amount, 6) = settlement_amount)
    OR (settlement_asset = 'BTC' AND settlement_network = 'Bitcoin' AND round(settlement_amount, 8) = settlement_amount)
    OR (settlement_asset = 'ETH' AND settlement_network = 'Ethereum' AND round(settlement_amount, 18) = settlement_amount)
    OR (settlement_asset = 'BNB' AND settlement_network = 'BNB Smart Chain (BEP-20)' AND round(settlement_amount, 18) = settlement_amount)
    OR (settlement_asset = 'SOL' AND settlement_network = 'Solana' AND round(settlement_amount, 9) = settlement_amount)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS withdrawal_payouts_provider_reference_unique
  ON public.withdrawal_payouts (reference_namespace, reference_key)
  WHERE reference_type = 'provider';
CREATE UNIQUE INDEX IF NOT EXISTS withdrawal_payouts_blockchain_output_unique
  ON public.withdrawal_payouts (
    settlement_network,
    settlement_asset,
    reference_key,
    output_index
  )
  WHERE reference_type = 'blockchain';

ALTER TABLE public.withdrawal_payouts ENABLE ROW LEVEL SECURITY;
REVOKE ALL PRIVILEGES ON TABLE public.withdrawal_payouts FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.withdrawal_payouts TO service_role;

CREATE OR REPLACE FUNCTION public.finalize_withdrawal(
  p_transaction_id UUID,
  p_payout_reference TEXT,
  p_reference_type TEXT,
  p_provider TEXT,
  p_output_index BIGINT,
  p_settlement_amount NUMERIC,
  p_admin_id UUID,
  p_fee NUMERIC DEFAULT 0,
  p_note TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_withdrawal public.transactions%ROWTYPE;
  v_profile public.profiles%ROWTYPE;
  v_reference TEXT := BTRIM(COALESCE(p_payout_reference, ''));
  v_reference_type TEXT := lower(BTRIM(COALESCE(p_reference_type, '')));
  v_provider TEXT := lower(BTRIM(COALESCE(p_provider, '')));
  v_reference_namespace TEXT;
  v_reference_key TEXT;
  v_note TEXT := NULLIF(BTRIM(COALESCE(p_note, '')), '');
  v_fee NUMERIC := COALESCE(p_fee, 0);
  v_net_amount NUMERIC(20,8);
  v_settlement_asset TEXT;
  v_settlement_network TEXT;
  v_asset_decimals INTEGER;
  v_implied_rate NUMERIC;
  v_agreed_fee_text TEXT;
  v_agreed_fee NUMERIC;
  v_total_before NUMERIC(20,8);
  v_total_after NUMERIC(20,8);
  v_completed_at TIMESTAMPTZ := clock_timestamp();
  v_payout public.withdrawal_payouts%ROWTYPE;
BEGIN
  IF p_transaction_id IS NULL THEN
    RAISE EXCEPTION 'Withdrawal transaction is required';
  END IF;
  IF p_admin_id IS NULL OR NOT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = p_admin_id
      AND COALESCE(is_admin, false)
      AND COALESCE(is_active, false)
  ) THEN
    RAISE EXCEPTION 'A valid administrator is required';
  END IF;
  IF length(v_reference) NOT BETWEEN 4 AND 200
     OR v_reference ~ '[[:cntrl:]]' THEN
    RAISE EXCEPTION 'A valid provider or blockchain payout reference is required';
  END IF;
  IF v_reference_type NOT IN ('provider', 'blockchain') THEN
    RAISE EXCEPTION 'Payout reference type must be provider or blockchain';
  END IF;
  IF (v_reference_type = 'provider' AND v_provider !~ '^[a-z0-9][a-z0-9._-]{1,39}$')
     OR (v_reference_type = 'blockchain' AND v_provider <> '') THEN
    RAISE EXCEPTION 'A provider payout requires a valid provider identifier';
  END IF;
  IF (v_reference_type = 'provider' AND p_output_index IS NOT NULL)
     OR (v_reference_type = 'blockchain' AND (
       p_output_index IS NULL OR p_output_index < 0 OR p_output_index > 2147483647
     )) THEN
    RAISE EXCEPTION 'A blockchain payout requires a valid transfer, log, or output index';
  END IF;
  IF p_settlement_amount IS NULL
     OR p_settlement_amount <= 0
     OR p_settlement_amount >= 1000000000000000000
     OR round(p_settlement_amount, 18) <> p_settlement_amount THEN
    RAISE EXCEPTION 'Settlement amount must be positive and use at most eighteen decimal places';
  END IF;
  IF v_note IS NOT NULL AND (
    length(v_note) > 500 OR v_note ~ '[[:cntrl:]]'
  ) THEN
    RAISE EXCEPTION 'Completion note is invalid or too long';
  END IF;
  IF p_fee IS NOT NULL AND (
    p_fee < 0
    OR p_fee > 10000000
    OR round(p_fee, 8) <> p_fee
  ) THEN
    RAISE EXCEPTION 'Payout fee must be a non-negative amount with at most eight decimal places';
  END IF;

  SELECT * INTO v_withdrawal
  FROM public.transactions
  WHERE id = p_transaction_id AND type = 'withdrawal'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Withdrawal not found';
  END IF;
  IF v_withdrawal.amount IS NULL OR v_withdrawal.amount <= 0 THEN
    RAISE EXCEPTION 'Withdrawal has an invalid amount';
  END IF;
  v_settlement_asset := upper(COALESCE(v_withdrawal.asset, ''));
  v_settlement_network := CASE v_settlement_asset
    WHEN 'USDT' THEN 'TRON (TRC-20)'
    WHEN 'BTC' THEN 'Bitcoin'
    WHEN 'ETH' THEN 'Ethereum'
    WHEN 'BNB' THEN 'BNB Smart Chain (BEP-20)'
    WHEN 'SOL' THEN 'Solana'
    ELSE NULL
  END;
  v_asset_decimals := CASE v_settlement_asset
    WHEN 'USDT' THEN 6
    WHEN 'BTC' THEN 8
    WHEN 'SOL' THEN 9
    WHEN 'ETH' THEN 18
    WHEN 'BNB' THEN 18
    ELSE NULL
  END;
  IF v_settlement_network IS NULL THEN
    RAISE EXCEPTION 'Withdrawal has an unsupported settlement asset';
  END IF;
  IF (v_settlement_asset = 'USDT' AND COALESCE(v_withdrawal.wallet_address, '') !~ '^T[1-9A-HJ-NP-Za-km-z]{33}$')
     OR (v_settlement_asset = 'BTC' AND COALESCE(v_withdrawal.wallet_address, '') !~ '^(bc1[ac-hj-np-z02-9]{11,71}|[13][a-km-zA-HJ-NP-Z1-9]{25,34})$')
     OR (v_settlement_asset IN ('ETH', 'BNB') AND COALESCE(v_withdrawal.wallet_address, '') !~ '^0x[a-fA-F0-9]{40}$')
     OR (v_settlement_asset = 'SOL' AND COALESCE(v_withdrawal.wallet_address, '') !~ '^[1-9A-HJ-NP-Za-km-z]{32,44}$') THEN
    RAISE EXCEPTION 'Withdrawal destination is invalid for the settlement asset and network';
  END IF;
  IF v_reference_type = 'blockchain' AND (
    (v_settlement_asset IN ('USDT', 'BTC') AND v_reference !~ '^[a-fA-F0-9]{64}$')
    OR (v_settlement_asset IN ('ETH', 'BNB') AND v_reference !~ '^0x[a-fA-F0-9]{64}$')
    OR (v_settlement_asset = 'SOL' AND v_reference !~ '^[1-9A-HJ-NP-Za-km-z]{64,100}$')
  ) THEN
    RAISE EXCEPTION 'Blockchain transaction reference is invalid for the settlement network';
  END IF;
  IF round(p_settlement_amount, v_asset_decimals) <> p_settlement_amount THEN
    RAISE EXCEPTION 'Settlement amount uses more precision than the payout asset supports';
  END IF;

  v_agreed_fee_text := v_withdrawal.metadata ->> 'agreed_payout_fee_usd';
  IF v_agreed_fee_text IS NULL THEN
    v_agreed_fee := 0;
  ELSIF v_agreed_fee_text ~ '^[0-9]+([.][0-9]+)?$' THEN
    v_agreed_fee := v_agreed_fee_text::NUMERIC;
  ELSE
    RAISE EXCEPTION 'Withdrawal has an invalid agreed payout fee';
  END IF;
  IF v_fee <> v_agreed_fee THEN
    RAISE EXCEPTION 'Payout fee does not match the fee agreed before approval';
  END IF;
  IF v_fee >= v_withdrawal.amount THEN
    RAISE EXCEPTION 'Payout fee must be less than the withdrawal amount';
  END IF;

  v_net_amount := v_withdrawal.amount - v_fee;
  v_implied_rate := v_net_amount / p_settlement_amount;
  v_reference_namespace := CASE
    WHEN v_reference_type = 'provider' THEN v_provider
    ELSE lower(v_settlement_network || ':' || v_settlement_asset)
  END;
  v_reference_key := CASE
    WHEN v_reference_type = 'blockchain' AND v_settlement_asset <> 'SOL' THEN lower(v_reference)
    ELSE v_reference
  END;

  -- An exact retry is safe. A conflicting retry is rejected so a completed
  -- payout cannot be rewritten with a different proof or settlement amount.
  IF v_withdrawal.status = 'completed' THEN
    SELECT * INTO v_payout
    FROM public.withdrawal_payouts
    WHERE withdrawal_id = v_withdrawal.id;

    IF FOUND
       AND v_payout.reference_type = v_reference_type
       AND v_payout.reference_namespace = v_reference_namespace
       AND v_payout.reference_key = v_reference_key
       AND v_payout.output_index IS NOT DISTINCT FROM p_output_index
       AND v_payout.settlement_amount = p_settlement_amount
       AND v_payout.fee_usd = v_fee THEN
      RETURN jsonb_build_object(
        'status', 'completed',
        'already_completed', true,
        'transaction_id', v_withdrawal.id,
        'payout_reference', v_payout.payout_reference,
        'reference_type', v_payout.reference_type,
        'provider', CASE WHEN v_payout.reference_type = 'provider' THEN v_payout.reference_namespace ELSE NULL END,
        'output_index', v_payout.output_index,
        'gross_amount', v_withdrawal.amount,
        'fee', v_fee,
        'net_amount', v_net_amount,
        'settlement_asset', v_payout.settlement_asset,
        'settlement_network', v_payout.settlement_network,
        'settlement_amount', v_payout.settlement_amount::TEXT
      );
    END IF;

    RAISE EXCEPTION 'Withdrawal was already completed with different or legacy payout details';
  END IF;

  IF v_withdrawal.status <> 'processing' THEN
    RAISE EXCEPTION 'Only a processing withdrawal can be marked paid';
  END IF;

  SELECT * INTO v_profile
  FROM public.profiles
  WHERE id = v_withdrawal.user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Withdrawal profile not found';
  END IF;

  v_total_before := COALESCE(v_profile.total_withdrawn, 0);
  v_total_after := v_total_before + v_withdrawal.amount;

  INSERT INTO public.withdrawal_payouts (
    withdrawal_id,
    user_id,
    reference_type,
    reference_namespace,
    payout_reference,
    reference_key,
    output_index,
    settlement_asset,
    settlement_network,
    settlement_amount,
    requested_amount_usd,
    fee_usd,
    net_amount_usd,
    implied_rate_usd,
    completed_by,
    note,
    created_at
  ) VALUES (
    v_withdrawal.id,
    v_withdrawal.user_id,
    v_reference_type,
    v_reference_namespace,
    v_reference,
    v_reference_key,
    p_output_index,
    v_settlement_asset,
    v_settlement_network,
    p_settlement_amount,
    v_withdrawal.amount,
    v_fee,
    v_net_amount,
    v_implied_rate,
    p_admin_id,
    v_note,
    v_completed_at
  );

  UPDATE public.profiles
  SET total_withdrawn = v_total_after,
      updated_at = now()
  WHERE id = v_withdrawal.user_id;

  UPDATE public.transactions
  SET status = 'completed',
      tx_hash = v_reference,
      admin_note = concat_ws(
        E'\n',
        NULLIF(BTRIM(COALESCE(admin_note, '')), ''),
        'Payout completed by admin ' || p_admin_id::TEXT ||
          CASE WHEN v_note IS NULL THEN '' ELSE ': ' || v_note END
      ),
      metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
        'withdrawal_completion_version', 2,
        'payout_reference', v_reference,
        'payout_reference_type', v_reference_type,
        'payout_provider', CASE WHEN v_reference_type = 'provider' THEN v_provider ELSE NULL END,
        'payout_output_index', p_output_index,
        'payout_fee_usd', v_fee,
        'payout_net_amount_usd', v_net_amount,
        'settlement_asset', v_settlement_asset,
        'settlement_network', v_settlement_network,
        'settlement_amount', p_settlement_amount,
        'implied_rate_usd', v_implied_rate,
        'payout_completed_at', v_completed_at,
        'payout_completed_by', p_admin_id,
        'payout_note', v_note
      ),
      updated_at = v_completed_at
  WHERE id = v_withdrawal.id;

  INSERT INTO public.email_outbox (
    dedupe_key,
    user_id,
    template,
    to_email,
    payload
  )
  SELECT
    'withdrawal-completed/' || v_withdrawal.id,
    v_withdrawal.user_id,
    'withdrawal_completed',
    v_profile.email,
    jsonb_build_object(
      'name', COALESCE(v_profile.full_name, 'Investor'),
      'amount', v_withdrawal.amount,
      'fee', v_fee,
      'net_amount', v_net_amount,
      'currency', v_settlement_asset,
      'settlement_amount', p_settlement_amount::TEXT,
      'settlement_network', v_settlement_network,
      'wallet_address', COALESCE(v_withdrawal.wallet_address, ''),
      'payout_reference', v_reference,
      'reference_type', v_reference_type,
      'provider', CASE WHEN v_reference_type = 'provider' THEN v_provider ELSE NULL END,
      'output_index', p_output_index
    )
  WHERE COALESCE(
    (
      SELECT withdrawal_email
      FROM public.notification_preferences
      WHERE user_id = v_withdrawal.user_id
    ),
    true
  )
  ON CONFLICT (dedupe_key) DO NOTHING;

  INSERT INTO public.notifications (
    user_id,
    type,
    title,
    description,
    body,
    link,
    metadata,
    dedupe_key
  ) VALUES (
    v_withdrawal.user_id,
    'withdrawal',
    'Withdrawal paid',
    'Your withdrawal payout has been completed.',
    p_settlement_amount::TEXT || ' ' || v_settlement_asset ||
      ' was sent on ' || v_settlement_network ||
      '. Reference: ' || v_reference,
    '/dashboard/transactions',
    jsonb_build_object(
      'transaction_id', v_withdrawal.id,
      'status', 'completed',
      'gross_amount', v_withdrawal.amount,
      'fee', v_fee,
      'net_amount', v_net_amount,
      'asset', v_settlement_asset,
      'network', v_settlement_network,
      'settlement_amount', p_settlement_amount,
      'payout_reference', v_reference,
      'reference_type', v_reference_type,
      'provider', CASE WHEN v_reference_type = 'provider' THEN v_provider ELSE NULL END,
      'output_index', p_output_index
    ),
    'withdrawal-completed/' || v_withdrawal.id
  )
  ON CONFLICT (dedupe_key) DO NOTHING;

  INSERT INTO public.admin_audit_log (
    admin_id,
    action,
    target_user_id,
    details
  ) VALUES (
    p_admin_id,
    'withdrawal_completed',
    v_withdrawal.user_id,
    jsonb_build_object(
      'transaction_id', v_withdrawal.id,
      'payout_reference', v_reference,
      'reference_type', v_reference_type,
      'provider', CASE WHEN v_reference_type = 'provider' THEN v_provider ELSE NULL END,
      'output_index', p_output_index,
      'asset', v_settlement_asset,
      'network', v_settlement_network,
      'wallet_address', v_withdrawal.wallet_address,
      'settlement_amount', p_settlement_amount,
      'implied_rate_usd', v_implied_rate,
      'gross_amount', v_withdrawal.amount,
      'fee', v_fee,
      'net_amount', v_net_amount,
      'total_withdrawn_before', v_total_before,
      'total_withdrawn_after', v_total_after,
      'note', v_note,
      'completed_at', v_completed_at
    )
  );

  RETURN jsonb_build_object(
    'status', 'completed',
    'already_completed', false,
    'transaction_id', v_withdrawal.id,
    'payout_reference', v_reference,
    'reference_type', v_reference_type,
    'provider', CASE WHEN v_reference_type = 'provider' THEN v_provider ELSE NULL END,
    'output_index', p_output_index,
    'gross_amount', v_withdrawal.amount,
    'fee', v_fee,
    'net_amount', v_net_amount,
    'settlement_asset', v_settlement_asset,
    'settlement_network', v_settlement_network,
    'settlement_amount', p_settlement_amount::TEXT,
    'implied_rate_usd', v_implied_rate,
    'total_withdrawn', v_total_after,
    'dedupe_key', 'withdrawal-completed/' || v_withdrawal.id
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.fail_processing_withdrawal(
  p_transaction_id UUID,
  p_reason TEXT,
  p_admin_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_withdrawal public.transactions%ROWTYPE;
  v_profile public.profiles%ROWTYPE;
  v_refund public.transactions%ROWTYPE;
  v_reason TEXT := BTRIM(COALESCE(p_reason, ''));
  v_balance_before NUMERIC(20,8);
  v_balance_after NUMERIC(20,8);
  v_refund_id UUID := gen_random_uuid();
  v_refund_key TEXT;
  v_failed_at TIMESTAMPTZ := clock_timestamp();
BEGIN
  IF p_transaction_id IS NULL THEN
    RAISE EXCEPTION 'Withdrawal transaction is required';
  END IF;
  IF length(v_reason) NOT BETWEEN 3 AND 500
     OR v_reason ~ '[[:cntrl:]]' THEN
    RAISE EXCEPTION 'A specific payout failure reason is required';
  END IF;
  IF p_admin_id IS NULL OR NOT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = p_admin_id
      AND COALESCE(is_admin, false)
      AND COALESCE(is_active, false)
  ) THEN
    RAISE EXCEPTION 'A valid administrator is required';
  END IF;

  SELECT * INTO v_withdrawal
  FROM public.transactions
  WHERE id = p_transaction_id AND type = 'withdrawal'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Withdrawal not found';
  END IF;

  v_refund_key := 'withdrawal-processing-refund:' || v_withdrawal.id;

  IF v_withdrawal.status = 'failed' THEN
    SELECT * INTO v_refund
    FROM public.transactions
    WHERE user_id = v_withdrawal.user_id
      AND idempotency_key = v_refund_key
      AND type = 'adjustment_credit';

    IF FOUND
       AND v_withdrawal.metadata ->> 'processing_failure_version' = '1'
       AND v_withdrawal.metadata ->> 'processing_failure_reason' = v_reason
       AND v_refund.amount = v_withdrawal.amount THEN
      RETURN jsonb_build_object(
        'status', 'failed',
        'already_failed', true,
        'transaction_id', v_withdrawal.id,
        'refund_transaction_id', v_refund.id,
        'refunded_amount', v_refund.amount,
        'balance_after', v_refund.balance_after
      );
    END IF;

    RAISE EXCEPTION 'Withdrawal was already failed through a different or legacy workflow';
  END IF;

  IF v_withdrawal.status <> 'processing' THEN
    RAISE EXCEPTION 'Only a processing withdrawal can be failed and refunded';
  END IF;

  IF NULLIF(BTRIM(COALESCE(v_withdrawal.tx_hash, '')), '') IS NOT NULL
     OR NULLIF(BTRIM(COALESCE(v_withdrawal.metadata ->> 'payout_reference', '')), '') IS NOT NULL
     OR EXISTS (
       SELECT 1
       FROM public.withdrawal_payouts
       WHERE withdrawal_id = v_withdrawal.id
     ) THEN
    RAISE EXCEPTION 'Payout evidence already exists; manual reconciliation is required before any refund';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.transactions
    WHERE user_id = v_withdrawal.user_id
      AND idempotency_key = v_refund_key
  ) THEN
    RAISE EXCEPTION 'A processing-withdrawal refund already exists in an inconsistent state';
  END IF;

  SELECT * INTO v_profile
  FROM public.profiles
  WHERE id = v_withdrawal.user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Withdrawal profile not found';
  END IF;

  v_balance_before := COALESCE(v_profile.balance, 0);
  v_balance_after := v_balance_before + v_withdrawal.amount;

  UPDATE public.profiles
  SET balance = v_balance_after,
      updated_at = now()
  WHERE id = v_withdrawal.user_id;

  INSERT INTO public.transactions (
    id,
    user_id,
    type,
    amount,
    asset,
    status,
    description,
    balance_before,
    balance_after,
    idempotency_key,
    admin_note,
    metadata,
    created_at,
    updated_at
  ) VALUES (
    v_refund_id,
    v_withdrawal.user_id,
    'adjustment_credit',
    v_withdrawal.amount,
    'USD',
    'completed',
    'Withdrawal refund - approved payout could not be completed',
    v_balance_before,
    v_balance_after,
    v_refund_key,
    'Processing failure confirmed by admin ' || p_admin_id::TEXT || ': ' || v_reason,
    jsonb_build_object(
      'withdrawal_id', v_withdrawal.id,
      'refund_reason', v_reason,
      'refunded_by', p_admin_id,
      'refunded_at', v_failed_at
    ),
    v_failed_at,
    v_failed_at
  );

  UPDATE public.transactions
  SET status = 'failed',
      admin_note = concat_ws(
        E'\n',
        NULLIF(BTRIM(COALESCE(admin_note, '')), ''),
        'Approved payout failed and was refunded by admin ' || p_admin_id::TEXT || ': ' || v_reason
      ),
      metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
        'processing_failure_version', 1,
        'processing_failure_reason', v_reason,
        'processing_failed_at', v_failed_at,
        'processing_failed_by', p_admin_id,
        'refund_transaction_id', v_refund_id,
        'refunded_amount', v_withdrawal.amount,
        'refund_balance_after', v_balance_after
      ),
      updated_at = v_failed_at
  WHERE id = v_withdrawal.id;

  INSERT INTO public.email_outbox (
    dedupe_key,
    user_id,
    template,
    to_email,
    payload
  )
  SELECT
    'withdrawal-processing-failed/' || v_withdrawal.id,
    v_withdrawal.user_id,
    'withdrawal_processing_failed',
    v_profile.email,
    jsonb_build_object(
      'name', COALESCE(v_profile.full_name, 'Investor'),
      'amount', v_withdrawal.amount,
      'reason', v_reason,
      'cash_balance', v_balance_after
    )
  WHERE COALESCE(
    (
      SELECT withdrawal_email
      FROM public.notification_preferences
      WHERE user_id = v_withdrawal.user_id
    ),
    true
  )
  ON CONFLICT (dedupe_key) DO NOTHING;

  INSERT INTO public.notifications (
    user_id,
    type,
    title,
    description,
    body,
    link,
    metadata,
    dedupe_key
  ) VALUES (
    v_withdrawal.user_id,
    'withdrawal',
    'Withdrawal payout unsuccessful',
    'The approved payout could not be completed and the reserved cash was returned.',
    '$' || to_char(v_withdrawal.amount, 'FM999999999999990.00') ||
      ' was restored to your cash balance. Reason: ' || v_reason,
    '/dashboard/transactions',
    jsonb_build_object(
      'transaction_id', v_withdrawal.id,
      'refund_transaction_id', v_refund_id,
      'status', 'failed',
      'refunded_amount', v_withdrawal.amount,
      'balance_after', v_balance_after,
      'reason', v_reason
    ),
    'withdrawal-processing-failed/' || v_withdrawal.id
  )
  ON CONFLICT (dedupe_key) DO NOTHING;

  INSERT INTO public.admin_audit_log (
    admin_id,
    action,
    target_user_id,
    details
  ) VALUES (
    p_admin_id,
    'withdrawal_processing_failed',
    v_withdrawal.user_id,
    jsonb_build_object(
      'transaction_id', v_withdrawal.id,
      'refund_transaction_id', v_refund_id,
      'amount', v_withdrawal.amount,
      'balance_before', v_balance_before,
      'balance_after', v_balance_after,
      'reason', v_reason,
      'failed_at', v_failed_at
    )
  );

  RETURN jsonb_build_object(
    'status', 'failed',
    'already_failed', false,
    'transaction_id', v_withdrawal.id,
    'refund_transaction_id', v_refund_id,
    'refunded_amount', v_withdrawal.amount,
    'balance_after', v_balance_after,
    'dedupe_key', 'withdrawal-processing-failed/' || v_withdrawal.id
  );
END;
$$;

REVOKE ALL ON FUNCTION public.finalize_withdrawal(UUID, TEXT, TEXT, TEXT, BIGINT, NUMERIC, UUID, NUMERIC, TEXT)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.finalize_withdrawal(UUID, TEXT, TEXT, TEXT, BIGINT, NUMERIC, UUID, NUMERIC, TEXT)
  TO service_role;
REVOKE ALL ON FUNCTION public.fail_processing_withdrawal(UUID, TEXT, UUID)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fail_processing_withdrawal(UUID, TEXT, UUID)
  TO service_role;

COMMIT;
