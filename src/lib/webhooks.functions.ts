import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

async function assertAdmin(ctx: any) {
  const { data } = await ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "admin" });
  const { data: sa } = await ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "super_admin" });
  if (!data && !sa) throw new Response("Forbidden", { status: 403 });
}

export const listWebhooks = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data, error } = await context.supabase.from("webhooks").select("*").order("created_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  });

export const upsertWebhook = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    id: z.string().uuid().optional(),
    event: z.string().min(1),
    url: z.string().url(),
    enabled: z.boolean().default(true),
  }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const row = { event: data.event, url: data.url, enabled: data.enabled, created_by: context.userId };
    const q = data.id
      ? context.supabase.from("webhooks").update(row).eq("id", data.id).select().single()
      : context.supabase.from("webhooks").insert(row).select().single();
    const { data: out, error } = await q;
    if (error) throw error;
    return out;
  });

export const deleteWebhook = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.from("webhooks").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

// Emit an event to all enabled webhooks for that event. Fire-and-forget via no-cors-style POST.
export const emitWebhookEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ event: z.string(), payload: z.record(z.string(), z.any()) }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: hooks } = await context.supabase
      .from("webhooks").select("id,url").eq("event", data.event).eq("enabled", true);
    if (!hooks?.length) return { sent: 0 };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await Promise.all(hooks.map(async (h) => {
      let status = 0; let body = "";
      try {
        const res = await fetch(h.url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ event: data.event, payload: data.payload, ts: new Date().toISOString() }),
        });
        status = res.status;
        body = (await res.text()).slice(0, 500);
      } catch (e) {
        body = e instanceof Error ? e.message : String(e);
      }
      await supabaseAdmin.from("webhook_deliveries").insert({
        webhook_id: h.id, event: data.event, payload: data.payload, status, response: body,
      });
    }));
    return { sent: hooks.length };
  });