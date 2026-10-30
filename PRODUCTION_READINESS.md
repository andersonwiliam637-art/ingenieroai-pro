# IngenieroAI.pro — production readiness gates

## Current decision: NO-GO for live commercial launch

The code package now contains an initial self-service company-onboarding flow, an explicit SMTP sender, tenant-scoped CRUD for leads/products, billing UI, server-side single-period checkout endpoints for Recurrente/PayPal, and signed webhook handlers. These are code paths, not proof that the live application is ready for paying customers.

## Current production facts checked 2026-10-29

- Vercel's latest deployment is in state `READY`, so the site can be rendered.
- Runtime log errors on `/login` show `ECONNREFUSED 127.0.0.1:587`, because a real SMTP host/user/password/from are not configured in the live source/environment.
- Neon production currently has zero organizations, users, subscriptions and active plans in the queried schema; the `organization_registration_requests` table and its function are absent until migration `0002` is applied.
- The runtime role was checked to have login but not superuser, CREATEDB, CREATEROLE, replication, or BYPASSRLS. Preserve those restrictions.
- The new code has not yet been pushed from this patch, the incremental migration has not yet been applied, and live SMTP/provider credentials are not set.

## Mandatory gates before enabling registration and billing

1. Apply the source overlay from `IngenieroAI_Complete_MVP_Patch.zip` and push it to `main`; let Vercel build it.
2. Review and apply `db/migrations/0002_onboarding_billing_runtime.sql` to the existing production database. Never run `0001_neon_schema_review.sql` over existing production data. The migration refuses to continue if duplicate organization subscriptions exist; do not delete rows to force it.
3. Set real SMTP variables in Vercel: `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD`, `AUTH_EMAIL_FROM`. Use a sender/domain verified by the provider. The app should not use `localhost:587` in production.
4. Run `npm run qa:static`, `npm run qa:routes`, then a real `npm run build` with dependencies installed.
5. Check `/api/health` returns HTTP 200 and `ok:true` only after the migration is present.
6. Test registration with two test emails and two companies. Verify the first verified user becomes owner, a duplicate registration does not create a second tenant, and each company can only access its own leads/products.
7. Approve pricing and then seed/activate only the corresponding rows from `db/seeds/0003_paid_plans_proposal.sql`. The proposal values are inactive and not commercially approved.
8. Configure Recurrente test key and webhook signing secret and PayPal Sandbox credentials/webhook ID in Vercel. Test successful, cancelled, failed, duplicate and mismatched-amount events. Do not enable live payments until all succeed.
9. Current payment code is one-time checkout for a billing period, not automatic renewal. Automatic recurring subscriptions, team invitations, complete opportunity management, and full UAE/AI-automation operations still need implementation before those capabilities can be marketed as finished.
10. Complete rate limiting for public email requests, monitoring, backup/restore, tenant-isolation tests, tax/privacy review and an incident/rollback plan before broad release.

## Automated checks in this package

- `npm run qa:static`: pass.
- `npm run qa:routes`: pass.
- `npm install` timed out in this environment due to a registry/network failure, so a real `next build` and complete TypeScript check could not be verified here. Do not treat the static checks as a production certification.
