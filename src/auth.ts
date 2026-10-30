import NextAuth from "next-auth";
import Email from "next-auth/providers/nodemailer";
import PostgresAdapter from "@auth/pg-adapter";
import nodemailer from "nodemailer";
import { pool } from "@/lib/db/pool";

const smtpPort = Number(process.env.SMTP_PORT ?? 587);
const smtpSecure = process.env.SMTP_SECURE === "true" || smtpPort === 465;

function getSmtpConfig() {
  const host = process.env.SMTP_HOST?.trim();
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASSWORD;
  const from = process.env.AUTH_EMAIL_FROM?.trim();
  if (!host || !user || !pass || !from || !Number.isInteger(smtpPort) || smtpPort < 1 || smtpPort > 65535) {
    throw new Error("SMTP_CONFIGURATION_MISSING");
  }
  return { host, user, pass, from };
}

function escapeHtml(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PostgresAdapter(pool),
  providers: [Email({
    id: "nodemailer",
    from: process.env.AUTH_EMAIL_FROM,
    maxAge: 30 * 60,
    server: {
      host: process.env.SMTP_HOST,
      port: smtpPort,
      secure: smtpSecure,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD },
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 15_000,
      tls: { minVersion: "TLSv1.2" },
    },
    // Use our own transport instead of the provider's bundled default. This also gives
    // a clear configuration error instead of attempting localhost:587 when SMTP is absent.
    async sendVerificationRequest({ identifier, url }) {
      const smtp = getSmtpConfig();
      const transport = nodemailer.createTransport({
        host: smtp.host,
        port: smtpPort,
        secure: smtpSecure,
        auth: { user: smtp.user, pass: smtp.pass },
        connectionTimeout: 10_000,
        greetingTimeout: 10_000,
        socketTimeout: 15_000,
        tls: { minVersion: "TLSv1.2" },
      });
      const safeUrl = escapeHtml(url);
      try {
        await transport.sendMail({
          from: smtp.from,
          to: identifier,
          subject: "Tu enlace seguro de acceso a IngenieroAI.pro",
          text: `Abre este enlace para verificar tu correo e iniciar sesión en IngenieroAI.pro. El enlace expira en 30 minutos.\n\n${url}\n\nSi no solicitaste este acceso, ignora este correo.`,
          html: `<div style="font-family:Arial,sans-serif;line-height:1.6;color:#111"><h2>IngenieroAI.pro</h2><p>Abre el siguiente enlace para verificar tu correo e iniciar sesión. Caduca en 30 minutos.</p><p><a href="${safeUrl}" style="display:inline-block;padding:12px 18px;background:#111;color:#fff;border-radius:8px;text-decoration:none">Verificar y entrar</a></p><p>Si no solicitaste este acceso, puedes ignorar este correo.</p></div>`,
        });
      } finally {
        transport.close();
      }
    },
  })],
  session: { strategy: "database", maxAge: 12 * 60 * 60, updateAge: 60 * 60 },
  trustHost: true,
  pages: { signIn: "/login", verifyRequest: "/verify-request", error: "/login" },
  events: {
    // A first company is provisioned only after Auth.js verifies the email and only if
    // a matching, unexpired registration request exists in Neon.
    async signIn({ user }) {
      if (!user.id) return;
      await pool.query("SELECT private.provision_pending_organization($1::uuid)", [user.id]);
    },
  },
});
