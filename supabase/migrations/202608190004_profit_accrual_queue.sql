BEGIN;

-- Profit rules are versioned data. This migration intentionally creates no
-- active policy: an authorised operator must first confirm the contract rate,
-- calendar, compounding rule, and effective date. Without one, the cron fails
-- closed and no account balance changes.
CREATE TABLE IF NOT EXISTS public.profit_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL CHECK (length(name) BETWEEN 1 AND 120),
  effective_from DATE NOT NULL,
  effective_to DATE,
  rate_period TEXT NOT NULL DEFAULT 'daily' CHECK (rate_period = 'daily'),
  accrual_calendar TEXT NOT NULL DEFAULT 'weekdays' CHECK (accrual_calendar = 'weekdays'),
  compounding_mode TEXT NOT NULL CHECK (compounding_mode IN ('always', 'never', 'user_preference')),
  basis_method TEXT NOT NULL DEFAULT 'cash_plus_position_cost'
    CHECK (basis_method = 'cash_plus_position_cost'),
  enabled BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (effective_to IS NULL OR effective_to >= effective_from)
);

-- Existing installations may already have this table with an older default.
-- A policy must never become active merely because enabled was omitted.
ALTER TABLE public.profit_policies
  ALTER COLUMN enabled SET DEFAULT false;

CREATE TABLE IF NOT EXISTS public.profit_policy_rates (
  policy_id UUID NOT NULL REFERENCES public.profit_policies(id) ON DELETE CASCADE,
  tier TEXT NOT NULL CHECK (tier IN ('bronze', 'silver', 'gold')),
  rate_percent NUMERIC(10,6) NOT NULL CHECK (rate_percent > 0 AND rate_percent <= 100),
  PRIMARY KEY (policy_id, tier)
);

ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS profit_date DATE;
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

-- Older jobs put the intended accrual date at the end of the description. Use
-- that evidence before falling back to created_at; batch catch-ups otherwise
-- appear to be duplicate profits on the day the batch was posted.
UPDATE public.transactions
SET profit_date = substring(
  description FROM '([0-9]{4}-[0-9]{2}-[0-9]{2})$'
)::DATE
WHERE type = 'profit'
  AND profit_date IS NULL
  AND description ~ '([0-9]{4}-[0-9]{2}-[0-9]{2})$';

UPDATE public.transactions
SET profit_date = (created_at AT TIME ZONE 'UTC')::date
WHERE type = 'profit' AND profit_date IS NULL;

-- Give historical profit rows a stable UTC accrual date before uniqueness is
-- enforced. Stop for manual review if the old ledger already has more than one
-- profit row for the same account/day; guessing which duplicate is valid could
-- silently preserve an over-credit.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.transactions
    WHERE type = 'profit'
    GROUP BY user_id, COALESCE(profit_date, (created_at AT TIME ZONE 'UTC')::date)
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'Duplicate historical profit rows require reconciliation before this migration can continue';
  END IF;
END;
$$;

ALTER TABLE public.transactions
  DROP CONSTRAINT IF EXISTS transactions_profit_weekdays_only;
ALTER TABLE public.transactions
  DROP CONSTRAINT IF EXISTS transactions_profit_date_required;
ALTER TABLE public.transactions
  ADD CONSTRAINT transactions_profit_date_required CHECK (
    type <> 'profit'
    OR profit_date IS NOT NULL
  ) NOT VALID;

CREATE UNIQUE INDEX IF NOT EXISTS transactions_user_profit_date_unique
  ON public.transactions (user_id, profit_date)
  WHERE type = 'profit' AND profit_date IS NOT NULL;

CREATE OR REPLACE FUNCTION public.prevent_overlapping_profit_policies()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF NEW.enabled AND EXISTS (
    SELECT 1
    FROM public.profit_policies existing
    WHERE existing.enabled
      AND existing.id <> NEW.id
      AND daterange(
        existing.effective_from,
        COALESCE(existing.effective_to + 1, 'infinity'::date),
        '[)'
      ) && daterange(
        NEW.effective_from,
        COALESCE(NEW.effective_to + 1, 'infinity'::date),
        '[)'
      )
  ) THEN
    RAISE EXCEPTION 'Enabled profit policies cannot have overlapping effective dates';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profit_policies_no_overlap ON public.profit_policies;
CREATE TRIGGER profit_policies_no_overlap
  BEFORE INSERT OR UPDATE ON public.profit_policies
  FOR EACH ROW EXECUTE FUNCTION public.prevent_overlapping_profit_policies();

