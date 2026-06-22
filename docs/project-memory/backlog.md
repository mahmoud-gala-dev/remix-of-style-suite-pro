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
- [~] Test coverage expanded: `rate-limit`, `csv`, `whatsapp`, `stripe-verify`, `otp-helpers`, `totp`, `booking-shift`, `recurring`, `cancel-policy`, `reports-aggregate` (+`percentDelta`/`previousPeriod`), `format`, `client-ip`, `layout`, `csv-parse`, `push-vapid`, `theme` (resolveTheme SSR fallback + matchMedia + toggle cycle), and `utils` (`cn` Tailwind merge). Suite: 163 tests. (cycle #3)
- [~] Removed `any` in webhooks/tenants/memberships routes (cycle #3). Residual: `admin.functions.ts` supabase dynamic table, `restore.functions.ts`, `lovable-error-reporting.ts` (Sentry dynamic import), `tenants.functions.ts` ctx typing, `coupons.tsx` select cast — all intentional dynamic boundaries.

## P4 (nice-to-have / future)
- [x] PDF stack consolidated on `jspdf` + `jspdf-autotable`. `pdf-lib` removed from deps; reports server-fn rewritten to use jspdf. (cycle #3)
- [x] WhatsApp brand color tokenized as `--color-whatsapp` / `bg-whatsapp` / `text-whatsapp-foreground`; `book.tsx` and `reminders-widget` updated. (cycle #3)
- [x] `sitemap.xml` now derives origin from the request URL (works on preview, prod, custom domain) and emits priority + changefreq per page. (cycle #3)
- [x] Kiosk display uses semantic tokens (`bg-background`, `text-foreground`, `bg-primary/15`, etc.) and accepts `?theme=light|dark&accent=RRGGBB` search params for per-branch theming. (cycle #3)
- [x] Webhook deliveries queue inspector with totals (OK/Failed/Pending), "show failed only" filter, and retry button. (cycle #3)