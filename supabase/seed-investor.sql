-- ============================================
-- SEED INVESTOR: TOMA PANAYOTOV
-- ============================================
-- RUN CLEANUP FIRST (in case of partial run):
-- DELETE FROM transactions WHERE user_id = 'aab8c5e2-bee8-4799-ad23-149508e7f2af';
-- DELETE FROM stock_positions WHERE user_id = 'aab8c5e2-bee8-4799-ad23-149508e7f2af';
-- DELETE FROM crypto_positions WHERE user_id = 'aab8c5e2-bee8-4799-ad23-149508e7f2af';
-- ============================================

-- Fix type constraint to allow stock_buy, stock_sell, swap
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_type_check;
ALTER TABLE transactions ADD CONSTRAINT transactions_type_check
  CHECK (type IN ('deposit', 'withdrawal', 'profit', 'bonus', 'referral', 'fee', 'adjustment_credit', 'adjustment_debit', 'stock_buy', 'stock_sell', 'swap'));

DO $$
DECLARE
  uid UUID := 'aab8c5e2-bee8-4799-ad23-149508e7f2af';
  d DATE;
  running_bal DECIMAL := 0;
  day_rate DECIMAL;
  daily_profit DECIMAL;
  tier TEXT;
BEGIN

-- Profile setup
UPDATE profiles SET
  full_name = 'Toma Panayotov',
  tier = 'gold',
  kyc_status = 'approved',
  is_active = true,
  onboarding_complete = true,
  display_currency = 'GBP'
WHERE id = uid;

-- ============================================
-- DEPOSITS (£1,200 monthly + smaller extras)
-- £1 ≈ $1.27
-- ============================================

-- May 2025
INSERT INTO transactions (user_id, type, amount, asset, status, description, balance_before, balance_after, created_at)
VALUES (uid, 'deposit', 1524, 'GBP', 'completed', 'Monthly deposit - £1,200', 0, 1524, '2025-05-18 10:30:00+00');
running_bal := 1524;

-- Jun 2025 + extra £1,500
INSERT INTO transactions (user_id, type, amount, asset, status, description, balance_before, balance_after, created_at)
VALUES (uid, 'deposit', 1524, 'GBP', 'completed', 'Monthly deposit - £1,200', running_bal, running_bal + 1524, '2025-06-18 11:15:00+00');
running_bal := running_bal + 1524;
INSERT INTO transactions (user_id, type, amount, asset, status, description, balance_before, balance_after, created_at)
VALUES (uid, 'deposit', 1905, 'GBP', 'completed', 'Additional deposit - £1,500', running_bal, running_bal + 1905, '2025-06-26 14:20:00+00');
running_bal := running_bal + 1905;

-- Jul 2025
INSERT INTO transactions (user_id, type, amount, asset, status, description, balance_before, balance_after, created_at)
VALUES (uid, 'deposit', 1524, 'GBP', 'completed', 'Monthly deposit - £1,200', running_bal, running_bal + 1524, '2025-07-17 09:45:00+00');
running_bal := running_bal + 1524;

-- Aug 2025 + extra £2,000
INSERT INTO transactions (user_id, type, amount, asset, status, description, balance_before, balance_after, created_at)
VALUES (uid, 'deposit', 1524, 'GBP', 'completed', 'Monthly deposit - £1,200', running_bal, running_bal + 1524, '2025-08-19 10:00:00+00');
running_bal := running_bal + 1524;
INSERT INTO transactions (user_id, type, amount, asset, status, description, balance_before, balance_after, created_at)
VALUES (uid, 'deposit', 2540, 'GBP', 'completed', 'Additional deposit - £2,000', running_bal, running_bal + 2540, '2025-08-28 13:00:00+00');
running_bal := running_bal + 2540;

-- Sep 2025
INSERT INTO transactions (user_id, type, amount, asset, status, description, balance_before, balance_after, created_at)
VALUES (uid, 'deposit', 1524, 'GBP', 'completed', 'Monthly deposit - £1,200', running_bal, running_bal + 1524, '2025-09-18 11:30:00+00');
running_bal := running_bal + 1524;

