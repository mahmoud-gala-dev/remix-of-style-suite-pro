# Audit Cycle #9 — 2026-06-22

## Scope
Architectural decision on debt #1. No code changes.

## Decision
Routes that consume the shared `hydrate` Zustand store (bookings, customers, calendar, queue, services, employees, branches, settings, index, inventory, commissions, docs) do not need per-route `DataState`. Loading is already handled at the `AppShell`/route gate boundary, and store reads are synchronous selectors. Per-query `DataState` only adds value when each query has its own loading/error lifecycle — applied for webhooks, waitlist, tenants, shifts.

Debt #1 closed by design.

## Score impact
- No change.