-- Run as database owner AFTER 01-runtime-role-bootstrap.template.sql and verifying role attributes.
-- Create this role with SQL, NOT Neon Console/API/CLI; those methods grant neon_superuser membership.
-- Never grant BYPASSRLS. Stop if role attributes or inherited memberships are elevated.
-- Review this allow-list against actual server-side routes before each release.

GRANT CONNECT ON DATABASE neondb TO ingenieroai_runtime;
GRANT USAGE ON SCHEMA public, private TO ingenieroai_runtime;

-- Auth.js adapter server-only tables.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.users, public.accounts,
  public.sessions, public.verification_token TO ingenieroai_runtime;

-- Identity/membership and reference data: read-only to application runtime.
GRANT SELECT ON public.memberships, public.organizations, public.roles,
  public.permissions, public.role_permissions, public.organization_modules,
  public.subscription_plans TO ingenieroai_runtime;

-- Operational tenant tables. RLS policies scope all organization_id tables.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customers, public.files,
  public.notifications, public.leads, public.opportunities, public.quotes,
  public.products, public.collections, public.appointments, public.orders,
  public.drivers, public.vehicles, public.routes, public.deliveries,
  public.cod_transactions, public.localization_settings, public.ai_agents,
  public.automation_rules, public.automation_runs, public.ai_usage_events
  TO ingenieroai_runtime;

-- Append/read audit. No mutation or deletion of audit history from app runtime.
GRANT SELECT, INSERT ON public.audit_events TO ingenieroai_runtime;
GRANT USAGE, SELECT ON SEQUENCE public.audit_events_id_seq TO ingenieroai_runtime;

-- Financial state is read-only here; provider-signed webhook processing must use a
-- separate narrowly scoped service role/path with signature verification and idempotency.
GRANT SELECT ON public.subscriptions, public.payment_transactions TO ingenieroai_runtime;
-- Intentionally NO runtime grant on public.webhook_events.

-- Narrow helper execution required by RLS policies. Do not grant all private functions.
GRANT EXECUTE ON FUNCTION private.current_user_id() TO ingenieroai_runtime;
GRANT EXECUTE ON FUNCTION private.is_org_member(uuid) TO ingenieroai_runtime;

-- Verify effective privileges after applying grants using 03-runtime-role-verification.sql.
-- Do not treat this grants template as proof of tenant isolation.
