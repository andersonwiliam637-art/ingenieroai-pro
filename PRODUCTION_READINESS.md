# IngenieroAI.pro — production readiness and security gate

Date: 2026-10-17

## Current truthful status
This package is an **integration candidate**, not a certified production release. A static scaffold check passes, but dependency installation timed out in this execution environment. Consequently, the Next.js production build, TypeScript compilation, Auth.js/SMTP flow, PostgreSQL migration, live tenant isolation, and load tests have **not** passed. No Neon, SMTP, payment provider, or Render production credentials were supplied to this environment; no remote deployment or live database change was performed.

## Changes included in this revision
- Neon `pg` pool and Auth.js PostgreSQL adapter configuration.
- Consolidated PostgreSQL schema from supplied phases 1–8, migrated away from Supabase runtime dependencies.
- Membership row policy: a user can read only their own membership rows; membership writes are denied by RLS policy.
- Explicit helper permissions required by RLS expressions.
- Authenticated-only dashboard routes redirect to `/login`.
- Missing `/verify-request` page added.
- Health endpoint performs a database connectivity check, returns 503 on failure, and suppresses driver details.
- Production CSP no longer includes `unsafe-eval`.
- Updated tenant-isolation and fraud/billing release matrix.

## Mandatory work before production
1. **Build gate:** run `npm ci`, `npm run build`, and fix every compiler/build error in CI.
2. **SQL gate:** apply migration to a disposable Neon branch with a migration-owner credential; verify rollback/recovery and rerun behavior. Do not run the consolidated initial schema against an existing database.
3. **Runtime role:** create a dedicated role with SQL using `db/operations/01-runtime-role-bootstrap.template.sql`; do not create it through Neon Console/API/CLI, because those methods grant `neon_superuser` membership. Replace the password placeholder with a generated secret outside source control. Verify role attributes and inherited memberships before applying `02-runtime-role-grants.template.sql`, then run `03-runtime-role-verification.sql`. Never give the browser database credentials.
4. **Tenant gate:** execute `db/tests/tenant_isolation_live.md` with two users and two organizations using the exact runtime role. Test direct UUID access, cross-tenant foreign keys, membership mutation, and function execution.
5. **Auth gate:** configure a real SMTP sender, use a strong `AUTH_SECRET`, verify links, expiry, one-time token behavior, generic responses, abuse throttling, session expiry, and account lifecycle. Confirm the adapter's UUID schema compatibility with the pinned package version.
6. **Provisioning:** implement and test a secure first-organization and owner-membership provisioning flow. Do not manually grant arbitrary memberships from a public endpoint.
7. **Fraud/payments:** provider-specific checkout and webhook handlers are not fully implemented by this package. Before accepting money, verify raw-body signatures, idempotency, amount/currency, replay protection, reconciliation, audit trails, refund/dispute flows, and least-privilege provider keys. Never trust client-provided payment status.
8. **Abuse controls:** add rate limiting/WAF for email-link requests and public APIs; request limits, quotas, and anomaly alerts; protect AI tools from prompt injection and unauthorized actions.
9. **Operational security:** configure TLS, secret rotation, encrypted backups, tested restore, migration rollback strategy, dependency scanning, secret scanning, vulnerability triage, log redaction, audit retention, incident response, and alerts.
10. **Scale:** use a bounded connection pool compatible with Neon/Render limits, timeouts, statement/transaction limits, indexes validated by `EXPLAIN ANALYZE`, pagination, background jobs/queue for slow work, cache only non-sensitive derived data, and run representative concurrent load tests before choosing a plan.
11. **Compliance:** review Guatemala/LATAM and UAE privacy, retention, tax, e-invoicing, payment, and data residency obligations with qualified local counsel for the actual launch markets.
12. **Deployment gate:** set production secrets in Render, deploy to staging, run smoke/security/load tests, then promote with a rollback plan. No live deployment has been performed from this workspace.

## Current automated result
- `npm run qa:static`: checks provider removal and expected scaffolding; it is not a security certification.
- `npm install`: timed out in this environment.
- `npm run build`: not verifiable until dependencies install; do not report as passed.
- Neon SQL execution / live tests / SMTP / payment / load / restore: not run.

## Go/no-go
**NO-GO for production until all mandatory gates above are evidenced as PASS.** This is not a claim that the app is unsafe in every respect; it means critical behavior has not been verified and several operational features are not implemented in this package.

## Additional hard gate — runtime-role provisioning
A role-creation API response is not proof of effective PostgreSQL role attributes. Before granting any application privileges, query `pg_roles` and execute `db/operations/03-runtime-role-verification.sql` on the intended branch. If the role is missing, can create databases/roles, can replicate, is superuser, bypasses RLS, can mutate memberships/subscriptions/payment state, or can access webhook events, the gate must be treated as NO-GO. The verification query is necessary but not sufficient: it does not prove tenant isolation. Do not use the database owner as the application's `DATABASE_URL` role.


## Runtime-role investigation update — 2026-10-20
- On the test branch, role creation through the Neon role-management tool produced elevated effective attributes and broad inherited access; that test role was deleted.
- Official Neon documentation confirms roles created via Console/API/CLI inherit `neon_superuser`; limited roles must be created with SQL.
- Updated the bootstrap/grants templates to enforce SQL-based creation and separate verification. No new production role was created and no production role/grant changes were made during this investigation.
- SQL role creation through the connected Neon execution interface was blocked by the tool security layer, so a properly constrained runtime role is still not provisioned or verified.
