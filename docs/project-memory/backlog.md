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
- [x] **Cycle #4 — server-fn coverage**: added direct handler tests for `profile-prefs.functions` (6), `customers.functions` / `bulkImportCustomers` (5), `settings.functions` / `getAppSettings` + `setAppSetting` (6), and `notifications.functions` (6) via a tiny `@tanstack/react-start` + auth-middleware mock. +23 tests covering 8 server fns (validators + handlers + auth gates). Total suite: **238 tests**.
- [x] **Cycle #4 — `<OptimizedImage>`**: new React component (`src/components/OptimizedImage.tsx`) builds a multi-width WebP `srcset` from `optimizedImageUrl`, sets `loading="lazy"` + `decoding="async"` by default, and forwards `sizes`/`width`/`height` to prevent CLS.
- [x] **Cycle #4 — Web Vitals + Sentry performance**: `initGlobalErrorReporting` now also dynamic-imports `web-vitals` and forwards CLS/INP/LCP/FCP/TTFB to (1) `window.__lovableEvents.captureMetric` (LOVABLE_ERROR_REPORTING), (2) Sentry `metrics.distribution` / breadcrumb when `VITE_SENTRY_DSN` is set, with `browserTracingIntegration` auto-enabled when bundled, and (3) `/api/public/web-vitals` via `sendBeacon` (rate-limited, structured-log endpoint).
- [x] PDF stack consolidated on `jspdf` + `jspdf-autotable`. `pdf-lib` removed from deps; reports server-fn rewritten to use jspdf. (cycle #3)
- [x] WhatsApp brand color tokenized as `--color-whatsapp` / `bg-whatsapp` / `text-whatsapp-foreground`; `book.tsx` and `reminders-widget` updated. (cycle #3)
- [x] `sitemap.xml` now derives origin from the request URL (works on preview, prod, custom domain) and emits priority + changefreq per page. (cycle #3)
- [x] Kiosk display uses semantic tokens (`bg-background`, `text-foreground`, `bg-primary/15`, etc.) and accepts `?theme=light|dark&accent=RRGGBB` search params for per-branch theming. (cycle #3)
- [x] Webhook deliveries queue inspector with totals (OK/Failed/Pending), "show failed only" filter, and retry button. (cycle #3)