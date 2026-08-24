-- Atomic, idempotent stock and crypto trading operations.
-- Apply after security-and-ledger-hardening.sql.

CREATE OR REPLACE FUNCTION execute_stock_buy(p_user_id UUID, p_symbol TEXT, p_amount NUMERIC, p_price NUMERIC, p_key TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE p profiles%ROWTYPE; pos stock_positions%ROWTYPE; shares NUMERIC; new_qty NUMERIC; new_avg NUMERIC; new_balance NUMERIC; tx_id UUID;
BEGIN
  SELECT * INTO p FROM profiles WHERE id=p_user_id FOR UPDATE;
  IF NOT FOUND OR p.kyc_status <> 'approved' OR NOT p.is_active THEN RAISE EXCEPTION 'Account is not eligible to trade'; END IF;
  IF p_amount < 50 OR p_price <= 0 OR p.balance < p_amount THEN RAISE EXCEPTION 'Invalid order or insufficient balance'; END IF;
  SELECT id INTO tx_id FROM transactions WHERE user_id=p_user_id AND idempotency_key=p_key;
  IF FOUND THEN RETURN jsonb_build_object('id',tx_id,'duplicate',true); END IF;
  shares := p_amount/p_price; new_balance := p.balance-p_amount;
  SELECT * INTO pos FROM stock_positions WHERE user_id=p_user_id AND symbol=p_symbol FOR UPDATE;
  IF FOUND THEN
    new_qty:=pos.qty+shares; new_avg:=((pos.qty*pos.avg_price)+p_amount)/new_qty;
    UPDATE stock_positions SET qty=new_qty,avg_price=new_avg WHERE id=pos.id;
  ELSE INSERT INTO stock_positions(user_id,symbol,qty,avg_price) VALUES(p_user_id,p_symbol,shares,p_price); END IF;
  UPDATE profiles SET balance=new_balance,updated_at=now() WHERE id=p_user_id;
  INSERT INTO transactions(user_id,type,amount,asset,status,description,balance_before,balance_after,idempotency_key)
  VALUES(p_user_id,'stock_buy',p_amount,p_symbol,'completed','Bought '||shares||' shares of '||p_symbol||' @ $'||p_price,p.balance,new_balance,p_key) RETURNING id INTO tx_id;
  RETURN jsonb_build_object('id',tx_id,'shares',shares,'new_balance',new_balance,'duplicate',false);
END $$;

CREATE OR REPLACE FUNCTION execute_stock_sell(p_user_id UUID, p_symbol TEXT, p_qty NUMERIC, p_price NUMERIC, p_key TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE p profiles%ROWTYPE; pos stock_positions%ROWTYPE; value NUMERIC; new_balance NUMERIC; tx_id UUID;
BEGIN
  SELECT id INTO tx_id FROM transactions WHERE user_id=p_user_id AND idempotency_key=p_key;
  IF FOUND THEN RETURN jsonb_build_object('id',tx_id,'duplicate',true); END IF;
  SELECT * INTO p FROM profiles WHERE id=p_user_id FOR UPDATE;
  SELECT * INTO pos FROM stock_positions WHERE user_id=p_user_id AND symbol=p_symbol FOR UPDATE;
  IF NOT FOUND OR p_qty<=0 OR p_price<=0 OR pos.qty<p_qty THEN RAISE EXCEPTION 'Invalid order or insufficient shares'; END IF;
  value:=p_qty*p_price; new_balance:=p.balance+value;
  IF pos.qty-p_qty < 0.0001 THEN DELETE FROM stock_positions WHERE id=pos.id; ELSE UPDATE stock_positions SET qty=pos.qty-p_qty WHERE id=pos.id; END IF;
  UPDATE profiles SET balance=new_balance,updated_at=now() WHERE id=p_user_id;
  INSERT INTO transactions(user_id,type,amount,asset,status,description,balance_before,balance_after,idempotency_key)
  VALUES(p_user_id,'stock_sell',value,p_symbol,'completed','Sold '||p_qty||' shares of '||p_symbol||' @ $'||p_price,p.balance,new_balance,p_key) RETURNING id INTO tx_id;
  RETURN jsonb_build_object('id',tx_id,'value',value,'new_balance',new_balance,'duplicate',false);
END $$;

CREATE OR REPLACE FUNCTION execute_crypto_sell(p_user_id UUID,p_symbol TEXT,p_qty NUMERIC,p_price NUMERIC,p_fee_rate NUMERIC,p_key TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE p profiles%ROWTYPE; pos crypto_positions%ROWTYPE; gross NUMERIC; fee NUMERIC; net NUMERIC; new_balance NUMERIC; tx_id UUID;
BEGIN
  SELECT id INTO tx_id FROM transactions WHERE user_id=p_user_id AND idempotency_key=p_key;
  IF FOUND THEN RETURN jsonb_build_object('id',tx_id,'duplicate',true); END IF;
  SELECT * INTO p FROM profiles WHERE id=p_user_id FOR UPDATE;
  SELECT * INTO pos FROM crypto_positions WHERE user_id=p_user_id AND symbol=p_symbol FOR UPDATE;
  IF NOT FOUND OR p_qty<=0 OR p_price<=0 OR pos.qty<p_qty THEN RAISE EXCEPTION 'Invalid order or insufficient crypto balance'; END IF;
  gross:=p_qty*p_price; fee:=gross*p_fee_rate; net:=gross-fee; new_balance:=p.balance+net;
  IF pos.qty-p_qty < 0.00000001 THEN DELETE FROM crypto_positions WHERE id=pos.id; ELSE UPDATE crypto_positions SET qty=pos.qty-p_qty WHERE id=pos.id; END IF;
  UPDATE profiles SET balance=new_balance,updated_at=now() WHERE id=p_user_id;
  INSERT INTO transactions(user_id,type,amount,asset,status,description,balance_before,balance_after,idempotency_key)
  VALUES(p_user_id,'crypto_sell',net,p_symbol||'→USD','completed','Sold '||p_qty||' '||p_symbol||' to USD balance',p.balance,new_balance,p_key) RETURNING id INTO tx_id;
  RETURN jsonb_build_object('id',tx_id,'gross',gross,'fee',fee,'net',net,'new_balance',new_balance,'remaining_qty',pos.qty-p_qty,'duplicate',false);
END $$;

CREATE OR REPLACE FUNCTION execute_crypto_swap(p_user_id UUID,p_from TEXT,p_to TEXT,p_from_qty NUMERIC,p_from_price NUMERIC,p_to_price NUMERIC,p_fee_rate NUMERIC,p_key TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE src crypto_positions%ROWTYPE; dst crypto_positions%ROWTYPE; gross NUMERIC; fee NUMERIC; net NUMERIC; to_qty NUMERIC; new_qty NUMERIC; new_avg NUMERIC; tx_id UUID;
BEGIN
  SELECT id INTO tx_id FROM transactions WHERE user_id=p_user_id AND idempotency_key=p_key;
  IF FOUND THEN RETURN jsonb_build_object('id',tx_id,'duplicate',true); END IF;
  PERFORM 1 FROM profiles WHERE id=p_user_id AND is_active=true FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Account is not eligible to trade'; END IF;
  -- Lock both assets in a stable order so opposite-direction swaps cannot deadlock.
  PERFORM id FROM crypto_positions
  WHERE user_id=p_user_id AND symbol IN (p_from,p_to)
  ORDER BY symbol FOR UPDATE;
  SELECT * INTO src FROM crypto_positions WHERE user_id=p_user_id AND symbol=p_from FOR UPDATE;
  IF NOT FOUND OR p_from_qty<=0 OR p_from_price<=0 OR p_to_price<=0 OR src.qty<p_from_qty THEN RAISE EXCEPTION 'Invalid swap or insufficient balance'; END IF;
  SELECT * INTO dst FROM crypto_positions WHERE user_id=p_user_id AND symbol=p_to FOR UPDATE;
  gross:=p_from_qty*p_from_price; fee:=gross*p_fee_rate; net:=gross-fee; to_qty:=net/p_to_price;
  IF src.qty-p_from_qty < 0.00000001 THEN DELETE FROM crypto_positions WHERE id=src.id; ELSE UPDATE crypto_positions SET qty=src.qty-p_from_qty WHERE id=src.id; END IF;
  IF dst.id IS NOT NULL THEN new_qty:=dst.qty+to_qty; new_avg:=((dst.qty*dst.avg_price)+net)/new_qty; UPDATE crypto_positions SET qty=new_qty,avg_price=new_avg WHERE id=dst.id;
  ELSE INSERT INTO crypto_positions(user_id,symbol,qty,avg_price) VALUES(p_user_id,p_to,to_qty,p_to_price); END IF;
  INSERT INTO transactions(user_id,type,amount,asset,status,description,idempotency_key)
  VALUES(p_user_id,'swap',gross,p_from||'→'||p_to,'completed','Swapped '||p_from_qty||' '||p_from||' for '||to_qty||' '||p_to,p_key) RETURNING id INTO tx_id;
  RETURN jsonb_build_object('id',tx_id,'gross',gross,'fee',fee,'to_qty',to_qty,'duplicate',false);
END $$;

REVOKE ALL ON FUNCTION execute_stock_buy(UUID,TEXT,NUMERIC,NUMERIC,TEXT), execute_stock_sell(UUID,TEXT,NUMERIC,NUMERIC,TEXT), execute_crypto_sell(UUID,TEXT,NUMERIC,NUMERIC,NUMERIC,TEXT), execute_crypto_swap(UUID,TEXT,TEXT,NUMERIC,NUMERIC,NUMERIC,NUMERIC,TEXT) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION execute_stock_buy(UUID,TEXT,NUMERIC,NUMERIC,TEXT), execute_stock_sell(UUID,TEXT,NUMERIC,NUMERIC,TEXT), execute_crypto_sell(UUID,TEXT,NUMERIC,NUMERIC,NUMERIC,TEXT), execute_crypto_swap(UUID,TEXT,TEXT,NUMERIC,NUMERIC,NUMERIC,NUMERIC,TEXT) TO service_role;
