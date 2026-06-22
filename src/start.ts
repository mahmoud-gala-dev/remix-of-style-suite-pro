import { createStart, createMiddleware } from "@tanstack/react-start";

import { renderErrorPage } from "./lib/error-page";
import { attachSupabaseAuth } from "@/integrations/supabase/auth-attacher";
import { captureServerException, captureServerMetric } from "./lib/sentry.server";

const errorMiddleware = createMiddleware().server(async ({ next }) => {
  const startedAt = Date.now();
  try {
    const res = await next();
    void captureServerMetric("server.request.duration_ms", Date.now() - startedAt, { status: "ok" });
    return res;
  } catch (error) {
    if (error != null && typeof error === "object" && "statusCode" in error) {
      void captureServerException(error, { kind: "http_status_error" });
      throw error;
    }
    console.error(error);
    void captureServerException(error, { kind: "unhandled_server_error" });
    void captureServerMetric("server.request.duration_ms", Date.now() - startedAt, { status: "error" });
    return new Response(renderErrorPage(), {
      status: 500,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }
});

// P46 — security headers (CSP, X-Frame-Options, Referrer-Policy, etc.)
const securityHeadersMiddleware = createMiddleware().server(async ({ next }) => {
  const res = await next();
  const r = res as unknown as Response;
  if (r && typeof r === "object" && "headers" in r && r.headers?.set) {
    const csp = [
      "default-src 'self'",
      // 'unsafe-inline' kept for TanStack Start hydration scripts (no nonce plumbing yet).
      // 'unsafe-eval' removed — not required at runtime.
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data:",
      "connect-src 'self' https: wss:",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; ");
    r.headers.set("Content-Security-Policy", csp);
    r.headers.set("X-Frame-Options", "DENY");
    r.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
    r.headers.set("X-Content-Type-Options", "nosniff");
    r.headers.set("Permissions-Policy", "geolocation=(), microphone=(), camera=(), payment=(), usb=()");
    r.headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
    r.headers.set("Cross-Origin-Opener-Policy", "same-origin");
  }
  return res;
});

export const startInstance = createStart(() => ({
  functionMiddleware: [attachSupabaseAuth],
  requestMiddleware: [errorMiddleware, securityHeadersMiddleware],
}));
