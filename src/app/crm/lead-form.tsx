"use client";
import { useActionState } from "react";
import { createLeadAction, type ActionState } from "./actions";
const initial: ActionState = { status: "idle", message: "" };
export default function LeadForm() {
  const [state, action, pending] = useActionState(createLeadAction, initial);
  return <form action={action} className="data-form">
    <div className="form-grid">
      <label>Nombre del contacto<input name="name" required minLength={2} maxLength={160} placeholder="Nombre completo" /></label>
      <label>Correo<input name="email" type="email" maxLength={254} placeholder="contacto@empresa.com" /></label>
      <label>Teléfono<input name="phone" maxLength={40} placeholder="+502…" /></label>
      <label>Origen<input name="source" maxLength={80} placeholder="Web, WhatsApp, referido…" /></label>
    </div>
    <label>Notas<textarea name="notes" maxLength={2000} rows={3} placeholder="Próximo paso, necesidad o contexto" /></label>
    {state.message ? <p className={`form-message ${state.status === "error" ? "error" : ""}`} role="status">{state.message}</p> : null}
    <button className="button primary" disabled={pending}>{pending ? "Guardando…" : "Guardar contacto"}</button>
  </form>;
}
