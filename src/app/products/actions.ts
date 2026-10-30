"use server";
import { revalidatePath } from "next/cache";
import { withTenantTransaction } from "@/lib/db/tenant-transaction";
export type ProductState = { status: "idle" | "error" | "success"; message: string };
export async function createProductAction(_previous: ProductState, formData: FormData): Promise<ProductState> {
  const name = String(formData.get("name") ?? "").trim();
  const sku = String(formData.get("sku") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const price = Number(formData.get("unit_price"));
  const stock = Number(formData.get("stock_quantity"));
  const currency = String(formData.get("currency_code") ?? "").trim().toUpperCase();
  if (name.length < 2 || name.length > 160) return { status: "error", message: "El nombre debe tener entre 2 y 160 caracteres." };
  if (sku.length > 80 || description.length > 1000) return { status: "error", message: "El SKU o la descripción supera el límite permitido." };
  if (!Number.isFinite(price) || price < 0 || price > 1_000_000_000) return { status: "error", message: "Introduce un precio válido." };
  if (!Number.isFinite(stock) || stock < 0 || stock > 1_000_000_000) return { status: "error", message: "Introduce una existencia válida." };
  if (!/^[A-Z]{3}$/.test(currency)) return { status: "error", message: "La moneda debe ser un código válido de 3 letras." };
  try {
    await withTenantTransaction(async (client, userId) => {
      const membership = await client.query<{ organization_id: string }>("SELECT organization_id FROM public.memberships WHERE user_id=$1 AND status='active' ORDER BY created_at LIMIT 1", [userId]);
      const orgId = membership.rows[0]?.organization_id;
      if (!orgId) throw new Error("NO_ACTIVE_TENANT");
      const enabled = await client.query<{ enabled: boolean }>("SELECT enabled FROM public.organization_modules WHERE organization_id=$1 AND module='inventory'::public.module_code", [orgId]);
      if (enabled.rows[0]?.enabled !== true) throw new Error("MODULE_DISABLED");
      await client.query(
        `INSERT INTO public.products (organization_id, sku, name, description, unit_price, currency_code, stock_quantity)
         VALUES ($1, NULLIF($2,''), $3, NULLIF($4,''), $5, $6, $7)`,
        [orgId, sku, name, description, price, currency, stock],
      );
    });
    revalidatePath("/products");
    revalidatePath("/dashboard");
    return { status: "success", message: "Producto guardado." };
  } catch {
    return { status: "error", message: "No se pudo guardar el producto. Verifica la configuración y los permisos." };
  }
}
export async function deactivateProductAction(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(id)) return;
  await withTenantTransaction(async (client) => { const membership = await client.query<{ organization_id: string }>("SELECT organization_id FROM public.memberships WHERE user_id=private.current_user_id() AND status='active' ORDER BY created_at LIMIT 1");
    const orgId = membership.rows[0]?.organization_id;
    if (!orgId) return;
    const enabled = await client.query<{ enabled: boolean }>("SELECT enabled FROM public.organization_modules WHERE organization_id=$1 AND module='inventory'::public.module_code", [orgId]);
    if (enabled.rows[0]?.enabled !== true) return;
    await client.query("UPDATE public.products SET active=false, updated_at=now() WHERE id=$1::uuid AND organization_id=$2::uuid", [id, orgId]); });
  revalidatePath("/products");
  revalidatePath("/dashboard");
}
