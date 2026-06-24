import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Cycle #28 — Inventory Auto-Reorder

export const listSuppliers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ branchId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("suppliers")
      .select("*").eq("branch_id", data.branchId)
      .order("name").limit(500);
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const upsertSupplier = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      id: z.string().uuid().optional(),
      branchId: z.string().uuid(),
      name: z.string().min(1).max(120),
      contactName: z.string().max(120).nullable().optional(),
      phone: z.string().max(40).nullable().optional(),
      email: z.string().email().max(160).nullable().optional(),
      notes: z.string().max(500).nullable().optional(),
      active: z.boolean().default(true),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const row = {
      branch_id: data.branchId,
      name: data.name,
      contact_name: data.contactName ?? null,
      phone: data.phone ?? null,
      email: data.email ?? null,
      notes: data.notes ?? null,
      active: data.active,
    };
    const q = data.id
      ? context.supabase.from("suppliers").update(row).eq("id", data.id).select().single()
      : context.supabase.from("suppliers").insert(row).select().single();
    const { data: out, error } = await q;
    if (error) throw new Error(error.message);
    return out;
  });

export const deleteSupplier = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("suppliers").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const updateProductReorder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      productId: z.string().uuid(),
      reorderPoint: z.number().min(0),
      reorderQty: z.number().min(0),
      supplierId: z.string().uuid().nullable().optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("products").update({
      reorder_point: data.reorderPoint,
      reorder_qty: data.reorderQty,
      supplier_id: data.supplierId ?? null,
    }).eq("id", data.productId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listPurchaseOrders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ branchId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("purchase_orders")
      .select("id,number,status,source,total,notes,created_at,sent_at,received_at,supplier_id, suppliers(name)")
      .eq("branch_id", data.branchId)
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const getPurchaseOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const [poR, itR] = await Promise.all([
      context.supabase.from("purchase_orders")
        .select("*, suppliers(name,email,phone)").eq("id", data.id).single(),
      context.supabase.from("purchase_order_items")
        .select("id,product_id,qty,unit_cost,total, products(name,sku,unit)")
        .eq("po_id", data.id),
    ]);
    if (poR.error) throw new Error(poR.error.message);
    if (itR.error) throw new Error(itR.error.message);
    return { po: poR.data, items: itR.data ?? [] };
  });

type POItemInput = { productId: string; qty: number; unitCost: number };

async function nextPONumber(supabase: any, branchId: string): Promise<string> {
  const { count } = await supabase
    .from("purchase_orders")
    .select("id", { count: "exact", head: true })
    .eq("branch_id", branchId);
  const n = (count ?? 0) + 1;
  const yr = new Date().getFullYear();
  return `PO-${yr}-${String(n).padStart(5, "0")}`;
}

async function insertPO(
  supabase: any,
  branchId: string,
  supplierId: string | null,
  items: POItemInput[],
  source: "manual" | "auto",
  createdBy: string | null,
) {
  if (!items.length) throw new Error("PO has no items");
  const total = items.reduce((s, i) => s + Number(i.qty) * Number(i.unitCost), 0);
  const number = await nextPONumber(supabase, branchId);
  const { data: po, error } = await supabase.from("purchase_orders").insert({
    branch_id: branchId,
    supplier_id: supplierId,
    number,
    status: "draft",
    source,
    total,
    created_by: createdBy,
  }).select().single();
  if (error) throw new Error(error.message);
  const rows = items.map((i) => ({
    po_id: po.id,
    product_id: i.productId,
    qty: i.qty,
    unit_cost: i.unitCost,
    total: Number(i.qty) * Number(i.unitCost),
  }));
  const { error: e2 } = await supabase.from("purchase_order_items").insert(rows);
  if (e2) throw new Error(e2.message);
  return po;
}

