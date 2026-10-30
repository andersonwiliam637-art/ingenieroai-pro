-- Least-privilege grants for the existing IngenieroAI.pro runtime role.
-- Run only after the role exists with LOGIN, NOSUPERUSER, NOCREATEDB, NOCREATEROLE,
-- NOREPLICATION and NOBYPASSRLS. This template does not create/reset passwords.
BEGIN;
GRANT CONNECT ON DATABASE neondb TO ingenieroai_runtime;
GRANT USAGE ON SCHEMA public, private TO ingenieroai_runtime;

-- Auth.js PostgreSQL adapter tables (server-side only; never expose DATABASE_URL to the browser).
GRANT SELECT, INSERT, UPDATE, DELETE ON public.users, public.accounts,
  public.sessions, public.verification_token TO ingenieroai_runtime;

-- Tenant identity and plan catalog are read-only from application code. RLS/policies apply.
GRANT SELECT ON public.memberships, public.organizations, public.roles,
  public.subscription_plans TO ingenieroai_runtime;

-- Only CRUD paths currently implemented in the MVP may mutate business rows.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.leads, public.products TO ingenieroai_runtime;
GRANT SELECT ON public.customers, public.opportunities, public.collections,
  public.appointments, public.orders, public.drivers, public.vehicles,
  public.routes, public.deliveries, public.cod_transactions,
  public.organization_modules, public.localization_settings, public.ai_agents,
  public.automation_rules, public.automation_runs, public.ai_usage_events TO ingenieroai_runtime;

-- Checkout creates pending transactions; verified-payment functions change subscription state.
GRANT SELECT ON public.subscriptions TO ingenieroai_runtime;
GRANT SELECT, INSERT, UPDATE ON public.payment_transactions TO ingenieroai_runtime;

-- SECURITY DEFINER provisioning/payment functions own membership/subscription/audit writes.
GRANT EXECUTE ON FUNCTION private.current_user_id() TO ingenieroai_runtime;
GRANT EXECUTE ON FUNCTION private.is_org_member(uuid) TO ingenieroai_runtime;
GRANT EXECUTE ON FUNCTION private.request_organization_registration(text,text,text,text,text) TO ingenieroai_runtime;
GRANT EXECUTE ON FUNCTION private.provision_pending_organization(uuid) TO ingenieroai_runtime;
GRANT EXECUTE ON FUNCTION private.apply_verified_payment(text,text,text,text,text,bigint,text,jsonb) TO ingenieroai_runtime;
COMMIT;
