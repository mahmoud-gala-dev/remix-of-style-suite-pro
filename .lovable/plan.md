# Vanguard Salon OS — build plan

You picked all four areas. Doing them in one turn would be reckless, so we'll ship in 4 phases. Each phase is independently usable and gets reviewed before the next.

## Phase 1 — Persistence + Auth + Roles (start here)

Move data out of the in-memory Zustand store into Lovable Cloud (Postgres), add login, and gate the admin app behind sign-in.

What you get:
- Email/password + Google sign-in on a new `/auth` route.
- 5 roles (`super_admin`, `admin`, `reception`, `staff`, `customer`) stored in a proper `user_roles` table with a `has_role()` security-definer function.
- Tables: `branches`, `services`, `employees`, `customers`, `bookings`, `queue_items`, `profiles`, `user_roles` — all with RLS.
- Admin app (current `/`, `/calendar`, `/bookings`, `/queue`, `/customers`, `/services`, `/employees`, `/branches`, `/reports`, `/settings`) moves under `_authenticated/` and reads/writes from the DB via TanStack Query.
- A "seed demo data" button (admin-only) so the current seed records can be inserted into your real DB.

## Phase 2 — Customer-facing online booking PWA

- New public routes: `/book`, `/book/$branch`, `/book/$branch/service`, `/book/$branch/slot`, `/book/$branch/confirm`.
- Availability engine: respects employee hours, breaks, existing bookings, service duration, chair count, buffers, past-time blocking. Supports "Any available employee".
- Customer account: view / reschedule / cancel bookings, points, membership.
- PWA: installable manifest + icons; offline shell via the guarded `vite-plugin-pwa` path (only after admin app is stable).

## Phase 3 — Bookings, queue, calendar polish

- Drag-and-drop calendar (day/week/employee views) with conflict detection.
- Live queue with statuses (waiting/called/in-progress/completed) and estimated wait time.
- Booking status workflow (pending → confirmed → arrived → in-progress → completed / no-show / cancelled).
- Realtime updates via Supabase realtime so the queue and calendar update across devices.

## Phase 4 — Payments, invoices, loyalty, coupons

- Checkout drawer on a completed booking; payment methods (cash/card/wallet/other), paid/unpaid/partial status.
- Invoice generation + PDF export.
- Loyalty: points per visit / per spend, redemption table, history.
- Coupons: percentage / fixed / bundles, validity dates, usage limits.
- Memberships: Silver / Gold / VIP with remaining visits + expiry.

## Out of scope for now (call out, not building yet)

- WhatsApp / SMS / email sending integrations (will use Lovable Email + a WhatsApp link generator later).
- Native mobile apps.
- AI analytics.
- Excel/PDF import (CSV export is easy; full Excel import is its own project).
- Multi-tenant (multiple businesses on one DB) — current architecture is single-business / multi-branch as you specified.

## Technical notes

- Stack stays: TanStack Start + React 19 + Tailwind v4 + shadcn + Zustand (UI state only) + TanStack Query (server state) + Zod + Recharts + Framer Motion.
- Zustand keeps language/theme/current-branch selection; all domain data moves to Postgres.
- All DB access goes through `createServerFn` with `requireSupabaseAuth` middleware so RLS scopes by user.
- `i18n` and `theme` stores stay client-side, persisted to localStorage.
- Google OAuth via the managed Lovable broker (`lovable.auth.signInWithOAuth("google")`).

## Phase 1 — concrete steps I'll take next turn

1. Migration: create enums (`app_role`, `booking_status`, `queue_status`, `gender`, `payment_status`), tables, GRANTs, RLS policies, `has_role()` function, profile trigger.
2. `supabase--configure_social_auth` to enable Google.
3. Server functions per resource (`src/lib/branches.functions.ts`, etc.) using `requireSupabaseAuth`.
4. `/auth` page (email + Google), `_authenticated/route.tsx` if not present, move admin routes under it.
5. Refactor pages from `useData()` Zustand store to TanStack Query hooks backed by the server functions.
6. Admin-only "Load demo data" action that inserts the current `seedBranches/Services/Employees/Customers/Bookings/Queue` into the DB scoped to the signed-in admin.

Reply "go" and I'll start Phase 1. If you want to reorder, drop a phase, or change scope (e.g. skip Google auth, or skip role-gating for now), tell me before I start.
