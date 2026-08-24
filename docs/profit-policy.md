# Proposed profit policy — owner confirmation required

This file documents the policy currently shown in the product interface. It is
not activated by the database migration. Before production posting resumes, an
authorised owner must confirm the rate period, eligible days, compounding rule,
basis, and effective date in writing, then create one versioned policy record.

The current interface describes one tier percentage per eligible UTC weekday:

- Bronze: 1.5%
- Silver: 1.8%
- Gold: 2.1%

Eligible days are Monday through Friday. Saturday and Sunday never accrue or
receive a profit entry. The scheduled job runs at 08:00 UTC on weekdays and
also checks the date in code. The database requires every new profit
transaction to have a Monday-through-Friday `profit_date`, providing a second
guard for manual posting and backfills.

The stated percentage is a daily rate, not a monthly rate divided across the
month. Compounding follows the account holder's saved auto-compound preference;
when that preference is disabled, credited profit is excluded from future
profit bases.

Backfills must use the original eligible weekday dates. They must not convert
missed weekend dates into Monday credits or silently combine multiple dates
under one ledger entry.

## Cash withdrawals and non-compounding profit

Cash withdrawals use a profit-first rule. When a withdrawal request reserves
cash, it first removes up to the withdrawal amount from that account's tracked
`excluded_noncompounding_profit`. The database stores the exact amount removed,
plus the before-and-after values, as immutable metadata on the withdrawal.

If a pending withdrawal is declined, or an approved processing withdrawal is
failed and refunded, the same database transaction restores exactly that stored
amount to `excluded_noncompounding_profit`. Repeating either operation cannot
restore it twice because only the first locked status transition performs the
refund and restoration.

Historical profit is never assumed to be compounding or non-compounding. If an
account has nonzero historical `total_profit` but no `profit_account_state` row,
new non-compounding accruals and withdrawals stop with a reconciliation error.
Only an account whose historical `total_profit` is exactly zero may initialize
a missing state row as a known zero. Operations staff must reconcile affected
legacy accounts before enabling accruals or reviewing their withdrawals.

Customer projections use five weekdays per week, an average of 22 weekdays per
month, and 260 weekdays per year. These are illustrative simple projections;
actual calendar months contain different numbers of weekdays.
