
-- IngenieroAI.pro
-- Approved subscription catalog and automatic module synchronization.
-- Does not enable live payments or modify provider credentials.

BEGIN;

-- 1. Approved subscription plans.
INSERT INTO public.subscription_plans
  (code, name, currency_code, amount, interval_code, active,
   region, currency, amount_minor, billing_interval, features)
VALUES
  (
    'pro-gtq-monthly', 'Pro · Guatemala',
    'GTQ', 199, 'monthly', true, 'LATAM', 'GTQ',
    19900, 'month',
    '{"tier":"pro","modules":["crm","sales","inventory","collections","calendar","reports"],"limits":{"users":10}}'::jsonb
  ),
  (
    'business-gtq-monthly', 'Business · Guatemala',
    'GTQ', 499, 'monthly', true, 'LATAM', 'GTQ',
    49900, 'month',
    '{"tier":"business","modules":["crm","sales","inventory","collections","calendar","reports","ai_automation"],"limits":{"users":30}}'::jsonb
  ),
  (
    'pro-usd-monthly', 'Pro · Internacional',
    'USD', 29, 'monthly', true, 'LATAM', 'USD',
    2900, 'month',
    '{"tier":"pro","modules":["crm","sales","inventory","collections","calendar","reports"],"limits":{"users":10}}'::jsonb
  ),
  (
    'business-usd-monthly', 'Business · Internacional',
    'USD', 79, 'monthly', true, 'LATAM', 'USD',
    7900, 'month',
    '{"tier":"business","modules":["crm","sales","inventory","collections","calendar","reports","ai_automation"],"limits":{"users":30}}'::jsonb
  ),
  (
    'pro-uae-usd-monthly', 'Pro · UAE (USD)',
    'USD', 29, 'monthly', true, 'UAE', 'USD',
    2900, 'month',
    '{"tier":"pro","modules":["crm","sales","inventory","collections","calendar","reports","logistics","fleet","dispatch","delivery","cod"],"limits":{"users":10}}'::jsonb
  ),
  (
    'business-uae-usd-monthly', 'Business · UAE (USD)',
    'USD', 79, 'monthly', true, 'UAE', 'USD',
    7900, 'month',
    '{"tier":"business","modules":["crm","sales","inventory","collections","calendar","reports","logistics","fleet","dispatch","delivery","cod","ai_automation"],"limits":{"users":30}}'::jsonb
  )
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  currency_code = EXCLUDED.currency_code,
  amount = EXCLUDED.amount,
  interval_code = EXCLUDED.interval_code,
  active = true,
  region = EXCLUDED.region,
  currency = EXCLUDED.currency,
  amount_minor = EXCLUDED.amount_minor,
  billing_interval = EXCLUDED.billing_interval,
  features = EXCLUDED.features;


-- 2. Synchronize organization modules when a subscription changes plan.
CREATE OR REPLACE FUNCTION private.sync_subscription_modules_from_plan()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, private
AS $$
DECLARE
  v_features jsonb;
  v_modules jsonb;
  v_region public.organization_region;
  v_module public.module_code;
  v_enabled boolean;
BEGIN
  SELECT p.features, o.region
    INTO v_features, v_region
    FROM public.subscription_plans p
    JOIN public.organizations o
      ON o.id = NEW.organization_id
   WHERE p.id = NEW.plan_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'SUBSCRIPTION_PLAN_NOT_FOUND';
  END IF;

  v_modules := v_features->'modules';

  IF v_modules IS NULL OR jsonb_typeof(v_modules) <> 'array' THEN
    RAISE EXCEPTION 'SUBSCRIPTION_PLAN_MODULES_INVALID';
  END IF;

  -- UAE free accounts retain their basic logistics modules.
  IF v_region = 'UAE' AND v_features->>'tier' = 'free' THEN
    v_modules := v_modules ||
      '["logistics","fleet","dispatch","delivery","cod"]'::jsonb;
  END IF;

  FOR v_module IN
    SELECT unnest(enum_range(NULL::public.module_code))
  LOOP
    v_enabled := v_modules ? v_module::text;

    INSERT INTO public.organization_modules
      (organization_id, module, enabled, settings)
    VALUES
      (NEW.organization_id, v_module, v_enabled, '{}'::jsonb)
    ON CONFLICT (organization_id, module)
    DO UPDATE SET enabled = EXCLUDED.enabled;
  END LOOP;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.sync_subscription_modules_from_plan()
FROM PUBLIC;


-- 3. Apply synchronization only when the plan actually changes.
DROP TRIGGER IF EXISTS subscriptions_sync_modules
ON public.subscriptions;

CREATE TRIGGER subscriptions_sync_modules
AFTER UPDATE OF plan_id
ON public.subscriptions
FOR EACH ROW
WHEN (OLD.plan_id IS DISTINCT FROM NEW.plan_id)
EXECUTE FUNCTION private.sync_subscription_modules_from_plan();
-- Sincronizar módulos al crear una suscripción.
CREATE TRIGGER subscriptions_sync_modules_on_insert
AFTER INSERT
ON public.subscriptions
FOR EACH ROW
EXECUTE FUNCTION private.sync_subscription_modules_from_plan();

COMMIT;
