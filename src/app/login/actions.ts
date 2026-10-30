"use server";

import { signIn } from "@/auth";

export type LoginState = { status: "idle" | "error" | "info"; message: string };

function isRedirectSignal(error: unknown) {
  return !!error && typeof error === "object" && "digest" in error &&
    String((error as { digest?: unknown }).digest ?? "").startsWith("NEXT_REDIRECT");
}

export async function requestMagicLink(_previous: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!email || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { status: "error", message: "Escribe un correo electrónico válido." };
  }
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASSWORD || !process.env.AUTH_EMAIL_FROM) {
    return { status: "error", message: "El acceso por correo aún no está activado. Falta configurar el servicio SMTP en Vercel." };
  }
  try {
    await signIn("nodemailer", { email, redirectTo: "/dashboard" });
  } catch (error) {
    if (isRedirectSignal(error)) throw error;
    // Do not expose provider credentials, recipient existence, or infrastructure details.
    console.error("[auth] No se pudo solicitar el enlace de acceso.");
    return { status: "error", message: "No pudimos enviar el enlace. Verifica la configuración del correo y vuelve a intentarlo." };
  }
  return { status: "info", message: "Si el correo es válido, enviaremos un enlace temporal de acceso." };
}
