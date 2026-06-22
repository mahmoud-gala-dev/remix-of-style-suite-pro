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
| 9 | `any` types: 2 of 11 cleaned (`tenants`, `coupons`). Remaining are intentional (dynamic Sentry/web-vitals imports, generic table-name routing in admin/restore). | `admin.functions.ts`, `restore.functions.ts`, `lovable-error-reporting.ts` | P4 | Low |
| 10 | ~~No Supabase Realtime~~ — FIXED (queue + calendar subscribe to `postgres_changes`) | `queue.tsx`, `calendar.tsx` | — | — |
| 11 | ~~No customer-facing invoice PDF~~ — FIXED (jsPDF + autoTable on `/my/$token`) | `my.$token.tsx` | — | — |
| 12 | ~~No booking-confirmation email/SMS~~ — FIXED (Resend email + Twilio WhatsApp best-effort) | `bookings.functions.ts`, `notifications.server.ts` | — | — |
| 13 | ~~Per-employee shifts / day-off~~ — FIXED (tables + admin UI at `/shifts` + enforced in `createBooking`) | `shifts.tsx`, `shifts.functions.ts` | — | — |
| 14 | ~~Calendar drag-and-drop~~ — FIXED (HTML5 DnD + `rescheduleBooking` server fn with overlap check) | `calendar.tsx`, `reschedule.functions.ts` | — | — |
| 15 | Seed/demo IDs are non-UUID (`em1`, `cu1`, `sv1`) and live alongside real DB rows in the same Zustand collections. Pages that pass these IDs straight to `z.string().uuid()` server fns will throw ZodError (cycle #9 hit this on `/shifts`; filtered locally). Cleaner fix: mint UUIDs at seed time. Watch-item, not blocking. | `src/lib/seed.ts` | P4 | Low |