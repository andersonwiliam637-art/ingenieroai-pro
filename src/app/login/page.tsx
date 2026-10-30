import Link from "next/link";
import LoginForm from "./login-form";

export const metadata = { title: "Iniciar sesión | IngenieroAI.pro" };

export default function LoginPage() {
  return <main className="shell"><section className="hero auth-hero">
    <div className="eyebrow">INGENIEROAI.PRO · ACCESO SEGURO</div>
    <h1>Accede a tu espacio de trabajo.</h1>
    <p>Introduce el correo asociado a tu cuenta. Te enviaremos un enlace temporal para verificarlo y entrar.</p>
    <LoginForm />
    <div className="auth-links"><span>¿Tu empresa aún no está registrada?</span> <Link href="/register">Crear empresa y cuenta</Link></div>
    <p className="form-hint"><Link href="/">Volver al inicio</Link></p>
  </section></main>;
}
