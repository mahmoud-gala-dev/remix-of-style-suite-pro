# ADR-0001 — Use TanStack Start instead of Next.js

- **Status**: Accepted
- **Date**: 2026-05-01

## Context

The project needs SSR + file-based routing + first-class TypeScript on an edge
runtime (Cloudflare Workers). Both Next.js App Router and TanStack Start fit
the bill on paper.

## Decision

Adopt **TanStack Start v1** with the Vite plugin.

## Consequences

- **Positive**: type-safe routing end-to-end (no string paths); `createServerFn`
  RPC is simpler and lighter than Next server actions; Vite dev server is
  noticeably faster; no Vercel lock-in.
- **Negative**: smaller ecosystem; some patterns (auth gating, error
  boundaries) require care; docs are still maturing.
- **Neutral**: SSR/SSG configured through `_authenticated/` layout instead of
  middleware.

## Alternatives considered

1. **Next.js 15 App Router** — overkill for our routing needs; server actions
   couple too tightly to RSC.
2. **Remix** — fine, but `createServerFn`'s validator-then-handler chain wins
   for typed RPC.
