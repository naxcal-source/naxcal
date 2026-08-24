BEGIN;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS idempotency_key TEXT;
DROP INDEX IF EXISTS public.transactions_idempotency_key_unique;
CREATE UNIQUE INDEX IF NOT EXISTS transactions_user_idempotency_key_unique
  ON public.transactions (user_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_type_check;
ALTER TABLE public.transactions ADD CONSTRAINT transactions_type_check CHECK (
  type IN (
    'deposit', 'withdrawal', 'profit', 'bonus', 'referral', 'fee',
    'adjustment_credit', 'adjustment_debit', 'stock_buy', 'stock_sell',
    'crypto_sell', 'swap'
  )
) NOT VALID;

CREATE TABLE IF NOT EXISTS public.payment_intents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id),
  provider TEXT NOT NULL DEFAULT 'nowpayments',
  request_key TEXT NOT NULL,
  provider_payment_id TEXT UNIQUE,
  provider_order_id TEXT NOT NULL UNIQUE,
  requested_amount NUMERIC(20,8) NOT NULL CHECK (requested_amount > 0),
  price_currency TEXT NOT NULL DEFAULT 'USD',
  pay_currency TEXT NOT NULL,
  pay_address TEXT,
  pay_amount NUMERIC(36,18),
  provider_response JSONB,
  status TEXT NOT NULL DEFAULT 'creating',
  credited_amount NUMERIC(20,8),
  credited_transaction_id UUID REFERENCES public.transactions(id),
  credited_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, request_key)
);

CREATE TABLE IF NOT EXISTS public.payment_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_payment_id TEXT NOT NULL,
  payment_status TEXT NOT NULL,
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(provider_payment_id, payment_status)
);

