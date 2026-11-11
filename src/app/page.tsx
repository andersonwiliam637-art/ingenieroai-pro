import Link from "next/link";
import "./home.css";

const plans = [
  {
    code: "starter",
    name: "Starter",
    description: "Lo esencial para organizar tu negocio y empezar con una base clara.",
    price: "Gratis",
    cadence: "sin costo",
    users: "Hasta 3 usuarios",
    features: ["Gestión de clientes (CRM)", "Ventas y oportunidades", "Control de inventario", "Reportes del negocio"],
    action: "Crear cuenta gratis",
  },
  {
    code: "pro",
    name: "Pro",
    description: "Control operativo para equipos que necesitan trabajar con orden y seguimiento.",
    price: "Q199 / $29",
    cadence: "por mes · GTQ / USD",
    users: "Hasta 10 usuarios",
    features: ["Todo lo incluido en Starter", "Gestión de cobros", "Agenda y calendario", "Seguimiento comercial y operativo"],
    action: "Elegir Pro",
    featured: true,
  },
  {
    code: "business",
    name: "Business",
    description: "Más capacidad y automatización para empresas que buscan escalar sus operaciones.",
    price: "Q499 / $79",
    cadence: "por mes · GTQ / USD",
    users: "Hasta 30 usuarios",
    features: ["Todo lo incluido en Pro", "Automatización con inteligencia artificial", "Más capacidad para tu equipo", "Operación empresarial centralizada"],
    action: "Elegir Business",
  },
];

const modules = [
  { name: "CRM", copy: "Registro y seguimiento de oportunidades comerciales.", href: "/crm", label: "LATAM" },
  { name: "Ventas", copy: "Organiza prospectos, oportunidades y productos.", href: "/crm", label: "CORE" },
  { name: "Inventario", copy: "Control básico de productos, precios y existencias.", href: "/products", label: "CORE" },
  { name: "Cobros", copy: "Consulta planes y gestiona la facturación de tu empresa.", href: "/billing", label: "BILLING" },
  { name: "Agenda y reportes", copy: "Una base común para organizar el trabajo del equipo.", href: "/dashboard", label: "CORE" },
  { name: "Logística UAE", copy: "Pedidos, flota, entregas y contraentrega.", href: "/uae", label: "UAE" },
];

export default function Home() {
  return <main className="home-shell">
    <header className="home-nav">
      <Link className="home-brand" href="/">IngenieroAI<span>.pro</span></Link>
      <nav aria-label="Navegación principal">
        <a href="#planes">Planes</a>
        <a href="#plataforma">Plataforma</a>
        <Link href="/login">Iniciar sesión</Link>
        <Link className="home-nav-cta" href="/register">Crear empresa</Link>
      </nav>
    </header>

    <section className="home-hero">
      <div className="home-eyebrow">BUSINESS OPERATIONS PLATFORM</div>
      <h1>Tu empresa, bajo control. <span>En un solo espacio.</span></h1>
      <p>Organiza clientes, ventas, inventario, cobros y operaciones con herramientas conectadas para que tu equipo trabaje con claridad.</p>
      <div className="home-hero-actions">
        <Link className="home-button home-button-light" href="/register">Comenzar gratis</Link>
        <a className="home-button home-button-outline" href="#planes">Ver planes y precios</a>
      </div>
      <div className="home-trust-line"><span>Multiempresa</span><i /> <span>Control por roles</span><i /> <span>Planes flexibles</span></div>
    </section>

    <section className="home-pricing" id="planes">
      <div className="home-section-head">
        <div className="home-eyebrow">PRECIOS TRANSPARENTES</div>
        <h2>Un plan para cada etapa de tu empresa.</h2>
        <p>Empieza gratis y amplía tus herramientas cuando tu operación lo necesite.</p>
      </div>
      <div className="home-plan-grid">
        {plans.map((plan) => <article className={`home-plan-card ${plan.featured ? "home-plan-featured" : ""}`} key={plan.code}>
          {plan.featured ? <span className="home-plan-badge">RECOMENDADO</span> : null}
          <div className="home-plan-name">{plan.name}</div>
          <p className="home-plan-description">{plan.description}</p>
          <div className="home-plan-price">{plan.price}</div>
          <div className="home-plan-cadence">{plan.cadence}</div>
          <div className="home-plan-users">{plan.users}</div>
          <ul>{plan.features.map((feature) => <li key={feature}>{feature}</li>)}</ul>
          <Link className={`home-plan-action ${plan.featured ? "home-plan-action-light" : ""}`} href="/register">{plan.action}</Link>
          {plan.code !== "starter" ? <p className="home-provider-note">Recurrente: GTQ y USD · PayPal: USD</p> : <p className="home-provider-note">Sin tarjeta para comenzar</p>}
        </article>)}
      </div>
      <p className="home-pricing-footnote">Los importes se muestran por mes. La moneda y los medios de pago disponibles se confirman según la región y configuración de tu empresa. Los pagos se procesan de forma segura y la suscripción se activa tras la validación del proveedor.</p>
    </section>

    <section className="home-platform" id="plataforma">
      <div className="home-section-head">
        <div className="home-eyebrow">UNA PLATAFORMA CONECTADA</div>
        <h2>Las herramientas que tu operación necesita.</h2>
      </div>
      <div className="home-module-grid">{modules.map((m) => <article className="home-module-card" key={m.name}>
        <span>{m.label}</span><h3>{m.name}</h3><p>{m.copy}</p><Link href={m.href}>Explorar módulo →</Link>
      </article>)}</div>
    </section>

    <section className="home-regions">
      <article><div className="home-eyebrow">LATAM</div><h2>Business Operations</h2><p>Clientes → leads → oportunidades → productos → cobros.</p></article>
      <article><div className="home-eyebrow">UAE</div><h2>Operations & Logistics</h2><p>Pedidos → conductores → entregas → prueba de entrega → COD.</p></article>
    </section>
    <footer className="home-footer"><Link className="home-brand" href="/">IngenieroAI<span>.pro</span></Link><span>Operación clara. Decisiones mejores.</span><Link href="/login">Acceso de clientes</Link></footer>
  </main>;
}
