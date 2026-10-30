-- Pricing proposal for review. This file is NOT part of migration 0002 and is NOT run automatically.
-- Suggested starting prices only; review margins, provider fees, tax, and market first.
-- Rows are inactive so they cannot be purchased before the owner approves the final price.
BEGIN;
INSERT INTO public.subscription_plans
  (code,name,currency_code,amount,interval_code,active,region,currency,amount_minor,billing_interval,features)
VALUES
  ('pro-gtq-monthly','Pro · Guatemala','GTQ',199,'monthly',false,'LATAM','GTQ',19900,'month',
   '{"tier":"pro","modules":["crm","sales","inventory","collections","calendar","reports"],"limits":{"users":10}}'::jsonb),
  ('business-gtq-monthly','Business · Guatemala','GTQ',499,'monthly',false,'LATAM','GTQ',49900,'month',
   '{"tier":"business","modules":["crm","sales","inventory","collections","calendar","reports","ai_automation"],"limits":{"users":30}}'::jsonb),
  ('pro-usd-monthly','Pro · LATAM USD','USD',29,'monthly',false,'LATAM','USD',2900,'month',
   '{"tier":"pro","modules":["crm","sales","inventory","collections","calendar","reports"],"limits":{"users":10}}'::jsonb),
  ('business-usd-monthly','Business · LATAM USD','USD',79,'monthly',false,'LATAM','USD',7900,'month',
   '{"tier":"business","modules":["crm","sales","inventory","collections","calendar","reports","ai_automation"],"limits":{"users":30}}'::jsonb),
  ('pro-uae-usd-monthly','Pro · UAE (USD)','USD',29,'monthly',false,'UAE','USD',2900,'month',
   '{"tier":"pro","modules":["crm","sales","inventory","collections","calendar","reports","logistics","fleet","dispatch","delivery","cod"],"limits":{"users":10}}'::jsonb),
  ('business-uae-usd-monthly','Business · UAE (USD)','USD',79,'monthly',false,'UAE','USD',7900,'month',
   '{"tier":"business","modules":["crm","sales","inventory","collections","calendar","reports","logistics","fleet","dispatch","delivery","cod","ai_automation"],"limits":{"users":30}}'::jsonb)
ON CONFLICT (code) DO NOTHING;
COMMIT;
