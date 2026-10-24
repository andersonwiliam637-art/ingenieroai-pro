import type { PoolClient } from "pg";
import { pool } from "@/lib/db/pool";
import { requireUser } from "@/lib/auth";

/**
 * Every tenant-scoped query runs in a transaction with a transaction-local,
 * server-verified Auth.js user UUID. Never call set_config from client input.
 */
export async function withTenantTransaction<T>(
  operation: (client: PoolClient, userId: string) => Promise<T>,
): Promise<T> {
  const user = await requireUser();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT set_config('app.user_id', $1, true)", [user.id]);
    const result = await operation(client, user.id);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
