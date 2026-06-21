import { createFileRoute } from "@tanstack/react-router";

// P24 — lightweight health probe for uptime monitors.
// Pings DB to confirm app + database are both reachable. No PII, no auth.
export const Route = createFileRoute("/api/public/healthcheck")({
  server: {
    handlers: {
      GET: async () => {
        const started = Date.now();
        let db: "ok" | "fail" = "ok";
        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { error } = await supabaseAdmin.from("app_settings").select("key").limit(1);
          if (error) db = "fail";
        } catch {
          db = "fail";
        }
        const body = {
          status: db === "ok" ? "ok" : "degraded",
          db,
          uptimeMs: Date.now() - started,
          ts: new Date().toISOString(),
        };
        return new Response(JSON.stringify(body), {
          status: db === "ok" ? 200 : 503,
          headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
        });
      },
    },
  },
});