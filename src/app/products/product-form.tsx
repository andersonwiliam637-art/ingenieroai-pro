"use client";
import { useActionState } from "react";
import { createProductAction, type ProductState } from "./actions";
const initial: ProductState = { status: "idle", message: "" };
export default function ProductForm({ currency }: { currency: string }) {
  const [state, action, pending] = useActionState(createProductAction, initial);
  return <form action={action} className="data-form"><div className="form-grid">
    <label>Nombre del producto<input name="name" required minLength={2} maxLength={160} placeholder="Producto o servicio" /></label>
    <label>SKU<input name="sku" maxLength={80} placeholder="Código interno (opcional)" /></label>
    <label>Precio unitario<input name="unit_price" type="number" required min="0" step="0.01" defaultValue="0" /></label>
    <label>Existencias<input name="stock_quantity" type="number" required min="0" step="0.01" defaultValue="0" /></label>
  </div><input type="hidden" name="currency_code" value={currency} /><label>Descripción<textarea name="description" rows={3} maxLength={1000} placeholder="Información del producto o servicio" /></label>
    {state.message ? <p className={`form-message ${state.status === "error" ? "error" : ""}`} role="status">{state.message}</p> : null}
    <button className="button primary" disabled={pending}>{pending ? "Guardando…" : "Guardar producto"}</button>
  </form>;
}
