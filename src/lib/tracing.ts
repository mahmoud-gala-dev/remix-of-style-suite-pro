// P50 — Lightweight OpenTelemetry-flavoured tracing for server functions.
//
// Why not the full @opentelemetry/* SDK? Cloudflare Workers cannot run the
// Node SDK (no async-hooks/AsyncLocalStorage instrumentation API surface),
// and the Workers SDK is still experimental. This module emits OTLP-shaped
// spans (traceId/spanId/name/kind/startTimeUnixNano/endTimeUnixNano/attributes/status),
// logs them as structured JSON (searchable via server-function-logs), and
// optionally POSTs them to `OTEL_EXPORTER_OTLP_ENDPOINT` in OTLP/HTTP-JSON
// format. Drop-in replacement: any OTEL-compatible collector accepts them.

import { logger } from "./logger";

function randomHex(bytes: number): string {
  const buf = new Uint8Array(bytes);
  crypto.getRandomValues(buf);
  let out = "";
  for (const b of buf) out += b.toString(16).padStart(2, "0");
  return out;
}

export interface Span {
  traceId: string;
  spanId: string;
  name: string;
  startUnixNano: bigint;
  attributes: Record<string, string | number | boolean>;
}

const SERVICE_NAME = "vanguard-salon-os";

async function exportSpan(span: Span, endUnixNano: bigint, status: "ok" | "error", error?: unknown) {
  const endpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
  const durationMs = Number((endUnixNano - span.startUnixNano) / 1_000_000n);
  // Always log a structured line so traces are visible without a collector.
  logger.info("trace.span", {
    traceId: span.traceId,
    spanId: span.spanId,
    name: span.name,
    durationMs,
    status,
    ...span.attributes,
  });
  if (!endpoint) return;
  const payload = {
    resourceSpans: [
      {
        resource: { attributes: [{ key: "service.name", value: { stringValue: SERVICE_NAME } }] },
        scopeSpans: [
          {
            scope: { name: "vanguard.server-fn" },
            spans: [
              {
                traceId: span.traceId,
                spanId: span.spanId,
                name: span.name,
                kind: 2, // SPAN_KIND_SERVER
                startTimeUnixNano: span.startUnixNano.toString(),
                endTimeUnixNano: endUnixNano.toString(),
                attributes: Object.entries(span.attributes).map(([k, v]) => ({
                  key: k,
                  value:
                    typeof v === "number"
                      ? { doubleValue: v }
                      : typeof v === "boolean"
                        ? { boolValue: v }
                        : { stringValue: String(v) },
                })),
                status:
                  status === "ok"
                    ? { code: 1 }
                    : { code: 2, message: error instanceof Error ? error.message : String(error ?? "") },
              },
            ],
          },
        ],
      },
    ],
  };
  try {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (process.env.OTEL_EXPORTER_OTLP_HEADERS) {
      for (const pair of process.env.OTEL_EXPORTER_OTLP_HEADERS.split(",")) {
        const [k, v] = pair.split("=");
        if (k && v) headers[k.trim()] = v.trim();
      }
    }
    await fetch(`${endpoint.replace(/\/$/, "")}/v1/traces`, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
      // fire-and-forget — never block the response
      keepalive: true,
    }).catch(() => undefined);
  } catch {
    /* ignore */
  }
}

/**
 * Wrap an async function with a server-span. Use inside `createServerFn`
 * handlers:
 *
 *   .handler(async (ctx) => withSpan("bookings.create", { userId: ctx.context.userId }, () => doWork(ctx)))
 */
export async function withSpan<T>(
  name: string,
  attributes: Record<string, string | number | boolean>,
  fn: () => Promise<T>,
): Promise<T> {
  const span: Span = {
    traceId: randomHex(16),
    spanId: randomHex(8),
    name,
    startUnixNano: BigInt(Date.now()) * 1_000_000n,
    attributes,
  };
  try {
    const result = await fn();
    void exportSpan(span, BigInt(Date.now()) * 1_000_000n, "ok");
    return result;
  } catch (err) {
    void exportSpan(span, BigInt(Date.now()) * 1_000_000n, "error", err);
    throw err;
  }
}