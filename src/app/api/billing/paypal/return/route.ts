import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { withTenantTransaction } from "@/lib/db/tenant-transaction";
import { appBaseUrl, applyVerifiedPayment, decimalToMinor, paypalApi, type PaymentStatus } from "@/lib/payments";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  let base: string;
  try { base = appBaseUrl(); } catch { return NextResponse.json({ ok: false }, { status: 503 }); }
  const search = new URL(request.url).searchParams;
  const orderId = search.get("token") ?? "";
  const transactionId = search.get("tx") ?? "";
  const user = await getCurrentUser();
  if (!user?.id) return NextResponse.redirect(new URL("/login?reason=payment-return", base));
  if (!/^[0-9a-f-]{36}$/i.test(transactionId) || !/^[A-Z0-9-]{5,80}$/i.test(orderId)) {
    return NextResponse.redirect(new URL("/billing?payment=invalid", base));
  }

  try {
    const payment = await withTenantTransaction(async (client, userId) => {
      const result = await client.query<{ id: string; organization_id: string; provider_payment_id: string; amount_minor: string; currency: string; status: string }>(
        `SELECT t.id,t.organization_id,t.provider_payment_id,t.amount_minor::text,t.currency,t.status
           FROM public.payment_transactions t
           JOIN public.memberships m ON m.organization_id=t.organization_id
          WHERE t.id=$1::uuid AND m.user_id=$2 AND m.status='active'
            AND t.provider='paypal' AND t.provider_payment_id=$3
          ORDER BY m.created_at LIMIT 1`, [transactionId, userId, orderId],
      );
      return result.rows[0] ?? null;
    });
    if (!payment) return NextResponse.redirect(new URL("/billing?payment=not-found", base));
    if (payment.status === "succeeded") return NextResponse.redirect(new URL("/billing?payment=success", base));
    if (payment.status !== "pending") return NextResponse.redirect(new URL("/billing?payment=cancelled", base));

    let order: Record<string, any>;
    try {
      order = await paypalApi(`/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`, {
        method: "POST", headers: { "PayPal-Request-Id": `capture-${transactionId}` }, body: "{}",
      });
    } catch {
      // The webhook may have captured or processed the order already. Do not mark it paid
      // based on the browser redirect; let the signed webhook reconcile it.
      return NextResponse.redirect(new URL("/billing?payment=pending", base));
    }
    const purchaseUnit = order.purchase_units?.[0];
    const capture = purchaseUnit?.payments?.captures?.[0];
    const capturedStatus = String(capture?.status ?? "").toUpperCase();
    const currency = String(capture?.amount?.currency_code ?? "").toUpperCase();
    const value = String(capture?.amount?.value ?? "");
    if (capturedStatus !== "COMPLETED" || !capture?.id) return NextResponse.redirect(new URL("/billing?payment=pending", base));
    const amountMinor = decimalToMinor(value);
    if (amountMinor !== Number(payment.amount_minor) || currency !== payment.currency.toUpperCase()) {
      // Never activate a plan when the captured amount/currency differs from the server-side quote.
      return NextResponse.redirect(new URL("/billing?payment=review", base));
    }
    const status: PaymentStatus = "succeeded";
    const applied = await applyVerifiedPayment({
      provider: "paypal", eventId: `return-capture:${capture.id}`, eventType: "PAYMENT.CAPTURE.COMPLETED",
      providerPaymentId: orderId, status, amountMinor, currency,
      payload: { source: "server_capture_return", capture_id: capture.id, order_id: orderId, status, amount_minor: amountMinor, currency },
    });
    return NextResponse.redirect(new URL(applied ? "/billing?payment=success" : "/billing?payment=pending", base));
  } catch {
    return NextResponse.redirect(new URL("/billing?payment=pending", base));
  }
}
