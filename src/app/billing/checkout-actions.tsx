"use client";
import { useState } from "react";

export default function CheckoutActions({ planCode, currency, canCheckout, recurrenteUrl }: { planCode: string; currency: string; canCheckout: boolean; recurrenteUrl?: string }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const paypalSupported = currency.toUpperCase() === "USD";

  async function checkoutPayPal() {
    setPending(true); setError("");
    try {
      const response = await fetch("/api/billing/checkout", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: "paypal", planCode }),
      });
      const data = await response.json().catch(() => ({})) as { ok?: boolean; checkoutUrl?: string; error?: string };
      if (!response.ok || !data.ok || !data.checkoutUrl) throw new Error(data.error || "No fue posible preparar el pago.");
      window.location.assign(data.checkoutUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible preparar el pago.");
      setPending(false);
    }
  }

  return <div className="billing-checkout">
    <div className="billing-provider-buttons">
      {recurrenteUrl
        ? <a className="billing-provider billing-provider-primary" href={recurrenteUrl} target="_blank" rel="noopener noreferrer">Recurrente · Suscribirme</a>
        : <button className="billing-provider billing-provider-primary" disabled>Recurrente no configurado</button>}
      <button className="billing-provider" disabled={!canCheckout || !paypalSupported || pending} onClick={checkoutPayPal}>
        {pending ? "Conectando…" : "PayPal"}
      </button>
    </div>
    {!recurrenteUrl ? <p className="billing-hint">Enlace de suscripción Recurrente pendiente para este plan.</p> : null}
    {!paypalSupported ? <p className="billing-hint">PayPal está disponible en esta integración únicamente para USD.</p> : null}
    {!canCheckout ? <p className="billing-hint">PayPal está desactivado temporalmente o se requiere rol de propietario/administrador.</p> : null}
    {error ? <p className="billing-error" role="alert">{error}</p> : null}
  </div>;
}
