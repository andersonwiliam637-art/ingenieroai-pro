import { NextResponse } from "next/server";
import { pool } from "@/lib/db/pool";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const result = await pool.query<{
      database: number;
      registration_table: boolean;
      registration_function: boolean;
      provisioning_function: boolean;
      payment_function: boolean;
      free_plan: boolean;
    }>(`
      SELECT
        1 AS database,
        to_regclass('public.organization_registration_requests') IS NOT NULL AS registration_table,
        to_regprocedure('private.request_organization_registration(text,text,text,text,text)') IS NOT NULL AS registration_function,
        to_regprocedure('private.provision_pending_organization(uuid)') IS NOT NULL AS provisioning_function,
        to_regprocedure('private.apply_verified_payment(text,text,text,text,text,bigint,text,jsonb)') IS NOT NULL AS payment_function,
        EXISTS (SELECT 1 FROM public.subscription_plans WHERE code='starter-free' AND active=true) AS free_plan
    `);
    const row = result.rows[0];
    const schemaReady = Boolean(row?.registration_table && row?.registration_function && row?.provisioning_function && row?.payment_function && row?.free_plan);
    return NextResponse.json({
      ok: schemaReady,
      service: "ingenieroai-platform",
      database: "reachable",
      onboarding: schemaReady ? "ready" : "migration_required",
    }, { status: schemaReady ? 200 : 503 });
  } catch {
    // Never return connection strings, SQL, hostnames, or driver error details.
    return NextResponse.json({ ok: false, service: "ingenieroai-platform", database: "unavailable", onboarding: "unknown" }, { status: 503 });
  }
}
