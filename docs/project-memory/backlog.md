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
- [ ] Booking-confirmation email via Resend (next).
- [x] Customer invoice PDF download from `/my/$token`. (cycle #3)
- [x] Realtime for `queue_items` (already wired in `queue.tsx`).
- [x] Realtime for `bookings` (calendar + bookings page wired via dedicated channels; hydrate also subscribes). (cycle #3)
- [ ] `React.lazy()` for heavy routes (`reports`, `calendar`, dashboard) and PDF/Excel libs.
- [x] Backfill `requireAdmin` shared helper across `webhooks`, `notifications`, `stripe`, `saml`, `twilio`. (cycle #2)

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