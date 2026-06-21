import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { createHmac } from "crypto";

function signPayload(secret: string, body: string): string {
  return "sha256=" + createHmac("sha256", secret).update(body).digest("hex");
}

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

export const listDeliveries = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data, error } = await context.supabase
      .from("webhook_deliveries")
      .select("id, webhook_id, event, status, attempts, failed, response, created_at, next_retry_at")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw error;
    return data ?? [];
  });

// Emit an event to all enabled webhooks for that event. Fire-and-forget via no-cors-style POST.
export const emitWebhookEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ event: z.string(), payload: z.record(z.string(), z.any()) }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: hooks } = await context.supabase
      .from("webhooks").select("id,url,secret").eq("event", data.event).eq("enabled", true);
    if (!hooks?.length) return { sent: 0 };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await Promise.all(hooks.map(async (h) => {
      let status = 0; let body = "";
      const requestBody = JSON.stringify({ event: data.event, payload: data.payload, ts: new Date().toISOString() });
      const signature = h.secret ? signPayload(h.secret, requestBody) : "";
      try {
        const res = await fetch(h.url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(signature ? { "X-Vanguard-Signature": signature } : {}),
          },
          body: requestBody,
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

// P42 — Retry failed deliveries (status >= 500 OR status == 0) up to 3 times with exp backoff.
export const retryFailedWebhooks = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const nowIso = new Date().toISOString();
    const { data: rows } = await supabaseAdmin
      .from("webhook_deliveries")
      .select("id, webhook_id, event, payload, attempts, status")
      .eq("failed", false)
      .lte("next_retry_at", nowIso)
      .or("status.gte.500,status.eq.0")
      .limit(50);
    if (!rows?.length) return { retried: 0, failed: 0 };

    let retried = 0; let failed = 0;
    for (const row of rows) {
      if (!row.webhook_id) continue;
      const { data: hook } = await supabaseAdmin
        .from("webhooks").select("url, enabled, secret").eq("id", row.webhook_id).maybeSingle();
      if (!hook?.enabled) continue;
      let status = 0; let body = "";
      const requestBody = JSON.stringify({ event: row.event, payload: row.payload, ts: new Date().toISOString(), retry: true });
      const signature = hook.secret ? signPayload(hook.secret, requestBody) : "";
      try {
        const res = await fetch(hook.url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(signature ? { "X-Vanguard-Signature": signature } : {}),
          },
          body: requestBody,
        });
        status = res.status;
        body = (await res.text()).slice(0, 500);
      } catch (e) {
        body = e instanceof Error ? e.message : String(e);
      }
      const attempts = (row.attempts ?? 1) + 1;
      const ok = status >= 200 && status < 400;
      const isFailure = !ok;
      const giveUp = isFailure && attempts >= 3;
      const backoffMs = Math.pow(2, attempts) * 60_000; // 4m, 8m, ...
      await supabaseAdmin.from("webhook_deliveries").update({
        attempts, status, response: body,
        failed: giveUp,
        next_retry_at: isFailure && !giveUp ? new Date(Date.now() + backoffMs).toISOString() : null,
      }).eq("id", row.id);
      if (giveUp) failed++; else retried++;
    }
    return { retried, failed };
  });

// P68 — Send a one-off test ping to a single webhook (records delivery).
export const sendTestPing = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { data: hook, error } = await context.supabase
      .from("webhooks").select("id,url,event,secret").eq("id", data.id).maybeSingle();
    if (error) throw error;
    if (!hook) throw new Response("Not found", { status: 404 });
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const payload = { test: true, at: new Date().toISOString() };
    const requestBody = JSON.stringify({ event: hook.event, payload, ts: payload.at, test: true });
    const signature = hook.secret ? signPayload(hook.secret, requestBody) : "";
    let status = 0; let body = "";
    try {
      const res = await fetch(hook.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(signature ? { "X-Vanguard-Signature": signature } : {}),
        },
        body: requestBody,
      });
      status = res.status;
      body = (await res.text()).slice(0, 500);
    } catch (e) {
      body = e instanceof Error ? e.message : String(e);
    }
    await supabaseAdmin.from("webhook_deliveries").insert({
      webhook_id: hook.id, event: hook.event, payload, status, response: body,
    });
    return { status, body };
  });