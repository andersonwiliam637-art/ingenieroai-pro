# Production gate — Neon tenant isolation

**Status: NOT RUN.** This test matrix must pass on a disposable Neon database with the actual non-owner runtime role before release. Static checks are not a substitute.

## Test identities
- Tenant A: user A is an active member of organization A.
- Tenant B: user B is an active member of organization B.
- A and B must not share an organization.
- Run tests using the exact database role configured in Render, never the migration owner.

## Required assertions
1. A can SELECT only A rows.
2. A receives zero B rows even when filtering directly by B's UUID.
3. A cannot INSERT a row with B's `organization_id`.
4. A cannot UPDATE an A row to change `organization_id` to B.
5. A cannot UPDATE or DELETE B rows by UUID.
6. A cannot read B notifications, files, audit events, AI usage, or automation runs.
7. A cannot read/write another user's memberships; membership INSERT/UPDATE/DELETE must be denied to the runtime role.
8. A cannot mutate plans, subscriptions, payment transactions, or webhook events from the browser/application's untrusted path.
9. A cannot attach a customer, order, driver, vehicle, route, or delivery from another tenant.
10. A cannot execute privileged `private.*` functions other than the intentionally granted tenant membership boolean helper and current identity getter.
11. Anonymous requests cannot access `/dashboard` or `/uae`.
12. `/api/health` returns 503 if PostgreSQL is unreachable and never discloses connection details.

## Fraud and billing invariants
- Replaying the same provider event must not create a second payment transaction.
- A browser/client must never be able to mark a payment `succeeded` or edit subscription state.
- Provider signatures must be verified against raw request bytes before processing webhooks.
- Webhook processing must be idempotent, persist event IDs, and reject stale/invalid events.
- Reconcile provider settlement reports against internal ledger records; alert on amount/currency mismatches.
- Do not store card PAN/CVV. Use provider-hosted checkout/tokenization and keep secrets only in Render secret environment variables.

## Abuse and AI invariants
- Add edge/WAF and server-side rate limits for login/email-link requests, passwordless token requests, expensive endpoints, and webhooks.
- Use provider quotas, per-tenant usage budgets, max input/output tokens, timeout and retry caps for AI operations.
- Treat customer messages and retrieved documents as untrusted input; defend against prompt injection and tool misuse.
- AI-generated actions with financial, account, delivery, or destructive impact require allow-listed tools and authorization checks; human approval for high-impact actions.
- Record security events without logging access tokens, credentials, or unnecessary personal data.

## Release gate
Do not call the platform production-secure until this matrix passes in a real Neon test branch and the build, auth email delivery, role grants, backup/restore, webhook, rate-limit, and load tests have passed.
