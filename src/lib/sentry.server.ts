// Minimal Sentry envelope sender for Cloudflare Worker / TanStack server.
// No SDK — uses the public Sentry Envelope HTTP API via fetch.
// Activates only when SENTRY_DSN is set. Safe no-op otherwise.

type ParsedDsn = {
  publicKey: string;
  host: string;
  projectId: string;
  protocol: string;
};

let _cached: ParsedDsn | null | undefined;

function parseDsn(): ParsedDsn | null {
  if (_cached !== undefined) return _cached;
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) {
    _cached = null;
    return null;
  }
  try {
    const u = new URL(dsn);
    const projectId = u.pathname.replace(/^\//, "");
    _cached = {
      publicKey: u.username,
      host: u.host,
      projectId,
      protocol: u.protocol.replace(":", ""),
    };
    return _cached;
  } catch {
    _cached = null;
    return null;
  }
}

function envelopeEndpoint(dsn: ParsedDsn) {
  return `${dsn.protocol}://${dsn.host}/api/${dsn.projectId}/envelope/`;
}

function authHeader(dsn: ParsedDsn) {
  return `Sentry sentry_version=7, sentry_key=${dsn.publicKey}, sentry_client=lovable-edge/1.0`;
}

function serializeError(error: unknown) {
  if (error instanceof Error) {
    return {
      type: error.name || "Error",
      value: error.message,
      stacktrace: error.stack ? { frames: [{ filename: "<stack>", function: error.stack.split("\n")[1]?.trim() }] } : undefined,
    };
  }
  return { type: "Error", value: typeof error === "string" ? error : JSON.stringify(error) };
}

export async function captureServerException(
  error: unknown,
  context: Record<string, unknown> = {},
): Promise<void> {
  const dsn = parseDsn();
  if (!dsn) return;
  const eventId = crypto.randomUUID().replace(/-/g, "");
  const timestamp = Date.now() / 1000;
  const environment = process.env.NODE_ENV || "production";
  const release = process.env.SENTRY_RELEASE;

  const event = {
    event_id: eventId,
    timestamp,
    platform: "javascript",
    level: "error",
    environment,
    release,
    server_name: "edge-worker",
    exception: { values: [serializeError(error)] },
    extra: context,
    tags: { runtime: "worker" },
  };

  const envelope =
    JSON.stringify({ event_id: eventId, sent_at: new Date().toISOString() }) +
    "\n" +
    JSON.stringify({ type: "event" }) +
    "\n" +
    JSON.stringify(event);

  try {
    await fetch(envelopeEndpoint(dsn), {
      method: "POST",
      headers: {
        "Content-Type": "application/x-sentry-envelope",
        "X-Sentry-Auth": authHeader(dsn),
      },
      body: envelope,
    });
  } catch {
    /* swallow — never let telemetry break a request */
  }
}

export async function captureServerMetric(
  name: string,
  value: number,
  tags: Record<string, string> = {},
): Promise<void> {
  const dsn = parseDsn();
  if (!dsn) return;
  const timestamp = Math.floor(Date.now() / 1000);
  const tagStr = Object.entries(tags)
    .map(([k, v]) => `${k}:${String(v).replace(/[|#,]/g, "_")}`)
    .join(",");
  const line = `${name}@none:${value}|d|#${tagStr}|T${timestamp}`;
  const envelope =
    JSON.stringify({ sent_at: new Date().toISOString() }) +
    "\n" +
    JSON.stringify({ type: "statsd", length: line.length }) +
    "\n" +
    line;
  try {
    await fetch(envelopeEndpoint(dsn), {
      method: "POST",
      headers: {
        "Content-Type": "application/x-sentry-envelope",
        "X-Sentry-Auth": authHeader(dsn),
      },
      body: envelope,
    });
  } catch {
    /* ignore */
  }
}

export function isSentryConfigured(): boolean {
  return parseDsn() !== null;
}