import Link from "next/link";

export default function VerifyRequestPage() {
  return (
    <main className="shell">
      <section className="hero auth-hero">
        <div className="eyebrow">INGENIEROAI.PRO · VERIFICACIÓN</div>
        <h1>Revisa tu correo.</h1>
        <p>Si la solicitud es válida, recibirás un enlace de acceso de un solo uso. Ábrelo desde el mismo navegador. El enlace expira a los 30 minutos.</p>
        <p className="form-hint">Si no llega, revisa spam y confirma con el administrador que SMTP esté configurado. Nunca compartas el enlace de acceso.</p>
        <div className="actions"><Link className="button primary" href="/login">Volver al acceso</Link><Link className="button" href="/register">Registrar empresa</Link></div>
      </section>
    </main>
  );
}
