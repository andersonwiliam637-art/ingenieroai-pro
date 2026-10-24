# IngenieroAI Platform — Architecture

One platform, multiple commercial experiences.

## Core
Identity, tenancy, RBAC, customers, files, notifications, audit, billing, settings, module flags.

## Verticals
LATAM Business Operations; UAE Operations & Logistics.

## Security
Every business-owned row carries `organization_id`. PostgreSQL RLS is the primary isolation boundary; application checks are secondary. Frontend authorization is never trusted.

## Billing
Provider webhooks are the source of truth. Frontend cannot declare a tenant paid. Webhook processing must be idempotent.

## Integrations
Payments, FEL, WhatsApp, email, maps and AI are adapters around the core domain. No hardcoded credentials.

## Localization
Tenant stores region, country, currency, locale and timezone. UAE adds Arabic/RTL in Phase 4 without a second codebase.
