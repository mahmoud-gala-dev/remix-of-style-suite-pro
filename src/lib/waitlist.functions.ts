// F4 — Waitlist server functions.
// joinWaitlist is public (no auth) — anyone with a phone can register interest.
// list/update are staff-only via requireSupabaseAuth + RLS.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { rateLimit } from "@/lib/rate-limit";

const joinSchema = z.object({
  branchId: z.string().uuid(),
  serviceId: z.string().uuid(),
  customerName: z.string().trim().min(2).max(120),
  customerPhone: z.string().trim().min(6).max(40),
  preferredDate: z.string().optional(),
  notes: z.string().trim().max(500).optional(),
});

export const joinWaitlist = createServerFn({ method: "POST" })
  .inputValidator((d) => joinSchema.parse(d))
  .handler(async ({ data }) => {
    await rateLimit(`waitlist:${data.customerPhone}`, { capacity: 5, refillPerMin: 5 });
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("waitlist")
      .insert({
        branch_id: data.branchId,
        service_id: data.serviceId,
        customer_name: data.customerName,
        customer_phone: data.customerPhone,
        preferred_date: data.preferredDate ?? null,
        notes: data.notes ?? null,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id };
  });

export const listWaitlist = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ branchId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("waitlist")
      .select("*")
      .eq("branch_id", data.branchId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const updateWaitlistStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      id: z.string().uuid(),
      status: z.enum(["waiting", "notified", "converted", "cancelled"]),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("waitlist")
      .update({
        status: data.status,
        notified_at: data.status === "notified" ? new Date().toISOString() : null,
      })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const deleteWaitlistEntry = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("waitlist").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });