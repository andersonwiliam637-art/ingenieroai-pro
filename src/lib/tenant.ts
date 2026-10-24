import { withTenantTransaction } from "@/lib/db/tenant-transaction";

export type CurrentMembership = {
  id: string;
  organization_id: string;
  role_id: string;
  status: "active";
  organization_name: string;
  organization_slug: string;
  region: "LATAM" | "UAE";
  currency_code: string;
};

export async function getCurrentMembership(): Promise<CurrentMembership> {
  return withTenantTransaction(async (client, userId) => {
    const result = await client.query<CurrentMembership>(
      `SELECT m.id, m.organization_id, m.role_id, m.status,
              o.name AS organization_name, o.slug AS organization_slug,
              o.region, o.currency_code
         FROM public.memberships m
         JOIN public.organizations o ON o.id = m.organization_id
        WHERE m.user_id = $1 AND m.status = 'active'
        ORDER BY m.created_at ASC
        LIMIT 1`,
      [userId],
    );
    if (!result.rows[0]) throw new Error("NO_ACTIVE_TENANT");
    return result.rows[0];
  });
}
