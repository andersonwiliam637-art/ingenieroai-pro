# Neon + Auth.js migration status

## Current schema

The existing Neon production database has a tenant-oriented PostgreSQL schema including `organizations`, `memberships`, roles, Auth.js adapter tables, CRM/product tables, `subscriptions`, `subscription_plans`, `payment_transactions`, and `webhook_events`. Do not recreate these tables from the initial consolidated migration.

## Required incremental step

`db/migrations/0002_onboarding_billing_runtime.sql` is the incremental migration for:

- pending company registration data with expiration and email throttling;
- secure organization/owner provisioning only after Auth.js has verified the email;
- an active zero-cost Starter Free plan;
- a unique current-subscription-per-organization invariant (migration aborts if it finds duplicates);
- audit sequence default repair;
- signed-provider payment application/idempotency functions;
- least-privilege grants for `ingenieroai_runtime` and RLS-aware table policies.

Apply only after reviewing the migration against current production schema. It is additive, but the unique index deliberately stops if the data violates its invariant. It does not process customer charges or activate paid plan prices.

## Runtime role

`ingenieroai_runtime` was created in production and checked: `LOGIN=true`, `SUPERUSER=false`, `CREATEDB=false`, `CREATEROLE=false`, `REPLICATION=false`, `BYPASSRLS=false`, and it is not a member of `neon_superuser`. Keep the application configured with this role, never with `neondb_owner`.

## Readiness

Until migration 0002 is applied, `/register` cannot complete registration even if the page has deployed. The updated health endpoint will return HTTP 503 with `onboarding:"migration_required"` while the schema is incomplete. SMTP must also be configured separately in Vercel.
