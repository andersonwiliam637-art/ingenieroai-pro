-- PHASE 8 — STRUCTURAL QA / SECURITY REGRESSION CHECKS
-- Run in a trusted Supabase SQL session after applying all migrations.
-- This checks architecture invariants; live two-tenant authorization tests still require
-- two real authenticated users and are documented in tenant_isolation_live.md.

do $$
declare
  missing_rls text;
begin
  select string_agg(c.relname, ', ' order by c.relname)
  into missing_rls
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relkind = 'r'
    and c.relname not like 'spatial_%'
    and not c.relrowsecurity;

  if missing_rls is not null then
    raise exception 'QA-RLS: public tables without RLS: %', missing_rls;
  end if;
end $$;

do $$
begin
  if has_table_privilege('anon', 'public.organizations', 'SELECT') then
    raise exception 'QA-GRANTS: anon can read organizations';
  end if;
  if has_table_privilege('authenticated', 'public.webhook_events', 'SELECT') then
    raise exception 'QA-GRANTS: authenticated can read webhook_events';
  end if;
  if has_table_privilege('authenticated', 'public.payment_transactions', 'INSERT') then
    raise exception 'QA-GRANTS: authenticated can insert payment_transactions';
  end if;
  if has_table_privilege('authenticated', 'public.ai_usage_events', 'INSERT') then
    raise exception 'QA-GRANTS: authenticated can insert ai_usage_events';
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_proc where pronamespace = 'private'::regnamespace and proname = 'is_org_member') then
    raise exception 'QA-RLS: private.is_org_member missing';
  end if;
  if not exists (select 1 from pg_proc where pronamespace = 'private'::regnamespace and proname = 'has_org_permission') then
    raise exception 'QA-AUTHZ: private.has_org_permission missing';
  end if;
end $$;

-- Check that every UPDATE policy on tenant-scoped tables has WITH CHECK.
do $$
declare bad_count integer;
begin
  select count(*) into bad_count
  from pg_policies
  where schemaname = 'public'
    and cmd = 'UPDATE'
    and with_check is null;
  if bad_count > 0 then
    raise exception 'QA-RLS: % UPDATE policies lack WITH CHECK', bad_count;
  end if;
end $$;

-- Tenant-integrity regression checks.
do $$
begin
  if not exists (
    select 1 from pg_trigger
    where tgname = 'trg_customers_org_immutable'
      and tgrelid = 'public.customers'::regclass
  ) then raise exception 'QA-INTEGRITY: customer tenant immutability trigger missing'; end if;

  if not exists (
    select 1 from pg_trigger
    where tgname = 'trg_leads_customer_org'
      and tgrelid = 'public.leads'::regclass
  ) then raise exception 'QA-INTEGRITY: lead/customer tenant guard missing'; end if;

  if not exists (
    select 1 from pg_trigger
    where tgname = 'trg_deliveries_order_org'
      and tgrelid = 'public.deliveries'::regclass
  ) then raise exception 'QA-INTEGRITY: delivery/order tenant guard missing'; end if;

  if not exists (
    select 1 from pg_trigger
    where tgname = 'trg_payment_subscription_org'
      and tgrelid = 'public.payment_transactions'::regclass
  ) then raise exception 'QA-INTEGRITY: payment/subscription tenant guard missing'; end if;
end $$;

select 'PHASE_8_STRUCTURAL_QA_PASSED' as result;
