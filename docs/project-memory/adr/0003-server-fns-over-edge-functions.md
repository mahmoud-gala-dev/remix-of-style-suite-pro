# ADR-0003 — `createServerFn` over Supabase Edge Functions for app logic

- **Status**: Accepted
- **Date**: 2026-05-15

## Context

Two ways to run server logic in this stack: TanStack `createServerFn` (runs in
the Worker that serves the app) and Supabase Edge Functions (Deno, separate
deployment, separate URL).

## Decision

App-internal logic (bookings, settings, customers, billing) lives in
`src/lib/*.functions.ts` as `createServerFn`. Edge Functions are reserved for
**external** callers that must land inside Supabase's network (Stripe webhook
DB writes, Twilio status callbacks).

## Consequences

- **Positive**: same TypeScript types as the frontend, no CORS, no second
  deployment pipeline, easier observability — every span flows through the
  same `withSpan` helper.
- **Negative**: long-running jobs (>30s CPU) cannot run in the Worker;
  background work is handled by `pg_cron` calling `/api/public/cron/*` instead.
- **Neutral**: bundle size grows with server fns, but tree-shaking + the
  server-fn Vite transform keep client bundles clean.

## Alternatives considered

1. **All-in on Edge Functions** — duplicate type system, manual CORS, separate
   deploy.
2. **Server routes only** — loses type-safe RPC; reverts to fetch + Zod by
   hand at every call site.
