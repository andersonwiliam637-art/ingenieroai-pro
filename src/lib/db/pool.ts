import { Pool } from "pg";

declare global {
  // eslint-disable-next-line no-var
  var ingenieroAiPool: Pool | undefined;
}

function createPool() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("Missing required environment variable: DATABASE_URL");
  return new Pool({
    connectionString,
    max: Number(process.env.PG_POOL_MAX ?? 10),
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
    application_name: "ingenieroai-platform",
    ssl: connectionString.includes("localhost") ? undefined : { rejectUnauthorized: true },
  });
}

export const pool = globalThis.ingenieroAiPool ?? createPool();
if (process.env.NODE_ENV !== "production") globalThis.ingenieroAiPool = pool;
