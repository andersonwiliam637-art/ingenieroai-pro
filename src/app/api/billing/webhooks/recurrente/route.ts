import { NextResponse } from "next/server";
import { Webhook } from "svix";
import { applyVerifiedPayment, type PaymentStatus } from "@/lib/payments";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RecurrenteEvent = {
  id?: string;
  type?: string;
  event_type?: string;
  status?: string;
  amount_in_cents?: number;
  currency?: string;
  checkout?: { id?: string; status?: string } | string;
  payment?: { id?: string };
  created_at?: string;
};

function mappedStatus(event: RecurrenteEvent): PaymentStatus | null {
  const checkoutStatus = typeof event.checkout === "string" ? "" : event.checkout?.status ?? "";
  const status = String(event.status ?? checkoutStatus).toLowerCase();
  const eventType = String(event.event_type ?? "").toLowerCase();
  if (status === "succeeded" || status === "paid" || eventType.endsWith(".succeeded") || eventType.endsWith(".paid")) return "succeeded";
  if (status === "failed" || eventType.endsWith(".failed")) return "failed";
  if (status === "canceled" || status === "cancelled" || eventType.endsWith(".canceled")) return "canceled";
  if (status === "refunded" || eventType.startsWith("refund.") || eventType.endsWith(".refunded")) return "refunded";
  return null;
}

export async function POST(request: Request) {
  const secret = process.env.RECURRENTE_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ ok: false }, { status: 503 });
  const rawBody = await request.text();
  const svixHeaders: Record<string, string> = {};
  for (const name of ["svix-id", "svix-timestamp", "svix-signature"]) {
    const value = request.headers.get(name);
    if (value) svixHeaders[name] = value;
  }
  let event: RecurrenteEvent;
  try {
    const verifier = new Webhook(secret);
    event = verifier.verify(rawBody, svixHeaders) as RecurrenteEvent;
  } catch {
    return NextResponse.json({ ok: false, error: "INVALID_SIGNATURE" }, { status: 400 });
  }

  const status = mappedStatus(event);
  // Ignore unrelated and non-final notifications. They must not activate a licence.
  if (!status) return NextResponse.json({ ok: true, ignored: true });
  const providerPaymentId = String(typeof event.checkout === "string" ? event.checkout : event.checkout?.id ?? "");
  const eventId = String(svixHeaders["svix-id"] ?? event.id ?? "");
  const eventType = String(event.event_type ?? event.type ?? "recurrente.event");
  const amountMinor = Number(event.amount_in_cents);
  const currency = String(event.currency ?? "").toUpperCase();
  if (!providerPaymentId || !eventId || !Number.isSafeInteger(amountMinor) || amountMinor < 0 || !/^[A-Z]{3}$/.test(currency)) {
    return NextResponse.json({ ok: false, error: "INVALID_EVENT_PAYLOAD" }, { status: 400 });
  }

  try {
    const applied = await applyVerifiedPayment({
      provider: "recurrente", eventId, eventType, providerPaymentId, status, amountMinor, currency,
      payload: { id: eventId, type: event.type ?? null, event_type: eventType, status, checkout_id: providerPaymentId, amount_minor: amountMinor, currency },
    });
    // Unknown or mismatched checkouts are not acknowledged as successful processing. This lets
    // operations identify a missing transaction instead of activating an unrelated plan.
    if (!applied) return NextResponse.json({ ok: false, error: "TRANSACTION_NOT_MATCHED" }, { status: 409 });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: "WEBHOOK_PROCESSING_FAILED" }, { status: 500 });
  }
}
