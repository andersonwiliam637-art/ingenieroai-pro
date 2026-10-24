-- READ-ONLY release gate. Run as database owner on the target branch.
-- Replace the role name if your approved runtime role differs.
-- A missing row or any unexpected privilege is a NO-GO; do not proceed to app testing.

WITH target AS (
  SELECT r.oid, r.rolname, r.rolcanlogin, r.rolsuper, r.rolcreatedb,
         r.rolcreaterole, r.rolreplication, r.rolbypassrls
    FROM pg_roles r
   WHERE r.rolname = 'ingenieroai_runtime'
), table_privileges AS (
  SELECT
    has_table_privilege('ingenieroai_runtime', 'public.memberships', 'INSERT') AS membership_insert,
    has_table_privilege('ingenieroai_runtime', 'public.memberships', 'UPDATE') AS membership_update,
    has_table_privilege('ingenieroai_runtime', 'public.memberships', 'DELETE') AS membership_delete,
    has_table_privilege('ingenieroai_runtime', 'public.subscriptions', 'UPDATE') AS subscriptions_update,
    has_table_privilege('ingenieroai_runtime', 'public.payment_transactions', 'INSERT') AS payments_insert,
    has_table_privilege('ingenieroai_runtime', 'public.webhook_events', 'SELECT') AS webhook_select,
    has_table_privilege('ingenieroai_runtime', 'public.webhook_events', 'INSERT') AS webhook_insert,
    has_table_privilege('ingenieroai_runtime', 'public.customers', 'SELECT') AS customers_select
)
SELECT
  (t.oid IS NOT NULL) AS role_exists,
  t.rolname,
  t.rolcanlogin AS can_login,
  t.rolsuper AS is_superuser,
  t.rolcreatedb AS can_create_database,
  t.rolcreaterole AS can_create_roles,
  t.rolreplication AS can_replicate,
  t.rolbypassrls AS bypasses_rls,
  p.membership_insert,
  p.membership_update,
  p.membership_delete,
  p.subscriptions_update,
  p.payments_insert,
  p.webhook_select,
  p.webhook_insert,
  p.customers_select,
  CASE
    WHEN t.oid IS NULL THEN 'NO_GO_ROLE_MISSING'
    WHEN t.rolsuper OR t.rolcreatedb OR t.rolcreaterole OR t.rolreplication OR t.rolbypassrls
      THEN 'NO_GO_ROLE_ATTRIBUTES'
    WHEN p.membership_insert OR p.membership_update OR p.membership_delete
      OR p.subscriptions_update OR p.payments_insert OR p.webhook_select OR p.webhook_insert
      THEN 'NO_GO_EXCESS_PRIVILEGES'
    WHEN NOT p.customers_select THEN 'NO_GO_REQUIRED_PRIVILEGE_MISSING'
    ELSE 'ROLE_GATE_PASSED_ONLY_NOT_TENANT_ISOLATION'
  END AS gate_result
FROM (SELECT 1) seed
LEFT JOIN target t ON true
CROSS JOIN table_privileges p;
