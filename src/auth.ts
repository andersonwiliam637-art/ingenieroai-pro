import NextAuth from "next-auth";
import Email from "next-auth/providers/nodemailer";
import PostgresAdapter from "@auth/pg-adapter";
import { pool } from "@/lib/db/pool";

const smtpPort = Number(process.env.SMTP_PORT ?? 587);

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PostgresAdapter(pool),
  providers: [Email({
    from: process.env.AUTH_EMAIL_FROM,
    server: {
      host: process.env.SMTP_HOST,
      port: smtpPort,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
    },
  })],
  session: { strategy: "database" },
  trustHost: true,
  pages: { signIn: "/login", verifyRequest: "/verify-request" },
});
