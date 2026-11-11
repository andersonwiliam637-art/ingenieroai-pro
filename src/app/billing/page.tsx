import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { withTenantTransaction } from "@/lib/db/tenant-transaction";
import CheckoutActions from "./checkout-actions";
import "./billing.css";

export const metadata = { title: "Planes y cobros | IngenieroAI.pro" };

type Plan = { id: string; code: string; name: string; amount_minor: string; currency_code: string; interval_code: string; region: string; features: Record<string, unknown> };
type Current = { organization_id: string; organization_name: string; region: string; currency_code: string; plan_name: string | null; subscription_status: string | null; current_period_end: string | null; role_code: string };

const recurrenteLinks: Record<string, string> = {
  "pro-gtq-monthly": "https://app.recurrente.com/s/willy-salan/pro-guatemala",
  "business-gtq-monthly": "https://app.recurrente.com/s/willy-salan/bussines-guatemala",
  "pro-usd-monthly": "https://app.recurrente.com/s/willy-salan/pro-internacional",
  "business-usd-monthly": "https://app.recurrente.com/s/willy-salan/bussines-international",
  "pro-uae-usd-monthly": "https://app.recurrente.com/s/willy-salan/pro-uae",
  "business-uae-usd-monthly": "https://app.recurrente.com/s/willy-salan/business-uae",
};

const moduleLabels: Record<string, string> = {
  crm: "Gestión de clientes (CRM)", sales: "Ventas y oportunidades", inventory: "Control de inventario",
  collections: "Cobros y cuentas por cobrar", calendar: "Agenda y calendario", reports: "Reportes del negocio",
  ai_automation: "Automatización con inteligencia artificial", logistics: "Gestión logística",
  fleet: "Control de flota", dispatch: "Despacho de pedidos", delivery: "Seguimiento de entregas", cod: "Cobro contra entrega",
};
function formatMoney(minor: string | number, currency: string) {
  return new Intl.NumberFormat(currency === "AED" ? "en-AE" : "es-GT", { style: "currency", currency }).format(Number(minor) / 100);
}
function tierFor(plan: Plan) {
  const code = plan.code.toLowerCase();
  if (code.includes("business")) return "business";
  if (code.includes("pro")) return "pro";
  return "starter";
}
function benefitsFor(plan: Plan) {
  const modules = Array.isArray(plan.features?.modules) ? plan.features.modules as string[] : [];
  const limits = plan.features?.limits && typeof plan.features.limits === "object" ? plan.features.limits as Record<string, unknown> : {};
  const users = limits.users;
  return { modules: modules.map((key) => moduleLabels[key] ?? key), users: typeof users === "number" ? users : null };
}

