"use server";

import { revalidatePath } from "next/cache";
import { withTenantTransaction } from "@/lib/db/tenant-transaction";

export type ActionState = { status: "idle" | "error" | "success"; message: string };

export async function createLeadAction(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const phone = String(formData.get("phone") ?? "").trim();
  const source = String(formData.get("source") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();
  if (name.length < 2 || name.length > 160) return { status: "error", message: "El nombre debe tener entre 2 y 160 caracteres." };
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { status: "error", message: "El correo del contacto no es válido." };
  if (phone.length > 40 || source.length > 80 || notes.length > 2000) return { status: "error", message: "Uno de los campos supera el límite permitido." };
  try {
    await withTenantTransaction(async (client, userId) => {
      const membership = await client.query<{ organization_id: string }>(
        "SELECT organization_id FROM public.memberships WHERE user_id=$1 AND status='active' ORDER BY created_at LIMIT 1", [userId],
      );
      const orgId = membership.rows[0]?.organization_id;
      if (!orgId) throw new Error("NO_ACTIVE_TENANT");
      const enabled = await client.query<{ enabled: boolean }>("SELECT enabled FROM public.organization_modules WHERE organization_id=$1 AND module='crm'::public.module_code", [orgId]);
      if (enabled.rows[0]?.enabled !== true) throw new Error("MODULE_DISABLED");
      await client.query(
        `INSERT INTO public.leads (organization_id, name, email, phone, source, notes)
         VALUES ($1, $2, NULLIF($3,''), NULLIF($4,''), NULLIF($5,''), NULLIF($6,''))`,
        [orgId, name, email, phone, source, notes],
      );
    });
    revalidatePath("/crm");
    revalidatePath("/dashboard");
    return { status: "success", message: "Contacto guardado." };
  } catch {
    return { status: "error", message: "No se pudo guardar el contacto. Verifica tu empresa y los permisos de la cuenta." };
  }
}

export async function deleteLeadAction(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(id)) return;
  await withTenantTransaction(async (client) => {
    const membership = await client.query<{ organization_id: string }>("SELECT organization_id FROM public.memberships WHERE user_id=private.current_user_id() AND status='active' ORDER BY created_at LIMIT 1");
    const orgId = membership.rows[0]?.organization_id;
    if (!orgId) return;
    const enabled = await client.query<{ enabled: boolean }>("SELECT enabled FROM public.organization_modules WHERE organization_id=$1 AND module='crm'::public.module_code", [orgId]);
    if (enabled.rows[0]?.enabled !== true) return;
    await client.query("DELETE FROM public.leads WHERE id=$1::uuid AND organization_id=$2::uuid", [id, orgId]);
  });
  revalidatePath("/crm");
  revalidatePath("/dashboard");
}
