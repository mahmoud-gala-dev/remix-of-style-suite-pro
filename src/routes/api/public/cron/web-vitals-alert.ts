import { createFileRoute } from "@tanstack/react-router";
import { logger } from "@/lib/logger";

// P52 — Cron-driven p75 alerting for Web Vitals.
// Reads the last 15 minutes of samples, computes p75 per metric, and logs
// a structured "web_vitals.alert" record when any metric exceeds the
// industry "needs improvement" budget. Hook a downstream alerting webhook
// to that log line (Sentry/PagerDuty/Slack) when ready.
//
// Budgets (Core Web Vitals "good" thresholds):
//   LCP <= 2500ms, INP <= 200ms, CLS <= 0.1, FCP <= 1800ms, TTFB <= 800ms

const BUDGETS: Record<string, number> = {
  LCP: 2500,
  INP: 200,
  CLS: 0.1,
  FCP: 1800,
  TTFB: 800,
};

function authorized(request: Request): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected) return true; // dev: open
  return (request.headers.get("x-cron-secret") ?? "") === expected;
}

export const Route = createFileRoute("/api/public/cron/web-vitals-alert")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!authorized(request)) return new Response("Unauthorized", { status: 401 });
        const url = new URL(request.url);
        const windowMinutes = Math.min(
          Math.max(Number(url.searchParams.get("window") ?? 15) || 15, 1),
          1440,
        );
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data, error } = await supabaseAdmin.rpc("web_vitals_p75", {
          p_window_minutes: windowMinutes,
        });
        if (error) {
          return Response.json({ ok: false, error: error.message }, { status: 500 });
        }
        const alerts: Array<{ name: string; p75: number; budget: number; samples: number }> = [];
        for (const row of data ?? []) {
          const budget = BUDGETS[row.name];
          if (!budget) continue;
          if (row.p75 > budget) {
            alerts.push({ name: row.name, p75: row.p75, budget, samples: Number(row.samples) });
            logger.warn("web_vitals.alert", {
              name: row.name,
              p75: row.p75,
              budget,
              samples: Number(row.samples),
              windowMinutes,
            });
          }
        }
        return Response.json({
          ok: true,
          windowMinutes,
          metrics: data ?? [],
          alerts,
        });
      },
    },
  },
});