CREATE TABLE IF NOT EXISTS public.profit_account_state (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  excluded_noncompounding_profit NUMERIC(20,8) NOT NULL DEFAULT 0
    CHECK (excluded_noncompounding_profit >= 0),
  initial_excluded_noncompounding_profit NUMERIC(20,8) NOT NULL DEFAULT 0
    CHECK (initial_excluded_noncompounding_profit >= 0),
  initialized_by UUID REFERENCES public.profiles(id),
  initialization_reason TEXT,
  initialization_request_key TEXT UNIQUE,
  initialized_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.profit_account_state_baselines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_key TEXT NOT NULL UNIQUE,
  user_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE RESTRICT,
  excluded_noncompounding_profit NUMERIC(20,8) NOT NULL
    CHECK (excluded_noncompounding_profit >= 0),
  admin_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  reason TEXT NOT NULL CHECK (length(reason) BETWEEN 10 AND 500),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.prevent_profit_baseline_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  RAISE EXCEPTION 'Profit account baselines are immutable';
END;
$$;

DROP TRIGGER IF EXISTS profit_account_baselines_immutable
  ON public.profit_account_state_baselines;
CREATE TRIGGER profit_account_baselines_immutable
  BEFORE UPDATE OR DELETE ON public.profit_account_state_baselines
  FOR EACH ROW EXECUTE FUNCTION public.prevent_profit_baseline_mutation();

CREATE TABLE IF NOT EXISTS public.profit_accruals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id),
  profit_date DATE NOT NULL,
  policy_id UUID NOT NULL REFERENCES public.profit_policies(id),
  tier TEXT NOT NULL,
  stated_rate_percent NUMERIC(10,6) NOT NULL,
  effective_rate_percent NUMERIC(12,8) NOT NULL,
  rate_period TEXT NOT NULL,
  accrual_calendar TEXT NOT NULL,
  compounding_applied BOOLEAN NOT NULL,
  cash_basis NUMERIC(20,8) NOT NULL,
  crypto_cost_basis NUMERIC(20,8) NOT NULL,
  stock_cost_basis NUMERIC(20,8) NOT NULL,
  excluded_profit_basis NUMERIC(20,8) NOT NULL,
  eligible_basis NUMERIC(20,8) NOT NULL,
  profit_amount NUMERIC(20,8) NOT NULL CHECK (profit_amount >= 0),
  cash_balance_before NUMERIC(20,8) NOT NULL,
  cash_balance_after NUMERIC(20,8) NOT NULL,
  total_profit_after NUMERIC(20,8) NOT NULL,
  transaction_id UUID NOT NULL REFERENCES public.transactions(id),
  source TEXT NOT NULL CHECK (length(source) BETWEEN 1 AND 80),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, profit_date)
);

CREATE TABLE IF NOT EXISTS public.profit_accrual_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id),
  profit_date DATE NOT NULL,
  policy_id UUID NOT NULL REFERENCES public.profit_policies(id),
  basis_override NUMERIC(20,8),
  source TEXT NOT NULL DEFAULT 'scheduled',
  email_mode TEXT NOT NULL DEFAULT 'daily' CHECK (email_mode IN ('daily', 'none')),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'succeeded', 'failed')),
  attempts INTEGER NOT NULL DEFAULT 0,
  next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  locked_at TIMESTAMPTZ,
  lease_id UUID,
  last_error TEXT,
  result JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, profit_date)
);

ALTER TABLE public.profit_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profit_policy_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profit_account_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profit_account_state_baselines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profit_accruals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profit_accrual_jobs ENABLE ROW LEVEL SECURITY;

REVOKE ALL PRIVILEGES ON TABLE public.profit_policies FROM PUBLIC, anon, authenticated;
REVOKE ALL PRIVILEGES ON TABLE public.profit_policy_rates FROM PUBLIC, anon, authenticated;
REVOKE ALL PRIVILEGES ON TABLE public.profit_account_state FROM PUBLIC, anon, authenticated;
REVOKE ALL PRIVILEGES ON TABLE public.profit_account_state_baselines FROM PUBLIC, anon, authenticated;
REVOKE ALL PRIVILEGES ON TABLE public.profit_accruals FROM PUBLIC, anon, authenticated;
REVOKE ALL PRIVILEGES ON TABLE public.profit_accrual_jobs FROM PUBLIC, anon, authenticated;
GRANT ALL PRIVILEGES ON TABLE public.profit_policies TO service_role;
GRANT ALL PRIVILEGES ON TABLE public.profit_policy_rates TO service_role;
GRANT ALL PRIVILEGES ON TABLE public.profit_account_state TO service_role;
GRANT SELECT ON TABLE public.profit_account_state_baselines TO service_role;
GRANT ALL PRIVILEGES ON TABLE public.profit_accruals TO service_role;
GRANT ALL PRIVILEGES ON TABLE public.profit_accrual_jobs TO service_role;

