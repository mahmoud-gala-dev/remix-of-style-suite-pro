# Backlog — 2026-06-22

## P1 (critical, do next)
- [x] Rate-limit OTP `request`/`verify` (5/10min, 10/min). → done in this audit.
- [x] Stop returning OTP code from `requestOtp` outside dev. → done in this audit.
- [x] Require `x-cron-secret` header on `/api/public/cron/*` endpoints. → done in this audit.
- [ ] Wire OTP send through Twilio when Twilio settings are enabled (today the code is silently discarded).
- [ ] Replace hardcoded VAPID private-key fallback with a startup error when `VAPID_PRIVATE_KEY` is unset in production.

## P2 (important)
- [ ] Add `<DataState>` wrappers (loading / error / empty) to: bookings, customers, calendar, queue, reports, services, employees, branches, settings, docs, dashboard.
- [ ] Booking-confirmation email via Resend + optional WhatsApp via Twilio.
- [ ] Customer invoice PDF download from `/my/$token`.
- [ ] Realtime subscriptions for `queue_items` and `bookings` so kiosk + admin update without refresh.
- [ ] `React.lazy()` for heavy routes (`reports`, `calendar`, dashboard) and PDF/Excel libs.
- [ ] Backfill `requireAdmin` shared helper across `webhooks`, `notifications`, `stripe`, `saml`, `tenants`, `twilio`.

## P3 (improvements)
- [ ] Per-employee shifts + days-off table → tighten availability engine.
- [ ] Recurring bookings UI hooked to existing `recurring.functions.ts`.
- [ ] Saved filters on bookings, invoices, customers.
- [ ] Expand test coverage: bookings, invoices, loyalty, 2FA, OTP, Stripe webhook.
- [ ] Remove residual `any` types (11 locations).

## P4 (nice-to-have / future)
- [ ] Consolidate PDF libraries (keep one of jspdf / pdf-lib).
- [ ] Tokenize WhatsApp brand color into theme.
- [ ] Populate sitemap.xml with real public URLs.
- [ ] Theme-able kiosk (`display.$branch.tsx`).
- [ ] Background-jobs UI (queue inspector for `webhook_deliveries`).