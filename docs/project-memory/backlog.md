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
- [ ] Per-employee shifts + days-off table → tighten availability engine.
- [x] Recurring bookings UI already wired in `BookingDialog` (weekly/biweekly/monthly + occurrences) via `createRecurringSeries`. (cycle #3)
- [x] Saved filters via `usePersistedState` hook — customers search, invoices status/date range (localStorage-persisted). (cycle #3)
- [ ] Expand test coverage: bookings, invoices, loyalty, 2FA, OTP, Stripe webhook.
- [~] Removed `any` in webhooks/tenants/memberships routes (cycle #3). Residual: `admin.functions.ts` supabase dynamic table, `restore.functions.ts`, `lovable-error-reporting.ts` (Sentry dynamic import), `tenants.functions.ts` ctx typing, `coupons.tsx` select cast — all intentional dynamic boundaries.

## P4 (nice-to-have / future)
- [ ] Consolidate PDF libraries (keep one of jspdf / pdf-lib).
- [ ] Tokenize WhatsApp brand color into theme.
- [ ] Populate sitemap.xml with real public URLs.
- [ ] Theme-able kiosk (`display.$branch.tsx`).
- [ ] Background-jobs UI (queue inspector for `webhook_deliveries`).