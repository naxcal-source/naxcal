-- ============================================
-- SEED HISTORICAL INVESTOR DATA
-- ============================================
-- INSTRUCTIONS:
-- 1. Have the investor register on naxcal.com
-- 2. Find their user ID in Supabase > Authentication > Users
-- 3. Replace 'USER_ID_HERE' below with their actual UUID
-- 4. Adjust amounts if needed (all amounts in USD)
-- 5. Run this entire script in Supabase SQL Editor
-- ============================================

-- Set the user ID (REPLACE THIS)
DO $$
DECLARE
  uid UUID := 'USER_ID_HERE';
  deposit_date TIMESTAMPTZ;
  running_balance DECIMAL := 0;
  daily_profit DECIMAL;
  tier_rate DECIMAL;
  d DATE;
BEGIN

-- ============================================
-- UPDATE PROFILE
-- ============================================
UPDATE profiles SET
  tier = 'gold',
  kyc_status = 'approved',
  is_active = true,
  onboarding_complete = true
WHERE id = uid;

-- ============================================
-- HISTORICAL DEPOSITS (£ converted to $ at ~1.27)
-- ============================================
-- May 2025 - regular £1200 deposit
INSERT INTO transactions (user_id, type, amount, asset, status, description, created_at)
VALUES (uid, 'deposit', 1524, 'GBP', 'completed', 'Bank transfer deposit - £1,200', '2025-05-18 10:30:00+00');
running_balance := running_balance + 1524;

-- June 2025
INSERT INTO transactions (user_id, type, amount, asset, status, description, created_at)
VALUES (uid, 'deposit', 1524, 'GBP', 'completed', 'Bank transfer deposit - £1,200', '2025-06-18 11:15:00+00');
running_balance := running_balance + 1524;

-- July 2025 + extra £2,000 deposit
INSERT INTO transactions (user_id, type, amount, asset, status, description, created_at)
VALUES (uid, 'deposit', 1524, 'GBP', 'completed', 'Bank transfer deposit - £1,200', '2025-07-17 09:45:00+00');
running_balance := running_balance + 1524;

INSERT INTO transactions (user_id, type, amount, asset, status, description, created_at)
VALUES (uid, 'deposit', 2540, 'GBP', 'completed', 'Additional deposit - £2,000', '2025-07-25 14:20:00+00');
running_balance := running_balance + 2540;

-- August 2025
INSERT INTO transactions (user_id, type, amount, asset, status, description, created_at)
VALUES (uid, 'deposit', 1524, 'GBP', 'completed', 'Bank transfer deposit - £1,200', '2025-08-19 10:00:00+00');
running_balance := running_balance + 1524;

-- September 2025 + extra £3,000
INSERT INTO transactions (user_id, type, amount, asset, status, description, created_at)
VALUES (uid, 'deposit', 1524, 'GBP', 'completed', 'Bank transfer deposit - £1,200', '2025-09-18 11:30:00+00');
running_balance := running_balance + 1524;

INSERT INTO transactions (user_id, type, amount, asset, status, description, created_at)
VALUES (uid, 'deposit', 3810, 'GBP', 'completed', 'Additional deposit - £3,000', '2025-09-22 16:45:00+00');
running_balance := running_balance + 3810;

-- October 2025
INSERT INTO transactions (user_id, type, amount, asset, status, description, created_at)
VALUES (uid, 'deposit', 1524, 'GBP', 'completed', 'Bank transfer deposit - £1,200', '2025-10-20 10:15:00+00');
running_balance := running_balance + 1524;

-- November 2025 + extra £2,500
INSERT INTO transactions (user_id, type, amount, asset, status, description, created_at)
VALUES (uid, 'deposit', 1524, 'GBP', 'completed', 'Bank transfer deposit - £1,200', '2025-11-18 09:30:00+00');
running_balance := running_balance + 1524;

INSERT INTO transactions (user_id, type, amount, asset, status, description, created_at)
VALUES (uid, 'deposit', 3175, 'GBP', 'completed', 'Additional deposit - £2,500', '2025-11-28 13:00:00+00');
running_balance := running_balance + 3175;

-- December 2025
INSERT INTO transactions (user_id, type, amount, asset, status, description, created_at)
VALUES (uid, 'deposit', 1524, 'GBP', 'completed', 'Bank transfer deposit - £1,200', '2025-12-18 10:45:00+00');
running_balance := running_balance + 1524;

