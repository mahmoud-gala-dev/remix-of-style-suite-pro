import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const channelEnum = z.enum(["whatsapp", "email", "push"]);
const segmentEnum = z.enum(["all", "vip", "inactive_30d", "birthdays_this_month", "custom"]);

export const listCampaigns = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ branchId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("campaigns")
      .select("id,name,channel,segment,subject,body,scheduled_at,status,recipient_count,sent_count,failed_count,created_at")
      .eq("branch_id", data.branchId)
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

async function resolveSegment(
  branchId: string,
  segment: z.infer<typeof segmentEnum>,
  channel: z.infer<typeof channelEnum>,
): Promise<string[]> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  let q = supabaseAdmin
    .from("customers")
    .select("id, phone, email, last_visit, birthday, visits, total_spend, blocked")
    .eq("branch_id", branchId)
    .eq("blocked", false);

  if (channel === "whatsapp") q = q.not("phone", "is", null);
  if (channel === "email") q = q.not("email", "is", null);

  const { data, error } = await q.limit(5000);
  if (error) throw new Error(error.message);

  const now = new Date();
  const monthIdx = now.getMonth();
  const cutoff = new Date(now.getTime() - 30 * 24 * 3600_000);

  return (data ?? [])
    .filter((c) => {
      switch (segment) {
        case "all":
        case "custom":
          return true;
        case "vip":
          return (c.visits ?? 0) >= 5 || Number(c.total_spend ?? 0) >= 1000;
        case "inactive_30d":
          return !c.last_visit || new Date(c.last_visit) < cutoff;
        case "birthdays_this_month":
          return c.birthday ? new Date(c.birthday).getMonth() === monthIdx : false;
        default:
          return false;
      }
    })
    .map((c) => c.id);
}

export const createCampaign = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      branchId: z.string().uuid(),
      name: z.string().trim().min(2).max(120),
      channel: channelEnum,
      segment: segmentEnum,
      subject: z.string().trim().max(200).optional(),
      body: z.string().trim().min(2).max(1600),
      scheduledAt: z.string().datetime().optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const ids = await resolveSegment(data.branchId, data.segment, data.channel);
    const { data: row, error } = await context.supabase
      .from("campaigns")
      .insert({
        branch_id: data.branchId,
        name: data.name,
        channel: data.channel,
        segment: data.segment,
        subject: data.subject ?? null,
        body: data.body,
        scheduled_at: data.scheduledAt ?? new Date().toISOString(),
        status: "draft",
        recipient_count: ids.length,
        created_by: context.userId,
      })
      .select("id")
      .single();
    if (error || !row) throw new Error(error?.message ?? "Failed to create campaign");

    if (ids.length > 0) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      // chunked insert
      for (let i = 0; i < ids.length; i += 500) {
        const chunk = ids.slice(i, i + 500).map((cid) => ({
          campaign_id: row.id,
          customer_id: cid,
        }));
        const { error: e2 } = await supabaseAdmin.from("campaign_recipients").insert(chunk);
        if (e2) throw new Error(e2.message);
      }
    }
    return { ok: true as const, id: row.id, recipientCount: ids.length };
  });

export const launchCampaign = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    // Verify branch access via RLS-scoped read
    const { data: camp, error } = await context.supabase
      .from("campaigns")
      .select("id, status, scheduled_at")
      .eq("id", data.id)
      .single();
    if (error || !camp) throw new Error("Campaign not found");
    if (camp.status !== "draft" && camp.status !== "scheduled") {
      throw new Error(`Cannot launch: status is ${camp.status}`);
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: recipients, error: rErr } = await supabaseAdmin
      .from("campaign_recipients")
      .select("id")
      .eq("campaign_id", data.id)
      .eq("status", "pending");
    if (rErr) throw new Error(rErr.message);

    const { enqueueNotification } = await import("./notification-queue.server");
    const runAt = new Date(Math.max(Date.now(), new Date(camp.scheduled_at).getTime()));
    for (const r of recipients ?? []) {
      await enqueueNotification("campaign_message", { recipientId: r.id }, runAt);
    }

    await supabaseAdmin
      .from("campaigns")
      .update({ status: "sending" })
      .eq("id", data.id);

    return { ok: true as const, queued: recipients?.length ?? 0 };
  });

export const cancelCampaign = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("campaigns")
      .update({ status: "cancelled" })
      .eq("id", data.id)
      .in("status", ["draft", "scheduled", "sending"]);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const deleteCampaign = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("campaigns").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });
