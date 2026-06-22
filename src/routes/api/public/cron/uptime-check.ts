import { createFileRoute } from "@tanstack/react-router";
import { notifySlack } from "@/lib/slack.server";
import { logger } from "@/lib/logger";

// Pings /healthcheck and alerts Slack when degraded/down. Idempotent — safe to
// run every 1–5 minutes. Origin auto-derived from the incoming request URL.
export const Route = createFileRoute("/api/public/cron/uptime-check")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const expected = process.env.CRON_SECRET;
        if (expected && (request.headers.get("x-cron-secret") ?? "") !== expected) {
          return new Response("Unauthorized", { status: 401 });
        }
        const origin = new URL(request.url).origin;
        const started = Date.now();
        let status: "ok" | "degraded" | "down" = "down";
        let httpStatus = 0;
        let body: unknown = null;
        try {
          const res = await fetch(`${origin}/api/public/healthcheck`, {
            headers: { "cache-control": "no-store" },
          });
          httpStatus = res.status;
          body = await res.json().catch(() => null);
          status = res.ok ? "ok" : "degraded";
        } catch (e) {
          logger.warn("uptime probe failed", { error: e instanceof Error ? e.message : String(e) });
        }
        const latencyMs = Date.now() - started;
        if (status !== "ok") {
          await notifySlack(`Uptime probe ${status} (HTTP ${httpStatus}, ${latencyMs}ms)`, {
            origin, body,
          });
        }
        logger.info("uptime probe", { status, httpStatus, latencyMs });
        return Response.json({ status, httpStatus, latencyMs });
      },
    },
  },
});