-- January 2026 + extra £3,000
INSERT INTO transactions (user_id, type, amount, asset, status, description, created_at)
VALUES (uid, 'deposit', 1524, 'GBP', 'completed', 'Bank transfer deposit - £1,200', '2026-01-19 11:00:00+00');
running_balance := running_balance + 1524;

INSERT INTO transactions (user_id, type, amount, asset, status, description, created_at)
VALUES (uid, 'deposit', 3810, 'GBP', 'completed', 'Additional deposit - £3,000', '2026-01-26 15:30:00+00');
running_balance := running_balance + 3810;

-- February 2026
INSERT INTO transactions (user_id, type, amount, asset, status, description, created_at)
VALUES (uid, 'deposit', 1524, 'GBP', 'completed', 'Bank transfer deposit - £1,200', '2026-02-18 10:00:00+00');
running_balance := running_balance + 1524;

-- March 2026 + extra £2,000
INSERT INTO transactions (user_id, type, amount, asset, status, description, created_at)
VALUES (uid, 'deposit', 1524, 'GBP', 'completed', 'Bank transfer deposit - £1,200', '2026-03-18 09:15:00+00');
running_balance := running_balance + 1524;

INSERT INTO transactions (user_id, type, amount, asset, status, description, created_at)
VALUES (uid, 'deposit', 2540, 'GBP', 'completed', 'Additional deposit - £2,000', '2026-03-28 14:00:00+00');
running_balance := running_balance + 2540;

-- April 2026 + extra £3,500
INSERT INTO transactions (user_id, type, amount, asset, status, description, created_at)
VALUES (uid, 'deposit', 1524, 'GBP', 'completed', 'Bank transfer deposit - £1,200', '2026-04-17 10:30:00+00');
running_balance := running_balance + 1524;

INSERT INTO transactions (user_id, type, amount, asset, status, description, created_at)
VALUES (uid, 'deposit', 4445, 'GBP', 'completed', 'Additional deposit - £3,500', '2026-04-22 11:45:00+00');
running_balance := running_balance + 4445;

-- May 2026
INSERT INTO transactions (user_id, type, amount, asset, status, description, created_at)
VALUES (uid, 'deposit', 1524, 'GBP', 'completed', 'Bank transfer deposit - £1,200', '2026-05-19 10:00:00+00');
running_balance := running_balance + 1524;

-- June 2026
INSERT INTO transactions (user_id, type, amount, asset, status, description, created_at)
VALUES (uid, 'deposit', 1524, 'GBP', 'completed', 'Bank transfer deposit - £1,200', '2026-06-18 09:30:00+00');
running_balance := running_balance + 1524;

-- Total deposits: ~$44,277 (≈ £34,900)

-- ============================================
-- SIMULATED MONTHLY PROFIT TRANSACTIONS
-- One profit entry per month (summary of daily returns)
-- ============================================
INSERT INTO transactions (user_id, type, amount, asset, status, description, created_at)
VALUES
(uid, 'profit', 342.00, NULL, 'completed', 'Monthly return - May 2025 (Bronze 1.5%)', '2025-05-31 08:00:00+00'),
(uid, 'profit', 520.00, NULL, 'completed', 'Monthly return - Jun 2025 (Bronze 1.5%)', '2025-06-30 08:00:00+00'),
(uid, 'profit', 890.00, NULL, 'completed', 'Monthly return - Jul 2025 (Silver 1.8%)', '2025-07-31 08:00:00+00'),
(uid, 'profit', 1150.00, NULL, 'completed', 'Monthly return - Aug 2025 (Silver 1.8%)', '2025-08-31 08:00:00+00'),
(uid, 'profit', 1480.00, NULL, 'completed', 'Monthly return - Sep 2025 (Silver 1.8%)', '2025-09-30 08:00:00+00'),
(uid, 'profit', 1720.00, NULL, 'completed', 'Monthly return - Oct 2025 (Gold 2.1%)', '2025-10-31 08:00:00+00'),
(uid, 'profit', 2100.00, NULL, 'completed', 'Monthly return - Nov 2025 (Gold 2.1%)', '2025-11-30 08:00:00+00'),
(uid, 'profit', 2350.00, NULL, 'completed', 'Monthly return - Dec 2025 (Gold 2.1%)', '2025-12-31 08:00:00+00'),
(uid, 'profit', 2680.00, NULL, 'completed', 'Monthly return - Jan 2026 (Gold 2.1%)', '2026-01-31 08:00:00+00'),
(uid, 'profit', 2450.00, NULL, 'completed', 'Monthly return - Feb 2026 (Gold 2.1%)', '2026-02-28 08:00:00+00'),
(uid, 'profit', 2890.00, NULL, 'completed', 'Monthly return - Mar 2026 (Gold 2.1%)', '2026-03-31 08:00:00+00'),
(uid, 'profit', 3200.00, NULL, 'completed', 'Monthly return - Apr 2026 (Gold 2.1%)', '2026-04-30 08:00:00+00'),
(uid, 'profit', 3100.00, NULL, 'completed', 'Monthly return - May 2026 (Gold 2.1%)', '2026-05-31 08:00:00+00'),
(uid, 'profit', 1580.00, NULL, 'completed', 'Monthly return - Jun 2026 (Gold 2.1%)', '2026-06-20 08:00:00+00');

