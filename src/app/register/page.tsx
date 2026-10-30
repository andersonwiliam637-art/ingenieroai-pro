import Link from "next/link";
import RegisterForm from "./register-form";

export const metadata = {
  title: "Crear empresa | IngenieroAI.pro",
  description: "Registra tu empresa y verifica tu correo para abrir un espacio de trabajo seguro.",
};

export default function RegisterPage() {
  return (
    <main className="shell">
      <section className="hero auth-hero">
        <div className="eyebrow">INGENIEROAI.PRO · ALTA DE EMPRESA</div>
        <h1>Empieza con tu empresa.</h1>
        <p>Registra los datos básicos. Verificaremos el correo antes de crear la organización y asignar su primer propietario.</p>
        <RegisterForm />
        <p className="form-hint"><Link href="/">Volver al inicio</Link></p>
      </section>
    </main>
  );
}
