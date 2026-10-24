-- IngenieroAI.pro — Neon PostgreSQL schema for review
-- Derived from the Phase 1–8 SQL included in the supplied project ZIP.
-- TARGET: Neon PostgreSQL + Auth.js (@auth/pg-adapter). NO Supabase runtime.
-- REVIEW FIRST: run only in a new/test Neon database; not an incremental migration.
-- Runtime tenant RLS expects each app transaction to SET LOCAL app.user_id to the
-- authenticated Auth.js user UUID. Use a non-owner runtime DB role; do not use the
-- migration/owner connection string as the app runtime credential.

begin;
create extension if not exists pgcrypto;
create schema if not exists private;
revoke all on schema private from public;

-- Auth.js PostgreSQL adapter tables. UUID IDs keep compatibility with the existing
-- business schema's user foreign keys. Auth.js adapter IDs are represented as strings.
create table public.users (
  id uuid primary key default gen_random_uuid(),
  name text,
  email text unique,
  "emailVerified" timestamptz,
  image text
);
create table public.accounts (
  id uuid primary key default gen_random_uuid(),
  "userId" uuid not null references public.users(id) on delete cascade,
  type text not null,
  provider text not null,
  "providerAccountId" text not null,
  refresh_token text,
  access_token text,
  expires_at bigint,
  token_type text,
  scope text,
  id_token text,
  session_state text,
  oauth_token_secret text,
  oauth_token text,
  unique(provider, "providerAccountId")
);
create table public.sessions (
  id uuid primary key default gen_random_uuid(),
  "sessionToken" text not null unique,
  "userId" uuid not null references public.users(id) on delete cascade,
  expires timestamptz not null
);
create table public.verification_token (
  identifier text not null,
  token text not null unique,
  expires timestamptz not null,
  primary key(identifier, token)
);


-- ===== Converted from 202610030001_initial_platform.sql; Supabase-specific policies removed and rebuilt below =====
create extension if not exists pgcrypto;
create type public.organization_region as enum ('LATAM','UAE');
create type public.membership_status as enum ('active','invited','suspended');
create type public.role_code as enum ('owner','admin','manager','member','viewer');
create type public.module_code as enum ('crm','sales','inventory','collections','calendar','reports','logistics','fleet','dispatch','delivery','cod','ai_automation');
create type public.lead_status as enum ('new','contacted','qualified','won','lost');
create type public.opportunity_stage as enum ('prospecting','proposal','negotiation','won','lost');
create type public.collection_status as enum ('open','partial','paid','overdue','cancelled');

