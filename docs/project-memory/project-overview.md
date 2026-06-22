# Vanguard Salon OS — Project Overview

## Description
Bilingual (AR/EN, RTL-aware) multi-branch salon management platform delivered as a TanStack Start SPA + SSR app on Cloudflare Workers, backed by Supabase (Postgres + RLS + Realtime + Storage + Auth).

## Target Users
- **super_admin** — platform owner (multi-tenant management).
- **admin** — salon owner.
- **reception / staff** — daily operators.
- **customer** — self-service via `/book` and `/my/$token`.

## Main Modules
- **Operations**: dashboard, calendar, bookings, queue, waitlist, customers.
- **Management**: services, employees, branches, reports, commissions, access control.
- **Finance**: invoices, payments, memberships, coupons, loyalty/points, inventory/products.
- **System**: setup wizard, auth + roles, settings, webhooks, audit log, docs, tenants, AI suggestions, PWA push, 2FA, SAML SSO, Stripe billing, Twilio (off by default).

## Architecture
- **Framework**: TanStack Start v1 (React 19, Vite 7) on Cloudflare Workers (`nodejs_compat`).
- **Routing**: file-based under `src/routes/`. Auth-gated subtree under `_authenticated/` (ssr:false, broker-protected).
- **Server logic**: `createServerFn` in `src/lib/*.functions.ts` (114 functions across 30 files). Public webhooks/cron under `src/routes/api/public/`.
- **Data**: Supabase (project `cmdlnlojvcyzqvyawkcv`) with 35 tables, all RLS-protected via security-definer `has_role()`.
- **Styling**: Tailwind v4 via `src/styles.css`, semantic tokens, dark theme by default.
- **State**: TanStack Query + Zustand (`src/lib/store.ts`).
- **Auth**: Supabase email/password + Google OAuth via Lovable broker. Optional 2FA (TOTP) and SAML SSO for enterprise tenants.

## Integrations
| Area | File |
|---|---|
| AI Gateway | `src/lib/ai.functions.ts`, `src/lib/ai-gateway.server.ts` |
| Stripe Billing (BYOK) | `src/lib/stripe.functions.ts`, `src/routes/api/public/webhooks/stripe.ts` |
| Twilio (SMS / WhatsApp, off by default) | `src/lib/twilio.functions.ts` |
| SAML SSO | `src/lib/saml.functions.ts` |
| Web Push (VAPID) | `src/lib/push.functions.ts`, `push.server.ts` |
| TOTP 2FA | `src/lib/2fa.functions.ts` |
| Email (Resend) | `src/lib/notifications.functions.ts` |

## Key Decisions
- All admin/server-only logic runs in `createServerFn`, never edge functions.
- Roles stored in `user_roles` (separate table) to prevent privilege escalation.
- All third-party integrations are admin-toggleable from Settings (BYOK).
- Multi-tenant aware: subscriptions sized per branch via Stripe.