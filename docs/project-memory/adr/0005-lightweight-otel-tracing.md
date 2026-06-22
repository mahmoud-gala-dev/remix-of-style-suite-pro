# ADR-0005 — Hand-rolled OTLP-compatible spans instead of the OTel SDK

- **Status**: Accepted
- **Date**: 2026-06-22

## Context

We want distributed tracing for server functions but the official
`@opentelemetry/sdk-node` requires AsyncLocalStorage instrumentation that
does not run cleanly under Cloudflare Workers; the experimental Workers SDK
is still in flux.

## Decision

Ship a ~120-line `src/lib/tracing.ts` (`withSpan(name, attrs, fn)`) that emits
spans in **OTLP/HTTP-JSON** shape — same wire format any OTel collector
accepts. By default spans go to the structured log stream; setting
`OTEL_EXPORTER_OTLP_ENDPOINT` forwards them to a real collector.

## Consequences

- **Positive**: zero-dependency, Workers-compatible, drop-in for any OTLP
  endpoint (Honeycomb, Grafana Tempo, self-hosted Jaeger).
- **Negative**: no automatic instrumentation of fetch/db; each server fn must
  opt in by wrapping its handler with `withSpan(...)`.
- **Neutral**: when the official Workers SDK stabilises we can swap the
  implementation behind the same `withSpan` interface without changing call
  sites.

## Alternatives considered

1. **Full OTel SDK** — broken under workerd today.
2. **Sentry tracing only** — vendor lock-in, no OTLP interop.
3. **Logs only** — what we had; doesn't reconstruct call trees.
