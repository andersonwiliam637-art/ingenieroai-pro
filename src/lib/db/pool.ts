import { Pool } from "pg";

declare global {
  // eslint-disable-next-line no-var
  var ingenieroAiPool: Pool | undefined;
}

function createPool() {
  const connectionString = process.env.DATABASE_URL;
  // Production must always be connected to its explicitly configured database.
  // Preview builds may intentionally omit DATABASE_URL; use a closed local socket
  // so importing Auth.js during Next.js build does not require production secrets.
  if (!connectionString && process.env.VERCEL_ENV === "production") {
    throw new Error("Missing required environment variable: DATABASE_URL");
  }

  return new Pool({
    ...(connectionString
      ? { connectionString }
      : {
          host: "127.0.0.1",
          port: 1,
          database: "preview_database_unconfigured",
          user: "preview_unconfigured",
          password: "preview_unconfigured",
        }),
    max: Number(process.env.PG_POOL_MAX ?? 10),
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 1_000,
    application_name: "ingenieroai-platform",
    ssl: connectionString && !connectionString.includes("localhost")
      ? { rejectUnauthorized: true }
      : undefined,
  });
}

export const pool = globalThis.ingenieroAiPool ?? createPool();
if (process.env.NODE_ENV !== "production") globalThis.ingenieroAiPool = pool;
