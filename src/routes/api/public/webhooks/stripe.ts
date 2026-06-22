import { createFileRoute } from "@tanstack/react-router";
import { verifyStripeWebhook } from "@/lib/stripe.functions";

export const Route = createFileRoute("/api/public/webhooks/stripe")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const signature = request.headers.get("stripe-signature") ?? "";
        const payload = await request.text();
        try {
          const result = await verifyStripeWebhook({ data: { payload, signature } });
          if ("skipped" in result && result.skipped) {
            return new Response("skipped", { status: 200 });
          }
          const eventType = result.type;
          const object = JSON.parse(result.object);

          if (eventType === "checkout.session.completed") {
            const tenantId = object.client_reference_id;
            const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
            if (tenantId) {
              await supabaseAdmin.from("subscriptions").upsert({
                tenant_id: tenantId,
                tier: "pro",
                status: "active",
                max_bookings_per_month: 1000,
                current_period_start: new Date().toISOString(),
                current_period_end: new Date(Date.now() + 30 * 24 * 3600_000).toISOString(),
                updated_at: new Date().toISOString(),
              }, { onConflict: "tenant_id" });
            }
          }

          return new Response("ok", { status: 200 });
        } catch (e) {
          console.error("Stripe webhook error:", e);
          return new Response("error", { status: 400 });
        }
      },
    },
  },
});
