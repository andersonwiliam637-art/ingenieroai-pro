import { withTenantTransaction } from "@/lib/db/tenant-transaction";

export async function getDashboardSummary() {
  return withTenantTransaction(async (client, userId) => {
    const membership = await client.query<{ organization_id: string }>(
      `SELECT organization_id FROM public.memberships
        WHERE user_id = $1 AND status = 'active'
        ORDER BY created_at ASC LIMIT 1`, [userId],
    );
    const id = membership.rows[0]?.organization_id;
    if (!id) throw new Error("NO_ACTIVE_TENANT");
    const [leads, opportunities, products, collections] = await Promise.all([
      client.query<{ count: string }>("SELECT count(*)::text AS count FROM public.leads WHERE organization_id = $1", [id]),
      client.query<{ count: string }>("SELECT count(*)::text AS count FROM public.opportunities WHERE organization_id = $1", [id]),
      client.query<{ count: string }>("SELECT count(*)::text AS count FROM public.products WHERE organization_id = $1", [id]),
      client.query<{ count: string }>("SELECT count(*)::text AS count FROM public.collections WHERE organization_id = $1 AND status <> 'paid'", [id]),
    ]);
    return {
      leads: Number(leads.rows[0]?.count ?? 0),
      opportunities: Number(opportunities.rows[0]?.count ?? 0),
      products: Number(products.rows[0]?.count ?? 0),
      openCollections: Number(collections.rows[0]?.count ?? 0),
    };
  });
}
