// B — Inventory: products + stock movements (RLS-gated).
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type Product = {
  id: string;
  branch_id: string;
  name: string;
  sku: string | null;
  unit: string;
  cost: number;
  price: number;
  stock: number;
  low_stock_threshold: number;
  active: boolean;
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const listProducts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ branchId: z.string().min(1) }).parse(d))
  .handler(async ({ data, context }) => {
    if (!UUID_RE.test(data.branchId)) return [] as Product[];
    const { data: rows, error } = await context.supabase
      .from("products").select("*").eq("branch_id", data.branchId).order("name");
    if (error) throw new Error(error.message);
    return (rows ?? []) as Product[];
  });

export const upsertProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      id: z.string().uuid().optional(),
      branch_id: z.string().uuid(),
      name: z.string().trim().min(1).max(120),
      sku: z.string().trim().max(60).nullable().optional(),
      unit: z.string().trim().min(1).max(20).default("unit"),
      cost: z.number().nonnegative().default(0),
      price: z.number().nonnegative().default(0),
      low_stock_threshold: z.number().nonnegative().default(0),
      active: z.boolean().default(true),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("products").upsert(data);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const recordStockMovement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      product_id: z.string().uuid(),
      branch_id: z.string().uuid(),
      kind: z.enum(["purchase", "sale", "usage", "adjustment", "waste"]),
      qty: z.number(),
      unit_cost: z.number().nonnegative().optional(),
      note: z.string().max(500).optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("stock_movements").insert({
      ...data,
      created_by: context.userId,
    });
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });