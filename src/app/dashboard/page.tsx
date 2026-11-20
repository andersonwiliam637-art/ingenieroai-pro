import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getDashboardSummary } from "@/lib/latam";
import "./dashboard.css";

type IconName = "home" | "users" | "box" | "wallet" | "globe" | "arrow" | "plus" | "spark";

function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  const common = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true as const };
  const shapes: Record<IconName, React.ReactNode> = {
    home: <><path d="m3 10 9-7 9 7" /><path d="M5 9v12h14V9M9 21v-7h6v7" /></>,
    users: <><circle cx="9" cy="8" r="3" /><path d="M3 20v-1a6 6 0 0 1 12 0v1M16 5.5a3 3 0 0 1 0 5.8M18 14a4.5 4.5 0 0 1 3 4.2V20" /></>,
    box: <><path d="m12 3 9 4.5v9L12 21l-9-4.5v-9L12 3Z" /><path d="m3.5 7.7 8.5 4.5 8.5-4.5M12 12.2V21M7.5 5.3l9 4.6" /></>,
    wallet: <><rect x="3" y="5" width="18" height="15" rx="2" /><path d="M3 9h18M16 14h2M7 5V3h11" /></>,
    globe: <><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" /></>,
    arrow: <><path d="M5 12h14M13 6l6 6-6 6" /></>,
    plus: <><path d="M12 5v14M5 12h14" /></>,
    spark: <><path d="m12 3 1.8 6.2L20 11l-6.2 1.8L12 19l-1.8-6.2L4 11l6.2-1.8L12 3Z" /><path d="m19 16 .8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8L19 16Z" /></>,
  };
  return <svg {...common}>{shapes[name]}</svg>;
}

const navigation: { label: string; href: string; icon: IconName; key: string }[] = [
  { label: "Panel general", href: "/dashboard", icon: "home", key: "dashboard" },
  { label: "Clientes y CRM", href: "/crm", icon: "users", key: "crm" },
  { label: "Inventario", href: "/products", icon: "box", key: "inventory" },
  { label: "Planes y cobros", href: "/billing", icon: "wallet", key: "billing" },
  { label: "Operaciones UAE", href: "/uae", icon: "globe", key: "uae" },
];

export default async function Dashboard() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  let summary = null;
  let tenantUnavailable = false;
  try {
    summary = await getDashboardSummary();
  } catch (error) {
    if (error instanceof Error && error.message === "NO_ACTIVE_TENANT") tenantUnavailable = true;
    else throw error;
  }

  const displayName = user.name?.trim() || user.email?.split("@")[0] || "Usuario";
  const initial = displayName.charAt(0).toUpperCase();

  const metrics = [
    { label: "Clientes y prospectos", value: summary?.leads ?? 0, description: "Registros en tu CRM", icon: "users" as const, href: "/crm", tone: "copper" },
    { label: "Oportunidades", value: summary?.opportunities ?? 0, description: "Oportunidades registradas", icon: "spark" as const, href: "/crm", tone: "slate" },
    { label: "Productos", value: summary?.products ?? 0, description: "Elementos de tu catálogo", icon: "box" as const, href: "/products", tone: "copper" },
    { label: "Cobros abiertos", value: summary?.openCollections ?? 0, description: "Pendientes de pago", icon: "wallet" as const, href: "/billing", tone: "slate" },
  ];

  return (
    <main className="dash-shell">
      <aside className="dash-sidebar">
        <Link className="dash-brand" href="/dashboard" aria-label="IngenieroAI.pro, panel general">
          <span className="dash-brand-mark"><span /></span>
          <span className="dash-brand-word">IngenieroAI<span>.pro</span><small>GESTIÓN EMPRESARIAL INTELIGENTE</small></span>
        </Link>

        <div className="dash-sidebar-label">ESPACIO DE TRABAJO</div>
        <nav className="dash-nav" aria-label="Navegación del espacio de trabajo">
          {navigation.map((item) => (
            <Link className={item.key === "dashboard" ? "dash-nav-link is-active" : "dash-nav-link"} href={item.href} key={item.key}>
              <Icon name={item.icon} size={19} /><span>{item.label}</span>{item.key === "dashboard" ? <i /> : null}
            </Link>
          ))}
        </nav>

        <div className="dash-sidebar-bottom">
          <div className="dash-support-card">
            <div className="dash-support-icon"><Icon name="spark" size={20} /></div>
            <strong>¿Necesitas ayuda?</strong>
            <p>Estamos disponibles para orientarte.</p>
            <a href="https://wa.me/50254164016" target="_blank" rel="noopener noreferrer">Contactar por WhatsApp <Icon name="arrow" size={15} /></a>
          </div>
          <div className="dash-sidebar-foot"><span className="dash-online-dot" /> Plataforma operativa</div>
        </div>
      </aside>

      <section className="dash-main">
        <header className="dash-topbar">
          <div className="dash-breadcrumb"><span>IngenieroAI.pro</span><b>/</b><strong>Panel general</strong></div>
          <div className="dash-account">
            <div className="dash-account-avatar">{initial}</div>
            <div><strong>{displayName}</strong><span>Cuenta activa</span></div>
          </div>
        </header>

        <div className="dash-content">
          <section className="dash-welcome">
            <div className="dash-welcome-copy">
              <div className="dash-eyebrow"><span /> BUSINESS OPERATIONS PLATFORM</div>
              <h1>Tu operación,<br /><em>bajo control.</em></h1>
              <p>Una visión clara de tus clientes, oportunidades, inventario y cobros. Todo conectado en un mismo espacio de trabajo.</p>
              <div className="dash-welcome-actions">
                <Link className="dash-button dash-button-copper" href="/crm"><Icon name="plus" size={17} /> Abrir CRM</Link>
                <Link className="dash-button dash-button-glass" href="/products">Ver inventario <Icon name="arrow" size={16} /></Link>
              </div>
            </div>
            <div className="dash-welcome-art" aria-hidden="true">
              <div className="dash-orbit dash-orbit-one" />
              <div className="dash-orbit dash-orbit-two" />
              <div className="dash-art-mark"><span>IA</span><i>+</i></div>
              <div className="dash-art-caption"><span>OPERACIÓN INTELIGENTE</span><strong>Ingeniería para crecer.</strong></div>
            </div>
          </section>

          {tenantUnavailable ? (
            <section className="dash-empty-tenant">
              <div className="dash-empty-icon"><Icon name="users" size={26} /></div>
              <div><span className="dash-section-kicker">CONFIGURACIÓN INICIAL</span><h2>Tu espacio de trabajo está listo para comenzar.</h2><p>Registra tu empresa y verifica tu correo. Después se creará tu espacio con el rol de propietario y el plan inicial gratuito.</p></div>
              <Link className="dash-button dash-button-copper" href="/register">Registrar empresa <Icon name="arrow" size={16} /></Link>
            </section>
          ) : (
            <>
              <section className="dash-section">
                <div className="dash-section-heading">
                  <div><span className="dash-section-kicker">INDICADORES</span><h2>Resumen de tu negocio</h2></div>
                  <span className="dash-live-label"><i /> DATOS DE TU EMPRESA</span>
                </div>
                <div className="dash-metrics">
                  {metrics.map((metric, index) => (
                    <Link className="dash-metric-card" href={metric.href} key={metric.label}>
                      <div className="dash-metric-top"><span className={`dash-metric-icon ${metric.tone}`}><Icon name={metric.icon} size={21} /></span><span className="dash-metric-index">0{index + 1}</span></div>
                      <strong className="dash-metric-value">{metric.value.toLocaleString("es-GT")}</strong>
                      <span className="dash-metric-label">{metric.label}</span>
                      <span className="dash-metric-description">{metric.description}</span>
                      <span className="dash-metric-arrow"><Icon name="arrow" size={16} /></span>
                    </Link>
                  ))}
                </div>
              </section>

              <section className="dash-section dash-workspace-section">
                <div className="dash-section-heading">
                  <div><span className="dash-section-kicker">MÓDULOS DISPONIBLES</span><h2>Gestiona cada área</h2></div>
                  <span className="dash-section-note">Accesos a tus herramientas</span>
                </div>
                <div className="dash-module-grid">
                  <Link href="/crm" className="dash-module-card">
                    <span className="dash-module-icon"><Icon name="users" size={24} /></span><span className="dash-module-tag">RELACIONES</span><h3>Clientes y CRM</h3><p>Registra contactos y da seguimiento a tus prospectos desde un solo lugar.</p><span className="dash-module-link">Abrir módulo <Icon name="arrow" size={16} /></span>
                  </Link>
                  <Link href="/products" className="dash-module-card">
                    <span className="dash-module-icon"><Icon name="box" size={24} /></span><span className="dash-module-tag">CATÁLOGO</span><h3>Inventario</h3><p>Organiza tus productos, precios, existencias y servicios.</p><span className="dash-module-link">Abrir módulo <Icon name="arrow" size={16} /></span>
                  </Link>
                  <Link href="/billing" className="dash-module-card">
                    <span className="dash-module-icon"><Icon name="wallet" size={24} /></span><span className="dash-module-tag">SUSCRIPCIÓN</span><h3>Planes y cobros</h3><p>Consulta el plan de tu empresa y las opciones de contratación.</p><span className="dash-module-link">Ver facturación <Icon name="arrow" size={16} /></span>
                  </Link>
                  <Link href="/uae" className="dash-module-card">
                    <span className="dash-module-icon"><Icon name="globe" size={24} /></span><span className="dash-module-tag">OPERACIONES</span><h3>Logística UAE</h3><p>Accede al espacio de operaciones y logística para UAE.</p><span className="dash-module-link">Abrir módulo <Icon name="arrow" size={16} /></span>
                  </Link>
                </div>
              </section>
            </>
          )}

          <footer className="dash-footer"><span>IngenieroAI.pro <i>·</i> Gestión empresarial inteligente</span><span>GRAPHITE TITANIUM <b /></span></footer>
        </div>
      </section>
    </main>
  );
}
