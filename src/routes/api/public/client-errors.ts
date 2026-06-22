import { createFileRoute } from "@tanstack/react-router";
import { rateLimitByIp } from "@/lib/rate-limit";

// Public ingestion endpoint for browser-side error reports.
// Writes to server logs (visible via server-function-logs).
// Schema kept tiny on purpose; no PII expected from client.
export const Route = createFileRoute("/api/public/client-errors")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          await rateLimitByIp(request, "client-errors", { capacity: 30, refillPerMin: 30 });
        } catch (e) {
          if (e instanceof Response) return e;
        }
        try {
          const body = (await request.json()) as {
            message?: string;
            stack?: string;
            route?: string;
            source?: string;
            userAgent?: string;
          };
          const safe = {
            message: String(body.message ?? "").slice(0, 500),
            stack: String(body.stack ?? "").slice(0, 2000),
            route: String(body.route ?? "").slice(0, 200),
            source: String(body.source ?? "").slice(0, 50),
            userAgent: String(body.userAgent ?? "").slice(0, 200),
            ip:
              request.headers.get("cf-connecting-ip") ??
              request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
              "unknown",
            at: new Date().toISOString(),
          };
          // Structured log line — searchable via server-function-logs.
          console.error("[client-error]", JSON.stringify(safe));
          return Response.json({ ok: true });
        } catch {
          return new Response("bad request", { status: 400 });
        }
      },
    },
  },
});