import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const KINDS = ["discount", "refund", "cancel_paid_invoice", "customer_delete", "price_override", "other"] as const;
const STATUSES = ["pending", "approved", "rejected", "cancelled"] as const;

export const listApprovals = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        branchId: z.string().uuid().optional(),
        status: z.enum(STATUSES).optional(),
      })
      .parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    let q = context.supabase
      .from("approval_requests")
      .select(
        "id,branch_id,requested_by,kind,status,title,reason,amount,currency,reference_id,payload,resolved_by,resolved_at,resolution_note,created_at,updated_at",
      )
      .order("created_at", { ascending: false })
      .limit(200);
    if (data.branchId) q = q.eq("branch_id", data.branchId);
    if (data.status) q = q.eq("status", data.status);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const createApproval = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        branchId: z.string().uuid(),
        kind: z.enum(KINDS),
        title: z.string().trim().min(1).max(200),
        reason: z.string().trim().max(2000).optional(),
        amount: z.number().optional(),
        currency: z.string().trim().max(8).optional(),
        referenceId: z.string().trim().max(120).optional(),
        payload: z.record(z.unknown()).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("approval_requests")
      .insert({
        branch_id: data.branchId,
        requested_by: context.userId,
        kind: data.kind,
        title: data.title,
        reason: data.reason ?? null,
        amount: data.amount ?? null,
        currency: data.currency ?? null,
        reference_id: data.referenceId ?? null,
        payload: data.payload ?? {},
      })
      .select("id")
      .single();
    if (error || !row) throw new Error(error?.message ?? "Failed to create approval request");
    return { ok: true as const, id: row.id };
  });

export const resolveApproval = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        id: z.string().uuid(),
        decision: z.enum(["approved", "rejected", "cancelled"]),
        note: z.string().trim().max(2000).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("approval_requests")
      .update({
        status: data.decision,
        resolved_by: context.userId,
        resolved_at: new Date().toISOString(),
        resolution_note: data.note ?? null,
      })
      .eq("id", data.id)
      .eq("status", "pending");
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });