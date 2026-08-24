BEGIN;

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS kyc_reviewed_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS public.kyc_review_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_key TEXT NOT NULL UNIQUE,
  user_id UUID NOT NULL REFERENCES public.profiles(id),
  decision TEXT NOT NULL CHECK (decision IN ('approved', 'rejected')),
  reason TEXT,
  occurred_at TIMESTAMPTZ NOT NULL,
  source TEXT NOT NULL,
  actor_id UUID REFERENCES public.profiles(id),
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  applied BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID REFERENCES public.profiles(id),
  action TEXT NOT NULL,
  target_user_id UUID,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.profit_correction_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_key TEXT NOT NULL UNIQUE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  profit_transaction_id UUID NOT NULL UNIQUE REFERENCES public.transactions(id) ON DELETE RESTRICT,
  correction_transaction_id UUID NOT NULL UNIQUE REFERENCES public.transactions(id) ON DELETE RESTRICT,
  original_amount NUMERIC(20,8) NOT NULL CHECK (original_amount > 0),
  corrected_amount NUMERIC(20,8) NOT NULL CHECK (corrected_amount >= 0),
  removed_amount NUMERIC(20,8) NOT NULL CHECK (removed_amount > 0),
  cash_impact BOOLEAN NOT NULL,
  cash_balance_before NUMERIC(20,8) NOT NULL,
  cash_balance_after NUMERIC(20,8) NOT NULL,
  total_profit_before NUMERIC(20,8) NOT NULL,
  total_profit_after NUMERIC(20,8) NOT NULL,
  admin_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  reason TEXT NOT NULL CHECK (length(reason) BETWEEN 10 AND 500),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (corrected_amount < original_amount),
  CHECK (removed_amount = original_amount - corrected_amount),
  CHECK (
    (cash_impact AND cash_balance_after = cash_balance_before - removed_amount)
    OR (NOT cash_impact AND cash_balance_after = cash_balance_before)
  )
);

CREATE OR REPLACE FUNCTION public.prevent_profit_correction_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  RAISE EXCEPTION 'Profit correction events are immutable';
END;
$$;

DROP TRIGGER IF EXISTS profit_correction_events_immutable
  ON public.profit_correction_events;
CREATE TRIGGER profit_correction_events_immutable
  BEFORE UPDATE OR DELETE ON public.profit_correction_events
  FOR EACH ROW EXECUTE FUNCTION public.prevent_profit_correction_mutation();

ALTER TABLE public.kyc_review_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profit_correction_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL PRIVILEGES ON TABLE public.kyc_review_events FROM PUBLIC, anon, authenticated;
REVOKE ALL PRIVILEGES ON TABLE public.admin_audit_log FROM PUBLIC, anon, authenticated;
REVOKE ALL PRIVILEGES ON TABLE public.profit_correction_events FROM PUBLIC, anon, authenticated;
GRANT ALL PRIVILEGES ON TABLE public.kyc_review_events TO service_role;
GRANT ALL PRIVILEGES ON TABLE public.admin_audit_log TO service_role;
GRANT SELECT ON TABLE public.profit_correction_events TO service_role;

