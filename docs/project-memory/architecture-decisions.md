# Architecture Decisions

## ADR-001 — TanStack Start + Cloudflare Workers
**Problem:** Need SSR for SEO on public marketing/booking pages and a fast SPA for the admin shell.
**Decision:** TanStack Start on Cloudflare Workers (nodejs_compat).
**Alternatives:** Next.js (heavier), Remix (no edge story), Vite+SPA only (no SSR/SEO).
**Impact:** Constrains us to Worker-compatible packages; admin features must avoid Node-only libs.

## ADR-002 — Supabase + RLS as single source of truth
**Decision:** Postgres + RLS gated by `has_role()` security-definer function. No client-trusted role checks.
**Alternatives:** Firebase, custom Node/Express + Prisma.
**Impact:** All admin/write logic runs via `requireSupabaseAuth` server functions; `supabaseAdmin` (service role) only inside `*.functions.ts`/`*.server.ts` modules with explicit role assertion.

## ADR-003 — Server logic via `createServerFn`, not Edge Functions
**Decision:** App-internal logic lives in `src/lib/*.functions.ts`. Edge functions reserved for webhooks/cron/public APIs under `src/routes/api/public/*`.
**Why:** Type-safe RPC, shared validation, automatic auth middleware.

## ADR-004 — Multi-tenant SaaS shape
**Decision:** Per-tenant `branches`, `tenants`, `subscriptions`. Stripe per-branch pricing. Tenant onboarding via `setup.tsx` wizard.
**Impact:** All queries scope by tenant/branch.

## ADR-005 — Third-party integrations are admin-toggleable (BYOK)
**Decision:** Twilio, SAML, Stripe, AI all configurable from Settings. Disabled by default.
**Why:** Avoid forcing paid integrations on small-business users; let enterprises supply their own keys.

## ADR-006 — OTP storage in `otp_codes` table + Postgres RPC (`request_otp`, `verify_otp`)
**Decision:** Codes hashed and stored in Postgres, rate-limited via `rate_limit_buckets`. SMS delivery pluggable via Twilio.
**Status:** SMS pipe pending wiring; until then OTP code is hidden in production responses.