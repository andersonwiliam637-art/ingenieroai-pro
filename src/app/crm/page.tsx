import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { withTenantTransaction } from "@/lib/db/tenant-transaction";
import LeadForm from "./lead-form";
import { deleteLeadAction } from "./actions";

export const metadata = { title: "CRM | IngenieroAI.pro" };

type Lead = { id: string; name: string; email: string | null; phone: string | null; source: string | null; status: string; created_at: string };

export default async function CrmPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  let leads: Lead[] = [];
  let organizationName = "";
  try {
    const data = await withTenantTransaction(async (client, userId) => {
      const membership = await client.query<{ organization_id: string; name: string }>(
        `SELECT o.id AS organization_id, o.name FROM public.memberships m
         JOIN public.organizations o ON o.id=m.organization_id
         WHERE m.user_id=$1 AND m.status='active' ORDER BY m.created_at LIMIT 1`, [userId],
      );
      const org = membership.rows[0];
      if (!org) throw new Error("NO_ACTIVE_TENANT");
      const entitlement = await client.query<{ enabled: boolean }>("SELECT enabled FROM public.organization_modules WHERE organization_id=$1 AND module='crm'::public.module_code", [org.organization_id]);
      if (entitlement.rows[0]?.enabled !== true) throw new Error("MODULE_DISABLED");
      const rows = await client.query<Lead>(
        `SELECT id, name, email, phone, source, status, created_at FROM public.leads
         WHERE organization_id=$1 ORDER BY created_at DESC LIMIT 100`, [org.organization_id],
      );
      return { organizationName: org.name, leads: rows.rows };
    });
    organizationName = data.organizationName;
    leads = data.leads;
  } catch (error) {
    if (error instanceof Error && error.message === "NO_ACTIVE_TENANT") redirect("/register");
    if (error instanceof Error && error.message === "MODULE_DISABLED") return <main className="shell"><section className="panel"><h1>CRM no habilitado</h1><p className="muted">Solicita al propietario de la empresa que habilite el módulo en el plan.</p><Link className="button" href="/dashboard">Volver</Link></section></main>;
    throw error;
  }
  return <main className="shell">
    <header className="topbar"><div><div className="eyebrow">CRM · {organizationName}</div><h1>Contactos y prospectos</h1><p className="muted">Tus contactos quedan asociados a la empresa de tu sesión.</p></div><Link className="button" href="/dashboard">Volver al dashboard</Link></header>
    <section className="panel"><h2>Registrar contacto</h2><LeadForm /></section>
    <section className="panel section-gap"><div className="section-heading"><div><h2>Prospectos recientes</h2><p className="muted">Últimos 100 registros</p></div><span className="status">{leads.length} contactos</span></div>
      {leads.length === 0 ? <p className="empty-state">Todavía no hay contactos. Agrega el primero con el formulario anterior.</p> : <div className="table-wrap"><table><thead><tr><th>Contacto</th><th>Teléfono</th><th>Origen</th><th>Estado</th><th>Registro</th><th></th></tr></thead><tbody>{leads.map((lead) => <tr key={lead.id}><td><strong>{lead.name}</strong><small>{lead.email ?? "Sin correo"}</small></td><td>{lead.phone ?? "—"}</td><td>{lead.source ?? "—"}</td><td><span className="pill">{lead.status}</span></td><td>{new Date(lead.created_at).toLocaleDateString("es-GT")}</td><td><form action={deleteLeadAction}><input type="hidden" name="id" value={lead.id} /><button className="button danger small" aria-label={`Eliminar ${lead.name}`}>Eliminar</button></form></td></tr>)}</tbody></table></div>}
    </section>
  </main>;
}
