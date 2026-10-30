import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { withTenantTransaction } from "@/lib/db/tenant-transaction";
import CheckoutActions from "./checkout-actions";

export const metadata = { title: "Planes y cobros | IngenieroAI.pro" };

type Plan = { id: string; code: string; name: string; amount_minor: string; currency_code: string; interval_code: string; region: string; features: Record<string, unknown> };
type Current = { organization_id: string; organization_name: string; region: string; currency_code: string; plan_name: string | null; subscription_status: string | null; current_period_end: string | null; role_code: string };
function formatMoney(minor: string | number, currency: string) {
  return new Intl.NumberFormat(currency === "AED" ? "en-AE" : "es-GT", { style: "currency", currency }).format(Number(minor) / 100);
}

export default async function BillingPage({ searchParams }: { searchParams: Promise<{ payment?: string; provider?: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const query = await searchParams;
  let current: Current;
  let plans: Plan[];
  try {
    const data = await withTenantTransaction(async (client, userId) => {
      const tenant = await client.query<Current>(
        `SELECT o.id AS organization_id, o.name AS organization_name, o.region::text AS region, o.currency_code,
                p.name AS plan_name, s.status AS subscription_status, s.current_period_end::text, r.code::text AS role_code
           FROM public.memberships m
           JOIN public.organizations o ON o.id=m.organization_id
           JOIN public.roles r ON r.id=m.role_id
           LEFT JOIN public.subscriptions s ON s.organization_id=o.id
           LEFT JOIN public.subscription_plans p ON p.id=s.plan_id
          WHERE m.user_id=$1 AND m.status='active'
          ORDER BY m.created_at ASC LIMIT 1`, [userId],
      );
      const org = tenant.rows[0];
      if (!org) throw new Error("NO_ACTIVE_TENANT");
      const planRows = await client.query<Plan>(
        `SELECT id, code, name, amount_minor::text, currency_code, interval_code, region, features
           FROM public.subscription_plans
          WHERE active=true AND (region='GLOBAL' OR region=$1)
            AND (amount_minor=0 OR currency_code=$2 OR currency_code='USD')
          ORDER BY amount_minor ASC`, [org.region, org.currency_code],
      );
      return { current: org, plans: planRows.rows };
    });
    current = data.current; plans = data.plans;
  } catch (error) {
    if (error instanceof Error && error.message === "NO_ACTIVE_TENANT") redirect("/register");
    throw error;
  }
  const paymentsEnabled = process.env.BILLING_PAYMENTS_ENABLED === "true";
  const canManage = ["owner", "admin"].includes(current.role_code);
  const paymentMessage = query.payment === "pending"
    ? "El checkout se abrió. La licencia se activará después de verificar el pago del proveedor."
    : query.payment === "success"
      ? "Pago confirmado. Actualiza la página si el estado de la suscripción aún no se refleja."
      : query.payment === "cancelled" ? "El checkout se canceló. No se activó ningún plan de pago." : "";

  return <main className="shell">
    <header className="topbar"><div><div className="eyebrow">FACTURACIÓN · {current.organization_name}</div><h1>Planes y cobros</h1><p className="muted">Compra una licencia de la empresa. La activación requiere confirmación del proveedor, nunca el regreso del navegador.</p></div><Link className="button" href="/dashboard">Volver al dashboard</Link></header>
    {paymentMessage ? <section className="panel notice" role="status">{paymentMessage}</section> : null}
    <section className="panel"><div className="section-heading"><div><h2>Suscripción actual</h2><p className="muted">Empresa: {current.organization_name}</p></div><span className="pill">{current.subscription_status ?? "sin suscripción"}</span></div>
      <div className="current-plan"><strong>{current.plan_name ?? "Sin plan asignado"}</strong><span>Moneda de la empresa: {current.currency_code}</span><span>{current.current_period_end ? `Periodo hasta ${new Date(current.current_period_end).toLocaleDateString("es-GT")}` : "Sin vencimiento registrado"}</span></div>
    </section>
    <section className="section-gap"><div className="section-heading"><div><h2>Planes disponibles</h2><p className="muted">Precios leídos desde Neon; el servidor verifica el importe antes de crear cada checkout.</p></div></div>
      {plans.length === 0 ? <div className="panel"><h3>No hay planes de pago activos para tu región y moneda.</h3><p className="muted">El catálogo se debe configurar y revisar antes de ofrecer cobros reales.</p></div> : <div className="plan-grid">{plans.map(plan => {
        const amount = Number(plan.amount_minor);
        const isFree = amount === 0;
        return <article className="plan-card" key={plan.id}>
          <div className="eyebrow">{plan.region} · {plan.interval_code}</div><h2>{plan.name}</h2>
          <p className="plan-price">{isFree ? "Gratis" : formatMoney(plan.amount_minor, plan.currency_code)}<small>{isFree ? "" : ` / ${plan.interval_code === "annual" ? "año" : plan.interval_code === "quarterly" ? "trimestre" : "mes"}`}</small></p>
          <p className="muted">{Array.isArray(plan.features?.modules) ? `Módulos: ${(plan.features.modules as string[]).join(", ")}` : "Funciones según la configuración de la organización."}</p>
          {isFree ? <span className="pill">Plan sin cobro</span> : <CheckoutActions planCode={plan.code} currency={plan.currency_code} canCheckout={paymentsEnabled && canManage} />}
        </article>;
      })}</div>}
    </section>
    {!paymentsEnabled ? <p className="form-hint section-gap">Los pagos están desactivados mientras se prueban las credenciales sandbox y los webhooks. No se realizará ningún cobro hasta activar esa opción en Vercel.</p> : null}
    <section className="panel section-gap"><h2>Cómo se confirma el pago</h2><p className="muted">Recurrente y PayPal notifican el resultado al servidor. La aplicación verifica la firma del webhook, importe, moneda e idempotencia antes de cambiar la suscripción. Una página de éxito por sí sola nunca activa una licencia.</p></section>
  </main>;
}
