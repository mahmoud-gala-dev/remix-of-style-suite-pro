import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function tenantOfBranch(supabase: any, branchId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from("branches").select("tenant_id").eq("id", branchId).maybeSingle();
  if (error) throw new Error(error.message);
  return data?.tenant_id ?? null;
}

export const listExpenseCategories = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ branchId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const tenantId = await tenantOfBranch(context.supabase, data.branchId);
    if (!tenantId) return [];
    const { data: rows, error } = await context.supabase
      .from("expense_categories")
      .select("id,name,name_ar,is_active")
      .eq("tenant_id", tenantId)
      .order("name", { ascending: true });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const createExpenseCategory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    branchId: z.string().uuid(),
    name: z.string().trim().min(1).max(120),
    nameAr: z.string().trim().max(120).optional(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const tenantId = await tenantOfBranch(context.supabase, data.branchId);
    if (!tenantId) throw new Error("Branch not found");
    const { data: row, error } = await context.supabase
      .from("expense_categories")
      .insert({ tenant_id: tenantId, name: data.name, name_ar: data.nameAr ?? null })
      .select("id").single();
    if (error || !row) throw new Error(error?.message ?? "Failed to create category");
    return { ok: true as const, id: row.id };
  });

export const listExpenses = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    branchId: z.string().uuid(),
    from: z.string().optional(),
    to: z.string().optional(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    let q = context.supabase.from("expenses")
      .select("id,category_id,amount,currency,description,vendor,payment_method,reference,expense_date,created_at")
      .eq("branch_id", data.branchId)
      .order("expense_date", { ascending: false })
      .limit(500);
    if (data.from) q = q.gte("expense_date", data.from);
    if (data.to) q = q.lte("expense_date", data.to);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const createExpense = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    branchId: z.string().uuid(),
    categoryId: z.string().uuid().optional(),
    amount: z.number().nonnegative(),
    currency: z.string().trim().min(3).max(8).default("SAR"),
    description: z.string().trim().max(500).optional(),
    vendor: z.string().trim().max(200).optional(),
    paymentMethod: z.string().trim().max(40).optional(),
    reference: z.string().trim().max(120).optional(),
    expenseDate: z.string().optional(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const tenantId = await tenantOfBranch(context.supabase, data.branchId);
    if (!tenantId) throw new Error("Branch not found");
    const { data: row, error } = await context.supabase.from("expenses").insert({
      tenant_id: tenantId,
      branch_id: data.branchId,
      category_id: data.categoryId ?? null,
      amount: data.amount,
      currency: data.currency,
      description: data.description ?? null,
      vendor: data.vendor ?? null,
      payment_method: data.paymentMethod ?? null,
      reference: data.reference ?? null,
      expense_date: data.expenseDate ?? new Date().toISOString().slice(0, 10),
      created_by: context.userId,
    }).select("id").single();
    if (error || !row) throw new Error(error?.message ?? "Failed to record expense");
    return { ok: true as const, id: row.id };
  });

export const deleteExpense = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("expenses").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const expenseSummary = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    branchId: z.string().uuid(),
    from: z.string().optional(),
    to: z.string().optional(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    let eq = context.supabase.from("expenses")
      .select("amount,category_id,expense_date")
      .eq("branch_id", data.branchId);
    if (data.from) eq = eq.gte("expense_date", data.from);
    if (data.to) eq = eq.lte("expense_date", data.to);
    const { data: exRows, error: exErr } = await eq;
    if (exErr) throw new Error(exErr.message);

    let invQ = context.supabase.from("invoices")
      .select("total,issued_at,status")
      .eq("branch_id", data.branchId)
      .in("status", ["paid", "issued"]);
    if (data.from) invQ = invQ.gte("issued_at", data.from);
    if (data.to) invQ = invQ.lte("issued_at", data.to);
    const { data: invRows } = await invQ;

    const totalExpenses = (exRows ?? []).reduce((s: number, r: any) => s + Number(r.amount ?? 0), 0);
    const totalRevenue = (invRows ?? []).reduce((s: number, r: any) => s + Number(r.total ?? 0), 0);
    const byCategory: Record<string, number> = {};
    for (const r of exRows ?? []) {
      const key = r.category_id ?? "uncategorized";
      byCategory[key] = (byCategory[key] ?? 0) + Number(r.amount ?? 0);
    }
    return {
      totalExpenses,
      totalRevenue,
      netProfit: totalRevenue - totalExpenses,
      byCategory,
      count: (exRows ?? []).length,
    };
  });