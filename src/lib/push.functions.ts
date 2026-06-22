import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const subSchema = z.object({
  endpoint: z.string().url().max(2048),
  p256dh: z.string().min(1).max(256),
  auth: z.string().min(1).max(256),
  userAgent: z.string().max(512).nullable().optional(),
});

export const savePushSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => subSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("push_subscriptions")
      .upsert(
        {
          user_id: context.userId,
          endpoint: data.endpoint,
          p256dh: data.p256dh,
          auth: data.auth,
          user_agent: data.userAgent ?? null,
        },
        { onConflict: "endpoint" },
      );
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const deletePushSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ endpoint: z.string().url() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("push_subscriptions")
      .delete()
      .eq("user_id", context.userId)
      .eq("endpoint", data.endpoint);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

// Broadcast a push to every stored subscription. Used by the booking + queue
// hooks so staff get notified even when their tab is closed.
export const broadcastPush = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      title: z.string().min(1).max(120),
      body: z.string().max(280).optional(),
      url: z.string().max(256).optional(),
      tag: z.string().max(64).optional(),
    }).parse(d),
  )
  .handler(async ({ data }) => {
    if (!process.env.VAPID_PRIVATE_KEY) return { sent: 0, skipped: "VAPID not configured" as const };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { sendWebPush } = await import("./push.server");
    const { data: subs, error } = await supabaseAdmin
      .from("push_subscriptions")
      .select("endpoint,p256dh,auth");
    if (error) throw new Error(error.message);
    if (!subs?.length) return { sent: 0 };
    let sent = 0;
    const stale: string[] = [];
    await Promise.all(
      subs.map(async (s) => {
        try {
          const res = await sendWebPush(s, data);
          if (res.ok) sent += 1;
          else if (res.status === 404 || res.status === 410) stale.push(s.endpoint);
        } catch { /* swallow individual delivery errors */ }
      }),
    );
    if (stale.length) {
      await supabaseAdmin.from("push_subscriptions").delete().in("endpoint", stale);
    }
    return { sent };
  });