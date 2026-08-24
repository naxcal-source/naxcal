BEGIN;

ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE OR REPLACE FUNCTION public.execute_stock_buy(
  p_user_id UUID,
  p_symbol TEXT,
  p_amount_usd NUMERIC,
  p_price_usd NUMERIC,
  p_idempotency_key TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_profile public.profiles%ROWTYPE;
  v_position public.stock_positions%ROWTYPE;
  v_existing public.transactions%ROWTYPE;
  v_symbol TEXT := upper(btrim(COALESCE(p_symbol, '')));
  v_request JSONB;
  v_tx_key TEXT := 'stock-buy:' || COALESCE(p_idempotency_key, '');
  v_transaction_id UUID := gen_random_uuid();
  v_balance_before NUMERIC(20,8);
  v_balance_after NUMERIC(20,8);
  v_shares NUMERIC;
  v_new_qty NUMERIC;
  v_new_avg_price NUMERIC;
  v_metadata JSONB;
BEGIN
  IF p_idempotency_key IS NULL
     OR p_idempotency_key !~ '^[A-Za-z0-9._:-]{8,128}$' THEN
    RAISE EXCEPTION 'Missing or invalid idempotency key';
  END IF;
  IF v_symbol !~ '^[A-Z0-9^][A-Z0-9.^-]{0,19}$' THEN
    RAISE EXCEPTION 'Invalid stock symbol';
  END IF;
  IF p_amount_usd IS NULL
     OR p_amount_usd::TEXT IN ('NaN', 'Infinity', '-Infinity')
     OR p_amount_usd < 50 THEN
    RAISE EXCEPTION 'Minimum investment is $50';
  END IF;
  IF p_amount_usd > 10000000 OR round(p_amount_usd, 8) <> p_amount_usd THEN
    RAISE EXCEPTION 'Invalid investment amount';
  END IF;
  IF p_price_usd IS NULL
     OR p_price_usd::TEXT IN ('NaN', 'Infinity', '-Infinity')
     OR p_price_usd <= 0
     OR p_price_usd > 1000000000000 THEN
    RAISE EXCEPTION 'Invalid stock price';
  END IF;

  v_request := jsonb_build_object(
    'symbol', v_symbol,
    'amount_usd', p_amount_usd
  );

  SELECT * INTO v_profile
  FROM public.profiles
  WHERE id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile not found';
  END IF;

  SELECT * INTO v_existing
  FROM public.transactions
  WHERE user_id = p_user_id AND idempotency_key = v_tx_key
  LIMIT 1;

  IF FOUND THEN
    IF v_existing.type <> 'stock_buy'
       OR v_existing.metadata -> 'request' IS DISTINCT FROM v_request THEN
      RAISE EXCEPTION 'Idempotency key was reused with different stock purchase details';
    END IF;

    RETURN (v_existing.metadata - 'request') || jsonb_build_object(
      'status', 'ok',
      'transaction_id', v_existing.id,
      'already_exists', true
    );
  END IF;

  IF NOT COALESCE(v_profile.is_active, false) THEN
    RAISE EXCEPTION 'Account is inactive';
  END IF;
  IF v_profile.kyc_status IS DISTINCT FROM 'approved' THEN
    RAISE EXCEPTION 'Complete KYC verification first';
  END IF;

  v_balance_before := COALESCE(v_profile.balance, 0);
  IF v_balance_before < p_amount_usd THEN
    RAISE EXCEPTION 'Insufficient balance';
  END IF;

  SELECT * INTO v_position
  FROM public.stock_positions
  WHERE user_id = p_user_id AND symbol = v_symbol
  FOR UPDATE;

  v_shares := round(p_amount_usd / p_price_usd, 18);
  IF v_shares <= 0 THEN
    RAISE EXCEPTION 'Investment amount is too small for the quoted price';
  END IF;

  IF FOUND THEN
    v_new_qty := v_position.qty + v_shares;
    v_new_avg_price := round(
      ((v_position.avg_price * v_position.qty) + p_amount_usd) / v_new_qty,
      18
    );

    UPDATE public.stock_positions
    SET qty = v_new_qty, avg_price = v_new_avg_price
    WHERE id = v_position.id;
  ELSE
    v_new_qty := v_shares;
    v_new_avg_price := p_price_usd;

    INSERT INTO public.stock_positions (user_id, symbol, qty, avg_price)
    VALUES (p_user_id, v_symbol, v_new_qty, v_new_avg_price);
  END IF;

  v_balance_after := round(v_balance_before - p_amount_usd, 8);

  UPDATE public.profiles
  SET balance = v_balance_after, updated_at = now()
  WHERE id = p_user_id;

  v_metadata := jsonb_build_object(
    'request', v_request,
    'symbol', v_symbol,
    'shares', v_shares,
    'price', p_price_usd,
    'amount', p_amount_usd,
    'balance_before', v_balance_before,
    'new_balance', v_balance_after
  );

  INSERT INTO public.transactions (
    id, user_id, type, amount, asset, status, description,
    balance_before, balance_after, idempotency_key, metadata
  ) VALUES (
    v_transaction_id,
    p_user_id,
    'stock_buy',
    p_amount_usd,
    v_symbol,
    'completed',
    'Bought ' || v_shares || ' shares of ' || v_symbol || ' @ $' || p_price_usd,
    v_balance_before,
    v_balance_after,
    v_tx_key,
    v_metadata
  );

  INSERT INTO public.notifications (
    user_id, type, title, description, body, link, metadata, dedupe_key
  ) VALUES (
    p_user_id,
    'stock_buy',
    'Stock purchase completed',
    v_symbol || ' was added to your portfolio.',
    'Your stock purchase was completed successfully. You invested $' ||
      to_char(p_amount_usd, 'FM999999999999990.00') || ' into ' || v_symbol ||
      ', receiving ' || v_shares || ' shares at $' || p_price_usd || ' per share.',
    '/dashboard/portfolio',
    jsonb_build_object(
      'transaction_id', v_transaction_id,
      'symbol', v_symbol,
      'amount_usd', p_amount_usd,
      'shares', v_shares,
      'price', p_price_usd,
      'balance_before', v_balance_before,
      'balance_after', v_balance_after
    ),
    'trade/' || v_transaction_id
  ) ON CONFLICT DO NOTHING;

  RETURN (v_metadata - 'request') || jsonb_build_object(
    'status', 'ok',
    'transaction_id', v_transaction_id,
    'already_exists', false
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.execute_stock_sell(
  p_user_id UUID,
  p_symbol TEXT,
  p_qty NUMERIC,
  p_price_usd NUMERIC,
  p_idempotency_key TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_profile public.profiles%ROWTYPE;
  v_position public.stock_positions%ROWTYPE;
  v_existing public.transactions%ROWTYPE;
  v_symbol TEXT := upper(btrim(COALESCE(p_symbol, '')));
  v_request JSONB;
  v_tx_key TEXT := 'stock-sell:' || COALESCE(p_idempotency_key, '');
  v_transaction_id UUID := gen_random_uuid();
  v_balance_before NUMERIC(20,8);
  v_balance_after NUMERIC(20,8);
  v_sale_value NUMERIC;
  v_remaining_qty NUMERIC;
  v_metadata JSONB;
BEGIN
  IF p_idempotency_key IS NULL
     OR p_idempotency_key !~ '^[A-Za-z0-9._:-]{8,128}$' THEN
    RAISE EXCEPTION 'Missing or invalid idempotency key';
  END IF;
  IF v_symbol !~ '^[A-Z0-9^][A-Z0-9.^-]{0,19}$' THEN
    RAISE EXCEPTION 'Invalid stock symbol';
  END IF;
  IF p_qty IS NULL
     OR p_qty::TEXT IN ('NaN', 'Infinity', '-Infinity')
     OR p_qty <= 0
     OR p_qty > 1000000000000
     OR round(p_qty, 18) <> p_qty THEN
    RAISE EXCEPTION 'Invalid sell quantity';
  END IF;
  IF p_price_usd IS NULL
     OR p_price_usd::TEXT IN ('NaN', 'Infinity', '-Infinity')
     OR p_price_usd <= 0
     OR p_price_usd > 1000000000000 THEN
    RAISE EXCEPTION 'Invalid stock price';
  END IF;

  v_request := jsonb_build_object('symbol', v_symbol, 'qty', p_qty);

  SELECT * INTO v_profile
  FROM public.profiles
  WHERE id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile not found';
  END IF;

  SELECT * INTO v_existing
  FROM public.transactions
  WHERE user_id = p_user_id AND idempotency_key = v_tx_key
  LIMIT 1;

  IF FOUND THEN
    IF v_existing.type <> 'stock_sell'
       OR v_existing.metadata -> 'request' IS DISTINCT FROM v_request THEN
      RAISE EXCEPTION 'Idempotency key was reused with different stock sale details';
    END IF;

    RETURN (v_existing.metadata - 'request') || jsonb_build_object(
      'status', 'ok',
      'transaction_id', v_existing.id,
      'already_exists', true
    );
  END IF;

  IF NOT COALESCE(v_profile.is_active, false) THEN
    RAISE EXCEPTION 'Account is inactive';
  END IF;

  SELECT * INTO v_position
  FROM public.stock_positions
  WHERE user_id = p_user_id AND symbol = v_symbol
  FOR UPDATE;

  IF NOT FOUND OR v_position.qty < p_qty THEN
    RAISE EXCEPTION 'Insufficient shares';
  END IF;

  v_sale_value := round(p_qty * p_price_usd, 8);
  IF v_sale_value <= 0 OR v_sale_value > 10000000 THEN
    RAISE EXCEPTION 'Sale value is outside the supported range';
  END IF;

  v_remaining_qty := v_position.qty - p_qty;
  IF v_remaining_qty = 0 THEN
    DELETE FROM public.stock_positions WHERE id = v_position.id;
  ELSE
    UPDATE public.stock_positions
    SET qty = v_remaining_qty
    WHERE id = v_position.id;
  END IF;

  v_balance_before := COALESCE(v_profile.balance, 0);
  IF v_balance_before + v_sale_value > 999999999999.99999999 THEN
    RAISE EXCEPTION 'Resulting balance is outside the supported range';
  END IF;
  v_balance_after := round(v_balance_before + v_sale_value, 8);

  UPDATE public.profiles
  SET balance = v_balance_after, updated_at = now()
  WHERE id = p_user_id;

  v_metadata := jsonb_build_object(
    'request', v_request,
    'symbol', v_symbol,
    'qty', p_qty,
    'price', p_price_usd,
    'value', v_sale_value,
    'balance_before', v_balance_before,
    'new_balance', v_balance_after,
    'remaining_qty', v_remaining_qty
  );

  INSERT INTO public.transactions (
    id, user_id, type, amount, asset, status, description,
    balance_before, balance_after, idempotency_key, metadata
  ) VALUES (
    v_transaction_id,
    p_user_id,
    'stock_sell',
    v_sale_value,
    v_symbol,
    'completed',
    'Sold ' || p_qty || ' shares of ' || v_symbol || ' @ $' || p_price_usd,
    v_balance_before,
    v_balance_after,
    v_tx_key,
    v_metadata
  );

  INSERT INTO public.notifications (
    user_id, type, title, description, body, link, metadata, dedupe_key
  ) VALUES (
    p_user_id,
    'stock_sell',
    'Stock sale completed',
    v_symbol || ' was sold and credited to your USD balance.',
    'You sold ' || p_qty || ' shares of ' || v_symbol || ' for $' ||
      to_char(v_sale_value, 'FM999999999999990.00') || '.',
    '/dashboard/transactions',
    jsonb_build_object(
      'transaction_id', v_transaction_id,
      'symbol', v_symbol,
      'qty', p_qty,
      'price', p_price_usd,
      'sale_value', v_sale_value,
      'balance_before', v_balance_before,
      'balance_after', v_balance_after
    ),
    'trade/' || v_transaction_id
  ) ON CONFLICT DO NOTHING;

  RETURN (v_metadata - 'request') || jsonb_build_object(
    'status', 'ok',
    'transaction_id', v_transaction_id,
    'already_exists', false
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.execute_crypto_sell(
  p_user_id UUID,
  p_symbol TEXT,
  p_qty NUMERIC,
  p_price_usd NUMERIC,
  p_idempotency_key TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_profile public.profiles%ROWTYPE;
  v_position public.crypto_positions%ROWTYPE;
  v_existing public.transactions%ROWTYPE;
  v_symbol TEXT := upper(btrim(COALESCE(p_symbol, '')));
  v_request JSONB;
  v_tx_key TEXT := 'crypto-sell:' || COALESCE(p_idempotency_key, '');
  v_transaction_id UUID := gen_random_uuid();
  v_balance_before NUMERIC(20,8);
  v_balance_after NUMERIC(20,8);
  v_gross_usd NUMERIC;
  v_fee_usd NUMERIC(20,8);
  v_net_usd NUMERIC(20,8);
  v_remaining_qty NUMERIC;
  v_metadata JSONB;
BEGIN
  IF p_idempotency_key IS NULL
     OR p_idempotency_key !~ '^[A-Za-z0-9._:-]{8,128}$' THEN
    RAISE EXCEPTION 'Missing or invalid idempotency key';
  END IF;
  IF v_symbol NOT IN ('BTC', 'ETH', 'BNB', 'MATIC', 'AVAX', 'USDC', 'USDT', 'SOL', 'XRP', 'ADA', 'DOGE') THEN
    RAISE EXCEPTION 'Unsupported crypto asset';
  END IF;
  IF p_qty IS NULL
     OR p_qty::TEXT IN ('NaN', 'Infinity', '-Infinity')
     OR p_qty <= 0
     OR p_qty > 1000000000000
     OR round(p_qty, 18) <> p_qty THEN
    RAISE EXCEPTION 'Invalid sell amount';
  END IF;
  IF p_price_usd IS NULL
     OR p_price_usd::TEXT IN ('NaN', 'Infinity', '-Infinity')
     OR p_price_usd <= 0
     OR p_price_usd > 1000000000000 THEN
    RAISE EXCEPTION 'Invalid crypto price';
  END IF;

  v_request := jsonb_build_object('symbol', v_symbol, 'qty', p_qty);

  SELECT * INTO v_profile
  FROM public.profiles
  WHERE id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile not found';
  END IF;

  SELECT * INTO v_existing
  FROM public.transactions
  WHERE user_id = p_user_id AND idempotency_key = v_tx_key
  LIMIT 1;

  IF FOUND THEN
    IF v_existing.type <> 'crypto_sell'
       OR v_existing.metadata -> 'request' IS DISTINCT FROM v_request THEN
      RAISE EXCEPTION 'Idempotency key was reused with different crypto sale details';
    END IF;

    RETURN (v_existing.metadata - 'request') || jsonb_build_object(
      'status', 'ok',
      'success', true,
      'transaction_id', v_existing.id,
      'already_exists', true
    );
  END IF;

  IF NOT COALESCE(v_profile.is_active, false) THEN
    RAISE EXCEPTION 'Account is inactive';
  END IF;

  SELECT * INTO v_position
  FROM public.crypto_positions
  WHERE user_id = p_user_id AND symbol = v_symbol
  FOR UPDATE;

  IF NOT FOUND OR v_position.qty < p_qty THEN
    RAISE EXCEPTION 'Insufficient ' || v_symbol || ' balance';
  END IF;

  v_gross_usd := round(p_qty * p_price_usd, 8);
  IF v_gross_usd <= 0 OR v_gross_usd > 10000000 THEN
    RAISE EXCEPTION 'Sale value is outside the supported range';
  END IF;
  v_fee_usd := round(v_gross_usd * 0.005, 8);
  v_net_usd := v_gross_usd - v_fee_usd;
  v_remaining_qty := v_position.qty - p_qty;

  IF v_remaining_qty = 0 THEN
    DELETE FROM public.crypto_positions WHERE id = v_position.id;
  ELSE
    UPDATE public.crypto_positions
    SET qty = v_remaining_qty
    WHERE id = v_position.id;
  END IF;

  v_balance_before := COALESCE(v_profile.balance, 0);
  IF v_balance_before + v_net_usd > 999999999999.99999999 THEN
    RAISE EXCEPTION 'Resulting balance is outside the supported range';
  END IF;
  v_balance_after := round(v_balance_before + v_net_usd, 8);

  UPDATE public.profiles
  SET balance = v_balance_after, updated_at = now()
  WHERE id = p_user_id;

  v_metadata := jsonb_build_object(
    'request', v_request,
    'success', true,
    'symbol', v_symbol,
    'sold_amount', p_qty,
    'price', p_price_usd,
    'gross_usd', v_gross_usd,
    'fee_usd', v_fee_usd,
    'net_usd', v_net_usd,
    'balance_before', v_balance_before,
    'balance_after', v_balance_after,
    'remaining_crypto_qty', v_remaining_qty
  );

  INSERT INTO public.transactions (
    id, user_id, type, amount, asset, status, description,
    balance_before, balance_after, idempotency_key, metadata
  ) VALUES (
    v_transaction_id,
    p_user_id,
    'crypto_sell',
    v_net_usd,
    v_symbol || '→USD',
    'completed',
    'Sold ' || p_qty || ' ' || v_symbol || ' to USD balance',
    v_balance_before,
    v_balance_after,
    v_tx_key,
    v_metadata
  );

  INSERT INTO public.notifications (
    user_id, type, title, description, body, link, metadata, dedupe_key
  ) VALUES (
    p_user_id,
    'crypto_sell',
    'Crypto sold to USD balance',
    v_symbol || ' was sold and credited to your USD balance.',
    'You sold ' || p_qty || ' ' || v_symbol || '. After fees, $' ||
      to_char(v_net_usd, 'FM999999999999990.00') || ' was credited to your USD balance.',
    '/dashboard/transactions',
    jsonb_build_object(
      'transaction_id', v_transaction_id,
      'symbol', v_symbol,
      'sold_amount', p_qty,
      'gross_usd', v_gross_usd,
      'fee_usd', v_fee_usd,
      'net_usd', v_net_usd,
      'balance_before', v_balance_before,
      'balance_after', v_balance_after
    ),
    'trade/' || v_transaction_id
  ) ON CONFLICT DO NOTHING;

  RETURN (v_metadata - 'request') || jsonb_build_object(
    'status', 'ok',
    'transaction_id', v_transaction_id,
    'already_exists', false
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.execute_crypto_swap(
  p_user_id UUID,
  p_from_symbol TEXT,
  p_to_symbol TEXT,
  p_from_qty NUMERIC,
  p_from_price_usd NUMERIC,
  p_to_price_usd NUMERIC,
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
  v_from_position public.crypto_positions%ROWTYPE;
  v_to_position public.crypto_positions%ROWTYPE;
  v_locked_position public.crypto_positions%ROWTYPE;
  v_from_symbol TEXT := upper(btrim(COALESCE(p_from_symbol, '')));
  v_to_symbol TEXT := upper(btrim(COALESCE(p_to_symbol, '')));
  v_request JSONB;
  v_tx_key TEXT := 'crypto-swap:' || COALESCE(p_idempotency_key, '');
  v_transaction_id UUID := gen_random_uuid();
  v_from_value_usd NUMERIC;
  v_fee_usd NUMERIC(20,8);
  v_net_value_usd NUMERIC(20,8);
  v_to_qty NUMERIC;
  v_remaining_from_qty NUMERIC;
  v_new_to_qty NUMERIC;
  v_new_to_avg_price NUMERIC;
  v_metadata JSONB;
BEGIN
  IF p_idempotency_key IS NULL
     OR p_idempotency_key !~ '^[A-Za-z0-9._:-]{8,128}$' THEN
    RAISE EXCEPTION 'Missing or invalid idempotency key';
  END IF;
  IF v_from_symbol NOT IN ('BTC', 'ETH', 'BNB', 'MATIC', 'AVAX', 'USDC', 'USDT', 'SOL', 'XRP', 'ADA', 'DOGE')
     OR v_to_symbol NOT IN ('BTC', 'ETH', 'BNB', 'MATIC', 'AVAX', 'USDC', 'USDT', 'SOL', 'XRP', 'ADA', 'DOGE') THEN
    RAISE EXCEPTION 'Unsupported token';
  END IF;
  IF v_from_symbol = v_to_symbol THEN
    RAISE EXCEPTION 'Cannot swap same token';
  END IF;
  IF p_from_qty IS NULL
     OR p_from_qty::TEXT IN ('NaN', 'Infinity', '-Infinity')
     OR p_from_qty <= 0
     OR p_from_qty > 1000000000000
     OR round(p_from_qty, 18) <> p_from_qty THEN
    RAISE EXCEPTION 'Invalid swap parameters';
  END IF;
  IF p_from_price_usd IS NULL
     OR p_from_price_usd::TEXT IN ('NaN', 'Infinity', '-Infinity')
     OR p_from_price_usd <= 0
     OR p_from_price_usd > 1000000000000
     OR p_to_price_usd IS NULL
     OR p_to_price_usd::TEXT IN ('NaN', 'Infinity', '-Infinity')
     OR p_to_price_usd <= 0
     OR p_to_price_usd > 1000000000000 THEN
    RAISE EXCEPTION 'Invalid crypto price';
  END IF;

  v_request := jsonb_build_object(
    'from_token', v_from_symbol,
    'to_token', v_to_symbol,
    'from_amount', p_from_qty
  );

  SELECT * INTO v_profile
  FROM public.profiles
  WHERE id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile not found';
  END IF;

  SELECT * INTO v_existing
  FROM public.transactions
  WHERE user_id = p_user_id AND idempotency_key = v_tx_key
  LIMIT 1;

  IF FOUND THEN
    IF v_existing.type <> 'swap'
       OR v_existing.metadata -> 'request' IS DISTINCT FROM v_request THEN
      RAISE EXCEPTION 'Idempotency key was reused with different swap details';
    END IF;

    RETURN (v_existing.metadata - 'request') || jsonb_build_object(
      'status', 'ok',
      'transaction_id', v_existing.id,
      'already_exists', true
    );
  END IF;

  IF NOT COALESCE(v_profile.is_active, false) THEN
    RAISE EXCEPTION 'Account is inactive';
  END IF;

  FOR v_locked_position IN
    SELECT *
    FROM public.crypto_positions
    WHERE user_id = p_user_id
      AND symbol IN (v_from_symbol, v_to_symbol)
    ORDER BY symbol
    FOR UPDATE
  LOOP
    IF v_locked_position.symbol = v_from_symbol THEN
      v_from_position := v_locked_position;
    ELSIF v_locked_position.symbol = v_to_symbol THEN
      v_to_position := v_locked_position;
    END IF;
  END LOOP;

  IF v_from_position.id IS NULL OR v_from_position.qty < p_from_qty THEN
    RAISE EXCEPTION 'Insufficient ' || v_from_symbol || ' balance';
  END IF;

  v_from_value_usd := round(p_from_qty * p_from_price_usd, 8);
  IF v_from_value_usd <= 0 OR v_from_value_usd > 10000000 THEN
    RAISE EXCEPTION 'Swap value is outside the supported range';
  END IF;
  v_fee_usd := round(v_from_value_usd * 0.005, 8);
  v_net_value_usd := v_from_value_usd - v_fee_usd;
  v_to_qty := round(v_net_value_usd / p_to_price_usd, 18);
  IF v_to_qty <= 0 THEN
    RAISE EXCEPTION 'Swap output is too small';
  END IF;

  v_remaining_from_qty := v_from_position.qty - p_from_qty;
  IF v_remaining_from_qty = 0 THEN
    DELETE FROM public.crypto_positions WHERE id = v_from_position.id;
  ELSE
    UPDATE public.crypto_positions
    SET qty = v_remaining_from_qty
    WHERE id = v_from_position.id;
  END IF;

  IF v_to_position.id IS NULL THEN
    v_new_to_qty := v_to_qty;
    v_new_to_avg_price := p_to_price_usd;

    INSERT INTO public.crypto_positions (user_id, symbol, qty, avg_price)
    VALUES (p_user_id, v_to_symbol, v_new_to_qty, v_new_to_avg_price);
  ELSE
    v_new_to_qty := v_to_position.qty + v_to_qty;
    v_new_to_avg_price := round(
      ((v_to_position.avg_price * v_to_position.qty) + v_net_value_usd) / v_new_to_qty,
      18
    );

    UPDATE public.crypto_positions
    SET qty = v_new_to_qty, avg_price = v_new_to_avg_price
    WHERE id = v_to_position.id;
  END IF;

  v_metadata := jsonb_build_object(
    'request', v_request,
    'from_token', v_from_symbol,
    'to_token', v_to_symbol,
    'from_amount', p_from_qty,
    'to_amount', v_to_qty,
    'from_price', p_from_price_usd,
    'to_price', p_to_price_usd,
    'fee', v_fee_usd,
    'rate', p_from_price_usd / p_to_price_usd,
    'value_usd', v_from_value_usd,
    'net_value_usd', v_net_value_usd,
    'remaining_from_qty', v_remaining_from_qty
  );

  INSERT INTO public.transactions (
    id, user_id, type, amount, asset, status, description,
    idempotency_key, metadata
  ) VALUES (
    v_transaction_id,
    p_user_id,
    'swap',
    v_from_value_usd,
    v_from_symbol || '→' || v_to_symbol,
    'completed',
    'Swapped ' || p_from_qty || ' ' || v_from_symbol || ' for ' || v_to_qty || ' ' || v_to_symbol,
    v_tx_key,
    v_metadata
  );

  INSERT INTO public.notifications (
    user_id, type, title, description, body, link, metadata, dedupe_key
  ) VALUES (
    p_user_id,
    'swap',
    'Swap completed',
    v_from_symbol || ' was swapped to ' || v_to_symbol || '.',
    'Your swap was completed successfully. You swapped ' || p_from_qty || ' ' ||
      v_from_symbol || ' for ' || v_to_qty || ' ' || v_to_symbol ||
      '. A 0.5% swap fee was applied.',
    '/dashboard/transactions',
    jsonb_build_object(
      'transaction_id', v_transaction_id,
      'from_token', v_from_symbol,
      'to_token', v_to_symbol,
      'from_amount', p_from_qty,
      'to_amount', v_to_qty,
      'value_usd', v_from_value_usd,
      'fee_usd', v_fee_usd
    ),
    'trade/' || v_transaction_id
  ) ON CONFLICT DO NOTHING;

  RETURN (v_metadata - 'request') || jsonb_build_object(
    'status', 'ok',
    'transaction_id', v_transaction_id,
    'already_exists', false
  );
END;
$$;

REVOKE ALL ON FUNCTION public.execute_stock_buy(UUID, TEXT, NUMERIC, NUMERIC, TEXT)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.execute_stock_sell(UUID, TEXT, NUMERIC, NUMERIC, TEXT)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.execute_crypto_sell(UUID, TEXT, NUMERIC, NUMERIC, TEXT)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.execute_crypto_swap(UUID, TEXT, TEXT, NUMERIC, NUMERIC, NUMERIC, TEXT)
  FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.execute_stock_buy(UUID, TEXT, NUMERIC, NUMERIC, TEXT)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.execute_stock_sell(UUID, TEXT, NUMERIC, NUMERIC, TEXT)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.execute_crypto_sell(UUID, TEXT, NUMERIC, NUMERIC, TEXT)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.execute_crypto_swap(UUID, TEXT, TEXT, NUMERIC, NUMERIC, NUMERIC, TEXT)
  TO service_role;

COMMIT;
