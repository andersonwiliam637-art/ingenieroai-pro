"use server";

import { signIn } from "@/auth";
import { getCurrentUser } from "@/lib/auth";
import { getCurrentMembership } from "@/lib/tenant";
import { pool } from "@/lib/db/pool";
import { redirect } from "next/navigation";

export type RegistrationState = { status: "idle" | "error" | "info"; message: string };

function isRedirectSignal(error: unknown): boolean {
  return !!error && typeof error === "object" && "digest" in error &&
    String((error as { digest?: unknown }).digest ?? "").startsWith("NEXT_REDIRECT");
}

const countries = new Set(["GT", "MX", "CO", "SV", "HN", "CR", "PA", "DO", "PE", "CL", "AR", "BR", "NI", "BO", "PY", "UY", "EC", "AE"]);

export async function registerOrganizationAction(
  _previous: RegistrationState,
  formData: FormData,
): Promise<RegistrationState> {
  const fullName = String(formData.get("full_name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const organizationName = String(formData.get("organization_name") ?? "").trim();
  const region = String(formData.get("region") ?? "").trim().toUpperCase();
  const countryCode = String(formData.get("country_code") ?? "").trim().toUpperCase();

  if (fullName.length < 2 || fullName.length > 120) return { status: "error", message: "Escribe tu nombre completo (entre 2 y 120 caracteres)." };
  if (!email || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { status: "error", message: "Escribe un correo electrónico válido." };
  if (organizationName.length < 2 || organizationName.length > 120) return { status: "error", message: "El nombre de la empresa debe tener entre 2 y 120 caracteres." };
  if (!countries.has(countryCode) || !["LATAM", "UAE"].includes(region) || (region === "UAE" && countryCode !== "AE") || (region === "LATAM" && countryCode === "AE")) {
    return { status: "error", message: "Selecciona una región y un país compatibles." };
  }

  const currentUser = await getCurrentUser();
  if (currentUser?.id) {
    if (currentUser.email?.toLowerCase() !== email) return { status: "error", message: "El correo debe coincidir con la sesión verificada. Cierra sesión o utiliza el correo actual." };
    try {
      await getCurrentMembership();
      redirect("/dashboard?company=already-active");
    } catch (error) {
      if (!(error instanceof Error && error.message === "NO_ACTIVE_TENANT")) throw error;
    }
  } else if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASSWORD || !process.env.AUTH_EMAIL_FROM) {
    return { status: "error", message: "El registro requiere configurar primero el correo transaccional (SMTP) en Vercel. No se creó ningún usuario ni empresa." };
  }

  let accepted = false;
  try {
    const result = await pool.query<{ accepted: boolean }>(
      "SELECT private.request_organization_registration($1, $2, $3, $4, $5) AS accepted",
      [email, fullName, organizationName, region, countryCode],
    );
    accepted = result.rows[0]?.accepted === true;
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    return { status: "error", message: message.includes("INVALID_REGION_COUNTRY")
      ? "El país seleccionado no corresponde a esa región."
      : "No pudimos iniciar el registro. Revisa la configuración de la plataforma e inténtalo nuevamente." };
  }

  if (!accepted) {
    return { status: "info", message: "No se creó otra empresa. Si ya tienes una cuenta, inicia sesión; si acabas de enviar una solicitud, revisa tu correo y vuelve a intentarlo en un minuto." };
  }

  if (currentUser?.id) {
    try {
      const provisioned = await pool.query<{ organization_id: string | null }>(
        "SELECT private.provision_pending_organization($1::uuid) AS organization_id",
        [currentUser.id],
      );
      if (provisioned.rows[0]?.organization_id) redirect("/dashboard?company=created");
      return { status: "info", message: "No se creó otra empresa. Tu cuenta puede pertenecer ya a una organización o la solicitud necesita revisión." };
    } catch (error) {
      if (isRedirectSignal(error)) throw error;
      return { status: "error", message: "No pudimos completar la creación de la empresa. No se eliminaron datos; revisa los registros del servidor." };
    }
  }

  try {
    await signIn("nodemailer", { email, redirectTo: "/dashboard" });
  } catch (error) {
    if (isRedirectSignal(error)) throw error;
    console.error("[registration] No se pudo iniciar verificación de correo.");
    return { status: "error", message: "No pudimos enviar el enlace. Verifica el servicio de correo configurado en Vercel." };
  }
  return { status: "info", message: "Revisa tu correo para verificarlo. La empresa y el propietario se crearán después de confirmar el enlace." };
}
