-- IngenieroAI.pro
-- Allow the runtime to read the fixed global role catalogue.
-- This is required to resolve owner/admin permissions in billing.
-- It grants SELECT only; it does not grant role creation or modification.

BEGIN;

ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM pg_policies
     WHERE schemaname = 'public'
       AND tablename = 'roles'
       AND policyname = 'roles_runtime_select'
  ) THEN
    CREATE POLICY roles_runtime_select
      ON public.roles
      FOR SELECT
      TO ingenieroai_runtime
      USING (true);
  END IF;
END
$$;

GRANT SELECT ON public.roles TO ingenieroai_runtime;

COMMIT;