-- Oct 2025 + extra £1,800
INSERT INTO transactions (user_id, type, amount, asset, status, description, balance_before, balance_after, created_at)
VALUES (uid, 'deposit', 1524, 'GBP', 'completed', 'Monthly deposit - £1,200', running_bal, running_bal + 1524, '2025-10-20 10:15:00+00');
running_bal := running_bal + 1524;
INSERT INTO transactions (user_id, type, amount, asset, status, description, balance_before, balance_after, created_at)
VALUES (uid, 'deposit', 2286, 'GBP', 'completed', 'Additional deposit - £1,800', running_bal, running_bal + 2286, '2025-10-30 15:00:00+00');
running_bal := running_bal + 2286;

-- Nov 2025
INSERT INTO transactions (user_id, type, amount, asset, status, description, balance_before, balance_after, created_at)
VALUES (uid, 'deposit', 1524, 'GBP', 'completed', 'Monthly deposit - £1,200', running_bal, running_bal + 1524, '2025-11-18 09:30:00+00');
running_bal := running_bal + 1524;

-- Dec 2025 + extra £2,500
INSERT INTO transactions (user_id, type, amount, asset, status, description, balance_before, balance_after, created_at)
VALUES (uid, 'deposit', 1524, 'GBP', 'completed', 'Monthly deposit - £1,200', running_bal, running_bal + 1524, '2025-12-18 10:45:00+00');
running_bal := running_bal + 1524;
INSERT INTO transactions (user_id, type, amount, asset, status, description, balance_before, balance_after, created_at)
VALUES (uid, 'deposit', 3175, 'GBP', 'completed', 'Additional deposit - £2,500', running_bal, running_bal + 3175, '2025-12-29 11:00:00+00');
running_bal := running_bal + 3175;

-- Jan 2026
INSERT INTO transactions (user_id, type, amount, asset, status, description, balance_before, balance_after, created_at)
VALUES (uid, 'deposit', 1524, 'GBP', 'completed', 'Monthly deposit - £1,200', running_bal, running_bal + 1524, '2026-01-19 11:00:00+00');
running_bal := running_bal + 1524;

-- Feb 2026 + extra £1,500
INSERT INTO transactions (user_id, type, amount, asset, status, description, balance_before, balance_after, created_at)
VALUES (uid, 'deposit', 1524, 'GBP', 'completed', 'Monthly deposit - £1,200', running_bal, running_bal + 1524, '2026-02-18 10:00:00+00');
running_bal := running_bal + 1524;
INSERT INTO transactions (user_id, type, amount, asset, status, description, balance_before, balance_after, created_at)
VALUES (uid, 'deposit', 1905, 'GBP', 'completed', 'Additional deposit - £1,500', running_bal, running_bal + 1905, '2026-02-27 12:00:00+00');
running_bal := running_bal + 1905;

-- Mar 2026
INSERT INTO transactions (user_id, type, amount, asset, status, description, balance_before, balance_after, created_at)
VALUES (uid, 'deposit', 1524, 'GBP', 'completed', 'Monthly deposit - £1,200', running_bal, running_bal + 1524, '2026-03-18 09:15:00+00');
running_bal := running_bal + 1524;

-- Apr 2026 + extra £2,000
INSERT INTO transactions (user_id, type, amount, asset, status, description, balance_before, balance_after, created_at)
VALUES (uid, 'deposit', 1524, 'GBP', 'completed', 'Monthly deposit - £1,200', running_bal, running_bal + 1524, '2026-04-17 10:30:00+00');
running_bal := running_bal + 1524;
INSERT INTO transactions (user_id, type, amount, asset, status, description, balance_before, balance_after, created_at)
VALUES (uid, 'deposit', 2540, 'GBP', 'completed', 'Additional deposit - £2,000', running_bal, running_bal + 2540, '2026-04-25 11:45:00+00');
running_bal := running_bal + 2540;

