import Link from "next/link";
const modules = [
  { name: "CRM", copy: "Registro y seguimiento de oportunidades comerciales.", href: "/crm", label: "LATAM" },
  { name: "Ventas", copy: "Organiza prospectos, oportunidades y productos.", href: "/crm", label: "CORE" },
  { name: "Inventario", copy: "Control básico de productos, precios y existencias.", href: "/products", label: "CORE" },
  { name: "Cobros", copy: "Consulta planes y activa la facturación cuando esté configurada.", href: "/billing", label: "BILLING" },
  { name: "Agenda y reportes", copy: "Una base común para organizar el trabajo del equipo.", href: "/dashboard", label: "CORE" },
  { name: "Logística UAE", copy: "Pedidos, flota, entregas y contraentrega.", href: "/uae", label: "UAE" },
];
export default function Home() {
  return <main className="shell">
    <section className="hero">
      <div className="eyebrow">INGENIEROAI.PRO · BUSINESS OPERATIONS PLATFORM</div>
      <h1>Opera tu empresa desde un solo espacio.</h1>
      <p>Una plataforma empresarial multiempresa pensada para organizar clientes, ventas e inventario en LATAM, y operaciones logísticas para UAE.</p>
      <div className="actions"><Link className="button primary" href="/register">Crear empresa</Link><Link className="button" href="/login">Iniciar sesión</Link><Link className="button" href="/dashboard">Dashboard</Link></div>
      <p className="form-hint">El registro requiere verificar tu correo. Los módulos disponibles dependen de la configuración de cada organización.</p>
    </section>
    <section className="grid" aria-label="Módulos de la plataforma">{modules.map((m) => <article className="card" key={m.name}><span className="card-index">{m.label}</span><h2>{m.name}</h2><p>{m.copy}</p><Link href={m.href} className="text-link">Explorar →</Link></article>)}</section>
    <section className="split"><div className="panel"><span className="eyebrow">LATAM</span><h2>Business Operations</h2><p>Clientes → leads → oportunidades → productos → cobros.</p></div><div className="panel"><span className="eyebrow">UAE</span><h2>Operations & Logistics</h2><p>Pedidos → conductores → entregas → prueba de entrega → COD.</p></div></section>
  </main>;
}
