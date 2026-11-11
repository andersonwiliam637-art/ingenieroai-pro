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

  return <div className="billing-checkout">
    <div className="billing-provider-buttons">
      <button className="billing-provider billing-provider-primary" disabled={!canCheckout || !recurrenteSupported || pending !== null} onClick={() => checkout("recurrente")}>
        {pending === "recurrente" ? "Conectando…" : "Recurrente"}
      </button>
      <button className="billing-provider" disabled={!canCheckout || !paypalSupported || pending !== null} onClick={() => checkout("paypal")}>
        {pending === "paypal" ? "Conectando…" : "PayPal"}
      </button>
    </div>
    {!recurrenteSupported ? <p className="billing-hint">Recurrente no está habilitado para {currency}.</p> : null}
    {!paypalSupported ? <p className="billing-hint">PayPal está disponible en esta integración únicamente para USD.</p> : null}
    {!canCheckout ? <p className="billing-hint">Pagos desactivados temporalmente o se requiere rol de propietario/administrador.</p> : null}
    {error ? <p className="billing-error" role="alert">{error}</p> : null}
  </div>;
}
