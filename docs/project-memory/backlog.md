# Backlog — 2026-06-22

## P1 (critical, do next)
- [x] Rate-limit OTP `request`/`verify` (5/10min, 10/min). → done in this audit.
- [x] Stop returning OTP code from `requestOtp` outside dev. → done in this audit.
- [x] Require `x-cron-secret` header on `/api/public/cron/*` endpoints. → done in this audit.
- [x] Wire OTP send through Twilio when Twilio settings are enabled. (cycle #2)
- [x] VAPID throws in production when `VAPID_PRIVATE_KEY` env is unset; dev fallback retained. (cycle #2)

## P2 (important)
- [~] Add `<DataState>` wrappers — reports done (cycle #3). Others use Zustand store hydrated by `useHydrate` (already covered by polling + Realtime, no async loading state needed at page level).
- [x] Booking-confirmation WhatsApp via Twilio (best-effort, fires after `createBooking`). (cycle #2)
- [x] Booking-confirmation email via Resend (best-effort, fires after `createBooking` when notification settings provider=resend and customer has email). (cycle #3)
- [x] Customer invoice PDF download from `/my/$token`. (cycle #3)
- [x] Realtime for `queue_items` (already wired in `queue.tsx`).
- [x] Realtime for `bookings` (calendar + bookings page wired via dedicated channels; hydrate also subscribes). (cycle #3)
- [x] Heavy libs lazy-loaded: `jspdf`/`jspdf-autotable` already dynamic-imported; `xlsx` now dynamic-imported in `src/lib/xlsx.ts`. Route splitting already handled per-file by TanStack Router. (cycle #3)
- [x] Backfill `requireAdmin` shared helper across `webhooks`, `notifications`, `stripe`, `saml`, `twilio`. (cycle #2)

## P3 (improvements)
- [x] Per-employee shifts + days-off tables added (RLS: read-all, admin-write). `createBooking` rejects bookings outside shifts or on days off. Admin UI shipped at `/shifts` (cycle #3).
- [x] Recurring bookings UI already wired in `BookingDialog` (weekly/biweekly/monthly + occurrences) via `createRecurringSeries`. (cycle #3)
- [x] Saved filters via `usePersistedState` hook — customers search, invoices status/date range (localStorage-persisted). (cycle #3)
- [~] Test coverage expanded: …`require-admin`, `i18n-dict`, **`storage-transforms`** (CDN webp defaults + caller overrides), **`push-vapid-required`** (KI-002 regression guard). Suite: 213 tests. (cycle #3)
- [x] **KI-002 closed**: removed hardcoded `DEV_VAPID_PRIVATE_KEY` fallback; `VAPID_PRIVATE_KEY` env required in every environment with a clear remediation message. (cycle #3)
- [x] **CDN image optimization**: `getAvatarUrl` / `getImageUrl` now request Supabase Storage transforms (`format=webp`, sensible width + quality defaults) so every avatar/image URL is auto-optimized at the edge. (cycle #3)
- [x] **Twilio ↔ OTP**: `requestOtp` already routes through `sendWhatsappInternal` (Twilio WhatsApp) when admin enabled it in Settings; OTP code only leaks when delivery failed in non-prod. (cycle #2, re-verified)
- [~] Removed `any` in webhooks/tenants/memberships routes (cycle #3). Residual: `admin.functions.ts` supabase dynamic table, `restore.functions.ts`, `lovable-error-reporting.ts` (Sentry dynamic import), `tenants.functions.ts` ctx typing, `coupons.tsx` select cast — all intentional dynamic boundaries.

## P4 (nice-to-have / future)
- [x] **Cycle #6 — No-show deposit hold (Stripe)** — new `src/lib/deposits.functions.ts`: `holdBookingDeposit` creates a Stripe PaymentIntent with `capture_method=manual` (authorization hold), `captureBookingDeposit` charges it on no-show, `releaseBookingDeposit` cancels the hold on attendance. New cron `/api/public/cron/deposit-noshow-capture` sweeps `status='no_show' AND deposit_status='authorized' AND start_at < now()-graceHours` to auto-capture and releases lingering holds on completed bookings. Reuses the BYOK Stripe key already in `app_settings.stripe_billing`; new booking columns: `deposit_amount_cents`, `deposit_currency`, `deposit_intent_id`, `deposit_status`, `deposit_held_at`, `deposit_settled_at`.
- [x] **Cycle #6 — Review-request cron** (`/api/public/cron/review-requests`): scans `bookings` where `status='completed'` and `end_at` is 2h–48h ago (configurable) and `review_request_sent_at IS NULL`, sends a best-effort WhatsApp + email review-request, then stamps `review_request_sent_at` so each booking is asked exactly once. New `bookings.review_request_sent_at` column added in the same cycle.
- [x] **Cycle #6 — Booking reminders cron** (`/api/public/cron/booking-reminders`): scans `bookings` where `reminder_sent_at IS NULL` and `start_at` is within the next 24h (configurable `?aheadHours=&slackHours=`), sends best-effort WhatsApp via Twilio + email via Resend, then stamps `reminder_sent_at` so each booking is reminded exactly once. Cron-secret protected like the rest of `/api/public/cron/*`.
- [x] **Cycle #5 — measured coverage**: `vitest --coverage` wired (v8 provider, HTML+JSON+text reporters), scoped to pure-logic units. **87.56% statements / 78.4% branches / 90.4% functions / 87.75% lines** across 26 modules — gates set at 60/65/55/60 in `vitest.config.ts`. Suite: **241 tests**.
- [x] **Cycle #5 — OpenTelemetry tracing** (`src/lib/tracing.ts`): `withSpan(name, attrs, fn)` emits OTLP/HTTP-JSON spans, always logs as structured `trace.span` lines, and POSTs to `OTEL_EXPORTER_OTLP_ENDPOINT` when set. ADR-0005 documents why we skip the official SDK on Workers. Wired into `exportAuditLog` and every SCIM handler.
- [x] **Cycle #5 — SCIM 2.0 provisioning**: `/api/public/scim/v2/Users` (GET list + POST create) and `/api/public/scim/v2/Users/$id` (GET + PATCH active + DELETE) — bearer-auth via auto-generated `SCIM_BEARER_TOKEN`, rate-limited, `application/scim+json` responses, backed by `supabaseAdmin.auth.admin.*`.
- [x] **Cycle #5 — Audit log export**: `exportAuditLog` server fn (admin-only) streams `audit_log` to CSV with optional date range + row cap (max 50k).
- [x] **Cycle #5 — k6 load tests**: `tests/load/{healthcheck,booking-catalog,web-vitals-beacon}.js` with per-script p75/p95 thresholds + README runbook.
- [x] **Cycle #5 — Web Vitals p75 alerting**: new `web_vitals_samples` table + `web_vitals_p75(window_minutes)` RPC. `/api/public/web-vitals` now persists every beacon; `/api/public/cron/web-vitals-alert` reads the last N minutes, computes p75 per metric, and logs `web_vitals.alert` records when LCP>2500, INP>200, CLS>0.1, FCP>1800, or TTFB>800.
- [x] **Cycle #5 — ADR folder**: `docs/project-memory/adr/` with template + 5 initial ADRs (TanStack Start choice, RLS multi-tenancy, server-fns over Edge Functions, Postgres token-bucket, lightweight OTel).
- [x] **Cycle #4 — server-fn coverage**: added direct handler tests for `profile-prefs.functions` (6), `customers.functions` / `bulkImportCustomers` (5), `settings.functions` / `getAppSettings` + `setAppSetting` (6), and `notifications.functions` (6) via a tiny `@tanstack/react-start` + auth-middleware mock. +23 tests covering 8 server fns (validators + handlers + auth gates). Total suite: **238 tests**.
- [x] **Cycle #4 — `<OptimizedImage>`**: new React component (`src/components/OptimizedImage.tsx`) builds a multi-width WebP `srcset` from `optimizedImageUrl`, sets `loading="lazy"` + `decoding="async"` by default, and forwards `sizes`/`width`/`height` to prevent CLS.
- [x] **Cycle #4 — Web Vitals + Sentry performance**: `initGlobalErrorReporting` now also dynamic-imports `web-vitals` and forwards CLS/INP/LCP/FCP/TTFB to (1) `window.__lovableEvents.captureMetric` (LOVABLE_ERROR_REPORTING), (2) Sentry `metrics.distribution` / breadcrumb when `VITE_SENTRY_DSN` is set, with `browserTracingIntegration` auto-enabled when bundled, and (3) `/api/public/web-vitals` via `sendBeacon` (rate-limited, structured-log endpoint).
- [x] PDF stack consolidated on `jspdf` + `jspdf-autotable`. `pdf-lib` removed from deps; reports server-fn rewritten to use jspdf. (cycle #3)
- [x] WhatsApp brand color tokenized as `--color-whatsapp` / `bg-whatsapp` / `text-whatsapp-foreground`; `book.tsx` and `reminders-widget` updated. (cycle #3)
- [x] `sitemap.xml` now derives origin from the request URL (works on preview, prod, custom domain) and emits priority + changefreq per page. (cycle #3)
- [x] Kiosk display uses semantic tokens (`bg-background`, `text-foreground`, `bg-primary/15`, etc.) and accepts `?theme=light|dark&accent=RRGGBB` search params for per-branch theming. (cycle #3)
- [x] Webhook deliveries queue inspector with totals (OK/Failed/Pending), "show failed only" filter, and retry button. (cycle #3)