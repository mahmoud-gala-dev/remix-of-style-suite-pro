import { createStart, createMiddleware } from "@tanstack/react-start";

import { renderErrorPage } from "./lib/error-page";
import { attachSupabaseAuth } from "@/integrations/supabase/auth-attacher";

const errorMiddleware = createMiddleware().server(async ({ next }) => {
  try {
    return await next();
  } catch (error) {
    if (error != null && typeof error === "object" && "statusCode" in error) {
      throw error;
    }
    console.error(error);
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
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
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