-- May 2026
INSERT INTO transactions (user_id, type, amount, asset, status, description, balance_before, balance_after, created_at)
VALUES (uid, 'deposit', 1524, 'GBP', 'completed', 'Monthly deposit - £1,200', running_bal, running_bal + 1524, '2026-05-19 10:00:00+00');
running_bal := running_bal + 1524;

-- Jun 2026
INSERT INTO transactions (user_id, type, amount, asset, status, description, balance_before, balance_after, created_at)
VALUES (uid, 'deposit', 1524, 'GBP', 'completed', 'Monthly deposit - £1,200', running_bal, running_bal + 1524, '2026-06-18 09:30:00+00');
running_bal := running_bal + 1524;

-- Total deposits: ~$43,081 (≈ £33,900)

-- ============================================
-- DAILY PROFIT ENTRIES
-- Generate one per weekday from May 19, 2025 to Jun 22, 2026
-- Rate based on running balance tier
-- ============================================

-- Reset running_bal to track with profits
running_bal := 1524; -- starts after first deposit

FOR d IN SELECT generate_series('2025-05-19'::date, '2026-06-22'::date, '1 day'::interval)::date LOOP
  -- Skip weekends
  IF EXTRACT(dow FROM d) IN (0, 6) THEN CONTINUE; END IF;

  -- Determine tier
  IF running_bal >= 25000 THEN tier := 'gold'; day_rate := 0.021;
  ELSIF running_bal >= 5000 THEN tier := 'silver'; day_rate := 0.018;
  ELSE tier := 'bronze'; day_rate := 0.015;
  END IF;

  -- Add some variance (0.8x to 1.2x of base rate)
  day_rate := day_rate * (0.8 + random() * 0.4);
  daily_profit := ROUND((running_bal * day_rate / 30)::numeric, 2);

  -- Skip tiny amounts
  IF daily_profit < 0.50 THEN CONTINUE; END IF;

  INSERT INTO transactions (user_id, type, amount, asset, status, description, balance_before, balance_after, created_at)
  VALUES (uid, 'profit', daily_profit, NULL, 'completed',
    'Daily return +' || ROUND((day_rate * 100 / 30)::numeric, 3) || '% (' || tier || ' tier)',
    running_bal, running_bal + daily_profit,
    d + interval '8 hours' + (random() * interval '30 minutes'));

  running_bal := running_bal + daily_profit;

  -- Add deposit bumps at the right dates
  IF d = '2025-06-18' THEN running_bal := running_bal + 1524; END IF;
  IF d = '2025-06-26' THEN running_bal := running_bal + 1905; END IF;
  IF d = '2025-07-17' THEN running_bal := running_bal + 1524; END IF;
  IF d = '2025-08-19' THEN running_bal := running_bal + 1524; END IF;
  IF d = '2025-08-28' THEN running_bal := running_bal + 2540; END IF;
  IF d = '2025-09-18' THEN running_bal := running_bal + 1524; END IF;
  IF d = '2025-10-20' THEN running_bal := running_bal + 1524; END IF;
  IF d = '2025-10-30' THEN running_bal := running_bal + 2286; END IF;
  IF d = '2025-11-18' THEN running_bal := running_bal + 1524; END IF;
  IF d = '2025-12-18' THEN running_bal := running_bal + 1524; END IF;
  IF d = '2025-12-29' THEN running_bal := running_bal + 3175; END IF;
  IF d = '2026-01-19' THEN running_bal := running_bal + 1524; END IF;
  IF d = '2026-02-18' THEN running_bal := running_bal + 1524; END IF;
  IF d = '2026-02-27' THEN running_bal := running_bal + 1905; END IF;
  IF d = '2026-03-18' THEN running_bal := running_bal + 1524; END IF;
  IF d = '2026-04-17' THEN running_bal := running_bal + 1524; END IF;
  IF d = '2026-04-25' THEN running_bal := running_bal + 2540; END IF;
  IF d = '2026-05-19' THEN running_bal := running_bal + 1524; END IF;
  IF d = '2026-06-18' THEN running_bal := running_bal + 1524; END IF;