CREATE OR REPLACE FUNCTION public.initialize_profit_account_state(
  p_user_id UUID,
  p_excluded_noncompounding_profit NUMERIC,
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
  v_profile public.profiles%ROWTYPE;
  v_existing public.profit_account_state_baselines%ROWTYPE;
  v_reason TEXT := BTRIM(COALESCE(p_reason, ''));
  v_account_cost NUMERIC(20,8);
BEGIN
  IF p_user_id IS NULL OR p_admin_id IS NULL THEN
    RAISE EXCEPTION 'A user and administrator are required';
  END IF;
  IF p_excluded_noncompounding_profit IS NULL
     OR p_excluded_noncompounding_profit < 0
     OR p_excluded_noncompounding_profit > 1000000000000
     OR round(p_excluded_noncompounding_profit, 8) <> p_excluded_noncompounding_profit THEN
    RAISE EXCEPTION 'Invalid excluded non-compounding profit baseline';
  END IF;
  IF length(v_reason) NOT BETWEEN 10 AND 500 OR v_reason ~ '[[:cntrl:]]' THEN
    RAISE EXCEPTION 'A specific baseline reason is required';
  END IF;
  IF p_request_key IS NULL OR p_request_key !~ '^[A-Za-z0-9._:-]{8,128}$' THEN
    RAISE EXCEPTION 'Invalid baseline request key';
  END IF;
  IF p_confirmation <> 'INITIALIZE PROFIT STATE ' || p_user_id::TEXT THEN
    RAISE EXCEPTION 'Profit state confirmation did not match the target user';
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
  FROM public.profit_account_state_baselines
  WHERE request_key = p_request_key;
  IF FOUND THEN
    IF v_existing.user_id <> p_user_id
       OR v_existing.excluded_noncompounding_profit <> p_excluded_noncompounding_profit
       OR v_existing.admin_id <> p_admin_id
       OR v_existing.reason <> v_reason THEN
      RAISE EXCEPTION 'Baseline request key was reused with different details';
    END IF;
    RETURN jsonb_build_object(
      'status', 'already_initialized',
      'baseline_id', v_existing.id,
      'user_id', v_existing.user_id,
      'excluded_noncompounding_profit', v_existing.excluded_noncompounding_profit
    );
  END IF;

  SELECT * INTO v_profile
  FROM public.profiles
  WHERE id = p_user_id
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Profile not found'; END IF;

  IF EXISTS (SELECT 1 FROM public.profit_account_state WHERE user_id = p_user_id) THEN
    RAISE EXCEPTION 'Profit account state already exists; it cannot be re-baselined';
  END IF;
  IF p_excluded_noncompounding_profit > COALESCE(v_profile.total_profit, 0) THEN
    RAISE EXCEPTION 'Excluded baseline exceeds the account total profit';
  END IF;

  SELECT COALESCE(v_profile.balance, 0)
       + COALESCE((
           SELECT sum(qty * avg_price)
           FROM public.crypto_positions
           WHERE user_id = p_user_id
         ), 0)
       + COALESCE((
           SELECT sum(qty * avg_price)
           FROM public.stock_positions
           WHERE user_id = p_user_id
         ), 0)
  INTO v_account_cost;
  IF p_excluded_noncompounding_profit > v_account_cost THEN
    RAISE EXCEPTION 'Excluded baseline exceeds the current account cost';
  END IF;

  INSERT INTO public.profit_account_state (
    user_id,
    excluded_noncompounding_profit,
    initial_excluded_noncompounding_profit,
    initialized_by,
    initialization_reason,
    initialization_request_key,
    initialized_at,
    updated_at
  ) VALUES (
    p_user_id,
    p_excluded_noncompounding_profit,
    p_excluded_noncompounding_profit,
    p_admin_id,
    v_reason,
    p_request_key,
    now(),
    now()
  );

  INSERT INTO public.profit_account_state_baselines (
    request_key,
    user_id,
    excluded_noncompounding_profit,
    admin_id,
    reason
  ) VALUES (
    p_request_key,
    p_user_id,
    p_excluded_noncompounding_profit,
    p_admin_id,
    v_reason
  ) RETURNING * INTO v_existing;

  RETURN jsonb_build_object(
    'status', 'initialized',
    'baseline_id', v_existing.id,
    'user_id', p_user_id,
    'excluded_noncompounding_profit', p_excluded_noncompounding_profit
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.manage_withdrawal_profit_state()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_state public.profit_account_state%ROWTYPE;
  v_profile public.profiles%ROWTYPE;
  v_policy_mode TEXT;
  v_compounds BOOLEAN := true;
  v_removed NUMERIC(20,8) := 0;
  v_removed_text TEXT;
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.type <> 'withdrawal' OR NEW.status <> 'pending' THEN
      RETURN NEW;
    END IF;

    SELECT * INTO v_state
    FROM public.profit_account_state
    WHERE user_id = NEW.user_id
    FOR UPDATE;

    IF NOT FOUND THEN
      SELECT * INTO v_profile
      FROM public.profiles
      WHERE id = NEW.user_id
      FOR UPDATE;
      IF NOT FOUND THEN RAISE EXCEPTION 'Withdrawal profile not found'; END IF;

      SELECT compounding_mode INTO v_policy_mode
      FROM public.profit_policies
      WHERE enabled
        AND effective_from <= CURRENT_DATE
        AND (effective_to IS NULL OR effective_to >= CURRENT_DATE)
      ORDER BY effective_from DESC
      LIMIT 1;

      IF FOUND THEN
        v_compounds := v_policy_mode = 'always'
          OR (v_policy_mode = 'user_preference' AND COALESCE(v_profile.auto_compound, false));
      END IF;

      IF NOT v_compounds AND COALESCE(v_profile.total_profit, 0) <> 0 THEN
        RAISE EXCEPTION 'Profit account state must be initialized before a non-compounding withdrawal';
      END IF;

      IF NOT v_compounds THEN
        INSERT INTO public.profit_account_state (
          user_id,
          excluded_noncompounding_profit,
          initial_excluded_noncompounding_profit,
          initialization_reason,
          initialized_at,
          updated_at
        ) VALUES (
          NEW.user_id,
          0,
          0,
          'Automatic zero baseline: account has no historical profit',
          now(),
          now()
        )
        ON CONFLICT (user_id) DO NOTHING;
      END IF;
    ELSE
      v_removed := least(COALESCE(NEW.amount, 0), v_state.excluded_noncompounding_profit);
      IF v_removed > 0 THEN
        UPDATE public.profit_account_state
        SET excluded_noncompounding_profit = excluded_noncompounding_profit - v_removed,
            updated_at = now()
        WHERE user_id = NEW.user_id;
      END IF;
    END IF;

    NEW.metadata := COALESCE(NEW.metadata, '{}'::jsonb) || jsonb_build_object(
      'profit_state_version', 1,
      'noncompounding_profit_removed', v_removed
    );
    RETURN NEW;
  END IF;

  IF OLD.type <> 'withdrawal' OR NEW.type <> 'withdrawal' THEN
    RETURN NEW;
  END IF;

  IF (NEW.metadata ->> 'noncompounding_profit_removed') IS DISTINCT FROM
     (OLD.metadata ->> 'noncompounding_profit_removed') THEN
    RAISE EXCEPTION 'Withdrawal non-compounding profit reservation is immutable';
  END IF;
  IF (OLD.metadata ? 'noncompounding_profit_restored') AND (
    (NEW.metadata ->> 'noncompounding_profit_restored') IS DISTINCT FROM
      (OLD.metadata ->> 'noncompounding_profit_restored')
    OR (NEW.metadata ->> 'noncompounding_profit_restored_at') IS DISTINCT FROM
      (OLD.metadata ->> 'noncompounding_profit_restored_at')
  ) THEN
    RAISE EXCEPTION 'Withdrawal non-compounding profit restoration is immutable';
  END IF;

  IF OLD.status IN ('pending', 'processing')
     AND NEW.status = 'failed'
     AND NOT (OLD.metadata ? 'noncompounding_profit_restored') THEN
    v_removed_text := COALESCE(OLD.metadata ->> 'noncompounding_profit_removed', '0');
    IF v_removed_text !~ '^[0-9]+([.][0-9]+)?$' THEN
      RAISE EXCEPTION 'Withdrawal profit reservation is invalid';
    END IF;
    v_removed := v_removed_text::NUMERIC;
    IF v_removed < 0 OR v_removed > COALESCE(OLD.amount, 0) THEN
      RAISE EXCEPTION 'Withdrawal profit reservation is out of range';
    END IF;

    IF v_removed > 0 THEN
      UPDATE public.profit_account_state
      SET excluded_noncompounding_profit = excluded_noncompounding_profit + v_removed,
          updated_at = now()
      WHERE user_id = OLD.user_id;
      IF NOT FOUND THEN
        RAISE EXCEPTION 'Profit account state is missing during withdrawal restoration';
      END IF;
    END IF;

    NEW.metadata := COALESCE(NEW.metadata, '{}'::jsonb) || jsonb_build_object(
      'noncompounding_profit_restored', v_removed,
      'noncompounding_profit_restored_at', now()
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS withdrawal_profit_state_on_insert ON public.transactions;
CREATE TRIGGER withdrawal_profit_state_on_insert
  BEFORE INSERT ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.manage_withdrawal_profit_state();
DROP TRIGGER IF EXISTS withdrawal_profit_state_on_update ON public.transactions;
CREATE TRIGGER withdrawal_profit_state_on_update
  BEFORE UPDATE ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.manage_withdrawal_profit_state();

CREATE OR REPLACE FUNCTION public.accrue_daily_profit(
  p_user_id UUID,
  p_profit_date DATE,
  p_policy_id UUID,
  p_basis_override NUMERIC DEFAULT NULL,
  p_source TEXT DEFAULT 'scheduled',
  p_email_mode TEXT DEFAULT 'daily',
  p_dry_run BOOLEAN DEFAULT false
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_profile public.profiles%ROWTYPE;
  v_policy public.profit_policies%ROWTYPE;
  v_existing public.profit_accruals%ROWTYPE;
  v_existing_transaction public.transactions%ROWTYPE;
  v_rate NUMERIC(10,6);
  v_effective_rate NUMERIC(12,8);
  v_cash NUMERIC(20,8);
  v_crypto NUMERIC(20,8);
  v_stock NUMERIC(20,8);
  v_account_cost NUMERIC(20,8);
  v_excluded NUMERIC(20,8) := 0;
  v_basis NUMERIC(20,8);
  v_profit NUMERIC(20,8);
  v_cash_after NUMERIC(20,8);
  v_total_profit_after NUMERIC(20,8);
  v_compound BOOLEAN;
  v_transaction_id UUID;
  v_accrual_id UUID;
  v_dedupe_key TEXT;
BEGIN
  IF p_profit_date IS NULL OR p_profit_date > CURRENT_DATE THEN
    RAISE EXCEPTION 'Profit date must be today or earlier';
  END IF;
  IF p_basis_override IS NOT NULL AND p_basis_override < 0 THEN
    RAISE EXCEPTION 'Basis override cannot be negative';
  END IF;
  IF p_source IS NULL OR length(p_source) NOT BETWEEN 1 AND 80 THEN
    RAISE EXCEPTION 'Invalid profit source';
  END IF;
  IF p_email_mode NOT IN ('daily', 'none') THEN
    RAISE EXCEPTION 'Invalid email mode';
  END IF;

  SELECT * INTO v_policy
  FROM public.profit_policies
  WHERE id = p_policy_id
    AND enabled
    AND effective_from <= p_profit_date
    AND (effective_to IS NULL OR effective_to >= p_profit_date);
  IF NOT FOUND THEN RAISE EXCEPTION 'No applicable enabled profit policy'; END IF;

  IF extract(isodow FROM p_profit_date) IN (6, 7) THEN
    RETURN jsonb_build_object('status', 'not_an_accrual_day', 'profit_date', p_profit_date);
  END IF;

  SELECT * INTO v_profile
  FROM public.profiles
  WHERE id = p_user_id
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Profile not found'; END IF;
  IF NOT COALESCE(v_profile.is_active, false) THEN
    RETURN jsonb_build_object('status', 'inactive', 'profit_date', p_profit_date);
  END IF;

  SELECT * INTO v_existing
  FROM public.profit_accruals
  WHERE user_id = p_user_id AND profit_date = p_profit_date;
  IF FOUND THEN
    RETURN jsonb_build_object(
      'status', 'already_accrued',
      'accrual_id', v_existing.id,
      'profit_date', v_existing.profit_date,
      'amount', v_existing.profit_amount,
      'basis', v_existing.eligible_basis,
      'effective_rate_percent', v_existing.effective_rate_percent
    );
  END IF;

  -- Historical rows predate profit_accruals. Their normalized profit_date and
  -- the partial unique index are the authoritative duplicate guard.
  SELECT * INTO v_existing_transaction
  FROM public.transactions
  WHERE user_id = p_user_id
    AND type = 'profit'
    AND profit_date = p_profit_date
  LIMIT 1;
  IF FOUND THEN
    RETURN jsonb_build_object(
      'status', 'legacy_profit_exists',
      'transaction_id', v_existing_transaction.id,
      'profit_date', v_existing_transaction.profit_date,
      'amount', v_existing_transaction.amount
    );
  END IF;

  SELECT rate_percent INTO v_rate
  FROM public.profit_policy_rates
  WHERE policy_id = v_policy.id AND tier = lower(COALESCE(v_profile.tier, 'bronze'));
  IF NOT FOUND THEN RAISE EXCEPTION 'Profit policy has no rate for user tier'; END IF;

  v_effective_rate := v_rate;

  v_cash := COALESCE(v_profile.balance, 0);
  SELECT COALESCE(sum(qty * avg_price), 0) INTO v_crypto
  FROM public.crypto_positions WHERE user_id = p_user_id;
  SELECT COALESCE(sum(qty * avg_price), 0) INTO v_stock
  FROM public.stock_positions WHERE user_id = p_user_id;
  v_account_cost := v_cash + v_crypto + v_stock;

  v_compound := v_policy.compounding_mode = 'always'
    OR (v_policy.compounding_mode = 'user_preference' AND COALESCE(v_profile.auto_compound, false));
  IF NOT v_compound THEN
    SELECT excluded_noncompounding_profit INTO v_excluded
    FROM public.profit_account_state
    WHERE user_id = p_user_id
    FOR UPDATE;

    IF NOT FOUND THEN
      IF COALESCE(v_profile.total_profit, 0) <> 0 THEN
        RAISE EXCEPTION 'Profit account state is missing; reconcile historical profit before non-compounding accrual';
      END IF;

      -- A preview must remain read-only. The first real accrual establishes an
      -- explicit known-zero state; historical profit is never guessed or seeded.
      v_excluded := 0;
      IF NOT p_dry_run THEN
        INSERT INTO public.profit_account_state (
          user_id,
          excluded_noncompounding_profit,
          initial_excluded_noncompounding_profit,
          initialization_reason,
          initialized_at,
          updated_at
        ) VALUES (
          p_user_id,
          0,
          0,
          'Automatic zero baseline: account has no historical profit',
          now(),
          now()
        )
        ON CONFLICT (user_id) DO NOTHING;
      END IF;
    END IF;
  END IF;

  v_basis := COALESCE(p_basis_override, greatest(v_account_cost - v_excluded, 0));
  IF v_basis <= 0 THEN
    RETURN jsonb_build_object('status', 'no_eligible_basis', 'profit_date', p_profit_date);
  END IF;

  v_profit := round(v_basis * (v_effective_rate / 100), 8);
  v_cash_after := v_cash + v_profit;
  v_total_profit_after := COALESCE(v_profile.total_profit, 0) + v_profit;

  IF p_dry_run THEN
    RETURN jsonb_build_object(
      'status', 'preview',
      'profit_date', p_profit_date,
      'tier', lower(COALESCE(v_profile.tier, 'bronze')),
      'stated_rate_percent', v_rate,
      'effective_rate_percent', v_effective_rate,
      'rate_period', v_policy.rate_period,
      'accrual_calendar', v_policy.accrual_calendar,
      'compounding_applied', v_compound,
      'cash_basis', v_cash,
      'crypto_cost_basis', v_crypto,
      'stock_cost_basis', v_stock,
      'excluded_profit_basis', v_excluded,
      'eligible_basis', v_basis,
      'amount', v_profit,
      'cash_balance_after', v_cash_after,
      'total_profit_after', v_total_profit_after
    );
  END IF;

  UPDATE public.profiles
  SET balance = v_cash_after,
      total_profit = v_total_profit_after,
      updated_at = now()
  WHERE id = p_user_id;

  IF NOT v_compound THEN
    INSERT INTO public.profit_account_state (user_id, excluded_noncompounding_profit, updated_at)
    VALUES (p_user_id, v_profit, now())
    ON CONFLICT (user_id) DO UPDATE
    SET excluded_noncompounding_profit = public.profit_account_state.excluded_noncompounding_profit + EXCLUDED.excluded_noncompounding_profit,
        updated_at = now();
  END IF;

  v_transaction_id := gen_random_uuid();
  v_dedupe_key := 'daily-profit/' || p_user_id || '/' || p_profit_date;
  INSERT INTO public.transactions (
    id, user_id, type, amount, asset, status, description,
    balance_before, balance_after, idempotency_key, metadata, profit_date
  ) VALUES (
    v_transaction_id,
    p_user_id,
    'profit',
    v_profit,
    'USD',
    'completed',
    'Daily profit accrual for ' || p_profit_date,
    v_cash,
    v_cash_after,
    v_dedupe_key,
    jsonb_build_object(
      'profit_date', p_profit_date,
      'policy_id', v_policy.id,
      'eligible_basis', v_basis,
      'stated_rate_percent', v_rate,
      'effective_rate_percent', v_effective_rate,
      'rate_period', v_policy.rate_period,
      'accrual_calendar', v_policy.accrual_calendar,
      'compounding_applied', v_compound,
      'source', p_source
    ),
    p_profit_date
  );

  INSERT INTO public.profit_accruals (
    user_id, profit_date, policy_id, tier, stated_rate_percent,
    effective_rate_percent, rate_period, accrual_calendar,
    compounding_applied, cash_basis, crypto_cost_basis, stock_cost_basis,
    excluded_profit_basis, eligible_basis, profit_amount,
    cash_balance_before, cash_balance_after, total_profit_after,
    transaction_id, source
  ) VALUES (
    p_user_id, p_profit_date, v_policy.id, lower(COALESCE(v_profile.tier, 'bronze')), v_rate,
    v_effective_rate, v_policy.rate_period, v_policy.accrual_calendar,
    v_compound, v_cash, v_crypto, v_stock,
    v_excluded, v_basis, v_profit,
    v_cash, v_cash_after, v_total_profit_after,
    v_transaction_id, p_source
  ) RETURNING id INTO v_accrual_id;

  INSERT INTO public.notifications (
    user_id, type, title, description, body, link, metadata, dedupe_key
  ) VALUES (
    p_user_id,
    'profit',
    'Weekday profit credited',
    '$' || to_char(v_profit, 'FM999999999999990.00') || ' has been credited to your cash balance.',
    'Your profit for ' || p_profit_date || ' was posted under policy "' || v_policy.name || '".',
    '/dashboard/transactions',
    jsonb_build_object(
      'profit_date', p_profit_date,
      'policy_id', v_policy.id,
      'tier', lower(COALESCE(v_profile.tier, 'bronze')),
      'effective_rate_percent', v_effective_rate,
      'eligible_basis', v_basis,
      'profit', v_profit,
      'cash_balance_after', v_cash_after
    ),
    v_dedupe_key
  ) ON CONFLICT (dedupe_key) DO NOTHING;

  IF p_email_mode = 'daily' AND COALESCE(
    (SELECT daily_profit_email FROM public.notification_preferences WHERE user_id = p_user_id),
    true
  ) THEN
    INSERT INTO public.email_outbox (dedupe_key, user_id, template, to_email, payload)
    VALUES (
      v_dedupe_key,
      p_user_id,
      'daily_profit',
      v_profile.email,
      jsonb_build_object(
        'name', COALESCE(v_profile.full_name, 'Investor'),
        'amount', v_profit,
        'percentage', v_effective_rate,
        'total_earned', v_total_profit_after,
        'balance', v_account_cost + v_profit,
        'profit_date', p_profit_date,
        'compounding_applied', v_compound,
        'policy_name', v_policy.name
      )
    ) ON CONFLICT (dedupe_key) DO NOTHING;
  END IF;

  RETURN jsonb_build_object(
    'status', 'accrued',
    'accrual_id', v_accrual_id,
    'transaction_id', v_transaction_id,
    'profit_date', p_profit_date,
    'amount', v_profit,
    'basis', v_basis,
    'effective_rate_percent', v_effective_rate,
    'cash_balance_after', v_cash_after,
    'total_profit_after', v_total_profit_after
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.enqueue_daily_profit_jobs(
  p_profit_date DATE,
  p_policy_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_policy public.profit_policies%ROWTYPE;
  v_count INTEGER;
BEGIN
  SELECT * INTO v_policy
  FROM public.profit_policies
  WHERE id = p_policy_id
    AND enabled
    AND effective_from <= p_profit_date
    AND (effective_to IS NULL OR effective_to >= p_profit_date);
  IF NOT FOUND THEN RAISE EXCEPTION 'No applicable enabled profit policy'; END IF;

  IF extract(isodow FROM p_profit_date) IN (6, 7) THEN
    RETURN jsonb_build_object('queued', 0, 'status', 'not_an_accrual_day');
  END IF;

  INSERT INTO public.profit_accrual_jobs (user_id, profit_date, policy_id, source)
  SELECT id, p_profit_date, p_policy_id, 'scheduled'
  FROM public.profiles
  WHERE COALESCE(is_active, false)
  ON CONFLICT (user_id, profit_date) DO NOTHING;
  GET DIAGNOSTICS v_count = ROW_COUNT;

  RETURN jsonb_build_object('queued', v_count, 'status', 'queued');
END;
$$;

CREATE OR REPLACE FUNCTION public.reconcile_profit_accruals(
  p_user_id UUID,
  p_policy_id UUID,
  p_dates JSONB,
  p_basis_overrides JSONB,
  p_execute BOOLEAN,
  p_send_summary BOOLEAN,
  p_admin_id UUID,
  p_confirmation TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_count INTEGER;
  v_unique_count INTEGER;
  v_date DATE;
  v_start_date DATE;
  v_end_date DATE;
  v_basis_text TEXT;
  v_basis NUMERIC;
  v_result JSONB;
  v_results JSONB := '[]'::jsonb;
  v_total NUMERIC(20,8) := 0;
  v_posted_count INTEGER := 0;
  v_profile public.profiles%ROWTYPE;
  v_summary_key TEXT;
BEGIN
  IF p_admin_id IS NULL OR NOT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = p_admin_id
      AND COALESCE(is_admin, false)
      AND COALESCE(is_active, false)
  ) THEN
    RAISE EXCEPTION 'A valid administrator is required';
  END IF;
  IF p_dates IS NULL OR jsonb_typeof(p_dates) <> 'array' THEN
    RAISE EXCEPTION 'Dates must be a JSON array';
  END IF;
  v_count := jsonb_array_length(p_dates);
  IF v_count < 1 OR v_count > 31 THEN
    RAISE EXCEPTION 'A reconciliation must include between 1 and 31 dates';
  END IF;
  SELECT count(DISTINCT value) INTO v_unique_count FROM jsonb_array_elements_text(p_dates);
  IF v_unique_count <> v_count THEN RAISE EXCEPTION 'Duplicate dates are not allowed'; END IF;
  IF p_execute AND p_confirmation <> 'POST ' || v_count || ' PROFIT ACCRUALS' THEN
    RAISE EXCEPTION 'Execution confirmation did not match the requested date count';
  END IF;

  FOR v_date IN
    SELECT value::DATE
    FROM jsonb_array_elements_text(p_dates)
    ORDER BY value::DATE
  LOOP
    IF v_date > CURRENT_DATE THEN RAISE EXCEPTION 'Future profit dates are not allowed'; END IF;
    IF extract(isodow FROM v_date) IN (6, 7) THEN
      RAISE EXCEPTION 'Weekend profit dates are not allowed: %', v_date;
    END IF;
    v_start_date := COALESCE(v_start_date, v_date);
    v_end_date := v_date;
    v_basis_text := COALESCE(p_basis_overrides, '{}'::jsonb) ->> v_date::TEXT;
    IF v_basis_text IS NULL THEN
      RAISE EXCEPTION 'Historical reconciliation requires an explicit basis for %', v_date;
    END IF;
    IF v_basis_text !~ '^[0-9]+([.][0-9]+)?$' THEN
      RAISE EXCEPTION 'Invalid basis override for %', v_date;
    END IF;
    v_basis := v_basis_text::NUMERIC;

    SELECT public.accrue_daily_profit(
      p_user_id,
      v_date,
      p_policy_id,
      v_basis,
      'admin_reconciliation:' || p_admin_id,
      'none',
      NOT p_execute
    ) INTO v_result;
    v_results := v_results || jsonb_build_array(v_result);

    IF (v_result ->> 'status') IN ('preview', 'accrued') THEN
      v_total := v_total + COALESCE((v_result ->> 'amount')::NUMERIC, 0);
    END IF;
    IF v_result ->> 'status' = 'accrued' THEN
      v_posted_count := v_posted_count + 1;
    END IF;
  END LOOP;

  IF p_execute AND p_send_summary AND v_posted_count > 0 THEN
    SELECT * INTO v_profile FROM public.profiles WHERE id = p_user_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Profile not found after reconciliation'; END IF;
    v_summary_key := 'profit-reconciliation/' || p_user_id || '/' || md5(p_policy_id::TEXT || p_dates::TEXT);

    INSERT INTO public.email_outbox (dedupe_key, user_id, template, to_email, payload)
    VALUES (
      v_summary_key,
      p_user_id,
      'profit_reconciliation',
      v_profile.email,
      jsonb_build_object(
        'name', COALESCE(v_profile.full_name, 'Investor'),
        'total_amount', v_total,
        'start_date', v_start_date,
        'end_date', v_end_date,
        'day_count', v_posted_count,
        'cash_balance', COALESCE(v_profile.balance, 0)
      )
    ) ON CONFLICT (dedupe_key) DO NOTHING;

    INSERT INTO public.notifications (
      user_id, type, title, description, body, link, metadata, dedupe_key
    ) VALUES (
      p_user_id,
      'profit',
      'Missing profit accruals corrected',
      '$' || to_char(v_total, 'FM999999999999990.00') || ' was credited across ' || v_posted_count || ' dated accruals.',
      'The correction is complete. Each date has a separate ledger entry and duplicate protection.',
      '/dashboard/transactions',
      jsonb_build_object(
        'total_amount', v_total,
        'start_date', v_start_date,
        'end_date', v_end_date,
        'day_count', v_posted_count,
        'admin_id', p_admin_id
      ),
      v_summary_key
    ) ON CONFLICT (dedupe_key) DO NOTHING;
  END IF;

  RETURN jsonb_build_object(
    'mode', CASE WHEN p_execute THEN 'executed' ELSE 'preview' END,
    'requested_dates', v_count,
    'posted_dates', v_posted_count,
    'total_amount', v_total,
    'results', v_results
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.claim_profit_accrual_jobs(
  p_worker_id UUID,
  p_limit INTEGER DEFAULT 20
)
RETURNS SETOF public.profit_accrual_jobs
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  WITH candidates AS (
    SELECT id
    FROM public.profit_accrual_jobs
    WHERE (
        status IN ('pending', 'failed')
        OR (status = 'processing' AND (locked_at IS NULL OR locked_at < now() - interval '10 minutes'))
      )
      AND next_attempt_at <= now()
    ORDER BY profit_date, created_at
    FOR UPDATE SKIP LOCKED
    LIMIT LEAST(GREATEST(p_limit, 1), 100)
  )
  UPDATE public.profit_accrual_jobs AS job
  SET status = 'processing',
      attempts = job.attempts + 1,
      lease_id = p_worker_id,
      locked_at = now(),
      updated_at = now(),
      last_error = NULL
  FROM candidates
  WHERE job.id = candidates.id
  RETURNING job.*;
$$;

REVOKE ALL ON FUNCTION public.prevent_overlapping_profit_policies() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.prevent_profit_baseline_mutation() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.initialize_profit_account_state(UUID, NUMERIC, UUID, TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.manage_withdrawal_profit_state() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.accrue_daily_profit(UUID, DATE, UUID, NUMERIC, TEXT, TEXT, BOOLEAN) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.enqueue_daily_profit_jobs(DATE, UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.reconcile_profit_accruals(UUID, UUID, JSONB, JSONB, BOOLEAN, BOOLEAN, UUID, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.claim_profit_accrual_jobs(UUID, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.accrue_daily_profit(UUID, DATE, UUID, NUMERIC, TEXT, TEXT, BOOLEAN) TO service_role;
GRANT EXECUTE ON FUNCTION public.initialize_profit_account_state(UUID, NUMERIC, UUID, TEXT, TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.enqueue_daily_profit_jobs(DATE, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.reconcile_profit_accruals(UUID, UUID, JSONB, JSONB, BOOLEAN, BOOLEAN, UUID, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.claim_profit_accrual_jobs(UUID, INTEGER) TO service_role;

COMMIT;
