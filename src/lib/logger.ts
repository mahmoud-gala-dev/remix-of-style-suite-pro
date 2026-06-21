// #4 — Structured JSON logger. One line per event, easy to grep / ship to Sentry / Datadog.
// Usage: logger.info("booking_created", { id, branchId })

type Level = "debug" | "info" | "warn" | "error";

interface LogFields {
  [key: string]: unknown;
}

function emit(level: Level, event: string, fields: LogFields = {}): void {
  const record = {
    ts: new Date().toISOString(),
    level,
    event,
    ...fields,
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