END LOOP;

-- ============================================
-- STOCK POSITIONS
-- ============================================
INSERT INTO transactions (user_id, type, amount, asset, status, description, created_at)
VALUES
(uid, 'stock_buy', 3500, 'AAPL', 'completed', 'Bought 11.78 shares of AAPL @ $297.15', '2025-09-05 14:00:00+00'),
(uid, 'stock_buy', 2800, 'NVDA', 'completed', 'Bought 13.43 shares of NVDA @ $208.55', '2025-11-12 15:30:00+00'),
(uid, 'stock_buy', 2500, 'MSFT', 'completed', 'Bought 6.80 shares of MSFT @ $367.65', '2026-01-08 14:45:00+00'),
(uid, 'stock_buy', 2000, 'TSLA', 'completed', 'Bought 4.94 shares of TSLA @ $405.00', '2026-03-15 16:00:00+00'),
(uid, 'stock_buy', 2200, 'GOOGL', 'completed', 'Bought 6.30 shares of GOOGL @ $349.20', '2026-05-10 15:15:00+00');

INSERT INTO stock_positions (user_id, symbol, qty, avg_price, created_at)
VALUES
(uid, 'AAPL', 11.78, 297.15, '2025-09-05 14:00:00+00'),
(uid, 'NVDA', 13.43, 208.55, '2025-11-12 15:30:00+00'),
(uid, 'MSFT', 6.80, 367.65, '2026-01-08 14:45:00+00'),
(uid, 'TSLA', 4.94, 405.00, '2026-03-15 16:00:00+00'),
(uid, 'GOOGL', 6.30, 349.20, '2026-05-10 15:15:00+00')
ON CONFLICT (user_id, symbol) DO UPDATE SET qty = EXCLUDED.qty, avg_price = EXCLUDED.avg_price;

-- ============================================
-- CRYPTO POSITIONS (mainly ETH)
-- ============================================
INSERT INTO transactions (user_id, type, amount, asset, status, description, created_at)
VALUES
(uid, 'swap', 10000, 'ETH', 'completed', 'Converted $10,000 to 5.94 ETH', '2025-08-10 12:00:00+00'),
(uid, 'swap', 5000, 'BTC', 'completed', 'Converted $5,000 to 0.079 BTC', '2025-11-20 13:30:00+00'),
(uid, 'swap', 3000, 'SOL', 'completed', 'Converted $3,000 to 41.67 SOL', '2026-01-15 11:00:00+00'),
(uid, 'swap', 8000, 'ETH', 'completed', 'Converted $8,000 to 4.75 ETH', '2026-04-05 14:30:00+00');

INSERT INTO crypto_positions (user_id, symbol, qty, avg_price, created_at)
VALUES
(uid, 'ETH', 10.69, 1683.67, '2025-08-10 12:00:00+00'),
(uid, 'BTC', 0.079, 63291.00, '2025-11-20 13:30:00+00'),
(uid, 'SOL', 41.67, 72.00, '2026-01-15 11:00:00+00')
ON CONFLICT (user_id, symbol) DO UPDATE SET qty = EXCLUDED.qty, avg_price = EXCLUDED.avg_price;

-- ============================================
-- FINAL BALANCE
-- The running_bal from the loop has the real number
-- But we set a target: deposits + ~200k profit - investments
-- Deposits: ~43,081 + Profit: ~200,000 - Stocks: 13,000 - Crypto: 26,000
-- Cash: ~204,081
-- ============================================
UPDATE profiles SET
  balance = running_bal - 13000 - 26000,
  total_deposited = 43081.00,
  total_profit = running_bal - 43081
WHERE id = uid;

END $$;
