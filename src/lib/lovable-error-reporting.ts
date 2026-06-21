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
// Attach window.onerror + unhandledrejection once; forwards to the same
// captureException pipeline as the React error boundary.
export function initGlobalErrorReporting() {
  if (typeof window === "undefined" || _installed) return;
  _installed = true;
  window.addEventListener("error", (e) => {
    window.__lovableEvents?.captureException?.(
      e.error ?? new Error(e.message),
      { source: "window.onerror", route: window.location.pathname, filename: e.filename, lineno: e.lineno },
      { mechanism: "onerror", handled: false, severity: "error" },
    );
  });
  window.addEventListener("unhandledrejection", (e) => {
    window.__lovableEvents?.captureException?.(
      e.reason instanceof Error ? e.reason : new Error(String(e.reason)),
      { source: "unhandledrejection", route: window.location.pathname },
      { mechanism: "unhandledrejection", handled: false, severity: "error" },
    );
  });
}
