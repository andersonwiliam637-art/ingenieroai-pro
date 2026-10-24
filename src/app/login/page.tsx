import { signIn } from "@/auth";

export default function LoginPage() {
  return (
    <main className="shell">
      <section className="hero">
        <div className="eyebrow">INGENIEROAI.PRO · ACCESO SEGURO</div>
        <h1>Accede a tu espacio de trabajo.</h1>
        <p>Te enviaremos un enlace de acceso al correo registrado. Configura SMTP en el entorno antes de usar este flujo.</p>
        <form action={async (formData: FormData) => {
          "use server";
          const email = String(formData.get("email") ?? "").trim();
          if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return;
          await signIn("nodemailer", { email, redirectTo: "/dashboard" });
        }} className="login-form">
          <label htmlFor="email">Correo electrónico</label>
          <input id="email" name="email" type="email" autoComplete="email" required maxLength={254} placeholder="tu@empresa.com" />
          <button className="button primary" type="submit">Enviar enlace de acceso</button>
        </form>
      </section>
    </main>
  );
}
