// #4 — Structured JSON logger. One line per event, easy to grep / ship to Sentry / Datadog.
// Usage: logger.info("booking_created", { id, branchId })

type Level = "debug" | "info" | "warn" | "error";

interface LogFields {
  [key: string]: unknown;
}

// P52 (E) — PII redaction. Scrub phone numbers, emails, and obvious tokens
// from log fields before they leave the process. Audit/compliance: logs are
// often shipped to third-party aggregators (Datadog/Sentry/CloudWatch) so we
// must never let raw PII out.
const EMAIL_RE = /([a-zA-Z0-9._%+-])[a-zA-Z0-9._%+-]*(@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g;
const PHONE_RE = /(\+?\d[\d\s\-().]{7,}\d)/g;
const TOKEN_KEYS = /^(authorization|apikey|api_key|access_token|refresh_token|password|secret|otp|code|cookie)$/i;

function redactString(s: string): string {
  return s
    .replace(EMAIL_RE, "$1***$2")
    .replace(PHONE_RE, (m) => (m.length <= 4 ? m : `${m.slice(0, 2)}***${m.slice(-2)}`));
}

function redactValue(v: unknown, key?: string): unknown {
  if (key && TOKEN_KEYS.test(key)) return "[REDACTED]";
  if (typeof v === "string") return redactString(v);
  if (Array.isArray(v)) return v.map((x) => redactValue(x));
  if (v && typeof v === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
      out[k] = redactValue(val, k);
    }
    return out;
  }
  return v;
}

export function redactPII(fields: LogFields): LogFields {
  return redactValue(fields) as LogFields;
}

function emit(level: Level, event: string, fields: LogFields = {}): void {
  const record = {
    ts: new Date().toISOString(),
    level,
    event,
    ...redactPII(fields),
  };
  const line = JSON.stringify(record);
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

export const logger = {
  debug: (event: string, fields?: LogFields) => emit("debug", event, fields),
  info: (event: string, fields?: LogFields) => emit("info", event, fields),
  warn: (event: string, fields?: LogFields) => emit("warn", event, fields),
  error: (event: string, fields?: LogFields) => emit("error", event, fields),
};

/** Wrap an async server handler with start/end/error logs and duration. */
export async function withLog<T>(
  event: string,
  fields: LogFields,
  fn: () => Promise<T>,
): Promise<T> {
  const started = Date.now();
  logger.info(`${event}.start`, fields);
  try {
    const result = await fn();
    logger.info(`${event}.ok`, { ...fields, durationMs: Date.now() - started });
    return result;
  } catch (err) {
    logger.error(`${event}.fail`, {
      ...fields,
      durationMs: Date.now() - started,
      error: err instanceof Error ? err.message : String(err),
    });
    throw err;
  }
}