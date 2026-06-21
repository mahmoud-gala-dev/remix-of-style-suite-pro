import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const schema = z.object({
  table: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  limit: z.number().int().min(1).max(500).default(100),
});

export const getAuditLog = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => schema.parse(d))
  .handler(async ({ data, context }) => {
    let q = context.supabase
      .from("audit_log")
      .select("id,actor,table_name,row_id,action,diff,at")
      .order("at", { ascending: false })
      .limit(data.limit);
    if (data.table) q = q.eq("table_name", data.table);
    if (data.from) q = q.gte("at", `${data.from}T00:00:00.000Z`);
    if (data.to) q = q.lt("at", `${data.to}T23:59:59.999Z`);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return { rows: rows ?? [] };
  });