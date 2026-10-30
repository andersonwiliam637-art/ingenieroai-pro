import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const required = [
  "src/auth.ts",
  "src/app/register/page.tsx",
  "src/app/register/actions.ts",
  "src/app/login/page.tsx",
  "src/app/login/actions.ts",
  "src/app/dashboard/page.tsx",
  "src/app/crm/page.tsx",
  "src/app/products/page.tsx",
  "src/app/billing/page.tsx",
  "src/app/api/health/route.ts",
  "src/app/api/auth/[...nextauth]/route.ts",
  "src/app/api/billing/checkout/route.ts",
  "src/app/api/billing/paypal/return/route.ts",
  "src/app/api/billing/webhooks/paypal/route.ts",
  "src/app/api/billing/webhooks/recurrente/route.ts",
  "db/migrations/0002_onboarding_billing_runtime.sql",
  "db/seeds/0003_paid_plans_proposal.sql",
  ".env.example",
];
const missing = required.filter((path) => !existsSync(join(root, path)));
if (missing.length) {
  console.error("QA_ROUTES_FAILED: missing required files", missing);
  process.exit(1);
}
const read = (path) => readFileSync(join(root, path), "utf8");
const checks = [
  ["server-side company registration", /private\.request_organization_registration/.test(read("src/app/register/actions.ts"))],
  ["company provisioning after verified sign-in", /private\.provision_pending_organization/.test(read("src/auth.ts")) && /emailVerified/.test(read("db/migrations/0002_onboarding_billing_runtime.sql"))],
  ["custom Nodemailer sender", /nodemailer\.createTransport/.test(read("src/auth.ts")) && /sendVerificationRequest/.test(read("src/auth.ts"))],
  ["Recurrente signature verification", /new Webhook\(secret\)/.test(read("src/app/api/billing/webhooks/recurrente/route.ts"))],
  ["PayPal webhook signature verification", /verify-webhook-signature/.test(read("src/app/api/billing/webhooks/paypal/route.ts"))],
  ["payment activation from database-verified function", /private\.apply_verified_payment/.test(read("src/lib/payments.ts"))],
  ["payments disabled unless explicitly enabled", /BILLING_PAYMENTS_ENABLED !== "true"/.test(read("src/app/api/billing/checkout/route.ts"))],
  ["Recurrente currency allowlist", /\["GTQ", "USD"\]\.includes\(plan\.currency_code\)/.test(read("src/app/api/billing/checkout/route.ts"))],
  ["PayPal USD allowlist", /provider === "paypal" && plan\.currency_code !== "USD"/.test(read("src/app/api/billing/checkout/route.ts"))],
  ["SMTP configuration required before email send", /SMTP_CONFIGURATION_MISSING/.test(read("src/auth.ts")) && /SMTP_HOST/.test(read("src/app/login/actions.ts"))],
  ["restricted runtime role", /NOBYPASSRLS/.test(read("db/operations/02-runtime-role-grants.template.sql")) || /NOBYPASSRLS/.test(read("db/migrations/0002_onboarding_billing_runtime.sql"))],
  ["health checks onboarding schema", /registration_function/.test(read("src/app/api/health/route.ts"))],
];
const failed = checks.filter(([, ok]) => !ok).map(([name]) => name);
if (failed.length) {
  console.error("QA_ROUTES_FAILED:", failed.join(", "));
  process.exit(1);
}
console.log(`QA_ROUTES_STATIC_PASSED: ${required.length} files, ${checks.length} invariants.`);
console.log("Static checks are not a substitute for build, SQL migration, SMTP, sandbox payment, or tenant-isolation tests.");
