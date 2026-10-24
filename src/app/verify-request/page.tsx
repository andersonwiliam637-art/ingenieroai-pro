import Link from "next/link";

export default function VerifyRequestPage() {
  return (
    <main className="shell">
      <section className="hero">
        <div className="eyebrow">INGENIEROAI.PRO · VERIFICACIÓN</div>
        <h1>Revisa tu correo.</h1>
        <p>Si el correo es válido y el servicio de envío está configurado, recibirás un enlace de acceso. Si no aparece, revisa spam o vuelve a intentarlo más tarde.</p>
        <Link className="button primary" href="/login">Volver al acceso</Link>
      </section>
    </main>
  );
}
