import { NextResponse } from "next/server";
import { pool } from "@/lib/db/pool";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await pool.query("SELECT 1");
    return NextResponse.json({ ok: true, service: "ingenieroai-platform", database: "reachable" }, { status: 200 });
  } catch {
    // Never return connection strings, SQL, hostnames, or driver error details.
    return NextResponse.json({ ok: false, service: "ingenieroai-platform", database: "unavailable" }, { status: 503 });
  }
}
