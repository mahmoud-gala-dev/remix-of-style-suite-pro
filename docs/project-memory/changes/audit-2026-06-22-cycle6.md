# Audit Cycle #6 — 2026-06-22

## Scope
`any`-type cleanup (debt #9). No behavior change.

## Changes
- `tenants.functions.ts`: typed `assertSuperAdmin` ctx with `SupabaseClient`.
- `coupons.tsx`: narrowed `setKind` cast from `any` to `"percent" | "fixed"`.

## Held
- Remaining `any` are intentional: dynamic-imported Sentry/web-vitals modules, generic table-name routing in admin/restore migrations.

## Score impact
- Code Quality: +0.1. Other scores unchanged.