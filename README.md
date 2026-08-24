# Naxcal

Naxcal is a Next.js account and portfolio platform for crypto deposits, market positions, transaction records, identity verification, withdrawals, notifications, and weekday profit accruals.

Investment products involve risk. Product copy must not claim a licence, regulatory status, compensation protection, guaranteed return, or operating statistic unless compliance has supplied current written evidence.

## Core rules

- The interface currently describes Bronze 1.5%, Silver 1.8%, and Gold 2.1% on eligible weekdays; production posting remains disabled until an authorised owner confirms that policy in writing and creates a versioned database policy.
- Financial mutations belong in atomic Postgres functions with an idempotency key and immutable ledger record.
- Browser clients must never update balances, roles, KYC approval, withdrawal credentials, or ledger rows directly.
- Provider webhooks fail closed when their signing secret is missing or the signature is invalid.
- Customer email is delivered through a durable outbox so a provider or network failure can be retried safely.

The detailed return policy is in [`docs/profit-policy.md`](docs/profit-policy.md).
The staged database and provider cutover is in [`docs/production-rollout.md`](docs/production-rollout.md).

## Local setup

Requirements:

- Node.js 20 or newer
- A separate Supabase development project
- Test credentials for Resend, Sumsub, and NOWPayments

Create the local environment file and replace every placeholder with a development value:

```bash
cp .env.example .env.local
npm ci
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Never put production service-role keys or customer identifiers in local fixtures, screenshots, logs, or commits.

## Quality gates

Run these before opening a pull request:

```bash
npm run test
npm run typecheck
npm run lint
npm run build
```

The build requires non-production placeholder values for required server environment variables. A change is not release-ready if any command fails.

## Architecture

- `src/app` — pages, layouts, and server route handlers
- `src/lib` — authentication, email delivery, provider signatures, profit workers, and shared domain rules
- `src/contexts` — client-side dashboard state
- `supabase/migrations` — ordered database changes and atomic financial functions
- `tests` — policy and security regression tests
- `docs` — operator-facing product and rollout documentation

Privileged operations use the server-only Supabase service role after authenticating and authorising the caller. Public browser code uses only the anonymous key.

## Database rollout safety

The migrations change access controls and financial paths. Test the complete sequence against a copy of production schema and representative synthetic data before any production rollout.

For production:

1. Pause affected money-moving jobs and deposit creation.
2. Inventory open provider payments and pending withdrawals.
3. Apply additive schema/functions first where compatibility allows.
4. Deploy compatible application code and run replay/concurrency checks.
5. Reconcile open provider records.
6. Apply restrictive grants and RLS changes only after the compatible app is healthy.
7. Re-enable jobs and monitor ledger, outbox, and webhook metrics.

Never repair a customer balance with an ad-hoc table update. Use the reviewed, user-scoped reconciliation path with a date range, dry-run output, reason, actor, and idempotency key.

## Deployment

Vercel schedules are defined in `vercel.json`. Set every secret in the deployment environment, use a strong `CRON_SECRET`, and keep preview credentials isolated from production. The current ten-minute leased workers require Vercel Pro or Enterprise; Hobby accepts only once-daily cron expressions and is not an equivalent production scheduler for this queue.

After deployment, verify:

- login, logout, callback, and MFA flows;
- KYC token and signed webhook handling;
- deposit intent creation and duplicate webhook delivery;
- concurrent withdrawal idempotency;
- weekday profit enqueueing and weekend skipping;
- email outbox retry and suppression behavior;
- dashboard, portfolio, statement, and support pages;
- security headers and provider iframe access.

Production balance changes, customer emails, and provider actions require an explicit operator decision after the dry-run or preview has been reviewed.
