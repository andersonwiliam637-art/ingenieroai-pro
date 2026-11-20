export default function CheckoutActions({
  planCode,
  planName,
  currency,
  amountLabel,
  organizationName,
  recurrenteUrl,
}: {
  planCode: string;
  planName: string;
  currency: string;
  amountLabel: string;
  organizationName: string;
  recurrenteUrl?: string;
}) {
  const message = [
    "Hola, quiero contratar un plan de IngenieroAI.pro.",
    `Empresa: ${organizationName}`,
    `Plan: ${planName} (${planCode})`,
    `Precio mostrado: ${amountLabel} por mes (${currency}).`,
    "Deseo pagar por depósito o transferencia bancaria. ¿Me pueden compartir los datos de pago y los pasos para activar el servicio?",
  ].join("\n");
  const whatsappUrl = `https://wa.me/50254164016?text=${encodeURIComponent(message)}`;

  return (
    <div className="billing-checkout">
      <div className="billing-provider-buttons">
        {recurrenteUrl ? (
          <a className="billing-provider billing-provider-primary" href={recurrenteUrl} target="_blank" rel="noopener noreferrer">
            Recurrente · Suscribirme
          </a>
        ) : (
          <button className="billing-provider billing-provider-primary" disabled>
            Recurrente no configurado
          </button>
        )}
        <a
          className="billing-provider billing-provider-whatsapp"
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Contratar el plan ${planName} por WhatsApp`}
        >
          WhatsApp · Contratar
        </a>
      </div>
      {!recurrenteUrl ? <p className="billing-hint">Enlace de suscripción Recurrente pendiente para este plan.</p> : null}
      <p className="billing-hint">También puedes solicitar pago por depósito o transferencia. La activación manual se realiza después de verificar el pago.</p>
    </div>
  );
}
