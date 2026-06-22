# ADR-0002 — Multi-tenancy via Supabase RLS scoped to `tenant_id`

- **Status**: Accepted
- **Date**: 2026-05-08

## Context

Vanguard hosts multiple salons in one database. Tenants must never read each
other's bookings, customers, or revenue.

## Decision

Every tenant-owned table carries `tenant_id uuid` (directly or via FK to
`branches`). RLS policies use `public.has_role` + `public.current_user_tenants()`
to restrict rows to the caller's tenant set. Cross-cutting tables (`profiles`,
`user_roles`) scope by `auth.uid()` only.

## Consequences

- **Positive**: tenant isolation enforced at the database, not the application;
  any app bug fails closed; works identically for browser, server fn, and
  webhook code paths.
- **Negative**: every JOIN must include the tenant predicate, otherwise the
  planner cannot prove safety and rows drop unexpectedly; admins debugging
  cross-tenant must impersonate via `service_role`.
- **Neutral**: per-tenant analytics piggybacks on the same `tenant_id`.

## Alternatives considered

1. **Separate schema per tenant** — operationally heavy at scale (migrations
   across N schemas).
2. **App-level tenant filtering** — too easy to forget a predicate, and one
   bug leaks data across tenants.
