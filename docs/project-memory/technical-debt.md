# Technical Debt — 2026-06-22 (refreshed cycle #3)

| # | Issue | Files | Priority | Severity |
|---|---|---|---|---|
| 1 | `DataState` adopted on 11 routes; remaining gaps: `bookings.tsx`, `customers.tsx`, `calendar.tsx`, `queue.tsx`, `services.tsx`, `employees.tsx`, `branches.tsx`, `settings.tsx`, `docs.tsx`, `index.tsx` | as listed | P3 | Low |
| 2 | No `React.lazy()` / dynamic imports — entire app eager-loaded (~1–2 MB JS) | all `src/routes/` | P2 | Medium |
| 3 | 3 PDF libs installed (`jspdf`, `jspdf-autotable`, `pdf-lib`) — consolidate | `package.json` | P4 | Low |
| 4 | `<3%` test coverage of server functions (3 unit files for 114 fns) | `tests/` | P3 | Medium |
| 5 | `assertAdmin` boilerplate duplicated — now centralized as `requireAdmin`; backfill remaining files | `webhooks/notifications/twilio/stripe/saml/tenants .functions.ts` | P3 | Low |
| 6 | ~~Hardcoded VAPID private key fallback~~ — FIXED (KI-002, throws when secret missing) | `src/lib/push.server.ts` | — | — |
| 7 | ~~Hardcoded WhatsApp brand color `#25D366`~~ — FIXED (tokenized) | — | — | — |
| 8 | ~~`sitemap.xml.ts` URL placeholder~~ — FIXED (origin derived from request) | `src/routes/sitemap[.]xml.ts` | — | — |
| 9 | `any` types in 11 non-generated locations (mostly `ctx: any`) | see audit | P3 | Low |
| 10 | ~~No Supabase Realtime~~ — FIXED (queue + calendar subscribe to `postgres_changes`) | `queue.tsx`, `calendar.tsx` | — | — |
| 11 | ~~No customer-facing invoice PDF~~ — FIXED (jsPDF + autoTable on `/my/$token`) | `my.$token.tsx` | — | — |
| 12 | ~~No booking-confirmation email/SMS~~ — FIXED (Resend email + Twilio WhatsApp best-effort) | `bookings.functions.ts`, `notifications.server.ts` | — | — |
| 13 | Per-employee shifts / day-off table missing — availability engine inaccurate | DB schema + `bookings.functions.ts` | P3 | Medium |