export const createPurchaseOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      branchId: z.string().uuid(),
      supplierId: z.string().uuid().nullable().optional(),
      items: z.array(z.object({
        productId: z.string().uuid(),
        qty: z.number().positive(),
        unitCost: z.number().min(0),
      })).min(1),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    return insertPO(
      context.supabase, data.branchId, data.supplierId ?? null,
      data.items, "manual", context.userId,
    );
  });

export const updatePOStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      id: z.string().uuid(),
      status: z.enum(["draft","sent","received","cancelled"]),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const patch: any = { status: data.status };
    if (data.status === "sent") patch.sent_at = new Date().toISOString();
    if (data.status === "received") patch.received_at = new Date().toISOString();
    const { error } = await context.supabase
      .from("purchase_orders").update(patch).eq("id", data.id);
    if (error) throw new Error(error.message);

    // On receive: increment stock for each line item
    if (data.status === "received") {
      const { data: po } = await context.supabase
        .from("purchase_orders").select("branch_id").eq("id", data.id).single();
      const branchId = (po as any)?.branch_id as string | undefined;
      const { data: items } = await context.supabase
        .from("purchase_order_items")
        .select("product_id,qty,unit_cost, products(stock)")
        .eq("po_id", data.id);
      for (const it of items ?? []) {
        const newStock = Number((it as any).products?.stock ?? 0) + Number(it.qty);
        await context.supabase.from("products").update({ stock: newStock }).eq("id", it.product_id);
        if (branchId) {
          await context.supabase.from("stock_movements").insert({
            product_id: it.product_id,
            branch_id: branchId,
            kind: "purchase",
            qty: Number(it.qty),
            unit_cost: Number(it.unit_cost ?? 0),
            note: `PO ${data.id}`,
          });
        }
      }
    }
    return { ok: true };
  });

/**
 * Auto-reorder scan. Groups low-stock products by supplier and creates one
 * draft PO per supplier. Skips products with a `last_auto_po_at` in the
 * last 24h to avoid duplicates.
 */
export const runAutoReorderScan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ branchId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const cutoff = new Date(Date.now() - 24 * 3600_000).toISOString();
    const { data: products, error } = await context.supabase
      .from("products")
      .select("id,name,stock,reorder_point,reorder_qty,cost,supplier_id,last_auto_po_at")
      .eq("branch_id", data.branchId)
      .eq("active", true)
      .gt("reorder_point", 0);
    if (error) throw new Error(error.message);

    const eligible = (products ?? []).filter((p) =>
      Number(p.stock) <= Number(p.reorder_point) &&
      Number(p.reorder_qty) > 0 &&
      (!p.last_auto_po_at || p.last_auto_po_at < cutoff),
    );
    if (!eligible.length) return { created: 0, pos: [] as string[] };

    const bySupplier = new Map<string | null, typeof eligible>();
    for (const p of eligible) {
      const k = p.supplier_id ?? null;
      if (!bySupplier.has(k)) bySupplier.set(k, []);
      bySupplier.get(k)!.push(p);
    }

    const created: string[] = [];
    for (const [supplierId, items] of bySupplier) {
      const po = await insertPO(
        context.supabase, data.branchId, supplierId,
        items.map((p) => ({
          productId: p.id,
          qty: Number(p.reorder_qty),
          unitCost: Number(p.cost ?? 0),
        })),
        "auto", context.userId,
      );
      created.push(po.id);
      await context.supabase.from("products")
        .update({ last_auto_po_at: new Date().toISOString() })
        .in("id", items.map((p) => p.id));
    }
    return { created: created.length, pos: created };
  });

export const listLowStockProducts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ branchId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("products")
      .select("id,name,sku,unit,stock,reorder_point,reorder_qty,cost,supplier_id, suppliers(name)")
      .eq("branch_id", data.branchId)
      .eq("active", true)
      .order("name");
    if (error) throw new Error(error.message);
    return (rows ?? []).filter((p) =>
      Number(p.reorder_point) > 0 && Number(p.stock) <= Number(p.reorder_point),
    );
  });