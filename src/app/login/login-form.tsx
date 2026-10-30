"use client";

import { useActionState } from "react";
import { requestMagicLink, type LoginState } from "./actions";

const initialState: LoginState = { status: "idle", message: "" };

export default function LoginForm() {
  const [state, action, pending] = useActionState(requestMagicLink, initialState);
  return <form action={action} className="login-form">
    <label htmlFor="email">Correo electrónico</label>
    <input id="email" name="email" type="email" autoComplete="email" required maxLength={254} placeholder="tu@empresa.com" />
    {state.message ? <p className={`form-message ${state.status === "error" ? "error" : ""}`} role="status">{state.message}</p> : null}
    <button className="button primary" type="submit" disabled={pending}>{pending ? "Enviando…" : "Enviar enlace de acceso"}</button>
  </form>;
}
