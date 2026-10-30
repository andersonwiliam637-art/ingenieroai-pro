import { pool } from "@/lib/db/pool";

export type PaymentProvider = "recurrente" | "paypal";
export type PaymentStatus = "succeeded" | "failed" | "canceled" | "refunded";

export function appBaseUrl() {
  const configured = process.env.APP_BASE_URL || process.env.AUTH_URL;
  if (!configured) throw new Error("APP_BASE_URL_MISSING");
  const url = new URL(configured);
  if (process.env.NODE_ENV === "production" && url.protocol !== "https:") throw new Error("APP_BASE_URL_MUST_USE_HTTPS");
  return url.origin;
}

export function minorToDecimalString(minor: number) {
  if (!Number.isSafeInteger(minor) || minor < 0) throw new Error("INVALID_MINOR_AMOUNT");
  return (minor / 100).toFixed(2);
}

export function decimalToMinor(value: string | number) {
  const input = String(value).trim();
  if (!/^\d+(?:\.\d{1,2})?$/.test(input)) throw new Error("INVALID_PROVIDER_AMOUNT");
  const [whole, fraction = ""] = input.split(".");
  return Number(whole) * 100 + Number((fraction + "00").slice(0, 2));
}

function paypalBaseUrl() {
  return process.env.PAYPAL_MODE === "live"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";
}

export async function paypalAccessToken() {
  const clientId = process.env.PAYPAL_CLIENT_ID?.trim();
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error("PAYPAL_CONFIGURATION_MISSING");
  const response = await fetch(`${paypalBaseUrl()}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
    cache: "no-store",
  });
  const data = await response.json().catch(() => ({})) as { access_token?: string };
  if (!response.ok || !data.access_token) throw new Error("PAYPAL_AUTH_FAILED");
  return data.access_token;
}

export async function paypalApi(path: string, init: RequestInit = {}) {
  const token = await paypalAccessToken();
  const response = await fetch(`${paypalBaseUrl()}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
    cache: "no-store",
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    // Do not forward provider body or credentials to the browser.
    throw new Error(`PAYPAL_API_ERROR_${response.status}`);
  }
  return data as Record<string, any>;
}

export async function applyVerifiedPayment(input: {
  provider: PaymentProvider;
  eventId: string;
  eventType: string;
  providerPaymentId: string;
  status: PaymentStatus;
  amountMinor: number;
  currency: string;
  payload?: Record<string, unknown>;
}) {
  const result = await pool.query<{ applied: boolean }>(
    `SELECT private.apply_verified_payment(
       $1::text,$2::text,$3::text,$4::text,$5::text,$6::bigint,$7::text,$8::jsonb
     ) AS applied`,
    [input.provider, input.eventId.slice(0, 255), input.eventType.slice(0, 255), input.providerPaymentId,
      input.status, input.amountMinor, input.currency.toUpperCase(), JSON.stringify(input.payload ?? {})],
  );
  return result.rows[0]?.applied === true;
}
