import { createFileRoute } from "@tanstack/react-router";
import { logger } from "@/lib/logger";

// P2 (cycle #6) — Waitlist auto-promote.
// Finds recently-cancelled future bookings and notifies the oldest matching
// waitlist entry (same branch, matching service if specified, preferred_date
// within ±1 day of the freed slot). Stamps waitlist.notified_at so each
// entry is promoted at most once.

function authorized(request: Request): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected) return true;
  return (request.headers.get("x-cron-secret") ?? "") === expected;
}

export const Route = createFileRoute("/api/public/cron/waitlist-promote")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!authorized(request)) return new Response("Unauthorized", { status: 401 });
        const url = new URL(request.url);
        const lookbackMin = Math.min(
          Math.max(Number(url.searchParams.get("lookbackMin") ?? 30) || 30, 1),
          1440,
        );
        const since = new Date(Date.now() - lookbackMin * 60_000).toISOString();

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: cancellations } = await supabaseAdmin
          .from("bookings")
          .select("id, branch_id, service_id, start_at, updated_at")
          .eq("status", "cancelled")
          .gte("updated_at", since)
          .gte("start_at", new Date().toISOString())
          .limit(200);

        let promoted = 0;
        for (const b of (cancellations ?? []) as Array<{
          branch_id: string; service_id: string | null; start_at: string;
        }>) {
          const day = b.start_at.slice(0, 10);
          const dayBefore = new Date(new Date(b.start_at).getTime() - 86400_000).toISOString().slice(0, 10);
          const dayAfter = new Date(new Date(b.start_at).getTime() + 86400_000).toISOString().slice(0, 10);

          let q = supabaseAdmin
            .from("waitlist")
            .select("id, customer_name, customer_phone, service_id, preferred_date")
            .eq("branch_id", b.branch_id)
            .eq("status", "waiting")
            .is("notified_at", null)
            .order("created_at", { ascending: true })
            .limit(5);
          const { data: candidates } = await q;

          const pick = (candidates ?? []).find((w) => {
            if (b.service_id && w.service_id && w.service_id !== b.service_id) return false;
            if (w.preferred_date && ![day, dayBefore, dayAfter].includes(w.preferred_date.slice(0, 10))) {
              return false;
            }
            return true;
          });
          if (!pick) continue;

          try {
            if (pick.customer_phone) {
              const { sendWhatsappInternal } = await import("@/lib/twilio.functions");
              const when = new Date(b.start_at).toLocaleString();
              await sendWhatsappInternal(
                pick.customer_phone,
                `Good news${pick.customer_name ? `, ${pick.customer_name}` : ""}! A slot opened at ${when}. Reply to confirm.`,
              );
            }
          } catch { /* best-effort */ }

          await supabaseAdmin
            .from("waitlist")
            .update({ notified_at: new Date().toISOString(), status: "notified" })
            .eq("id", pick.id);
          promoted++;
        }

        logger.info("waitlist.promote", { scanned: cancellations?.length ?? 0, promoted });
        return Response.json({ ok: true, scanned: cancellations?.length ?? 0, promoted });
      },
    },
  },
});