# IngenieroAI.pro architecture — MVP correction

- **Frontend / server runtime:** Next.js App Router, React 19, TypeScript, deployed to Vercel.
- **Auth:** Auth.js v5 database sessions with Neon PostgreSQL adapter and email magic links using an explicit Nodemailer transport. Production email depends on configured SMTP.
- **Database:** Neon PostgreSQL multi-tenant schema. Application queries use a bounded `pg` pool and transaction-local `app.user_id` derived from Auth.js session. RLS policies guard tenant-scoped tables.
- **Onboarding:** `/register` writes an expiring registration request; only the verified email sign-in event can invoke the definer function that creates the organization, owner membership, module entitlements and Starter Free subscription.
- **MVP business surfaces:** dashboard summaries, CRM lead CRUD and product/inventory CRUD. Other schema modules exist but several operations are summaries/scaffolding rather than complete workflows.
- **Billing:** server-side single-period checkout for Recurrente hosted checkout (GTQ/USD) and PayPal Orders (USD only in this integration), plus webhook signature verification and payment-amount reconciliation. Pricing seed rows are inactive until owner approval. No automatic renewal yet.
- **Secrets:** environment variables live in Vercel, never Git. `DATABASE_URL` uses the restricted `ingenieroai_runtime` role. Production payment flag defaults off.

See `RUNBOOK_PRODUCTION.md` for deployment steps and required tests.
