import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Cycle #27 — Photo Gallery (encrypted private storage)
// Storage convention: gallery/<tenant_id>/<scope>/<uuid>.<ext>

async function tenantOfBranch(supabase: any, branchId: string): Promise<string> {
  const { data, error } = await supabase
    .from("branches").select("tenant_id").eq("id", branchId).single();
  if (error) throw new Error(error.message);
  if (!data?.tenant_id) throw new Error("Branch not found");
  return data.tenant_id as string;
}

export const createGalleryUploadUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      branchId: z.string().uuid(),
      scope: z.enum(["service", "customer"]),
      ext: z.string().regex(/^[a-z0-9]{1,5}$/i),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const tenantId = await tenantOfBranch(context.supabase, data.branchId);
    const id = crypto.randomUUID();
    const path = `${tenantId}/${data.scope}/${id}.${data.ext.toLowerCase()}`;
    const { data: signed, error } = await context.supabase
      .storage.from("gallery").createSignedUploadUrl(path);
    if (error) throw new Error(error.message);
    return { path, token: signed.token, signedUrl: signed.signedUrl };
  });

export const recordServicePhoto = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      branchId: z.string().uuid(),
      serviceId: z.string().uuid().nullable().optional(),
      employeeId: z.string().uuid().nullable().optional(),
      storagePath: z.string().min(1),
      kind: z.enum(["before", "after", "portfolio"]).default("after"),
      caption: z.string().max(500).nullable().optional(),
      isPublic: z.boolean().default(false),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const tenantId = await tenantOfBranch(context.supabase, data.branchId);
    const { data: row, error } = await context.supabase
      .from("service_photos")
      .insert({
        tenant_id: tenantId,
        branch_id: data.branchId,
        service_id: data.serviceId ?? null,
        employee_id: data.employeeId ?? null,
        storage_path: data.storagePath,
        kind: data.kind,
        caption: data.caption ?? null,
        is_public: data.isPublic,
        created_by: context.userId,
      })
      .select().single();
    if (error) throw new Error(error.message);
    return row;
  });

export const recordCustomerPhoto = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      branchId: z.string().uuid(),
      customerId: z.string().uuid(),
      bookingId: z.string().uuid().nullable().optional(),
      storagePath: z.string().min(1),
      kind: z.enum(["before", "after", "note"]).default("after"),
      caption: z.string().max(500).nullable().optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const tenantId = await tenantOfBranch(context.supabase, data.branchId);
    const { data: row, error } = await context.supabase
      .from("customer_photos")
      .insert({
        tenant_id: tenantId,
        branch_id: data.branchId,
        customer_id: data.customerId,
        booking_id: data.bookingId ?? null,
        storage_path: data.storagePath,
        kind: data.kind,
        caption: data.caption ?? null,
        created_by: context.userId,
      })
      .select().single();
    if (error) throw new Error(error.message);
    return row;
  });

async function signMany(supabase: any, paths: string[]) {
  if (!paths.length) return {} as Record<string, string>;
  const { data, error } = await supabase
    .storage.from("gallery").createSignedUrls(paths, 3600);
  if (error) throw new Error(error.message);
  const out: Record<string, string> = {};
  for (const r of data ?? []) if (r.path && r.signedUrl) out[r.path] = r.signedUrl;
  return out;
}

export const listServicePhotos = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      branchId: z.string().uuid(),
      serviceId: z.string().uuid().nullable().optional(),
      employeeId: z.string().uuid().nullable().optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    let q = context.supabase
      .from("service_photos")
      .select("id,service_id,employee_id,storage_path,kind,caption,is_public,sort_order,created_at")
      .eq("branch_id", data.branchId)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false })
      .limit(200);
    if (data.serviceId) q = q.eq("service_id", data.serviceId);
    if (data.employeeId) q = q.eq("employee_id", data.employeeId);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    const urls = await signMany(context.supabase, (rows ?? []).map((r) => r.storage_path));
    return (rows ?? []).map((r) => ({ ...r, url: urls[r.storage_path] ?? null }));
  });

export const listCustomerPhotos = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ customerId: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("customer_photos")
      .select("id,customer_id,booking_id,storage_path,kind,caption,created_at")
      .eq("customer_id", data.customerId)
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    const urls = await signMany(context.supabase, (rows ?? []).map((r) => r.storage_path));
    return (rows ?? []).map((r) => ({ ...r, url: urls[r.storage_path] ?? null }));
  });

export const deleteServicePhoto = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: row, error: e1 } = await context.supabase
      .from("service_photos").select("storage_path").eq("id", data.id).single();
    if (e1) throw new Error(e1.message);
    await context.supabase.storage.from("gallery").remove([row!.storage_path]);
    const { error } = await context.supabase.from("service_photos").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteCustomerPhoto = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: row, error: e1 } = await context.supabase
      .from("customer_photos").select("storage_path").eq("id", data.id).single();
    if (e1) throw new Error(e1.message);
    await context.supabase.storage.from("gallery").remove([row!.storage_path]);
    const { error } = await context.supabase.from("customer_photos").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });