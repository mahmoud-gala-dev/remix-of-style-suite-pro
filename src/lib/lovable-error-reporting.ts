type LovableErrorOptions = {
  mechanism?: "manual" | "onerror" | "unhandledrejection" | "react_error_boundary";
  handled?: boolean;
  severity?: "error" | "warning" | "info";
};

type LovableEvents = {
  captureException?: (
    error: unknown,
    context?: Record<string, unknown>,
    options?: LovableErrorOptions,
  ) => void;
  captureMetric?: (
    name: string,
    value: number,
    context?: Record<string, unknown>,
  ) => void;
};

declare global {
  interface Window {
    __lovableEvents?: LovableEvents;
  }
}

export function reportLovableError(error: unknown, context: Record<string, unknown> = {}) {
  if (typeof window === "undefined") return;
  window.__lovableEvents?.captureException?.(
    error,
    {
      source: "react_error_boundary",
      route: window.location.pathname,
      ...context,
    },
    {
      mechanism: "react_error_boundary",
      handled: false,
      severity: "error",
    },
  );
}

let _installed = false;

// P33: Optional Sentry integration. If VITE_SENTRY_DSN is set, dynamically load
// @sentry/browser and forward exceptions. Falls back to Lovable's built-in
// __lovableEvents pipeline when DSN is absent.
let _sentry: { captureException: (e: unknown, ctx?: unknown) => void } | null = null;
async function initSentry() {
  const dsn = (import.meta as any).env?.VITE_SENTRY_DSN as string | undefined;
  if (!dsn || typeof window === "undefined") return;
  try {
    const mod = "@sentry/browser";
    const Sentry: any = await import(/* @vite-ignore */ mod).catch(() => null);
    if (!Sentry) return;
    Sentry.init({ dsn, tracesSampleRate: 0.1 });
    _sentry = { captureException: (e, ctx) => Sentry.captureException(e, { extra: ctx as any }) };
  } catch {
    /* ignore */
  }
}

function forward(error: unknown, context: Record<string, unknown>, options: LovableErrorOptions) {
  if (typeof window === "undefined") return;
  window.__lovableEvents?.captureException?.(error, context, options);
  _sentry?.captureException(error, context);
  // Best-effort POST to internal ingestion route. Fire-and-forget.
  try {
    const err = error as { message?: string; stack?: string };
    const payload = {
      message: err?.message ?? String(error),
      stack: err?.stack,
      route: typeof window !== "undefined" ? window.location.pathname : "",
      source: String(context?.source ?? options.mechanism ?? "manual"),
      userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "",
    };
    void fetch("/api/public/client-errors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(() => undefined);
  } catch {
    /* ignore */
  }
}

// Attach window.onerror + unhandledrejection once; forwards to the same
// captureException pipeline as the React error boundary.
export function initGlobalErrorReporting() {
  if (typeof window === "undefined" || _installed) return;
  _installed = true;
  void initSentry();
  window.addEventListener("error", (e) => {
    forward(
      e.error ?? new Error(e.message),
      { source: "window.onerror", route: window.location.pathname, filename: e.filename, lineno: e.lineno },
      { mechanism: "onerror", handled: false, severity: "error" },
    );
  });
  window.addEventListener("unhandledrejection", (e) => {
    forward(
      e.reason instanceof Error ? e.reason : new Error(String(e.reason)),
      { source: "unhandledrejection", route: window.location.pathname },
      { mechanism: "unhandledrejection", handled: false, severity: "error" },
    );
  });
}
