# Production rollout and reconciliation runbook

This release changes authentication, database privileges, deposits, trading,
withdrawals, profit posting, and email delivery. Do not run all migrations
against production while the old application is serving traffic.

## Release gates

Before production:

1. Create a restorable database backup and a staging copy with synthetic data.
2. Confirm the written profit contract: rate period, eligible days, basis,
   compounding rule, tier rates, effective date, and timezone.
3. Inventory every open NOWPayments payment and pending/processing withdrawal.
4. Confirm Resend, NOWPayments, and Sumsub webhook secrets in the target
   environment. Never paste them into a ticket, chat, log, or commit.
5. Confirm the Vercel project is on Pro or Enterprise. The durable email and
   profit workers run every ten minutes; Vercel Hobby permits only one cron
   invocation per day and will reject this deployment schedule.
6. Run the repository checks from a clean checkout:

   ```sh
   npm ci --ignore-scripts
   npm run typecheck
   npm run lint
   npm test
   npm run build -- --webpack
   npm audit --omit=dev --audit-level=high
   ```

## Read-only database preflight

Run these queries first. Save the results in the restricted release record.
They do not change data.

```sql
select schemaname, tablename, policyname, cmd, roles, qual, with_check
from pg_policies
where schemaname = 'public'
  and tablename in ('profiles', 'transactions')
order by tablename, policyname;

select grantee, table_name, privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name in ('profiles', 'transactions')
order by table_name, grantee, privilege_type;

select is_admin, count(*)
from public.profiles
group by is_admin;

select type, count(*)
from public.transactions
group by type
order by type;

select user_id, (created_at at time zone 'UTC')::date as profit_date, count(*)
from public.transactions
where type = 'profit'
group by user_id, (created_at at time zone 'UTC')::date
having count(*) > 1;

select status, count(*)
from public.transactions
where type = 'withdrawal'
group by status;
```

Any unexpected administrator, protected-field change, unsupported transaction
type, or duplicate profit date stops the release for investigation.

## Coordinated cutover

1. Pause deposit creation, provider webhook switching, withdrawals, trading, and
   scheduled jobs. Keep the maintenance window visible to operators.
2. Apply additive migrations `202608190002` through `202608190007`, followed by
   `202608190009_finalize_withdrawals.sql`, in staging and then production.
   Migration `202608190009` is mandatory because it also replaces the partial
   notification deduplication index required by the earlier financial RPCs.
   Do not apply `202608190010_emergency_access_control.sql` yet.
3. Import all still-open pre-cutover NOWPayments payments into
   `payment_intents`, matching provider payment ID, order ID, user, requested
   amount, currencies, and already-credited ledger state. A second reviewer
   must approve this reconciliation.
4. Deploy the compatible application. Keep profit posting disabled: migration
   `202608190004` intentionally creates no active policy.
5. In staging, prove that duplicate and concurrent payment callbacks credit
   exactly once; changed idempotency payloads are rejected; concurrent trades
   and withdrawals preserve balances; rejected withdrawals refund once; and a
   processing withdrawal completes once with its payout reference.
6. Switch signed provider webhooks to the new deployment and reconcile failed
   inbox rows and open provider payments.
7. Apply `202608190010_emergency_access_control.sql`. Verify that an ordinary
   authenticated browser cannot read the PIN hash, change financial/admin/KYC
   profile fields, or insert ledger entries directly.
8. Re-enable one financial path at a time while monitoring application logs,
   webhook inboxes, ledger totals, outbox retries, delivery webhooks, and rate
   limits.

## Profit policy activation

Do not create an enabled policy until the owner has confirmed the contract in
writing. Insert the policy and all three tier rates in one transaction, initially
disabled; review it; then enable it. The no-overlap trigger prevents two active
policies covering the same date.

Before enabling a non-compounding policy, every account with historical profit
must have a reviewed `profit_account_state` baseline. Reconstruct the amount of
profit still present in cash or position cost; do not copy `total_profit`
blindly. Call `initialize_profit_account_state` with an account-specific reason,
an idempotency key, and the exact confirmation `INITIALIZE PROFIT STATE <user
uuid>`. The immutable baseline event is the release evidence. Accounts with no
historical profit may start automatically at zero on their first real accrual.

After baselining, withdrawals reserve non-compounding profit first and record
the exact reserved amount in immutable transaction metadata. A rejected or
failed withdrawal restores that exact amount once; a completed withdrawal does
not restore it.

The first scheduled run should be observed. Verify that its UTC date, eligible
basis, rate, compounding flag, transaction, notification, and email-outbox row
agree before allowing the worker to process the remaining accounts.

## One-account historical profit repair

Never use the retired global catch-up endpoint. For one account:

1. Reconstruct each missing eligible date from the immutable ledger and cron
   history.
2. Identify any ineligible weekend credits or compounded excess. Preserve the
   original rows and use `correct_profit_overcredit` to create compensating
   debit entries; never edit or delete the original profit transactions. Mark
   cash impact explicitly: use `CASH` only when the over-credit is still in the
   current cash balance and `TOTAL ONLY` when evidence proves it was already
   removed during a prior migration or reconciliation.
3. Initialize the account's non-compounding state from reviewed ledger evidence
   before either a preview or execution. The baseline must represent profit
   still included in current cash or position cost, not lifetime `total_profit`.
4. Record an explicit historical eligible basis for every missing date.
5. Call `reconcile_profit_accruals` with `p_execute = false` and have a second
   reviewer compare every date and the total with the signed contract.
6. Only after approval, repeat with `p_execute = true` and the exact confirmation
   text `POST N PROFIT ACCRUALS`, where `N` is the number of requested dates.
7. Request one summary email, not one email per backfilled date. If over-credits
   were removed, include the gross missing credit, removed amount, and net cash
   change in the outbox payload so the customer sees the complete reconciliation.
   The database
   posts all dated ledger entries and the summary outbox row in the same
   transaction.
8. Verify the outbox row reaches `sent`, then use the signed Resend webhook event
   to confirm delivery status. A provider acceptance response alone is not proof
   that the recipient received the message.

## Rollback

If verification fails, pause the affected path again. Do not reverse financial
entries with direct updates or destructive SQL. Record compensating ledger
entries through a reviewed atomic command. Restore application access only from
the tested release or database backup, and preserve webhook/audit evidence.