CREATE TABLE IF NOT EXISTS public.payment_webhook_inbox (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_key TEXT NOT NULL UNIQUE,
  provider_payment_id TEXT NOT NULL,
  provider_order_id TEXT NOT NULL,
  payment_status TEXT NOT NULL,
  payload JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'received'
    CHECK (status IN ('received', 'processed', 'failed')),
  attempts INTEGER NOT NULL DEFAULT 1,
  last_error TEXT,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id),
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  body TEXT,
  link TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_read BOOLEAN NOT NULL DEFAULT false,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS dedupe_key TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS notifications_dedupe_key_unique
  ON public.notifications (dedupe_key)
  WHERE dedupe_key IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.email_outbox (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dedupe_key TEXT NOT NULL UNIQUE,
  user_id UUID NOT NULL REFERENCES public.profiles(id),
  template TEXT NOT NULL,
  to_email TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'sending', 'sent', 'failed')),
  attempts INTEGER NOT NULL DEFAULT 0,
  provider_message_id TEXT,
  last_error TEXT,
  locked_at TIMESTAMPTZ,
  lease_id UUID,
  next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  sent_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.notification_preferences (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  daily_profit_email BOOLEAN NOT NULL DEFAULT true,
  deposit_email BOOLEAN NOT NULL DEFAULT true,
  withdrawal_email BOOLEAN NOT NULL DEFAULT true,
  security_email BOOLEAN NOT NULL DEFAULT true,
  marketing_email BOOLEAN NOT NULL DEFAULT false,
  announcements_email BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.payment_intents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_webhook_inbox ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_outbox ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
REVOKE ALL PRIVILEGES ON TABLE public.payment_intents FROM PUBLIC, anon, authenticated;
REVOKE ALL PRIVILEGES ON TABLE public.payment_webhook_events FROM PUBLIC, anon, authenticated;
REVOKE ALL PRIVILEGES ON TABLE public.payment_webhook_inbox FROM PUBLIC, anon, authenticated;
REVOKE ALL PRIVILEGES ON TABLE public.email_outbox FROM PUBLIC, anon, authenticated;
REVOKE ALL PRIVILEGES ON TABLE public.notifications FROM PUBLIC, anon, authenticated;
REVOKE ALL PRIVILEGES ON TABLE public.notification_preferences FROM PUBLIC, anon, authenticated;
GRANT ALL PRIVILEGES ON TABLE public.payment_intents TO service_role;
GRANT ALL PRIVILEGES ON TABLE public.payment_webhook_events TO service_role;
GRANT ALL PRIVILEGES ON TABLE public.payment_webhook_inbox TO service_role;
GRANT ALL PRIVILEGES ON TABLE public.email_outbox TO service_role;
GRANT ALL PRIVILEGES ON TABLE public.notifications TO service_role;
GRANT ALL PRIVILEGES ON TABLE public.notification_preferences TO service_role;

CREATE OR REPLACE FUNCTION public.settle_nowpayments_deposit(
  p_provider_payment_id TEXT,
  p_provider_order_id TEXT,
  p_payment_status TEXT,
  p_payload JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_event_id UUID;
  v_intent public.payment_intents%ROWTYPE;
  v_profile public.profiles%ROWTYPE;
  v_transaction_id UUID;
  v_balance_before NUMERIC(20,8);
  v_balance_after NUMERIC(20,8);
  v_dedupe_key TEXT;
  v_price_amount_text TEXT;
  v_actually_paid_text TEXT;
BEGIN
  IF p_provider_payment_id IS NULL OR p_provider_order_id IS NULL OR p_payment_status IS NULL THEN
    RAISE EXCEPTION 'Missing payment identifiers';
  END IF;

  INSERT INTO public.payment_webhook_events (
    provider_payment_id,
    payment_status,
    payload
  ) VALUES (
    p_provider_payment_id,
    lower(p_payment_status),
    p_payload
  )
  ON CONFLICT (provider_payment_id, payment_status) DO NOTHING
  RETURNING id INTO v_event_id;

  SELECT * INTO v_intent
  FROM public.payment_intents
  WHERE provider_payment_id = p_provider_payment_id
     OR (provider_payment_id IS NULL AND provider_order_id = p_provider_order_id)
  ORDER BY (provider_payment_id = p_provider_payment_id) DESC
  LIMIT 1
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Unknown payment intent';
  END IF;
  IF v_intent.provider_order_id <> p_provider_order_id THEN
    RAISE EXCEPTION 'Payment order mismatch';
  END IF;

  IF v_intent.provider_payment_id IS NULL THEN
    UPDATE public.payment_intents
    SET provider_payment_id = p_provider_payment_id, updated_at = now()
    WHERE id = v_intent.id;
    v_intent.provider_payment_id := p_provider_payment_id;
  END IF;

  UPDATE public.payment_intents
  SET status = CASE
        WHEN status IN ('finished', 'manual_review', 'failed', 'refunded', 'expired') THEN status
        WHEN lower(p_payment_status) = 'finished' THEN 'finished'
        WHEN credited_at IS NOT NULL THEN status
        ELSE lower(p_payment_status)
      END,
      updated_at = now()
  WHERE id = v_intent.id;

  IF v_event_id IS NULL THEN
    RETURN jsonb_build_object(
      'status', 'duplicate_event',
      'credited', v_intent.credited_at IS NOT NULL,
      'dedupe_key', 'deposit-confirmed/' || p_provider_payment_id
    );
  END IF;

  IF lower(p_payment_status) NOT IN ('confirmed', 'finished') THEN
    RETURN jsonb_build_object('status', 'recorded', 'credited', false);
  END IF;

  v_price_amount_text := p_payload ->> 'price_amount';
  v_actually_paid_text := p_payload ->> 'actually_paid';
  IF lower(COALESCE(p_payload ->> 'price_currency', '')) <> lower(v_intent.price_currency)
     OR lower(COALESCE(p_payload ->> 'pay_currency', '')) <> lower(v_intent.pay_currency)
     OR v_price_amount_text IS NULL
     OR v_price_amount_text !~ '^[0-9]+([.][0-9]+)?$'
     OR abs((v_price_amount_text::NUMERIC) - v_intent.requested_amount) > 0.01
     OR (v_intent.pay_amount IS NOT NULL AND (
       v_actually_paid_text IS NULL
       OR v_actually_paid_text !~ '^[0-9]+([.][0-9]+)?$'
       OR v_actually_paid_text::NUMERIC < v_intent.pay_amount * 0.99
     )) THEN
    UPDATE public.payment_intents
    SET status = 'manual_review', updated_at = now()
    WHERE id = v_intent.id;
    RETURN jsonb_build_object('status', 'manual_review', 'credited', false);
  END IF;

  IF v_intent.credited_at IS NOT NULL THEN
    RETURN jsonb_build_object(
      'status', 'already_credited',
      'credited', true,
      'dedupe_key', 'deposit-confirmed/' || p_provider_payment_id
    );
  END IF;

  SELECT * INTO v_profile
  FROM public.profiles
  WHERE id = v_intent.user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payment profile not found';
  END IF;

  v_balance_before := COALESCE(v_profile.balance, 0);
  v_balance_after := v_balance_before + v_intent.requested_amount;
  v_transaction_id := gen_random_uuid();
  v_dedupe_key := 'deposit-confirmed/' || p_provider_payment_id;

  UPDATE public.profiles
  SET balance = v_balance_after,
      total_deposited = COALESCE(total_deposited, 0) + v_intent.requested_amount,
      updated_at = now()
  WHERE id = v_intent.user_id;

  INSERT INTO public.transactions (
    id,
    user_id,
    type,
    amount,
    asset,
    status,
    tx_hash,
    description,
    balance_before,
    balance_after,
    idempotency_key
  ) VALUES (
    v_transaction_id,
    v_intent.user_id,
    'deposit',
    v_intent.requested_amount,
    upper(v_intent.pay_currency),
    'completed',
    p_provider_payment_id,
    'Crypto deposit - ' || upper(v_intent.pay_currency),
    v_balance_before,
    v_balance_after,
    'nowpayments-deposit:' || p_provider_payment_id
  );

  UPDATE public.payment_intents
  SET credited_amount = requested_amount,
      credited_transaction_id = v_transaction_id,
      credited_at = now(),
      updated_at = now()
  WHERE id = v_intent.id;

  INSERT INTO public.email_outbox (
    dedupe_key,
    user_id,
    template,
    to_email,
    payload
  ) SELECT
    v_dedupe_key,
    v_intent.user_id,
    'deposit_confirmed',
    v_profile.email,
    jsonb_build_object(
      'name', COALESCE(v_profile.full_name, 'Investor'),
      'amount', v_intent.requested_amount,
      'currency', upper(v_intent.pay_currency),
      'payment_id', p_provider_payment_id
    )
  WHERE COALESCE(
    (SELECT deposit_email FROM public.notification_preferences WHERE user_id = v_intent.user_id),
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
    v_intent.user_id,
    'deposit',
    'Deposit confirmed',
    '$' || to_char(v_intent.requested_amount, 'FM999999999999990.00') || ' has been credited to your account.',
    'Your deposit has been confirmed and credited to your Naxcal cash balance. Transaction reference: ' || p_provider_payment_id || '.',
    '/dashboard/transactions',
    jsonb_build_object(
      'amount_usd', v_intent.requested_amount,
      'pay_currency', upper(v_intent.pay_currency),
      'payment_id', p_provider_payment_id,
      'balance_before', v_balance_before,
      'balance_after', v_balance_after
    ),
    'deposit-confirmed/' || p_provider_payment_id
  ) ON CONFLICT (dedupe_key) DO NOTHING;

  RETURN jsonb_build_object(
    'status', 'credited',
    'credited', true,
    'new_balance', v_balance_after,
    'balance_before', v_balance_before,
    'amount', v_intent.requested_amount,
    'currency', upper(v_intent.pay_currency),
    'transaction_id', v_transaction_id,
    'user_id', v_intent.user_id,
    'dedupe_key', v_dedupe_key
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.create_withdrawal_request(
  p_user_id UUID,
  p_amount NUMERIC,
  p_asset TEXT,
  p_wallet TEXT,
  p_idempotency_key TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_profile public.profiles%ROWTYPE;
  v_existing public.transactions%ROWTYPE;
  v_transaction_id UUID;
  v_balance_before NUMERIC(20,8);
  v_balance_after NUMERIC(20,8);
  v_lockup_days INTEGER;
  v_tx_key TEXT := 'withdrawal:' || p_user_id || ':' || p_idempotency_key;
BEGIN
  IF p_idempotency_key IS NULL OR p_idempotency_key !~ '^[A-Za-z0-9._:-]{8,128}$' THEN
    RAISE EXCEPTION 'Missing or invalid idempotency key';
  END IF;
  IF p_amount IS NULL OR p_amount < 100 THEN
    RAISE EXCEPTION 'Minimum withdrawal is $100';
  END IF;
  IF round(p_amount, 2) <> p_amount THEN
    RAISE EXCEPTION 'Withdrawal amount must use at most two decimal places';
  END IF;
  IF p_amount > 10000000 THEN
    RAISE EXCEPTION 'Withdrawal amount exceeds the supported limit';
  END IF;
  IF upper(COALESCE(p_asset, '')) NOT IN ('USDT', 'BTC', 'ETH', 'BNB', 'SOL') THEN
    RAISE EXCEPTION 'Unsupported withdrawal asset';
  END IF;
  IF p_wallet IS NULL OR length(p_wallet) < 20 OR length(p_wallet) > 128 THEN
    RAISE EXCEPTION 'Invalid wallet address';
  END IF;

  SELECT * INTO v_profile
  FROM public.profiles
  WHERE id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN RAISE EXCEPTION 'Profile not found'; END IF;

  SELECT * INTO v_existing
  FROM public.transactions
  WHERE user_id = p_user_id AND idempotency_key = v_tx_key
  LIMIT 1;

  IF FOUND THEN
    IF v_existing.amount <> p_amount
       OR upper(COALESCE(v_existing.asset, '')) <> upper(p_asset)
       OR COALESCE(v_existing.wallet_address, '') <> p_wallet THEN
      RAISE EXCEPTION 'Idempotency key was reused with different withdrawal details';
    END IF;
    RETURN jsonb_build_object(
      'status', 'ok',
      'transaction_id', v_existing.id,
      'transaction_status', v_existing.status,
      'new_balance', COALESCE(v_profile.balance, 0),
      'already_exists', true
    );
  END IF;

  IF NOT COALESCE(v_profile.is_active, false) THEN RAISE EXCEPTION 'Account is inactive'; END IF;
  IF v_profile.kyc_status <> 'approved' THEN RAISE EXCEPTION 'Complete KYC verification before withdrawing'; END IF;

  v_lockup_days := CASE lower(COALESCE(v_profile.tier, 'bronze'))
    WHEN 'gold' THEN 30
    WHEN 'silver' THEN 14
    ELSE 7
  END;
  IF v_profile.created_at IS NULL THEN
    RAISE EXCEPTION 'Withdrawal lock-up start is unavailable';
  END IF;
  IF v_profile.created_at + make_interval(days => v_lockup_days) > now() THEN
    RAISE EXCEPTION 'Withdrawal lock-up period is still active';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.transactions
    WHERE user_id = p_user_id
      AND type = 'deposit'
      AND status = 'completed'
      AND created_at >= date_trunc('month', now())
  ) THEN
    RAISE EXCEPTION 'A completed deposit is required this calendar month';
  END IF;

  v_balance_before := COALESCE(v_profile.balance, 0);
  IF v_balance_before < p_amount THEN RAISE EXCEPTION 'Insufficient cash balance'; END IF;

  v_balance_after := v_balance_before - p_amount;
  v_transaction_id := gen_random_uuid();

  UPDATE public.profiles
  SET balance = v_balance_after, updated_at = now()
  WHERE id = p_user_id;

  INSERT INTO public.transactions (
    id,
    user_id,
    type,
    amount,
    asset,
    status,
    wallet_address,
    description,
    balance_before,
    balance_after,
    idempotency_key
  ) VALUES (
    v_transaction_id,
    p_user_id,
    'withdrawal',
    p_amount,
    upper(p_asset),
    'pending',
    p_wallet,
    'Withdrawal to ' || upper(p_asset) || ' wallet',
    v_balance_before,
    v_balance_after,
    v_tx_key
  );

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
    p_user_id,
    'withdrawal',
    'Withdrawal request submitted',
    'Your ' || upper(p_asset) || ' withdrawal is now pending review.',
    'Your withdrawal request for $' || to_char(p_amount, 'FM999999999999990.00') || ' has been submitted and is pending review.',
    '/dashboard/transactions',
    jsonb_build_object(
      'amount', p_amount,
      'asset', upper(p_asset),
      'wallet_address', p_wallet,
      'status', 'pending',
      'transaction_id', v_transaction_id
    ),
    'withdrawal-submitted/' || v_transaction_id
  ) ON CONFLICT (dedupe_key) DO NOTHING;

  RETURN jsonb_build_object(
    'status', 'ok',
    'transaction_id', v_transaction_id,
    'new_balance', v_balance_after,
    'already_exists', false
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.review_withdrawal(
  p_transaction_id UUID,
  p_action TEXT,
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
  v_new_balance NUMERIC(20,8);
BEGIN
  IF lower(COALESCE(p_action, '')) NOT IN ('approve', 'reject') THEN
    RAISE EXCEPTION 'Invalid withdrawal action';
  END IF;

  SELECT * INTO v_withdrawal
  FROM public.transactions
  WHERE id = p_transaction_id AND type = 'withdrawal'
  FOR UPDATE;

  IF NOT FOUND THEN RAISE EXCEPTION 'Withdrawal not found'; END IF;

  IF v_withdrawal.status <> 'pending' THEN
    RETURN jsonb_build_object(
      'status', v_withdrawal.status,
      'already_reviewed', true,
      'transaction_id', v_withdrawal.id
    );
  END IF;

  SELECT * INTO v_profile
  FROM public.profiles
  WHERE id = v_withdrawal.user_id
  FOR UPDATE;

  IF NOT FOUND THEN RAISE EXCEPTION 'Withdrawal profile not found'; END IF;

  IF lower(p_action) = 'approve' THEN
    UPDATE public.transactions
    SET status = 'processing',
        admin_note = COALESCE(NULLIF(BTRIM(p_reason), ''), 'Approved by admin'),
        updated_at = now()
    WHERE id = v_withdrawal.id;

    INSERT INTO public.email_outbox (dedupe_key, user_id, template, to_email, payload)
    SELECT
      'withdrawal-approved/' || v_withdrawal.id,
      v_withdrawal.user_id,
      'withdrawal_approved',
      v_profile.email,
      jsonb_build_object(
        'name', COALESCE(v_profile.full_name, 'Investor'),
        'amount', v_withdrawal.amount,
        'currency', COALESCE(v_withdrawal.asset, 'USDT'),
        'wallet_address', COALESCE(v_withdrawal.wallet_address, '')
      )
    WHERE COALESCE(
      (SELECT withdrawal_email FROM public.notification_preferences WHERE user_id = v_withdrawal.user_id),
      true
    )
    ON CONFLICT (dedupe_key) DO NOTHING;

    INSERT INTO public.notifications (
      user_id, type, title, description, body, link, metadata, dedupe_key
    ) VALUES (
      v_withdrawal.user_id,
      'withdrawal',
      'Withdrawal approved for processing',
      'Your withdrawal request has passed review and is being processed.',
      'Your approved withdrawal is now being processed. A completed payout will include its provider or blockchain reference.',
      '/dashboard/transactions',
      jsonb_build_object('transaction_id', v_withdrawal.id, 'status', 'processing'),
      'withdrawal-approved/' || v_withdrawal.id
    ) ON CONFLICT (dedupe_key) DO NOTHING;

    RETURN jsonb_build_object('status', 'processing', 'already_reviewed', false);
  END IF;

  v_new_balance := COALESCE(v_profile.balance, 0) + v_withdrawal.amount;
  UPDATE public.profiles
  SET balance = v_new_balance, updated_at = now()
  WHERE id = v_withdrawal.user_id;

  UPDATE public.transactions
  SET status = 'failed',
      admin_note = COALESCE(NULLIF(BTRIM(p_reason), ''), 'Rejected by admin'),
      updated_at = now()
  WHERE id = v_withdrawal.id;

  INSERT INTO public.transactions (
    user_id,
    type,
    amount,
    asset,
    status,
    description,
    balance_before,
    balance_after,
    idempotency_key,
    admin_note
  ) VALUES (
    v_withdrawal.user_id,
    'adjustment_credit',
    v_withdrawal.amount,
    v_withdrawal.asset,
    'completed',
    'Withdrawal refund - request declined',
    COALESCE(v_profile.balance, 0),
    v_new_balance,
    'withdrawal-refund:' || v_withdrawal.id,
    'Reviewed by admin ' || p_admin_id
  );

  INSERT INTO public.email_outbox (dedupe_key, user_id, template, to_email, payload)
  SELECT
    'withdrawal-rejected/' || v_withdrawal.id,
    v_withdrawal.user_id,
    'withdrawal_rejected',
    v_profile.email,
    jsonb_build_object(
      'name', COALESCE(v_profile.full_name, 'Investor'),
      'amount', v_withdrawal.amount,
      'reason', COALESCE(p_reason, '')
    )
  WHERE COALESCE(
    (SELECT withdrawal_email FROM public.notification_preferences WHERE user_id = v_withdrawal.user_id),
    true
  )
  ON CONFLICT (dedupe_key) DO NOTHING;

  INSERT INTO public.notifications (
    user_id, type, title, description, body, link, metadata, dedupe_key
  ) VALUES (
    v_withdrawal.user_id,
    'withdrawal',
    'Withdrawal declined',
    'Your withdrawal request was declined and the reserved cash was returned.',
    'The reserved withdrawal amount has been restored to your cash balance.',
    '/dashboard/transactions',
    jsonb_build_object(
      'transaction_id', v_withdrawal.id,
      'status', 'failed',
      'refunded_amount', v_withdrawal.amount,
      'balance_after', v_new_balance
    ),
    'withdrawal-rejected/' || v_withdrawal.id
  ) ON CONFLICT (dedupe_key) DO NOTHING;

  RETURN jsonb_build_object('status', 'failed', 'already_reviewed', false, 'new_balance', v_new_balance);
END;
$$;

CREATE OR REPLACE FUNCTION public.claim_email_outbox(
  p_worker_id UUID,
  p_limit INTEGER DEFAULT 20,
  p_dedupe_key TEXT DEFAULT NULL
)
RETURNS SETOF public.email_outbox
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  WITH candidates AS (
    SELECT id
    FROM public.email_outbox
    WHERE (
        status IN ('pending', 'failed')
        OR (status = 'sending' AND (locked_at IS NULL OR locked_at < now() - interval '10 minutes'))
      )
      AND next_attempt_at <= now()
      AND (p_dedupe_key IS NULL OR dedupe_key = p_dedupe_key)
    ORDER BY created_at
    FOR UPDATE SKIP LOCKED
    LIMIT LEAST(GREATEST(p_limit, 1), 100)
  )
  UPDATE public.email_outbox AS outbox
  SET status = 'sending',
      attempts = outbox.attempts + 1,
      lease_id = p_worker_id,
      locked_at = now(),
      updated_at = now(),
      last_error = NULL
  FROM candidates
  WHERE outbox.id = candidates.id
  RETURNING outbox.*;
$$;

REVOKE ALL ON FUNCTION public.settle_nowpayments_deposit(TEXT, TEXT, TEXT, JSONB) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.create_withdrawal_request(UUID, NUMERIC, TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.review_withdrawal(UUID, TEXT, TEXT, UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.claim_email_outbox(UUID, INTEGER, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.settle_nowpayments_deposit(TEXT, TEXT, TEXT, JSONB) TO service_role;
GRANT EXECUTE ON FUNCTION public.create_withdrawal_request(UUID, NUMERIC, TEXT, TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.review_withdrawal(UUID, TEXT, TEXT, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.claim_email_outbox(UUID, INTEGER, TEXT) TO service_role;

COMMIT;
