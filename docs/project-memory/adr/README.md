# Architecture Decision Records (ADRs)

ADRs capture *why* a significant architectural choice was made, not how the
code looks today. One file per decision, numbered sequentially. Once an ADR is
accepted it is **immutable** — supersede it with a new ADR rather than editing.

## Format

Use [`0000-template.md`](./0000-template.md). Each ADR has:

- **Status** — Proposed / Accepted / Superseded by ADR-NNNN
- **Context** — the forces at play
- **Decision** — what we chose
- **Consequences** — positive + negative + neutral tradeoffs
- **Alternatives considered**

## Index

| # | Title | Status |
|---|---|---|
| [0001](./0001-tanstack-start-over-nextjs.md) | Use TanStack Start instead of Next.js | Accepted |
| [0002](./0002-supabase-rls-multi-tenancy.md) | Multi-tenancy via Supabase RLS on `tenant_id` | Accepted |
| [0003](./0003-server-fns-over-edge-functions.md) | `createServerFn` over Supabase Edge Functions for app logic | Accepted |
| [0004](./0004-token-bucket-rate-limit.md) | Postgres-backed token-bucket rate limiter | Accepted |
| [0005](./0005-lightweight-otel-tracing.md) | Hand-rolled OTLP-compatible spans instead of OTel SDK | Accepted |
