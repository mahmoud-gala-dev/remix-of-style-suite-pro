# ADR-0004 — Postgres-backed token-bucket rate limiter

- **Status**: Accepted
- **Date**: 2026-05-22

## Context

Cloudflare Workers run as **many isolated instances**; an in-memory rate
limiter only protects one instance. We need shared rate-limit state for OTP,
webhooks, SCIM, and client-error ingest.

## Decision

Implement the bucket in Postgres (`public.rate_limit_buckets` +
`public.check_token_bucket(key, capacity, refill_per_min)` security-definer
function). The TS helper `rateLimitByIp` falls back to a per-instance bucket
when the DB is unreachable so the app never hard-fails.

## Consequences

- **Positive**: globally consistent limits with one round-trip; tunable per
  key without redeploys.
- **Negative**: each rate-limited request costs one DB call; high-traffic
  endpoints should set generous capacities.
- **Neutral**: a 24h cleanup cron (`cleanup_rate_limit_buckets`) keeps the
  table small.

## Alternatives considered

1. **In-memory only** — defeats the purpose under Workers' many-instance
   model.
2. **Cloudflare Durable Objects / KV** — extra surface to learn and pay for;
   Postgres already in the critical path.
3. **Redis (Upstash)** — yet another vendor + secret to manage.
