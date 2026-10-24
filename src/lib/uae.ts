import { withTenantTransaction } from "@/lib/db/tenant-transaction";

export async function getUaeOperationsSummary() {
  return withTenantTransaction(async (client, userId) => {
    const membership = await client.query<{ organization_id: string }>(
      `SELECT organization_id FROM public.memberships
        WHERE user_id = $1 AND status = 'active'
        ORDER BY created_at ASC LIMIT 1`, [userId],
    );
    const id = membership.rows[0]?.organization_id;
    if (!id) throw new Error("NO_ACTIVE_TENANT");
    const [orders, drivers, vehicles, deliveries, cod] = await Promise.all([
      client.query<{ count: string }>("SELECT count(*)::text AS count FROM public.orders WHERE organization_id = $1", [id]),
      client.query<{ count: string }>("SELECT count(*)::text AS count FROM public.drivers WHERE organization_id = $1", [id]),
      client.query<{ count: string }>("SELECT count(*)::text AS count FROM public.vehicles WHERE organization_id = $1", [id]),
      client.query<{ count: string }>("SELECT count(*)::text AS count FROM public.deliveries WHERE organization_id = $1 AND status <> 'delivered'", [id]),
      client.query<{ count: string }>("SELECT count(*)::text AS count FROM public.cod_transactions WHERE organization_id = $1 AND status IN ('pending', 'collected')", [id]),
    ]);
    return {
      orders: Number(orders.rows[0]?.count ?? 0),
      drivers: Number(drivers.rows[0]?.count ?? 0),
      vehicles: Number(vehicles.rows[0]?.count ?? 0),
      openDeliveries: Number(deliveries.rows[0]?.count ?? 0),
      pendingCod: Number(cod.rows[0]?.count ?? 0),
    };
  });
}