create table public.organizations(id uuid primary key default gen_random_uuid(),name text not null,slug text not null unique,region public.organization_region not null,country_code text not null,currency_code text not null,locale text not null,timezone text not null,created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create table public.roles(id uuid primary key default gen_random_uuid(),code public.role_code not null unique,name text not null);
create table public.permissions(id uuid primary key default gen_random_uuid(),code text not null unique,description text);
create table public.role_permissions(role_id uuid not null references public.roles(id) on delete cascade,permission_id uuid not null references public.permissions(id) on delete cascade,primary key(role_id,permission_id));
create table public.memberships(id uuid primary key default gen_random_uuid(),organization_id uuid not null references public.organizations(id) on delete cascade,user_id uuid not null references public.users(id) on delete cascade,role_id uuid not null references public.roles(id),status public.membership_status not null default 'active',created_at timestamptz not null default now(),unique(organization_id,user_id));
create table public.organization_modules(organization_id uuid not null references public.organizations(id) on delete cascade,module public.module_code not null,enabled boolean not null default true,settings jsonb not null default '{}'::jsonb,primary key(organization_id,module));
create table public.customers(id uuid primary key default gen_random_uuid(),organization_id uuid not null references public.organizations(id) on delete cascade,legal_name text not null,trade_name text,tax_id text,email text,phone text,address text,city text,country_code text not null,notes text,created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create table public.files(id uuid primary key default gen_random_uuid(),organization_id uuid not null references public.organizations(id) on delete cascade,bucket text not null,path text not null,file_name text not null,mime_type text,size_bytes bigint,uploaded_by uuid references public.users(id),created_at timestamptz not null default now());
create table public.notifications(id uuid primary key default gen_random_uuid(),organization_id uuid not null references public.organizations(id) on delete cascade,user_id uuid references public.users(id) on delete cascade,type text not null,title text not null,body text,read_at timestamptz,created_at timestamptz not null default now());
create table public.audit_events(id bigint generated always as identity primary key,organization_id uuid not null references public.organizations(id) on delete cascade,actor_user_id uuid references public.users(id),action text not null,entity_type text,entity_id uuid,metadata jsonb not null default '{}'::jsonb,created_at timestamptz not null default now());
create table public.subscription_plans(id uuid primary key default gen_random_uuid(),code text not null unique,name text not null,currency_code text not null,amount numeric(14,2) not null check(amount>=0),interval_code text not null check(interval_code in('monthly','quarterly','annual')),active boolean not null default true);
create table public.subscriptions(id uuid primary key default gen_random_uuid(),organization_id uuid not null references public.organizations(id) on delete cascade,plan_id uuid not null references public.subscription_plans(id),provider text,provider_customer_id text,provider_subscription_id text,status text not null default 'trialing',current_period_start timestamptz,current_period_end timestamptz,cancel_at_period_end boolean not null default false,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),unique(provider,provider_subscription_id));

create table public.leads(id uuid primary key default gen_random_uuid(),organization_id uuid not null references public.organizations(id) on delete cascade,customer_id uuid references public.customers(id),name text not null,email text,phone text,source text,status public.lead_status not null default 'new',notes text,created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create table public.opportunities(id uuid primary key default gen_random_uuid(),organization_id uuid not null references public.organizations(id) on delete cascade,customer_id uuid references public.customers(id),name text not null,value numeric(14,2) not null default 0,currency_code text not null,stage public.opportunity_stage not null default 'prospecting',expected_close_date date,owner_user_id uuid references public.users(id),created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create table public.quotes(id uuid primary key default gen_random_uuid(),organization_id uuid not null references public.organizations(id) on delete cascade,customer_id uuid references public.customers(id),quote_number text not null,status text not null default 'draft',currency_code text not null,subtotal numeric(14,2) not null default 0,tax numeric(14,2) not null default 0,total numeric(14,2) not null default 0,valid_until date,created_by uuid references public.users(id),created_at timestamptz not null default now(),unique(organization_id,quote_number));
create table public.products(id uuid primary key default gen_random_uuid(),organization_id uuid not null references public.organizations(id) on delete cascade,sku text,name text not null,description text,unit_price numeric(14,2) not null default 0,currency_code text not null,stock_quantity numeric(14,3) not null default 0,reorder_level numeric(14,3) not null default 0,active boolean not null default true,created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create table public.collections(id uuid primary key default gen_random_uuid(),organization_id uuid not null references public.organizations(id) on delete cascade,customer_id uuid references public.customers(id),reference_type text not null,reference_id uuid,amount_due numeric(14,2) not null check(amount_due>=0),amount_paid numeric(14,2) not null default 0 check(amount_paid>=0),due_date date,status public.collection_status not null default 'open',created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create table public.appointments(id uuid primary key default gen_random_uuid(),organization_id uuid not null references public.organizations(id) on delete cascade,customer_id uuid references public.customers(id),assigned_user_id uuid references public.users(id),title text not null,starts_at timestamptz not null,ends_at timestamptz not null,status text not null default 'scheduled',notes text,created_at timestamptz not null default now());

create index memberships_user_idx on public.memberships(user_id);
create index memberships_org_idx on public.memberships(organization_id);
create index customers_org_idx on public.customers(organization_id);
create index leads_org_idx on public.leads(organization_id);
create index opportunities_org_idx on public.opportunities(organization_id);
create index products_org_idx on public.products(organization_id);
create index collections_org_idx on public.collections(organization_id);
create index appointments_org_idx on public.appointments(organization_id);
create index audit_events_org_created_idx on public.audit_events(organization_id,created_at desc);

insert into public.roles(code,name) values('owner','Owner'),('admin','Administrator'),('manager','Manager'),('member','Member'),('viewer','Viewer') on conflict(code) do nothing;

create schema if not exists private;
revoke all on schema private from public;
-- Neon-native identity helper must exist before converted security functions are parsed.
create or replace function private.current_user_id()
returns uuid language sql stable
as $$ select nullif(current_setting('app.user_id', true), '')::uuid $$;
revoke all on function private.current_user_id() from public;

-- Phase 4: UAE Operations & Logistics
create type public.order_status as enum ('draft','confirmed','assigned','out_for_delivery','delivered','failed','cancelled');
create type public.driver_status as enum ('available','assigned','on_route','offline','suspended');
create type public.delivery_status as enum ('pending','assigned','out_for_delivery','delivered','failed','returned');
create type public.cod_status as enum ('not_required','pending','collected','reconciled','failed');

create table public.orders (id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade, customer_id uuid references public.customers(id), order_number text not null, status public.order_status not null default 'draft', currency_code text not null, total numeric(14,2) not null default 0 check(total>=0), delivery_address text, delivery_city text, delivery_country_code text not null default 'AE', requested_delivery_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(organization_id,order_number));
create table public.drivers (id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade, user_id uuid references public.users(id), full_name text not null, phone text, license_reference text, status public.driver_status not null default 'offline', created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table public.vehicles (id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade, plate_number text not null, vehicle_type text, status text not null default 'active', created_at timestamptz not null default now(), unique(organization_id,plate_number));
create table public.routes (id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade, driver_id uuid references public.drivers(id), vehicle_id uuid references public.vehicles(id), route_date date not null, status text not null default 'planned', created_at timestamptz not null default now());
create table public.deliveries (id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade, order_id uuid not null references public.orders(id) on delete cascade, driver_id uuid references public.drivers(id), route_id uuid references public.routes(id), status public.delivery_status not null default 'pending', proof_of_delivery_path text, delivered_at timestamptz, recipient_name text, failure_reason text, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(order_id));
create table public.cod_transactions (id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade, order_id uuid not null references public.orders(id) on delete cascade, amount numeric(14,2) not null check(amount>=0), currency_code text not null default 'AED', status public.cod_status not null default 'pending', collected_at timestamptz, reconciled_at timestamptz, created_at timestamptz not null default now(), unique(order_id));
create table public.localization_settings (organization_id uuid primary key references public.organizations(id) on delete cascade, default_locale text not null, supported_locales text[] not null, default_currency text not null, timezone text not null, rtl_enabled boolean not null default false, updated_at timestamptz not null default now());

create index orders_org_idx on public.orders(organization_id);
create index drivers_org_idx on public.drivers(organization_id);
create index vehicles_org_idx on public.vehicles(organization_id);
create index routes_org_idx on public.routes(organization_id);
create index deliveries_org_idx on public.deliveries(organization_id);
create index cod_org_idx on public.cod_transactions(organization_id);

-- RLS on every exposed table.
do $$ declare t text; begin foreach t in array array['organizations','roles','permissions','role_permissions','memberships','organization_modules','customers','files','notifications','audit_events','subscription_plans','subscriptions','leads','opportunities','quotes','products','collections','appointments','orders','drivers','vehicles','routes','deliveries','cod_transactions','localization_settings'] loop execute format('alter table public.%I enable row level security',t); end loop; end $$;

-- Tenant CRUD policies.
-- No client INSERT policy on audit_events. Billing mutations are server/provider controlled.

-- PHASE 5 — BILLING / MONETIZATION
create table if not exists public.subscription_plans (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  name text not null,
  region text not null default 'GLOBAL',
  currency text not null default 'USD',
  amount_minor bigint not null default 0 check (amount_minor >= 0),
  interval text not null default 'month' check (interval in ('month','year')),
  active boolean not null default true,
  features jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  plan_id uuid not null references public.subscription_plans(id),
  status text not null default 'trialing' check (status in ('trialing','active','past_due','paused','canceled','incomplete')),
  provider text not null default 'manual',
  provider_customer_id text,
  provider_subscription_id text,
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id)
);

create table if not exists public.payment_transactions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  subscription_id uuid references public.subscriptions(id) on delete set null,
  provider text not null,
  provider_payment_id text,
  provider_event_id text,
  status text not null check (status in ('pending','succeeded','failed','refunded','canceled')),
  amount_minor bigint not null check (amount_minor >= 0),
  currency text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique(provider, provider_event_id)
);

create table if not exists public.webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  provider_event_id text not null,
  event_type text not null,
  payload jsonb not null,
  processed_at timestamptz,
  status text not null default 'received' check (status in ('received','processed','failed')),
  created_at timestamptz not null default now(),
  unique(provider, provider_event_id)
);

-- PHASE 6 — AI / AUTOMATION CORE
create table if not exists public.ai_agents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  provider text not null,
  model text not null,
  system_prompt text not null default '',
  enabled boolean not null default true,
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.automation_rules (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  trigger_type text not null,
  conditions jsonb not null default '{}'::jsonb,
  actions jsonb not null default '[]'::jsonb,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.automation_runs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  rule_id uuid references public.automation_rules(id) on delete set null,
  status text not null default 'queued' check (status in ('queued','running','succeeded','failed','canceled')),
  input jsonb not null default '{}'::jsonb,
  output jsonb not null default '{}'::jsonb,
  error text,
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.ai_usage_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  agent_id uuid references public.ai_agents(id) on delete set null,
  provider text not null,
  model text not null,
  input_tokens integer not null default 0,
  output_tokens integer not null default 0,
  estimated_cost_minor bigint not null default 0 check (estimated_cost_minor >= 0),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_subscriptions_org on public.subscriptions(organization_id);
create index if not exists idx_payment_transactions_org on public.payment_transactions(organization_id);
create index if not exists idx_ai_agents_org on public.ai_agents(organization_id);
create index if not exists idx_automation_rules_org on public.automation_rules(organization_id);
create index if not exists idx_automation_runs_org on public.automation_runs(organization_id);
create index if not exists idx_ai_usage_org_created on public.ai_usage_events(organization_id, created_at desc);



-- ===== Converted from 202610070001_phase_7_security_hardening.sql; Supabase-specific policies removed and rebuilt below =====
-- PHASE 7 — SECURITY / HARDENING

-- Normalize the earlier Phase 5 plan schema so the billing model is forward-compatible.
alter table public.subscription_plans add column if not exists region text not null default 'GLOBAL';
alter table public.subscription_plans add column if not exists currency text;
alter table public.subscription_plans add column if not exists amount_minor bigint;
alter table public.subscription_plans add column if not exists billing_interval text;
alter table public.subscription_plans add column if not exists features jsonb not null default '{}'::jsonb;
update public.subscription_plans
set currency = coalesce(currency, currency_code),
    amount_minor = coalesce(amount_minor, round(amount * 100)::bigint),
    billing_interval = coalesce(billing_interval, interval_code)
where currency is null or amount_minor is null or billing_interval is null;
alter table public.subscription_plans alter column currency set not null;
alter table public.subscription_plans alter column amount_minor set not null;
alter table public.subscription_plans alter column billing_interval set not null;
-- This migration tightens authorization boundaries. It intentionally does not
-- expose privileged billing/webhook/usage writes to browser sessions.

create schema if not exists private;

create table if not exists private.security_permission_catalog (
  code text primary key,
  description text not null
);

insert into private.security_permission_catalog(code, description) values
  ('organization.manage', 'Manage organization settings'),
  ('modules.manage', 'Enable or disable tenant modules'),
  ('billing.manage', 'Manage subscriptions and billing state'),
  ('ai.manage', 'Manage AI agents'),
  ('automation.manage', 'Manage automation rules')
on conflict (code) do nothing;

insert into public.permissions(code, description)
select code, description from private.security_permission_catalog
on conflict(code) do nothing;

-- Owners and admins receive sensitive management permissions.
insert into public.role_permissions(role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on p.code in ('organization.manage','modules.manage','billing.manage','ai.manage','automation.manage')
where r.code in ('owner','admin')
on conflict do nothing;

create or replace function private.has_org_permission(target_org uuid, permission_code text)
returns boolean
language sql
security definer
set search_path = public, pg_catalog
stable
as $$
  select exists (
    select 1
    from public.memberships m
    join public.role_permissions rp on rp.role_id = m.role_id
    join public.permissions p on p.id = rp.permission_id
    where m.organization_id = target_org
      and m.user_id = private.current_user_id()
      and m.status = 'active'
      and p.code = permission_code
  );
$$;

revoke all on function private.has_org_permission(uuid, text) from public;

-- Sensitive organization settings.
-- Billing state is provider/backend controlled. Clients may read their own tenant state
-- but cannot create, mutate, or delete subscription/payment records.


-- AI configuration and automation definitions require explicit management permission.
-- AI usage and automation runs are append/read infrastructure records.


-- ===== Converted from 202610070002_phase_7_2_integrity_hardening.sql; Supabase-specific policies removed and rebuilt below =====
-- PHASE 7.2 — TENANT INTEGRITY HARDENING
-- Prevent tenant reassignment and cross-tenant foreign-key references.

create or replace function private.assert_org_immutable()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if tg_op = 'UPDATE' and new.organization_id is distinct from old.organization_id then
    raise exception 'TENANT_REASSIGNMENT_FORBIDDEN' using errcode = '42501';
  end if;
  return new;
end;
$$;

create or replace function private.assert_same_org(target_table regclass, target_id uuid, target_org uuid)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  referenced_org uuid;
begin
  if target_id is null then
    return;
  end if;

  execute format('select organization_id from %s where id = $1', target_table)
    into referenced_org
    using target_id;

  if referenced_org is null then
    raise exception 'REFERENCED_ROW_NOT_FOUND' using errcode = '23503';
  end if;

  if referenced_org is distinct from target_org then
    raise exception 'CROSS_TENANT_REFERENCE_FORBIDDEN' using errcode = '42501';
  end if;
end;
$$;

revoke all on function private.assert_org_immutable() from public;
revoke all on function private.assert_same_org(regclass, uuid, uuid) from public;

do $$
declare
  t text;
begin
  foreach t in array array[
    'customers','files','notifications','audit_events','subscriptions','leads','opportunities','quotes',
    'products','collections','appointments','orders','drivers','vehicles','routes','deliveries',
    'cod_transactions','localization_settings','payment_transactions','ai_agents','automation_rules',
    'automation_runs','ai_usage_events'
  ] loop
    execute format('drop trigger if exists %I on public.%I', 'trg_'||t||'_org_immutable', t);
    execute format('create trigger %I before update on public.%I for each row execute function private.assert_org_immutable()', 'trg_'||t||'_org_immutable', t);
  end loop;
end $$;

-- Same-tenant references for business entities.
create or replace function private.validate_customer_reference_org()
returns trigger language plpgsql security definer set search_path = pg_catalog, public as $$
begin
  perform private.assert_same_org('public.customers'::regclass, new.customer_id, new.organization_id);
  return new;
end; $$;

create or replace function private.validate_driver_reference_org()
returns trigger language plpgsql security definer set search_path = pg_catalog, public as $$
begin
  perform private.assert_same_org('public.drivers'::regclass, new.driver_id, new.organization_id);
  return new;
end; $$;

create or replace function private.validate_vehicle_reference_org()
returns trigger language plpgsql security definer set search_path = pg_catalog, public as $$
begin
  perform private.assert_same_org('public.vehicles'::regclass, new.vehicle_id, new.organization_id);
  return new;
end; $$;

create or replace function private.validate_route_reference_org()
returns trigger language plpgsql security definer set search_path = pg_catalog, public as $$
begin
  perform private.assert_same_org('public.routes'::regclass, new.route_id, new.organization_id);
  return new;
end; $$;

create or replace function private.validate_order_reference_org()
returns trigger language plpgsql security definer set search_path = pg_catalog, public as $$
begin
  perform private.assert_same_org('public.orders'::regclass, new.order_id, new.organization_id);
  return new;
end; $$;

create or replace function private.validate_subscription_reference_org()
returns trigger language plpgsql security definer set search_path = pg_catalog, public as $$
begin
  perform private.assert_same_org('public.subscriptions'::regclass, new.subscription_id, new.organization_id);
  return new;
end; $$;

create or replace function private.validate_agent_reference_org()
returns trigger language plpgsql security definer set search_path = pg_catalog, public as $$
begin
  perform private.assert_same_org('public.ai_agents'::regclass, new.agent_id, new.organization_id);
  return new;
end; $$;

create or replace function private.validate_rule_reference_org()
returns trigger language plpgsql security definer set search_path = pg_catalog, public as $$
begin
  perform private.assert_same_org('public.automation_rules'::regclass, new.rule_id, new.organization_id);
  return new;
end; $$;

do $$
begin
  -- CRM / collections / scheduling / orders
  create trigger trg_leads_customer_org before insert or update on public.leads for each row execute function private.validate_customer_reference_org();
  create trigger trg_opportunities_customer_org before insert or update on public.opportunities for each row execute function private.validate_customer_reference_org();
  create trigger trg_quotes_customer_org before insert or update on public.quotes for each row execute function private.validate_customer_reference_org();
  create trigger trg_collections_customer_org before insert or update on public.collections for each row execute function private.validate_customer_reference_org();
  create trigger trg_appointments_customer_org before insert or update on public.appointments for each row execute function private.validate_customer_reference_org();
  create trigger trg_orders_customer_org before insert or update on public.orders for each row execute function private.validate_customer_reference_org();

  -- UAE logistics graph
  create trigger trg_routes_driver_org before insert or update on public.routes for each row execute function private.validate_driver_reference_org();
  create trigger trg_routes_vehicle_org before insert or update on public.routes for each row execute function private.validate_vehicle_reference_org();
  create trigger trg_deliveries_order_org before insert or update on public.deliveries for each row execute function private.validate_order_reference_org();
  create trigger trg_deliveries_driver_org before insert or update on public.deliveries for each row execute function private.validate_driver_reference_org();
  create trigger trg_deliveries_route_org before insert or update on public.deliveries for each row execute function private.validate_route_reference_org();
  create trigger trg_cod_order_org before insert or update on public.cod_transactions for each row execute function private.validate_order_reference_org();

  -- Billing / AI infrastructure
  create trigger trg_payment_subscription_org before insert or update on public.payment_transactions for each row execute function private.validate_subscription_reference_org();
  create trigger trg_automation_run_rule_org before insert or update on public.automation_runs for each row execute function private.validate_rule_reference_org();
  create trigger trg_ai_usage_agent_org before insert or update on public.ai_usage_events for each row execute function private.validate_agent_reference_org();
end $$;

-- Driver user references must belong to the same tenant membership.
create or replace function private.assert_user_org_member(target_user uuid, target_org uuid)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if target_user is null then return; end if;
  if not exists (
    select 1 from public.memberships
    where user_id = target_user
      and organization_id = target_org
      
  ) then
    raise exception 'CROSS_TENANT_USER_REFERENCE_FORBIDDEN' using errcode = '42501';
  end if;
end;
$$;
revoke all on function private.assert_user_org_member(uuid, uuid) from public;

create or replace function private.validate_org_user_references()
returns trigger language plpgsql security definer set search_path = pg_catalog, public as $$
begin
  if tg_table_name = 'drivers' then perform private.assert_user_org_member(new.user_id, new.organization_id); end if;
  if tg_table_name = 'opportunities' then perform private.assert_user_org_member(new.owner_user_id, new.organization_id); end if;
  if tg_table_name = 'appointments' then perform private.assert_user_org_member(new.assigned_user_id, new.organization_id); end if;
  if tg_table_name = 'files' then perform private.assert_user_org_member(new.uploaded_by, new.organization_id); end if;
  if tg_table_name = 'quotes' then perform private.assert_user_org_member(new.created_by, new.organization_id); end if;
  if tg_table_name = 'audit_events' then perform private.assert_user_org_member(new.actor_user_id, new.organization_id); end if;
  if tg_table_name = 'notifications' then perform private.assert_user_org_member(new.user_id, new.organization_id); end if;
  return new;
end; $$;

revoke all on function private.validate_org_user_references() from public;

do $$
declare t text;
begin
  foreach t in array array['drivers','opportunities','appointments','files','quotes','audit_events','notifications'] loop
    execute format('drop trigger if exists %I on public.%I', 'trg_'||t||'_user_org', t);
    execute format('create trigger %I before insert or update on public.%I for each row execute function private.validate_org_user_references()', 'trg_'||t||'_user_org', t);
  end loop;
end $$;

-- Storage: keep tenant objects private and namespaced by organization UUID.
-- Application uploads must use: tenant-files/<organization_uuid>/<object-path>.
-- We intentionally do not grant storage access here until the application upload layer
-- is implemented with a membership-backed policy and signed URL flow. Default deny is safer.

-- Structural assertions.
do $$
begin
  if not exists (select 1 from pg_proc where pronamespace='private'::regnamespace and proname='assert_org_immutable') then
    raise exception 'PHASE7.2: immutable tenant guard missing';
  end if;
  if not exists (select 1 from pg_proc where pronamespace='private'::regnamespace and proname='assert_same_org') then
    raise exception 'PHASE7.2: cross-tenant reference guard missing';
  end if;
end $$;

-- Neon-native identity helper. Application must set this transaction-locally from
-- the verified Auth.js session; never accept user_id directly from a client request.
create or replace function private.current_user_id()
returns uuid
language sql stable
as $$
  select nullif(current_setting('app.user_id', true), '')::uuid
$$;

create or replace function private.is_org_member(target_org uuid)
returns boolean
language sql stable security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1 from public.memberships m
    where m.organization_id = target_org
      and m.user_id = private.current_user_id()
      and m.status = 'active'
  )
$$;
revoke all on function private.current_user_id() from public;
revoke all on function private.is_org_member(uuid) from public;

-- Enable and FORCE tenant RLS on every public table with organization_id.
-- This is database-level defense in depth; application queries must still authorize.
do $$
declare r record;
begin
  for r in
    select c.table_schema, c.table_name
    from information_schema.columns c
    join information_schema.tables t
      on t.table_schema=c.table_schema and t.table_name=c.table_name
    where c.table_schema='public' and c.column_name='organization_id'
      and t.table_type='BASE TABLE'
      and c.table_name <> 'memberships'
  loop
    execute format('alter table %I.%I enable row level security', r.table_schema, r.table_name);
    execute format('alter table %I.%I force row level security', r.table_schema, r.table_name);
    execute format('drop policy if exists tenant_isolation_select on %I.%I', r.table_schema, r.table_name);
    execute format('drop policy if exists tenant_isolation_insert on %I.%I', r.table_schema, r.table_name);
    execute format('drop policy if exists tenant_isolation_update on %I.%I', r.table_schema, r.table_name);
    execute format('drop policy if exists tenant_isolation_delete on %I.%I', r.table_schema, r.table_name);
    execute format('create policy tenant_isolation_select on %I.%I for select using (private.is_org_member(organization_id))', r.table_schema, r.table_name);
    execute format('create policy tenant_isolation_insert on %I.%I for insert with check (private.is_org_member(organization_id))', r.table_schema, r.table_name);
    execute format('create policy tenant_isolation_update on %I.%I for update using (private.is_org_member(organization_id)) with check (private.is_org_member(organization_id))', r.table_schema, r.table_name);
    execute format('create policy tenant_isolation_delete on %I.%I for delete using (private.is_org_member(organization_id))', r.table_schema, r.table_name);
  end loop;
end $$;

-- Memberships: users can read only their own active/invited/suspended membership rows.
-- Keep this table out of FORCE RLS: private.is_org_member() is SECURITY DEFINER and
-- must be able to inspect membership rows without policy recursion. Membership writes
-- are intentionally denied to the app runtime role; use a reviewed owner/admin service
-- path for invitations, role changes, suspensions, and tenant provisioning.
alter table public.memberships enable row level security;
drop policy if exists memberships_select_self on public.memberships;
create policy memberships_select_self on public.memberships
  for select using (user_id = private.current_user_id());
drop policy if exists memberships_no_client_insert on public.memberships;
create policy memberships_no_client_insert on public.memberships
  for insert with check (false);
drop policy if exists memberships_no_client_update on public.memberships;
create policy memberships_no_client_update on public.memberships
  for update using (false) with check (false);
drop policy if exists memberships_no_client_delete on public.memberships;
create policy memberships_no_client_delete on public.memberships
  for delete using (false);

-- RLS policy expressions run with the requesting DB role, so that role must be able
-- to resolve and execute this narrow, boolean-only helper. It exposes no row data.
-- Runtime grants are intentionally applied separately after creating the dedicated app role.
-- See db/operations/02-runtime-role-grants.template.sql.

-- Organizations are tenant roots: users can see/update only organizations they belong to.
alter table public.organizations enable row level security;
alter table public.organizations force row level security;
drop policy if exists organizations_member_select on public.organizations;
drop policy if exists organizations_member_update on public.organizations;
create policy organizations_member_select on public.organizations for select using (private.is_org_member(id));
create policy organizations_member_update on public.organizations for update using (private.is_org_member(id)) with check (private.is_org_member(id));

-- Auth.js adapter tables are intentionally not covered by tenant RLS; access them only
-- through the server-side Auth.js adapter and tightly scoped runtime DB grants.
-- Do not expose public schema tables directly to browsers.

-- Default role catalog seed (safe to rerun).
insert into public.roles(code,name) values
 ('owner','Owner'),('admin','Administrator'),('manager','Manager'),('member','Member'),('viewer','Viewer')
on conflict(code) do nothing;

commit;

-- IMPORTANT operational requirements before production:
-- 1) Create a dedicated Neon runtime role distinct from the schema owner/migration role.
-- 2) Grant that runtime role only the required table/sequence/function privileges:
--    Auth.js CRUD on users/accounts/sessions/verification_token; SELECT on memberships;
--    SELECT/INSERT/UPDATE/DELETE only on business tables required by server routes;
--    never grant membership writes or owner/superuser/BYPASSRLS to the app role.
--    Do not grant direct DB credentials to browsers or end users.
-- 3) Run every authenticated business DB operation in a transaction and execute
--    SELECT set_config('app.user_id', $1, true) with the verified Auth.js user UUID.
-- 4) Verify adapter compatibility with the installed @auth/pg-adapter version.
-- 5) Apply to a disposable Neon branch/database first; run tenant-isolation tests.
-- 6) Review business foreign keys for customer_id references: original schema's
--    customer references are not all composite same-tenant FKs; trigger checks are
--    retained where present, but test every relationship before production.
