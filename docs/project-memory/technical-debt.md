# Technical Debt — 2026-06-22 (refreshed cycle #3)

| # | Issue | Files | Priority | Severity |
|---|---|---|---|---|
| 1 | `DataState` adopted on async/`useQuery` routes (webhooks/waitlist/tenants/shifts). Remaining routes read from a single `hydrate` Zustand store (loading state already centralized at shell-level), so per-route `DataState` would duplicate UI without benefit. Closed by design. | — | — | — |
| 2 | ~~No route code-splitting~~ — FIXED implicitly: TanStack Start auto code-splits each file-based route + heavy libs (`xlsx`, `jspdf`, `pdf-lib`) are dynamic-imported. Verified via `manualChunks` for `recharts`/`framer-motion`/`@sentry`. | `vite.config.ts` | — | — |
| 3 | ~~3 PDF libs installed~~ — FIXED (`pdf-lib` removed; only `jspdf` + `jspdf-autotable` remain, both lazy-imported) | — | — | — |
| 4 | Test coverage: 40 unit test files (booking-shift, customers, notifications, settings, profile-prefs, push-vapid, stripe-verify, webhooks-retry, etc.) + e2e + load. Expand as new server fns land. | `tests/` | P4 | Low |
| 5 | ~~`assertAdmin` boilerplate duplicated~~ — FIXED (all `.functions.ts` use shared `requireAdmin`; `access.functions.ts` keeps its local typed variant intentionally) | — | — | — |
| 6 | ~~Hardcoded VAPID private key fallback~~ — FIXED (KI-002, throws when secret missing) | `src/lib/push.server.ts` | — | — |
| 7 | ~~Hardcoded WhatsApp brand color `#25D366`~~ — FIXED (tokenized) | — | — | — |
| 8 | ~~`sitemap.xml.ts` URL placeholder~~ — FIXED (origin derived from request) | `src/routes/sitemap[.]xml.ts` | — | — |
| 9 | ~~`any` types~~ — FIXED cycle #15: `web-vitals` shim now uses a structural `WebVitalsModule` type; the only remaining contained escape hatch is `insertDynamic` in `dynamic-table.server.ts` (documented runtime-table routing). | — | — | — |
| 10 | ~~No Supabase Realtime~~ — FIXED (queue + calendar subscribe to `postgres_changes`) | `queue.tsx`, `calendar.tsx` | — | — |
| 11 | ~~No customer-facing invoice PDF~~ — FIXED (jsPDF + autoTable on `/my/$token`) | `my.$token.tsx` | — | — |
| 12 | ~~No booking-confirmation email/SMS~~ — FIXED (Resend email + Twilio WhatsApp best-effort) | `bookings.functions.ts`, `notifications.server.ts` | — | — |
| 13 | ~~Per-employee shifts / day-off~~ — FIXED (tables + admin UI at `/shifts` + enforced in `createBooking`) | `shifts.tsx`, `shifts.functions.ts` | — | — |
| 14 | ~~Calendar drag-and-drop~~ — FIXED (HTML5 DnD + `rescheduleBooking` server fn with overlap check) | `calendar.tsx`, `reschedule.functions.ts` | — | — |
| 15 | ~~Seed/demo IDs non-UUID~~ — FIXED cycle #11: all seed branches/services/employees/customers/bookings now use stable UUIDs (`BR_*`, `SV(n)`, `EM(n)`, `CU(n)`, `BK(n)` helpers in `seed.ts`). Local UUID filter in `/shifts` reverted. | — | — | — |
| 16 | ~~Enterprise scale-out~~ — FIXED cycle #16: DB-backed report cache (`report_cache` + `cached()` helper), notification job queue (`notification_jobs` + `enqueueNotification()` + `/cron/drain-notifications` worker), `mv_daily_revenue` refreshed via pg_cron + `getDailyRevenue` server fn, CDN edge cache on sitemap. True multi-region read replicas remain infra-blocked (not available on Lovable Cloud). | `report-cache.server.ts`, `notification-queue.server.ts`, `reports.functions.ts` | — | — |
| 17 | ~~No SLA visibility on notification queue~~ — FIXED cycle #17: `notification_jobs_health()` RPC (SECURITY DEFINER, locked to `authenticated`/`service_role`) + new `notification_queue_stuck` alert in `getAlerts`. Surfaces pending/failed/stuck counts in the admin alerts widget; respects `alert_dismissals`. | `alerts.functions.ts` | — | — |
| 18 | ~~60s stale-window on `/reports` after a booking write~~ — FIXED cycle #18: `invalidateReportCache()` helper wired into `createBooking`, `rescheduleBooking`, `cancelByToken`, `createRecurringSeries`, `cancelRecurringSeries`. Fire-and-forget; booking writes never blocked. | `report-cache.server.ts`, `bookings.functions.ts`, `reschedule.functions.ts`, `customer-portal.functions.ts`, `recurring.functions.ts` | — | — |