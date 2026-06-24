import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function tenantOfBranch(supabase: any, branchId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from("branches").select("tenant_id").eq("id", branchId).single();
  if (error) throw new Error(error.message);
  return data?.tenant_id ?? null;
}

export const listPackages = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ branchId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("service_packages")
      .select("id,name_en,name_ar,description,service_ids,sessions_count,price,currency,validity_days,active,created_at")
      .eq("branch_id", data.branchId)
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const createPackage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    branchId: z.string().uuid(),
    nameEn: z.string().trim().min(1).max(120),
    nameAr: z.string().trim().min(1).max(120),
    description: z.string().trim().max(500).optional(),
    serviceIds: z.array(z.string().uuid()).default([]),
    sessionsCount: z.number().int().positive().max(1000),
    price: z.number().nonnegative().max(1_000_000),
    currency: z.string().min(2).max(8).default("SAR"),
    validityDays: z.number().int().positive().max(3650).default(365),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const tenantId = await tenantOfBranch(context.supabase, data.branchId);
    const { data: row, error } = await context.supabase.from("service_packages").insert({
      tenant_id: tenantId,
      branch_id: data.branchId,
      name_en: data.nameEn,
      name_ar: data.nameAr,
      description: data.description ?? null,
      service_ids: data.serviceIds,
      sessions_count: data.sessionsCount,
      price: data.price,
      currency: data.currency,
      validity_days: data.validityDays,
      active: true,
    }).select("id").single();
    if (error || !row) throw new Error(error?.message ?? "Failed to create package");
    return { ok: true as const, id: row.id };
  });

export const togglePackageActive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid(), active: z.boolean() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("service_packages").update({ active: data.active }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const deletePackage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("service_packages").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const sellPackage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    packageId: z.string().uuid(),
    customerId: z.string().uuid(),
    pricePaid: z.number().nonnegative().optional(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: pkg, error: pErr } = await context.supabase
      .from("service_packages")
      .select("id, tenant_id, branch_id, sessions_count, price, currency, validity_days, active")
      .eq("id", data.packageId).single();
    if (pErr || !pkg) throw new Error("Package not found");
    if (!pkg.active) throw new Error("Package is inactive");
    const expiresAt = new Date(Date.now() + pkg.validity_days * 86400_000).toISOString();
    const { data: row, error } = await context.supabase.from("customer_package_purchases").insert({
      tenant_id: pkg.tenant_id,
      branch_id: pkg.branch_id,
      package_id: pkg.id,
      customer_id: data.customerId,
      sessions_total: pkg.sessions_count,
      sessions_remaining: pkg.sessions_count,
      price_paid: data.pricePaid ?? Number(pkg.price),
      currency: pkg.currency,
      status: "active",
      expires_at: expiresAt,
    }).select("id").single();
    if (error || !row) throw new Error(error?.message ?? "Failed to sell package");
    return { ok: true as const, purchaseId: row.id };
  });

export const listCustomerPurchases = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ branchId: z.string().uuid(), customerId: z.string().uuid().optional() }).parse(d))
  .handler(async ({ data, context }) => {
    let q = context.supabase
      .from("customer_package_purchases")
      .select("id,package_id,customer_id,sessions_total,sessions_remaining,price_paid,currency,status,purchased_at,expires_at")
      .eq("branch_id", data.branchId)
      .order("purchased_at", { ascending: false })
      .limit(500);
    if (data.customerId) q = q.eq("customer_id", data.customerId);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const usePackageSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    purchaseId: z.string().uuid(),
    bookingId: z.string().uuid().optional(),
    serviceId: z.string().uuid().optional(),
    sessionsUsed: z.number().int().positive().default(1),
    note: z.string().max(500).optional(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: p, error } = await context.supabase
      .from("customer_package_purchases")
      .select("id, tenant_id, sessions_remaining, status, expires_at")
      .eq("id", data.purchaseId).single();
    if (error || !p) throw new Error("Purchase not found");
    if (p.status !== "active") throw new Error(`Purchase is ${p.status}`);
    if (p.expires_at && new Date(p.expires_at) < new Date()) {
      await context.supabase.from("customer_package_purchases")
        .update({ status: "expired" }).eq("id", data.purchaseId);
      throw new Error("Package has expired");
    }
    if (p.sessions_remaining < data.sessionsUsed) {
      throw new Error(`Only ${p.sessions_remaining} session(s) remaining`);
    }
    const remaining = p.sessions_remaining - data.sessionsUsed;
    const status = remaining <= 0 ? "exhausted" : "active";
    const { error: uErr } = await context.supabase
      .from("customer_package_purchases")
      .update({ sessions_remaining: remaining, status })
      .eq("id", data.purchaseId);
    if (uErr) throw new Error(uErr.message);
    await context.supabase.from("package_usages").insert({
      tenant_id: p.tenant_id,
      purchase_id: data.purchaseId,
      booking_id: data.bookingId ?? null,
      service_id: data.serviceId ?? null,
      sessions_used: data.sessionsUsed,
      note: data.note ?? null,
    });
    return { ok: true as const, remaining, status };
  });