-- Total profits: ~$26,452

-- ============================================
-- STOCK INVESTMENTS
-- ============================================
INSERT INTO transactions (user_id, type, amount, asset, status, description, created_at)
VALUES
(uid, 'stock_buy', 2500, 'AAPL', 'completed', 'Bought Apple stock', '2025-09-05 14:00:00+00'),
(uid, 'stock_buy', 1500, 'MSFT', 'completed', 'Bought Microsoft stock', '2025-11-12 15:30:00+00'),
(uid, 'stock_buy', 2000, 'NVDA', 'completed', 'Bought NVIDIA stock', '2026-01-08 14:45:00+00'),
(uid, 'stock_buy', 1000, 'TSLA', 'completed', 'Bought Tesla stock', '2026-03-15 16:00:00+00'),
(uid, 'stock_buy', 1500, 'GOOGL', 'completed', 'Bought Alphabet stock', '2026-05-10 15:15:00+00');

-- Stock positions (current holdings)
INSERT INTO stock_positions (user_id, symbol, qty, avg_price, created_at)
VALUES
(uid, 'AAPL', 8.42, 297.00, '2025-09-05 14:00:00+00'),
(uid, 'MSFT', 4.08, 367.00, '2025-11-12 15:30:00+00'),
(uid, 'NVDA', 9.59, 208.50, '2026-01-08 14:45:00+00'),
(uid, 'TSLA', 2.47, 405.00, '2026-03-15 16:00:00+00'),
(uid, 'GOOGL', 4.30, 349.00, '2026-05-10 15:15:00+00')
ON CONFLICT (user_id, symbol) DO UPDATE SET qty = EXCLUDED.qty, avg_price = EXCLUDED.avg_price;

-- ============================================
-- CRYPTO POSITIONS (mainly ETH, some others)
-- ============================================
INSERT INTO transactions (user_id, type, amount, asset, status, description, created_at)
VALUES
(uid, 'swap', 8000, 'USD→ETH', 'completed', 'Swapped $8,000 for ETH', '2025-08-10 12:00:00+00'),
(uid, 'swap', 3000, 'USD→BTC', 'completed', 'Swapped $3,000 for BTC', '2025-10-15 13:30:00+00'),
(uid, 'swap', 2000, 'USD→SOL', 'completed', 'Swapped $2,000 for SOL', '2026-02-20 11:00:00+00'),
(uid, 'swap', 4000, 'USD→ETH', 'completed', 'Swapped $4,000 for ETH', '2026-04-05 14:30:00+00');

INSERT INTO crypto_positions (user_id, symbol, qty, avg_price, created_at)
VALUES
(uid, 'ETH', 7.12, 1684.00, '2025-08-10 12:00:00+00'),
(uid, 'BTC', 0.048, 62500.00, '2025-10-15 13:30:00+00'),
(uid, 'SOL', 27.80, 72.00, '2026-02-20 11:00:00+00')
ON CONFLICT (user_id, symbol) DO UPDATE SET qty = EXCLUDED.qty, avg_price = EXCLUDED.avg_price;

-- ============================================
-- SET FINAL BALANCE
-- Total deposits: ~$44,277
-- Total profits: ~$26,452
-- Stock investments: -$8,500
-- Crypto swaps: -$17,000
-- Cash balance: ~$45,229
-- ============================================
UPDATE profiles SET
  balance = 45229.00,
  total_deposited = 44277.00,
  total_profit = 26452.00,
  display_currency = 'GBP'
WHERE id = uid;

END $$;
