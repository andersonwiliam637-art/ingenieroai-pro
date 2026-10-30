"use client";
import { useState } from "react";

export default function CheckoutActions({ planCode, currency, canCheckout }: { planCode: string; currency: string; canCheckout: boolean }) {
  const [pending, setPending] = useState<"recurrente" | "paypal" | null>(null);
  const [error, setError] = useState("");
  const recurrenteSupported = ["GTQ", "USD"].includes(currency.toUpperCase());
  const paypalSupported = currency.toUpperCase() === "USD";

  async function checkout(provider: "recurrente" | "paypal") {
    setPending(provider); setError("");
    try {
      const response = await fetch("/api/billing/checkout", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, planCode }),
      });
      const data = await response.json().catch(() => ({})) as { ok?: boolean; checkoutUrl?: string; error?: string };
      if (!response.ok || !data.ok || !data.checkoutUrl) throw new Error(data.error || "No fue posible preparar el pago.");
      window.location.assign(data.checkoutUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible preparar el pago.");
      setPending(null);
    }
  }

  return <div className="checkout-actions">
    <button className="button primary" disabled={!canCheckout || !recurrenteSupported || pending !== null} onClick={() => checkout("recurrente")}>
      {pending === "recurrente" ? "Conectando…" : "Pagar con Recurrente"}
    </button>
    <button className="button" disabled={!canCheckout || !paypalSupported || pending !== null} onClick={() => checkout("paypal")}>
      {pending === "paypal" ? "Conectando…" : "Pagar con PayPal"}
    </button>
    {!recurrenteSupported || !paypalSupported ? <p className="form-hint">Moneda de este plan: {currency}. Recurrente admite GTQ/USD; esta integración de PayPal está limitada a USD.</p> : null}
    {!canCheckout ? <p className="form-hint">El pago aún no está habilitado para producción o tu usuario no tiene permisos de propietario/administrador.</p> : null}
    {error ? <p className="form-message error" role="alert">{error}</p> : null}
  </div>;
}
