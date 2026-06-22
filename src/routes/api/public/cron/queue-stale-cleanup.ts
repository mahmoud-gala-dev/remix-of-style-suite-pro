import { createFileRoute } from "@tanstack/react-router";
import { logger } from "@/lib/logger";

// P4 (cycle #7) — Auto-cancel stale queue items.
// Marks `queue_items` as `cancelled` when they have been sitting in
// `waiting` or `called` status for longer than `staleMinutes` (default 120),
// freeing the queue and surfacing accurate wait counts on dashboards/kiosks.

function authorized(request: Request): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected) return true;
  return (request.headers.get("x-cron-secret") ?? "") === expected;
}

export const Route = createFileRoute("/api/public/cron/queue-stale-cleanup")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!authorized(request)) return new Response("Unauthorized", { status: 401 });
        const url = new URL(request.url);
        const staleMinutes = Math.min(
          Math.max(Number(url.searchParams.get("staleMinutes") ?? 120) || 120, 5),
          1440,
        );
        const cutoff = new Date(Date.now() - staleMinutes * 60_000).toISOString();

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: stale, error } = await supabaseAdmin
          .from("queue_items")
          .select("id, branch_id")
          .in("status", ["waiting", "called"])
          .lte("updated_at", cutoff)
          .limit(500);
        if (error) return Response.json({ ok: false, error: error.message }, { status: 500 });
        if (!stale || stale.length === 0) return Response.json({ ok: true, cancelled: 0 });

        const ids = stale.map((q) => q.id);
        const { error: updErr } = await supabaseAdmin
          .from("queue_items")
          .update({ status: "cancelled" })
          .in("id", ids);
        if (updErr) return Response.json({ ok: false, error: updErr.message }, { status: 500 });

        logger.info("queue.stale_cleanup", { cancelled: ids.length, staleMinutes });
        return Response.json({ ok: true, cancelled: ids.length, staleMinutes });
      },
    },
  },
});