CREATE OR REPLACE FUNCTION public.apply_kyc_review(
  p_event_key TEXT,
  p_user_id UUID,
  p_decision TEXT,
  p_reason TEXT,
  p_occurred_at TIMESTAMPTZ,
  p_source TEXT,
  p_actor_id UUID,
  p_payload JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_event_id UUID;
  v_profile public.profiles%ROWTYPE;
  v_dedupe_key TEXT;
BEGIN
  IF p_event_key IS NULL OR length(p_event_key) NOT BETWEEN 8 AND 200 THEN
    RAISE EXCEPTION 'Invalid KYC event key';
  END IF;
  IF p_decision NOT IN ('approved', 'rejected') THEN RAISE EXCEPTION 'Invalid KYC decision'; END IF;
  IF p_occurred_at IS NULL OR p_occurred_at > now() + interval '5 minutes' THEN
    RAISE EXCEPTION 'Invalid KYC event time';
  END IF;
  IF p_source IS NULL OR length(p_source) NOT BETWEEN 1 AND 80 THEN RAISE EXCEPTION 'Invalid KYC source'; END IF;

  INSERT INTO public.kyc_review_events (
    event_key, user_id, decision, reason, occurred_at, source, actor_id, payload
  ) VALUES (
    p_event_key, p_user_id, p_decision, NULLIF(BTRIM(p_reason), ''),
    p_occurred_at, p_source, p_actor_id, COALESCE(p_payload, '{}'::jsonb)
  )
  ON CONFLICT (event_key) DO NOTHING
  RETURNING id INTO v_event_id;
  IF v_event_id IS NULL THEN RETURN jsonb_build_object('status', 'duplicate'); END IF;

  SELECT * INTO v_profile FROM public.profiles WHERE id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'KYC profile not found'; END IF;

  IF v_profile.kyc_reviewed_at IS NOT NULL AND v_profile.kyc_reviewed_at > p_occurred_at THEN
    RETURN jsonb_build_object('status', 'stale_event');
  END IF;

  UPDATE public.profiles
  SET kyc_status = p_decision,
      kyc_rejection_reason = CASE WHEN p_decision = 'rejected' THEN NULLIF(BTRIM(p_reason), '') ELSE NULL END,
      kyc_reviewed_at = p_occurred_at,
      updated_at = now()
  WHERE id = p_user_id;
  UPDATE public.kyc_review_events SET applied = true WHERE id = v_event_id;

  v_dedupe_key := 'kyc-review/' || p_event_key;
  INSERT INTO public.email_outbox (dedupe_key, user_id, template, to_email, payload)
  VALUES (
    v_dedupe_key,
    p_user_id,
    CASE WHEN p_decision = 'approved' THEN 'kyc_approved' ELSE 'kyc_rejected' END,
    v_profile.email,
    jsonb_build_object(
      'name', COALESCE(v_profile.full_name, 'Investor'),
      'reason', COALESCE(p_reason, 'Documents could not be verified')
    )
  ) ON CONFLICT (dedupe_key) DO NOTHING;

  INSERT INTO public.notifications (
    user_id, type, title, description, body, link, metadata, dedupe_key
  ) VALUES (
    p_user_id,
    'kyc',
    CASE WHEN p_decision = 'approved' THEN 'Identity verification approved' ELSE 'Identity verification needs attention' END,
    CASE WHEN p_decision = 'approved' THEN 'Your identity verification was approved.' ELSE 'Your identity verification was not approved.' END,
    CASE WHEN p_decision = 'approved' THEN 'Your verified account features are now available.' ELSE COALESCE(NULLIF(BTRIM(p_reason), ''), 'Please review and resubmit your documents.') END,
    '/dashboard/kyc',
    jsonb_build_object('decision', p_decision, 'source', p_source, 'event_key', p_event_key),
    v_dedupe_key
  ) ON CONFLICT (dedupe_key) DO NOTHING;

  IF p_actor_id IS NOT NULL THEN
    INSERT INTO public.admin_audit_log (admin_id, action, target_user_id, details)
    VALUES (p_actor_id, 'kyc_' || p_decision, p_user_id, jsonb_build_object('reason', p_reason, 'event_key', p_event_key));
  END IF;

  RETURN jsonb_build_object('status', 'applied', 'decision', p_decision, 'dedupe_key', v_dedupe_key);
END;
$$;

CREATE OR REPLACE FUNCTION public.adjust_user_balance(
  p_user_id UUID,
  p_delta NUMERIC,
  p_reason TEXT,
  p_admin_id UUID,
  p_request_key TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_profile public.profiles%ROWTYPE;
  v_existing public.transactions%ROWTYPE;
  v_before NUMERIC(20,8);
  v_after NUMERIC(20,8);
  v_transaction_id UUID;
  v_tx_key TEXT := 'admin-adjustment:' || p_admin_id || ':' || p_request_key;
BEGIN
  IF p_delta IS NULL OR p_delta = 0 OR abs(p_delta) > 10000000 OR round(p_delta, 2) <> p_delta THEN
    RAISE EXCEPTION 'Invalid adjustment amount';
  END IF;
  IF p_reason IS NULL OR length(BTRIM(p_reason)) NOT BETWEEN 3 AND 500 THEN
    RAISE EXCEPTION 'A specific adjustment reason is required';
  END IF;
  IF p_request_key IS NULL OR p_request_key !~ '^[A-Za-z0-9._:-]{8,128}$' THEN
    RAISE EXCEPTION 'Invalid adjustment request key';
  END IF;

  SELECT * INTO v_profile FROM public.profiles WHERE id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Profile not found'; END IF;
  SELECT * INTO v_existing
  FROM public.transactions
  WHERE user_id = p_user_id AND idempotency_key = v_tx_key;
  IF FOUND THEN
    IF v_existing.amount <> abs(p_delta)
       OR v_existing.type <> CASE WHEN p_delta > 0 THEN 'adjustment_credit' ELSE 'adjustment_debit' END
       OR COALESCE(v_existing.admin_note, '') <> BTRIM(p_reason) THEN
      RAISE EXCEPTION 'Adjustment key was reused with different details';
    END IF;
    RETURN jsonb_build_object('status', 'already_applied', 'balance', v_profile.balance, 'transaction_id', v_existing.id);
  END IF;

  v_before := COALESCE(v_profile.balance, 0);
  v_after := v_before + p_delta;
  IF v_after < 0 THEN RAISE EXCEPTION 'Adjustment would make the cash balance negative'; END IF;

  UPDATE public.profiles SET balance = v_after, updated_at = now() WHERE id = p_user_id;
  v_transaction_id := gen_random_uuid();
  INSERT INTO public.transactions (
    id, user_id, type, amount, asset, status, description,
    balance_before, balance_after, idempotency_key, admin_note, metadata
  ) VALUES (
    v_transaction_id,
    p_user_id,
    CASE WHEN p_delta > 0 THEN 'adjustment_credit' ELSE 'adjustment_debit' END,
    abs(p_delta),
    'USD',
    'completed',
    'Admin cash balance adjustment',
    v_before,
    v_after,
    v_tx_key,
    BTRIM(p_reason),
    jsonb_build_object('admin_id', p_admin_id, 'delta', p_delta)
  );
  INSERT INTO public.admin_audit_log (admin_id, action, target_user_id, details)
  VALUES (
    p_admin_id,
    CASE WHEN p_delta > 0 THEN 'balance_credit' ELSE 'balance_debit' END,
    p_user_id,
    jsonb_build_object('delta', p_delta, 'before', v_before, 'after', v_after, 'reason', BTRIM(p_reason), 'transaction_id', v_transaction_id)
  );

  RETURN jsonb_build_object('status', 'applied', 'balance', v_after, 'transaction_id', v_transaction_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.set_user_active_state(
  p_user_id UUID,
  p_is_active BOOLEAN,
  p_admin_id UUID,
  p_reason TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_before BOOLEAN;
BEGIN
  IF p_is_active IS NULL THEN RAISE EXCEPTION 'Active state is required'; END IF;
  IF p_reason IS NULL OR length(BTRIM(p_reason)) NOT BETWEEN 3 AND 500 THEN
    RAISE EXCEPTION 'A specific account-state reason is required';
  END IF;
  SELECT is_active INTO v_before FROM public.profiles WHERE id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Profile not found'; END IF;
  UPDATE public.profiles SET is_active = p_is_active, updated_at = now() WHERE id = p_user_id;
  INSERT INTO public.admin_audit_log (admin_id, action, target_user_id, details)
  VALUES (p_admin_id, CASE WHEN p_is_active THEN 'account_unfrozen' ELSE 'account_frozen' END, p_user_id,
    jsonb_build_object('before', v_before, 'after', p_is_active, 'reason', BTRIM(p_reason)));
  RETURN jsonb_build_object('status', 'applied', 'is_active', p_is_active);
END;
$$;

CREATE OR REPLACE FUNCTION public.correct_profit_overcredit(
  p_profit_transaction_id UUID,
  p_corrected_amount NUMERIC,
  p_adjust_cash BOOLEAN,
  p_admin_id UUID,
  p_reason TEXT,
  p_request_key TEXT,
  p_confirmation TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_profit public.transactions%ROWTYPE;
  v_profile public.profiles%ROWTYPE;
  v_state public.profit_account_state%ROWTYPE;
  v_existing public.profit_correction_events%ROWTYPE;
  v_reason TEXT := BTRIM(COALESCE(p_reason, ''));
  v_removed NUMERIC(20,8);
  v_balance_before NUMERIC(20,8);
  v_balance_after NUMERIC(20,8);
  v_total_profit_before NUMERIC(20,8);
  v_total_profit_after NUMERIC(20,8);
  v_correction_id UUID := gen_random_uuid();
  v_transaction_key TEXT;
BEGIN
  IF p_profit_transaction_id IS NULL OR p_admin_id IS NULL THEN
    RAISE EXCEPTION 'A profit transaction and administrator are required';
  END IF;
  IF p_adjust_cash IS NULL THEN
    RAISE EXCEPTION 'Profit correction cash impact must be explicit';
  END IF;
  IF p_corrected_amount IS NULL
     OR p_corrected_amount < 0
     OR p_corrected_amount > 1000000000000
     OR round(p_corrected_amount, 8) <> p_corrected_amount THEN
    RAISE EXCEPTION 'Invalid corrected profit amount';
  END IF;
  IF length(v_reason) NOT BETWEEN 10 AND 500 OR v_reason ~ '[[:cntrl:]]' THEN
    RAISE EXCEPTION 'A specific profit correction reason is required';
  END IF;
  IF p_request_key IS NULL OR p_request_key !~ '^[A-Za-z0-9._:-]{8,128}$' THEN
    RAISE EXCEPTION 'Invalid profit correction request key';
  END IF;
  IF p_confirmation <> 'CORRECT PROFIT ' || p_profit_transaction_id::TEXT ||
    CASE WHEN p_adjust_cash THEN ' CASH' ELSE ' TOTAL ONLY' END THEN
    RAISE EXCEPTION 'Profit correction confirmation did not match the target transaction';
  END IF;
  IF NOT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = p_admin_id
      AND COALESCE(is_admin, false)
      AND COALESCE(is_active, false)
  ) THEN
    RAISE EXCEPTION 'A valid administrator is required';
  END IF;

  SELECT * INTO v_existing
  FROM public.profit_correction_events
  WHERE request_key = p_request_key;
  IF FOUND THEN
    IF v_existing.profit_transaction_id <> p_profit_transaction_id
       OR v_existing.corrected_amount <> p_corrected_amount
       OR v_existing.cash_impact <> p_adjust_cash
       OR v_existing.admin_id <> p_admin_id
       OR v_existing.reason <> v_reason THEN
      RAISE EXCEPTION 'Profit correction request key was reused with different details';
    END IF;
    RETURN jsonb_build_object(
      'status', 'already_applied',
      'event_id', v_existing.id,
      'profit_transaction_id', v_existing.profit_transaction_id,
      'correction_transaction_id', v_existing.correction_transaction_id,
      'removed_amount', v_existing.removed_amount,
      'balance_after', v_existing.cash_balance_after,
      'total_profit_after', v_existing.total_profit_after
    );
  END IF;

  SELECT * INTO v_profit
  FROM public.transactions
  WHERE id = p_profit_transaction_id
    AND type = 'profit'
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Profit transaction not found'; END IF;
  IF v_profit.status <> 'completed' OR v_profit.amount IS NULL OR v_profit.amount <= 0 THEN
    RAISE EXCEPTION 'Only a completed positive profit can be corrected';
  END IF;
  IF p_corrected_amount >= v_profit.amount THEN
    RAISE EXCEPTION 'Corrected amount must be less than the original profit amount';
  END IF;
  IF EXISTS (
    SELECT 1
    FROM public.profit_correction_events
    WHERE profit_transaction_id = p_profit_transaction_id
  ) THEN
    RAISE EXCEPTION 'This profit transaction already has a correction event';
  END IF;

  SELECT * INTO v_profile
  FROM public.profiles
  WHERE id = v_profit.user_id
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Profit profile not found'; END IF;

  IF p_adjust_cash THEN
    SELECT * INTO v_state
    FROM public.profit_account_state
    WHERE user_id = v_profit.user_id
    FOR UPDATE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Profit account state must be initialized before correcting a cash over-credit';
    END IF;
  END IF;

  v_removed := v_profit.amount - p_corrected_amount;
  v_balance_before := COALESCE(v_profile.balance, 0);
  v_total_profit_before := COALESCE(v_profile.total_profit, 0);
  IF p_adjust_cash AND v_balance_before < v_removed THEN
    RAISE EXCEPTION 'Cash balance is too low for this correction; manual reconciliation is required';
  END IF;
  IF v_total_profit_before < v_removed THEN
    RAISE EXCEPTION 'Total profit is too low for this correction; manual reconciliation is required';
  END IF;
  IF p_adjust_cash AND v_state.excluded_noncompounding_profit < v_removed THEN
    RAISE EXCEPTION 'Excluded non-compounding profit is too low for this correction';
  END IF;

  v_balance_after := CASE
    WHEN p_adjust_cash THEN v_balance_before - v_removed
    ELSE v_balance_before
  END;
  v_total_profit_after := v_total_profit_before - v_removed;
  v_transaction_key := 'profit-correction:' || p_request_key;

  UPDATE public.profiles
  SET balance = v_balance_after,
      total_profit = v_total_profit_after,
      updated_at = now()
  WHERE id = v_profit.user_id;

  IF p_adjust_cash THEN
    UPDATE public.profit_account_state
    SET excluded_noncompounding_profit = excluded_noncompounding_profit - v_removed,
        updated_at = now()
    WHERE user_id = v_profit.user_id;
  END IF;

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
    metadata
  ) VALUES (
    v_correction_id,
    v_profit.user_id,
    'adjustment_debit',
    v_removed,
    'USD',
    'completed',
    CASE
      WHEN p_adjust_cash THEN 'Profit ledger correction'
      ELSE 'Historical profit statistic correction'
    END,
    v_balance_before,
    v_balance_after,
    v_transaction_key,
    v_reason,
    jsonb_build_object(
      'profit_transaction_id', v_profit.id,
      'profit_date', v_profit.profit_date,
      'original_profit_amount', v_profit.amount,
      'corrected_profit_amount', p_corrected_amount,
      'removed_amount', v_removed,
      'cash_impact', p_adjust_cash,
      'admin_id', p_admin_id
    )
  );

  INSERT INTO public.profit_correction_events (
    request_key,
    user_id,
    profit_transaction_id,
    correction_transaction_id,
    original_amount,
    corrected_amount,
    removed_amount,
    cash_impact,
    cash_balance_before,
    cash_balance_after,
    total_profit_before,
    total_profit_after,
    admin_id,
    reason
  ) VALUES (
    p_request_key,
    v_profit.user_id,
    v_profit.id,
    v_correction_id,
    v_profit.amount,
    p_corrected_amount,
    v_removed,
    p_adjust_cash,
    v_balance_before,
    v_balance_after,
    v_total_profit_before,
    v_total_profit_after,
    p_admin_id,
    v_reason
  ) RETURNING * INTO v_existing;

  INSERT INTO public.admin_audit_log (admin_id, action, target_user_id, details)
  VALUES (
    p_admin_id,
    'profit_overcredit_corrected',
    v_profit.user_id,
    jsonb_build_object(
      'event_id', v_existing.id,
      'profit_transaction_id', v_profit.id,
      'correction_transaction_id', v_correction_id,
      'profit_date', v_profit.profit_date,
      'original_amount', v_profit.amount,
      'corrected_amount', p_corrected_amount,
      'removed_amount', v_removed,
      'cash_impact', p_adjust_cash,
      'balance_before', v_balance_before,
      'balance_after', v_balance_after,
      'total_profit_before', v_total_profit_before,
      'total_profit_after', v_total_profit_after,
      'reason', v_reason
    )
  );

  RETURN jsonb_build_object(
    'status', 'applied',
    'event_id', v_existing.id,
    'profit_transaction_id', v_profit.id,
    'correction_transaction_id', v_correction_id,
    'removed_amount', v_removed,
    'balance_after', v_balance_after,
    'total_profit_after', v_total_profit_after
  );
END;
$$;

REVOKE ALL ON FUNCTION public.apply_kyc_review(TEXT, UUID, TEXT, TEXT, TIMESTAMPTZ, TEXT, UUID, JSONB) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.adjust_user_balance(UUID, NUMERIC, TEXT, UUID, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_user_active_state(UUID, BOOLEAN, UUID, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.prevent_profit_correction_mutation() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.correct_profit_overcredit(UUID, NUMERIC, BOOLEAN, UUID, TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apply_kyc_review(TEXT, UUID, TEXT, TEXT, TIMESTAMPTZ, TEXT, UUID, JSONB) TO service_role;
GRANT EXECUTE ON FUNCTION public.adjust_user_balance(UUID, NUMERIC, TEXT, UUID, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.set_user_active_state(UUID, BOOLEAN, UUID, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.correct_profit_overcredit(UUID, NUMERIC, BOOLEAN, UUID, TEXT, TEXT, TEXT) TO service_role;

COMMIT;
