# Naxcal

Naxcal is a Next.js investment account portal with Supabase authentication and ledger storage, Sumsub KYC, Resend email delivery, wallet migration, portfolio views, and guarded admin operations.

## Local setup

1. Install Node.js 20+ and dependencies with `npm ci`.
2. Add required environment variables to `.env.local` without committing it.
3. Run `npm run dev` and open `http://localhost:3000`.

Never expose service-role, webhook, cron, migration, or email API secrets through `NEXT_PUBLIC_*` variables.

## Verification

```bash
npm test
npm run lint
npm run build
```

Financial and security changes must test authorization, idempotency, duplicate prevention, and balance invariants.

## Database changes

Apply `supabase/security-and-ledger-hardening.sql` before deploying the matching application release. It removes direct client mutation policies and adds atomic withdrawals, shared rate limits, notification preferences, and operational events.

Back up production first, apply in staging, verify the application, and then deploy. Do not partially deploy the database and application changes.

## Scheduled jobs

- Daily profit: 08:00 UTC, Monday–Friday only.
- Jay Jones wallet sync: 07:00 UTC daily.

Daily profit has both a weekday schedule and a server-side weekend guard. Cron routes require `CRON_SECRET`. Failures are written to `system_events` and surfaced in the admin dashboard.

## Accounting rules

- `transactions` is the audit trail; corrections use explicit adjustment entries.
- Balance changes must be atomic with their ledger entry.
- Every retryable financial request needs an idempotency key.
- Customer account value and admin AUM use the same persisted valuation helper.
- Never delete or silently overwrite settled financial history.

## Security rules

- Withdrawal PINs are scrypt-hashed and verified only on the server.
- KYC tokens are bound to the authenticated user.
- Profile and admin updates use explicit field allowlists.
- Never log secrets, PINs, access tokens, provider payloads, or authentication codes.

## Production checklist

1. Apply reviewed database migrations.
2. Run tests, lint, and the production build.
3. Complete KYC, deposit, and withdrawal smoke tests on a preview.
4. Confirm Vercel checks and merge through a pull request.
5. Verify the next scheduled cron and email delivery events.
6. Review `system_events`, withdrawals, and the audit log.
