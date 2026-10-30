import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { withTenantTransaction } from "@/lib/db/tenant-transaction";
import { appBaseUrl, minorToDecimalString, type PaymentProvider } from "@/lib/payments";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function publicError(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user?.id) return publicError("Inicia sesión para contratar un plan.", 401);
  if (process.env.BILLING_PAYMENTS_ENABLED !== "true") return publicError("Los pagos están desactivados mientras se completa la configuración y prueba del proveedor.", 503);

  let body: { provider?: unknown; planCode?: unknown };
  try { body = await request.json(); } catch { return publicError("Solicitud inválida."); }
  const provider = body.provider;
  const planCode = String(body.planCode ?? "").trim();
  if (!(provider === "recurrente" || provider === "paypal") || !/^[a-z0-9][a-z0-9-]{1,79}$/.test(planCode)) {
    return publicError("Selecciona un plan y un proveedor de pago válidos.");
  }
  if (provider === "recurrente" && !process.env.RECURRENTE_SECRET_KEY) return publicError("Recurrente aún no está configurado.", 503);
  if (provider === "paypal" && (!process.env.PAYPAL_CLIENT_ID || !process.env.PAYPAL_CLIENT_SECRET)) return publicError("PayPal aún no está configurado.", 503);

  let payment: { id: string; organizationId: string; subscriptionId: string; planId: string; planName: string; planCode: string; amountMinor: number; currency: string };
  try {
    payment = await withTenantTransaction(async (client, userId) => {
      const organization = await client.query<{ organization_id: string; region: string; currency_code: string; subscription_id: string; role_code: string }>(
        `SELECT o.id AS organization_id, o.region::text AS region, o.currency_code,
                s.id AS subscription_id, r.code::text AS role_code
           FROM public.memberships m
           JOIN public.organizations o ON o.id=m.organization_id
           JOIN public.roles r ON r.id=m.role_id
           JOIN public.subscriptions s ON s.organization_id=o.id
          WHERE m.user_id=$1 AND m.status='active'
          ORDER BY m.created_at ASC LIMIT 1`, [userId],
      );
      const org = organization.rows[0];
      if (!org) throw new Error("NO_ACTIVE_TENANT");
      if (!(["owner", "admin"] as string[]).includes(org.role_code)) throw new Error("BILLING_ADMIN_REQUIRED");

      const plans = await client.query<{ id: string; code: string; name: string; amount_minor: string; currency_code: string; interval_code: string; region: string }>(
        `SELECT id, code, name, amount_minor::text, currency_code, interval_code, region
           FROM public.subscription_plans
          WHERE code=$1 AND active=true AND amount_minor>0
            AND (region='GLOBAL' OR region=$2)
            AND (currency_code=$3 OR currency_code='USD')
          LIMIT 1`, [planCode, org.region, org.currency_code],
      );
      const plan = plans.rows[0];
      if (!plan) throw new Error("PLAN_NOT_AVAILABLE");
      // The provider limits differ: Recurrente hosted checkout supports GTQ/USD, while
      // this PayPal setup is deliberately restricted to USD for broad merchant compatibility.
      if (provider === "recurrente" && !["GTQ", "USD"].includes(plan.currency_code)) throw new Error("PROVIDER_CURRENCY_UNSUPPORTED");
      if (provider === "paypal" && plan.currency_code !== "USD") throw new Error("PROVIDER_CURRENCY_UNSUPPORTED");
      const amountMinor = Number(plan.amount_minor);
      if (!Number.isSafeInteger(amountMinor) || amountMinor <= 0) throw new Error("INVALID_PLAN_PRICE");

      // Store the approved server-side amount before contacting the provider. Never trust
      // a price or organization UUID supplied by the browser.
      const inserted = await client.query<{ id: string }>(
        `INSERT INTO public.payment_transactions
          (organization_id, subscription_id, provider, status, amount_minor, currency, metadata)
         VALUES ($1,$2,$3,'pending',$4,$5,jsonb_build_object('target_plan_id',$6::text,'plan_code',$7::text,'interval_code',$8::text))
         RETURNING id`,
        [org.organization_id, org.subscription_id, provider, amountMinor, plan.currency_code, plan.id, plan.code, plan.interval_code],
      );
      return { id: inserted.rows[0].id, organizationId: org.organization_id, subscriptionId: org.subscription_id,
        planId: plan.id, planName: plan.name, planCode: plan.code, amountMinor, currency: plan.currency_code };
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "UNAUTHENTICATED") return publicError("Inicia sesión para continuar.", 401);
    if (message === "NO_ACTIVE_TENANT") return publicError("Primero registra y verifica tu empresa.", 409);
    if (message === "BILLING_ADMIN_REQUIRED") return publicError("Solo el propietario o administrador puede cambiar el plan.", 403);
    if (message === "PLAN_NOT_AVAILABLE") return publicError("Este plan no está configurado para la moneda o región de tu empresa.", 409);
    if (message === "PROVIDER_CURRENCY_UNSUPPORTED") return publicError("El proveedor seleccionado no admite la moneda de este plan. Selecciona otro proveedor o un plan en USD.", 409);
    console.error("[billing] No se pudo crear la solicitud de pago.");
    return publicError("No pudimos preparar el pago. Inténtalo nuevamente.", 500);
  }

  try {
    const base = appBaseUrl();
    let checkoutUrl = "";
    let providerPaymentId = "";
    let providerMetadata: Record<string, string> = {};

    if (provider === "recurrente") {
      const response = await fetch("https://app.recurrente.com/api/checkouts", {
        method: "POST",
        headers: { "X-SECRET-KEY": process.env.RECURRENTE_SECRET_KEY!, "Content-Type": "application/json" },
        body: JSON.stringify({
          items: [{ name: payment.planName, amount_in_cents: payment.amountMinor, currency: payment.currency,
            quantity: 1, charge_type: "one_time" }],
          success_url: `${base}/billing?payment=pending&provider=recurrente`,
          cancel_url: `${base}/billing?payment=cancelled`,
        }),
        cache: "no-store",
      });
      const data = await response.json().catch(() => ({})) as { id?: string; checkout_url?: string };
      if (!response.ok || !data.id || !data.checkout_url) throw new Error(`RECURRENTE_CHECKOUT_FAILED_${response.status}`);
      providerPaymentId = data.id;
      checkoutUrl = data.checkout_url;
      providerMetadata = { recurrente_checkout_id: data.id };
    } else {
      const amount = minorToDecimalString(payment.amountMinor);
      const order = await (await import("@/lib/payments")).paypalApi("/v2/checkout/orders", {
        method: "POST",
        headers: { "PayPal-Request-Id": payment.id },
        body: JSON.stringify({
          intent: "CAPTURE",
          purchase_units: [{ reference_id: payment.id, custom_id: payment.id, invoice_id: payment.id,
            description: `Licencia ${payment.planName} - IngenieroAI.pro`,
            amount: { currency_code: payment.currency, value: amount } }],
          application_context: {
            brand_name: "IngenieroAI.pro", user_action: "PAY_NOW", landing_page: "LOGIN",
            return_url: `${base}/api/billing/paypal/return?tx=${encodeURIComponent(payment.id)}`,
            cancel_url: `${base}/billing?payment=cancelled`,
          },
        }),
      });
      providerPaymentId = String(order.id ?? "");
      checkoutUrl = Array.isArray(order.links) ? String(order.links.find((l: { rel?: string }) => l.rel === "approve")?.href ?? "") : "";
      if (!providerPaymentId || !checkoutUrl) throw new Error("PAYPAL_APPROVAL_URL_MISSING");
      providerMetadata = { paypal_order_id: providerPaymentId };
    }

    await withTenantTransaction(async (client) => {
      await client.query(
        `UPDATE public.payment_transactions
            SET provider_payment_id=$1, metadata=metadata || $2::jsonb
          WHERE id=$3::uuid AND organization_id=$4::uuid AND status='pending'`,
        [providerPaymentId, JSON.stringify(providerMetadata), payment.id, payment.organizationId],
      );
    });
    return NextResponse.json({ ok: true, checkoutUrl });
  } catch (error) {
    console.error("[billing] El proveedor no pudo crear un checkout.");
    try {
      await withTenantTransaction(async (client) => {
        await client.query("UPDATE public.payment_transactions SET status='failed' WHERE id=$1::uuid AND organization_id=$2::uuid AND status='pending'", [payment.id, payment.organizationId]);
      });
    } catch { /* preserve the original provider failure */ }
    return publicError("El proveedor no pudo preparar el pago. Revisa las credenciales de prueba y vuelve a intentar.", 502);
  }
}
