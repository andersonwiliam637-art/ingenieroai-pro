import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { withTenantTransaction } from "@/lib/db/tenant-transaction";
import ProductForm from "./product-form";
import { deactivateProductAction } from "./actions";
export const metadata = { title: "Productos | IngenieroAI.pro" };
type Product = { id: string; sku: string | null; name: string; description: string | null; unit_price: string; currency_code: string; stock_quantity: string; active: boolean };
export default async function ProductsPage() {
  const user = await getCurrentUser(); if (!user) redirect("/login");
  let products: Product[] = []; let currency = "GTQ"; let orgName = "";
  try {
    const data = await withTenantTransaction(async (client, userId) => {
      const m = await client.query<{ organization_id: string; currency_code: string; name: string }>(`SELECT o.id AS organization_id,o.currency_code,o.name FROM public.memberships m JOIN public.organizations o ON o.id=m.organization_id WHERE m.user_id=$1 AND m.status='active' ORDER BY m.created_at LIMIT 1`, [userId]);
      const org = m.rows[0]; if (!org) throw new Error("NO_ACTIVE_TENANT");
      const entitlement = await client.query<{ enabled: boolean }>("SELECT enabled FROM public.organization_modules WHERE organization_id=$1 AND module='inventory'::public.module_code", [org.organization_id]);
      if (entitlement.rows[0]?.enabled !== true) throw new Error("MODULE_DISABLED");
      const rows = await client.query<Product>("SELECT id, sku, name, description, unit_price::text, currency_code, stock_quantity::text, active FROM public.products WHERE organization_id=$1 ORDER BY created_at DESC LIMIT 100", [org.organization_id]);
      return { products: rows.rows, currency: org.currency_code, name: org.name };
    });
    products = data.products; currency = data.currency; orgName = data.name;
  } catch (error) { if (error instanceof Error && error.message === "NO_ACTIVE_TENANT") redirect("/register"); if (error instanceof Error && error.message === "MODULE_DISABLED") return <main className="shell"><section className="panel"><h1>Inventario no habilitado</h1><p className="muted">Solicita al propietario de la empresa que habilite el módulo en el plan.</p><Link className="button" href="/billing">Ver planes</Link></section></main>; throw error; }
  return <main className="shell"><header className="topbar"><div><div className="eyebrow">INVENTARIO · {orgName}</div><h1>Productos y servicios</h1><p className="muted">Lista base de productos, precio y existencia para tu empresa.</p></div><Link className="button" href="/dashboard">Volver al dashboard</Link></header>
    <section className="panel"><h2>Nuevo producto</h2><ProductForm currency={currency} /></section>
    <section className="panel section-gap"><div className="section-heading"><div><h2>Catálogo</h2><p className="muted">Últimos 100 productos</p></div><span className="status">{products.length} productos</span></div>
      {products.length===0 ? <p className="empty-state">El catálogo está vacío. Registra el primer producto o servicio.</p> : <div className="table-wrap"><table><thead><tr><th>Producto</th><th>SKU</th><th>Precio</th><th>Existencia</th><th>Estado</th><th></th></tr></thead><tbody>{products.map(p=><tr key={p.id}><td><strong>{p.name}</strong><small>{p.description??"Sin descripción"}</small></td><td>{p.sku??"—"}</td><td>{new Intl.NumberFormat("es-GT",{style:"currency",currency:p.currency_code}).format(Number(p.unit_price))}</td><td>{Number(p.stock_quantity).toLocaleString("es-GT")}</td><td><span className="pill">{p.active?"Activo":"Inactivo"}</span></td><td>{p.active?<form action={deactivateProductAction}><input type="hidden" name="id" value={p.id}/><button className="button danger small">Desactivar</button></form>:null}</td></tr>)}</tbody></table></div>}
    </section></main>;
}
