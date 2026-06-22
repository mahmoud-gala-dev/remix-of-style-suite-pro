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
  const dsn = (import.meta as ImportMeta).env?.VITE_SENTRY_DSN as string | undefined;
  if (!dsn || typeof window === "undefined") return;
  try {
    const mod = "@sentry/browser";
    type SentryLike = {
      init: (opts: Record<string, unknown>) => void;
      captureException: (e: unknown, ctx?: { extra?: unknown }) => void;
      browserTracingIntegration?: () => unknown;
      addBreadcrumb?: (b: Record<string, unknown>) => void;
      metrics?: { distribution?: (name: string, value: number, opts?: { tags?: Record<string, unknown> }) => void };
    };
    const Sentry: SentryLike | null = (await import(/* @vite-ignore */ mod).catch(() => null)) as SentryLike | null;
    if (!Sentry) return;
    Sentry.init({
      dsn,
      tracesSampleRate: 0.1,
      // Performance: browser tracing if integrations are available in the bundle.
      integrations: typeof Sentry.browserTracingIntegration === "function"
        ? [Sentry.browserTracingIntegration()]
        : undefined,
    });
    _sentry = { captureException: (e, ctx) => Sentry.captureException(e, { extra: ctx }) };
    _sentryMetric = (name, value, ctx) => {
      try {
        // Prefer Sentry.metrics.distribution when available, else breadcrumb.
        const m = Sentry.metrics;
        if (m?.distribution) m.distribution(name, value, { tags: ctx });
        else Sentry.addBreadcrumb?.({ category: "web-vitals", message: name, data: { value, ...(ctx ?? {}) } });
      } catch {
        /* ignore */
      }
    };
  } catch {
    /* ignore */
  }
}

let _sentryMetric: ((name: string, value: number, ctx?: Record<string, unknown>) => void) | null = null;

// P49 — Forward Core Web Vitals (CLS, INP, LCP, FCP, TTFB) to:
//   1. window.__lovableEvents.captureMetric (LOVABLE_ERROR_REPORTING pipeline)
//   2. Sentry metrics / breadcrumbs (when VITE_SENTRY_DSN is set)
//   3. /api/public/client-errors as a best-effort beacon for self-hosted aggregation.
async function initWebVitals() {
  if (typeof window === "undefined") return;
  try {
    type WebVitalMetric = { name: string; value: number; id: string; rating?: string };
    type WebVitalsModule = {
      onCLS?: (cb: (m: WebVitalMetric) => void) => void;
      onINP?: (cb: (m: WebVitalMetric) => void) => void;
      onLCP?: (cb: (m: WebVitalMetric) => void) => void;
      onFCP?: (cb: (m: WebVitalMetric) => void) => void;
      onTTFB?: (cb: (m: WebVitalMetric) => void) => void;
    };
    const mod = "web-vitals";
    const wv = (await import(/* @vite-ignore */ mod).catch(() => null)) as WebVitalsModule | null;
    if (!wv) return;
    const report = (metric: WebVitalMetric) => {
      const ctx = { id: metric.id, rating: metric.rating, route: window.location.pathname };
      try {
        window.__lovableEvents?.captureMetric?.(metric.name, metric.value, ctx);
      } catch {
        /* ignore */
      }
      _sentryMetric?.(`web_vitals.${metric.name.toLowerCase()}`, metric.value, ctx);
      try {
        const body = JSON.stringify({ kind: "web-vital", name: metric.name, value: metric.value, ...ctx });
        if (navigator.sendBeacon) {
          navigator.sendBeacon("/api/public/web-vitals", body);
        } else {
          void fetch("/api/public/web-vitals", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body,
            keepalive: true,
          }).catch(() => undefined);
        }
      } catch {
        /* ignore */
      }
    };
    wv.onCLS?.(report);
    wv.onINP?.(report);
    wv.onLCP?.(report);
    wv.onFCP?.(report);
    wv.onTTFB?.(report);
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
  void initWebVitals();
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
