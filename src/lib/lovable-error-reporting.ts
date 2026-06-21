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
    // @ts-ignore — optional peer dep, only loaded if installed
    const Sentry: any = await import(/* @vite-ignore */ ("@sentry/browser" as any)).catch(() => null);
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
