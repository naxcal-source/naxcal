-- ============================================
-- SEED INVESTOR: TOMA PANAYOTOV
-- ============================================
-- STEP 1: Toma registers via invitation link
-- STEP 2: Get his UUID from Supabase > Auth > Users
-- STEP 3: Replace USER_ID_HERE with his UUID
-- STEP 4: Run this in Supabase SQL Editor
-- ============================================

DO $$
DECLARE
  uid UUID := 'USER_ID_HERE';
BEGIN

-- ============================================
-- PROFILE SETUP
-- ============================================
UPDATE profiles SET
  full_name = 'Toma Panayotov',
  tier = 'gold',
  kyc_status = 'approved',
  is_active = true,
  onboarding_complete = true,
  display_currency = 'GBP'
WHERE id = uid;

-- ============================================
-- DEPOSITS: £1,200 monthly + extra lump sums
-- All amounts in USD (£1 ≈ $1.27)
-- ============================================

-- May 2025 - First deposit
INSERT INTO transactions (user_id, type, amount, asset, status, description, balance_before, balance_after, created_at)
VALUES (uid, 'deposit', 1524, 'GBP', 'completed', 'Monthly deposit - £1,200', 0, 1524, '2025-05-18 10:30:00+00');

-- June 2025 + extra £2,500
INSERT INTO transactions (user_id, type, amount, asset, status, description, balance_before, balance_after, created_at)
VALUES (uid, 'deposit', 1524, 'GBP', 'completed', 'Monthly deposit - £1,200', 1524, 3048, '2025-06-18 11:15:00+00');
INSERT INTO transactions (user_id, type, amount, asset, status, description, balance_before, balance_after, created_at)
VALUES (uid, 'deposit', 3175, 'GBP', 'completed', 'Additional deposit - £2,500', 3048, 6223, '2025-06-25 14:20:00+00');

-- July 2025 + extra £3,000
INSERT INTO transactions (user_id, type, amount, asset, status, description, balance_before, balance_after, created_at)
VALUES (uid, 'deposit', 1524, 'GBP', 'completed', 'Monthly deposit - £1,200', 6223, 7747, '2025-07-17 09:45:00+00');
INSERT INTO transactions (user_id, type, amount, asset, status, description, balance_before, balance_after, created_at)
VALUES (uid, 'deposit', 3810, 'GBP', 'completed', 'Additional deposit - £3,000', 7747, 11557, '2025-07-28 14:00:00+00');

-- August 2025
INSERT INTO transactions (user_id, type, amount, asset, status, description, balance_before, balance_after, created_at)
VALUES (uid, 'deposit', 1524, 'GBP', 'completed', 'Monthly deposit - £1,200', 11557, 13081, '2025-08-19 10:00:00+00');

-- September 2025 + extra £3,500
INSERT INTO transactions (user_id, type, amount, asset, status, description, balance_before, balance_after, created_at)
VALUES (uid, 'deposit', 1524, 'GBP', 'completed', 'Monthly deposit - £1,200', 13081, 14605, '2025-09-18 11:30:00+00');
INSERT INTO transactions (user_id, type, amount, asset, status, description, balance_before, balance_after, created_at)
VALUES (uid, 'deposit', 4445, 'GBP', 'completed', 'Additional deposit - £3,500', 14605, 19050, '2025-09-24 16:45:00+00');

-- October 2025 + extra £2,000
INSERT INTO transactions (user_id, type, amount, asset, status, description, balance_before, balance_after, created_at)
VALUES (uid, 'deposit', 1524, 'GBP', 'completed', 'Monthly deposit - £1,200', 19050, 20574, '2025-10-20 10:15:00+00');
INSERT INTO transactions (user_id, type, amount, asset, status, description, balance_before, balance_after, created_at)
VALUES (uid, 'deposit', 2540, 'GBP', 'completed', 'Additional deposit - £2,000', 20574, 23114, '2025-10-29 13:00:00+00');

-- November 2025 + extra £3,000
INSERT INTO transactions (user_id, type, amount, asset, status, description, balance_before, balance_after, created_at)
VALUES (uid, 'deposit', 1524, 'GBP', 'completed', 'Monthly deposit - £1,200', 23114, 24638, '2025-11-18 09:30:00+00');
INSERT INTO transactions (user_id, type, amount, asset, status, description, balance_before, balance_after, created_at)
VALUES (uid, 'deposit', 3810, 'GBP', 'completed', 'Additional deposit - £3,000', 24638, 28448, '2025-11-27 15:00:00+00');

-- December 2025
INSERT INTO transactions (user_id, type, amount, asset, status, description, balance_before, balance_after, created_at)
VALUES (uid, 'deposit', 1524, 'GBP', 'completed', 'Monthly deposit - £1,200', 28448, 29972, '2025-12-18 10:45:00+00');

