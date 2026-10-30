"use client";

import { useActionState } from "react";
import Link from "next/link";
import { registerOrganizationAction, type RegistrationState } from "./actions";

const initialState: RegistrationState = { status: "idle", message: "" };

export default function RegisterForm() {
  const [state, action, pending] = useActionState(registerOrganizationAction, initialState);
  return (
    <form action={action} className="login-form register-form">
      <label htmlFor="full_name">Tu nombre completo</label>
      <input id="full_name" name="full_name" autoComplete="name" required minLength={2} maxLength={120} placeholder="Nombre y apellido" />
      <label htmlFor="email">Correo corporativo o de trabajo</label>
      <input id="email" name="email" type="email" autoComplete="email" required maxLength={254} placeholder="tu@empresa.com" />
      <label htmlFor="organization_name">Nombre de la empresa</label>
      <input id="organization_name" name="organization_name" required minLength={2} maxLength={120} placeholder="Mi empresa" />
      <label htmlFor="region">Región de operación</label>
      <select id="region" name="region" required defaultValue="LATAM">
        <option value="LATAM">Latinoamérica</option>
        <option value="UAE">Emiratos Árabes Unidos (UAE)</option>
      </select>
      <label htmlFor="country_code">País de la empresa</label>
      <select id="country_code" name="country_code" required defaultValue="GT">
        <option value="GT">Guatemala</option><option value="MX">México</option><option value="CO">Colombia</option>
        <option value="SV">El Salvador</option><option value="HN">Honduras</option><option value="CR">Costa Rica</option>
        <option value="PA">Panamá</option><option value="DO">República Dominicana</option><option value="PE">Perú</option>
        <option value="CL">Chile</option><option value="AR">Argentina</option><option value="BR">Brasil</option>
        <option value="NI">Nicaragua</option><option value="BO">Bolivia</option><option value="PY">Paraguay</option>
        <option value="UY">Uruguay</option><option value="EC">Ecuador</option><option value="AE">Emiratos Árabes Unidos</option>
      </select>
      <p className="form-hint">La empresa se crea después de verificar el correo. El primer usuario verificado recibe el rol de propietario. El plan inicial es gratuito y no activa cobros.</p>
      {state.message ? <p className={state.status === "error" ? "form-message error" : "form-message"} role="status">{state.message}</p> : null}
      <button className="button primary" type="submit" disabled={pending}>{pending ? "Procesando…" : "Verificar correo y crear empresa"}</button>
      <p className="form-hint">¿Ya tienes una cuenta? <Link href="/login">Inicia sesión</Link>.</p>
    </form>
  );
}
