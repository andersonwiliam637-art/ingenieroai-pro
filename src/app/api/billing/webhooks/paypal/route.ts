import { NextResponse } from "next/server";
import { applyVerifiedPayment, decimalToMinor, paypalApi, type PaymentStatus } from "@/lib/payments";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type PaypalEvent = {
  id?: string;
  event_type?: string;
  resource?: {
    id?: string;
    status?: string;
    amount?: { value?: string; currency_code?: string };
    supplementary_data?: { related_ids?: { order_id?: string } };
  };
};

function mapEventType(eventType: string): PaymentStatus | null {
  if (eventType === "PAYMENT.CAPTURE.COMPLETED") return "succeeded";
  if (eventType === "PAYMENT.CAPTURE.REFUNDED" || eventType === "PAYMENT.CAPTURE.REVERSED") return "refunded";
  if (eventType === "PAYMENT.CAPTURE.DENIED") return "failed";
  return null;
}

export async function POST(request: Request) {
  if (!process.env.PAYPAL_WEBHOOK_ID || !process.env.PAYPAL_CLIENT_ID || !process.env.PAYPAL_CLIENT_SECRET) {
    return NextResponse.json({ ok: false }, { status: 503 });
  }
  const rawBody = await request.text();
  let event: PaypalEvent;
  try { event = JSON.parse(rawBody) as PaypalEvent; } catch { return NextResponse.json({ ok: false }, { status: 400 }); }
  const header = (name: string) => request.headers.get(name);
  const requiredHeaders = {
    auth_algo: header("paypal-auth-algo"),
    cert_url: header("paypal-cert-url"),
    transmission_id: header("paypal-transmission-id"),
    transmission_sig: header("paypal-transmission-sig"),
    transmission_time: header("paypal-transmission-time"),
  };
  if (Object.values(requiredHeaders).some(v => !v)) return NextResponse.json({ ok: false }, { status: 400 });

  try {
    const verification = await paypalApi("/v1/notifications/verify-webhook-signature", {
      method: "POST",
      body: JSON.stringify({ ...requiredHeaders, webhook_id: process.env.PAYPAL_WEBHOOK_ID, webhook_event: event }),
    });
    if (verification.verification_status !== "SUCCESS") return NextResponse.json({ ok: false, error: "INVALID_SIGNATURE" }, { status: 400 });
  } catch {
    return NextResponse.json({ ok: false, error: "SIGNATURE_VERIFICATION_FAILED" }, { status: 400 });
  }

  const status = mapEventType(String(event.event_type ?? ""));
  if (!status) return NextResponse.json({ ok: true, ignored: true });
  const resource = event.resource;
  const orderId = resource?.supplementary_data?.related_ids?.order_id;
  const eventId = event.id;
  const amountText = resource?.amount?.value;
  const currency = String(resource?.amount?.currency_code ?? "").toUpperCase();
  if (!orderId || !eventId || !amountText || !/^[A-Z]{3}$/.test(currency)) {
    return NextResponse.json({ ok: false, error: "INVALID_EVENT_PAYLOAD" }, { status: 400 });
  }
  let amountMinor: number;
  try { amountMinor = decimalToMinor(amountText); } catch { return NextResponse.json({ ok: false }, { status: 400 }); }

  try {
    const applied = await applyVerifiedPayment({
      provider: "paypal", eventId, eventType: String(event.event_type), providerPaymentId: orderId,
      status, amountMinor, currency,
      payload: { id: eventId, event_type: event.event_type, capture_id: resource?.id ?? null, order_id: orderId, status, amount_minor: amountMinor, currency },
    });
    if (!applied) return NextResponse.json({ ok: false, error: "TRANSACTION_NOT_MATCHED" }, { status: 409 });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: "WEBHOOK_PROCESSING_FAILED" }, { status: 500 });
  }
}