-- January 2026 + extra £4,000
INSERT INTO transactions (user_id, type, amount, asset, status, description, balance_before, balance_after, created_at)
VALUES (uid, 'deposit', 1524, 'GBP', 'completed', 'Monthly deposit - £1,200', 29972, 31496, '2026-01-19 11:00:00+00');
INSERT INTO transactions (user_id, type, amount, asset, status, description, balance_before, balance_after, created_at)
VALUES (uid, 'deposit', 5080, 'GBP', 'completed', 'Additional deposit - £4,000', 31496, 36576, '2026-01-26 15:30:00+00');

-- February 2026 + extra £2,500
INSERT INTO transactions (user_id, type, amount, asset, status, description, balance_before, balance_after, created_at)
VALUES (uid, 'deposit', 1524, 'GBP', 'completed', 'Monthly deposit - £1,200', 36576, 38100, '2026-02-18 10:00:00+00');
INSERT INTO transactions (user_id, type, amount, asset, status, description, balance_before, balance_after, created_at)
VALUES (uid, 'deposit', 3175, 'GBP', 'completed', 'Additional deposit - £2,500', 38100, 41275, '2026-02-25 12:00:00+00');

-- March 2026 + extra £3,000
INSERT INTO transactions (user_id, type, amount, asset, status, description, balance_before, balance_after, created_at)
VALUES (uid, 'deposit', 1524, 'GBP', 'completed', 'Monthly deposit - £1,200', 41275, 42799, '2026-03-18 09:15:00+00');
INSERT INTO transactions (user_id, type, amount, asset, status, description, balance_before, balance_after, created_at)
VALUES (uid, 'deposit', 3810, 'GBP', 'completed', 'Additional deposit - £3,000', 42799, 46609, '2026-03-28 14:00:00+00');

-- April 2026 + extra £3,500
INSERT INTO transactions (user_id, type, amount, asset, status, description, balance_before, balance_after, created_at)
VALUES (uid, 'deposit', 1524, 'GBP', 'completed', 'Monthly deposit - £1,200', 46609, 48133, '2026-04-17 10:30:00+00');
INSERT INTO transactions (user_id, type, amount, asset, status, description, balance_before, balance_after, created_at)
VALUES (uid, 'deposit', 4445, 'GBP', 'completed', 'Additional deposit - £3,500', 48133, 52578, '2026-04-24 11:45:00+00');

-- May 2026
INSERT INTO transactions (user_id, type, amount, asset, status, description, balance_before, balance_after, created_at)
VALUES (uid, 'deposit', 1524, 'GBP', 'completed', 'Monthly deposit - £1,200', 52578, 54102, '2026-05-19 10:00:00+00');

-- June 2026
INSERT INTO transactions (user_id, type, amount, asset, status, description, balance_before, balance_after, created_at)
VALUES (uid, 'deposit', 1524, 'GBP', 'completed', 'Monthly deposit - £1,200', 54102, 55626, '2026-06-18 09:30:00+00');

-- TOTAL DEPOSITS: $55,626 (≈ £43,800)

-- ============================================
-- PROFIT TRANSACTIONS (monthly summaries)
-- Growing as balance compounds + tier upgrades
-- Total target: ~$200,000 profit
-- ============================================
INSERT INTO transactions (user_id, type, amount, asset, status, description, created_at)
VALUES
-- 2025: Early months, smaller balance, Bronze→Silver→Gold
(uid, 'profit', 2180, NULL, 'completed', 'Monthly return - May 2025 (+14.2%)', '2025-05-31 08:00:00+00'),
(uid, 'profit', 3450, NULL, 'completed', 'Monthly return - Jun 2025 (+12.8%)', '2025-06-30 08:00:00+00'),
(uid, 'profit', 5820, NULL, 'completed', 'Monthly return - Jul 2025 (+15.1%)', '2025-07-31 08:00:00+00'),
(uid, 'profit', 7640, NULL, 'completed', 'Monthly return - Aug 2025 (+13.6%)', '2025-08-31 08:00:00+00'),
(uid, 'profit', 9280, NULL, 'completed', 'Monthly return - Sep 2025 (+14.8%)', '2025-09-30 08:00:00+00'),
(uid, 'profit', 11450, NULL, 'completed', 'Monthly return - Oct 2025 (+15.3%)', '2025-10-31 08:00:00+00'),
(uid, 'profit', 14200, NULL, 'completed', 'Monthly return - Nov 2025 (+14.1%)', '2025-11-30 08:00:00+00'),
(uid, 'profit', 16800, NULL, 'completed', 'Monthly return - Dec 2025 (+13.9%)', '2025-12-31 08:00:00+00'),
-- 2026: Larger balance, Gold tier, higher absolute returns
(uid, 'profit', 19500, NULL, 'completed', 'Monthly return - Jan 2026 (+14.7%)', '2026-01-31 08:00:00+00'),
(uid, 'profit', 18200, NULL, 'completed', 'Monthly return - Feb 2026 (+12.4%)', '2026-02-28 08:00:00+00'),
(uid, 'profit', 22400, NULL, 'completed', 'Monthly return - Mar 2026 (+13.8%)', '2026-03-31 08:00:00+00'),
(uid, 'profit', 25600, NULL, 'completed', 'Monthly return - Apr 2026 (+14.2%)', '2026-04-30 08:00:00+00'),
(uid, 'profit', 28100, NULL, 'completed', 'Monthly return - May 2026 (+13.5%)', '2026-05-31 08:00:00+00'),
(uid, 'profit', 15380, NULL, 'completed', 'Monthly return - Jun 2026 (partial)', '2026-06-22 08:00:00+00');