export default async function BillingPage({ searchParams }: { searchParams: Promise<{ payment?: string; provider?: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const query = await searchParams;
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
  }).catch((error: unknown) => {
    if (error instanceof Error && error.message === "NO_ACTIVE_TENANT") redirect("/register");
    throw error;
  });
  const { current, plans } = data;
  const paymentsEnabled = process.env.BILLING_PAYMENTS_ENABLED === "true";
  const canManage = ["owner", "admin"].includes(current.role_code);
  const paymentMessage = query.payment === "pending"
    ? "El checkout se abrió. El plan se activará cuando el proveedor confirme el pago."
    : query.payment === "success"
      ? "El proveedor devolvió una confirmación. El servidor debe verificar el webhook antes de activar el plan."
      : query.payment === "cancelled" ? "El checkout se canceló. No se activó ningún plan de pago." : "";

  const grouped = ["starter", "pro", "business"].map((tier) => ({
    tier,
    plans: plans.filter((plan) => tierFor(plan) === tier),
  })).filter((group) => group.plans.length > 0);

  return <main className="billing-shell">
    <header className="billing-header">
      <div><div className="billing-eyebrow">INGENIEROAI.PRO · FACTURACIÓN</div><h1>Elige el plan que impulsa tu negocio.</h1>
        <p>Herramientas para organizar clientes, ventas, inventario y operaciones desde un solo espacio de trabajo.</p></div>
      <Link className="billing-back" href="/dashboard">Volver al dashboard</Link>
    </header>
    {paymentMessage ? <div className="billing-notice" role="status">{paymentMessage}</div> : null}
    <section className="billing-current">
      <div><span className="billing-kicker">TU SUSCRIPCIÓN</span><h2>{current.plan_name ?? "Sin plan asignado"}</h2>
        <p>{current.organization_name} · {current.subscription_status ?? "sin suscripción"} · {current.currency_code}</p></div>
      <span className="billing-current-date">{current.current_period_end ? `Periodo hasta ${new Date(current.current_period_end).toLocaleDateString("es-GT")}` : "Sin vencimiento registrado"}</span>
    </section>
    <section className="billing-plans">
      <div className="billing-section-title"><span className="billing-kicker">PLANES DISPONIBLES</span><h2>Precios claros. Beneficios concretos.</h2>
        <p>Selecciona el nivel para tu empresa. Los importes se consultan directamente del catálogo de suscripciones.</p></div>
      <div className="billing-grid">
        {grouped.map(({ tier, plans: variants }) => {
          const primary = variants[0];
          const benefits = benefitsFor(primary);
          const title = tier === "starter" ? "Starter" : tier === "pro" ? "Pro" : "Business";
          const description = tier === "starter" ? "Empieza a organizar la operación de tu empresa." : tier === "pro" ? "Control operativo para equipos que están creciendo." : "Más capacidad y automatización para escalar tu negocio.";
          return <article className={`billing-card ${tier === "business" ? "billing-featured" : ""}`} key={tier}>
            {tier === "business" ? <span className="billing-recommended">MÁS COMPLETO</span> : null}
            <div className="billing-card-top"><span className="billing-tier">{title}</span><span className="billing-region">{[...new Set(variants.map((p) => p.region))].join(" · ")}</span></div>
            <h3>{title === "Starter" ? "Comienza gratis" : title === "Pro" ? "Controla tu operación" : "Lleva tu empresa más lejos"}</h3>
            <p className="billing-description">{description}</p>
            <div className="billing-benefits-heading">Incluye</div>
            <ul className="billing-benefits">
              {benefits.users ? <li><strong>Hasta {benefits.users} usuarios</strong></li> : null}
              {benefits.modules.map((label) => <li key={label}>{label}</li>)}
            </ul>
            <div className="billing-price-options">
              {variants.map((plan) => <div className="billing-price-row" key={plan.id}>
                <div><strong>{Number(plan.amount_minor) === 0 ? "Gratis" : formatMoney(plan.amount_minor, plan.currency_code)}</strong>
                  <small>{plan.currency_code} · {plan.interval_code === "annual" ? "por año" : plan.interval_code === "quarterly" ? "por trimestre" : Number(plan.amount_minor) === 0 ? "sin costo" : "por mes"}</small></div>
                {Number(plan.amount_minor) === 0
                  ? <span className="billing-included">Plan gratuito</span>
                  : <CheckoutActions planCode={plan.code} currency={plan.currency_code} canCheckout={paymentsEnabled && canManage} recurrenteUrl={recurrenteLinks[plan.code]} />}
              </div>)}
            </div>
          </article>;
        })}
      </div>
    </section>
    {!paymentsEnabled ? <p className="billing-disabled-note">Los pagos están temporalmente desactivados. Los botones se muestran para que puedas revisar las opciones, pero no se iniciará ningún cobro hasta completar y verificar las credenciales y webhooks de los proveedores.</p> : null}
    <footer className="billing-security"><strong>Pagos verificados y activación segura</strong><p>La suscripción solo cambia cuando el servidor valida la notificación del proveedor, el importe, la moneda y la operación. Volver desde la página de pago no activa una licencia por sí solo.</p></footer>
  </main>;
}