-- TOTAL PROFIT: $200,000

-- ============================================
-- STOCK INVESTMENTS (bought over time)
-- ============================================
INSERT INTO transactions (user_id, type, amount, asset, status, description, created_at)
VALUES
(uid, 'stock_buy', 5000, 'AAPL', 'completed', 'Bought 16.83 shares of AAPL @ $297.15', '2025-08-12 14:00:00+00'),
(uid, 'stock_buy', 4000, 'NVDA', 'completed', 'Bought 19.18 shares of NVDA @ $208.55', '2025-10-08 15:30:00+00'),
(uid, 'stock_buy', 3500, 'MSFT', 'completed', 'Bought 9.52 shares of MSFT @ $367.65', '2025-12-15 14:45:00+00'),
(uid, 'stock_buy', 3000, 'TSLA', 'completed', 'Bought 7.41 shares of TSLA @ $405.00', '2026-02-10 16:00:00+00'),
(uid, 'stock_buy', 3000, 'GOOGL', 'completed', 'Bought 8.59 shares of GOOGL @ $349.20', '2026-04-14 15:15:00+00'),
(uid, 'stock_buy', 2500, 'AMZN', 'completed', 'Bought 10.68 shares of AMZN @ $234.10', '2026-05-20 14:30:00+00');

INSERT INTO stock_positions (user_id, symbol, qty, avg_price, created_at)
VALUES
(uid, 'AAPL', 16.83, 297.15, '2025-08-12 14:00:00+00'),
(uid, 'NVDA', 19.18, 208.55, '2025-10-08 15:30:00+00'),
(uid, 'MSFT', 9.52, 367.65, '2025-12-15 14:45:00+00'),
(uid, 'TSLA', 7.41, 405.00, '2026-02-10 16:00:00+00'),
(uid, 'GOOGL', 8.59, 349.20, '2026-04-14 15:15:00+00'),
(uid, 'AMZN', 10.68, 234.10, '2026-05-20 14:30:00+00')
ON CONFLICT (user_id, symbol) DO UPDATE SET qty = EXCLUDED.qty, avg_price = EXCLUDED.avg_price;

-- Stocks total invested: $21,000

-- ============================================
-- CRYPTO POSITIONS (mainly ETH)
-- ============================================
INSERT INTO transactions (user_id, type, amount, asset, status, description, created_at)
VALUES
(uid, 'swap', 15000, 'USD→ETH', 'completed', 'Converted $15,000 to 8.91 ETH', '2025-09-05 12:00:00+00'),
(uid, 'swap', 8000, 'USD→BTC', 'completed', 'Converted $8,000 to 0.127 BTC', '2025-11-20 13:30:00+00'),
(uid, 'swap', 5000, 'USD→SOL', 'completed', 'Converted $5,000 to 69.44 SOL', '2026-01-15 11:00:00+00'),
(uid, 'swap', 12000, 'USD→ETH', 'completed', 'Converted $12,000 to 7.13 ETH', '2026-03-10 14:30:00+00'),
(uid, 'swap', 6000, 'USD→ETH', 'completed', 'Converted $6,000 to 3.56 ETH', '2026-05-08 10:00:00+00');

INSERT INTO crypto_positions (user_id, symbol, qty, avg_price, created_at)
VALUES
(uid, 'ETH', 19.60, 1683.67, '2025-09-05 12:00:00+00'),
(uid, 'BTC', 0.127, 62992.00, '2025-11-20 13:30:00+00'),
(uid, 'SOL', 69.44, 72.00, '2026-01-15 11:00:00+00')
ON CONFLICT (user_id, symbol) DO UPDATE SET qty = EXCLUDED.qty, avg_price = EXCLUDED.avg_price;

-- Crypto total invested: $46,000

-- ============================================
-- FINAL BALANCE CALCULATION
-- Deposits:       $55,626
-- Profits:       $200,000
-- Stocks out:    -$21,000
-- Crypto out:    -$46,000
-- Cash balance:  $188,626
-- ============================================
UPDATE profiles SET
  balance = 188626.00,
  total_deposited = 55626.00,
  total_profit = 200000.00
WHERE id = uid;

END $$;
