import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requireAdmin } from "@/lib/require-admin";
import { withSpan } from "@/lib/tracing";

// P51 — Admin-only CSV export of the audit_log table.
// Returns a plain object the caller can convert to a Blob / download.
const schema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
  maxRows: z.number().int().min(1).max(50_000).default(10_000),
});

function csvEscape(v: unknown): string {
  if (v == null) return "";
  const s = typeof v === "string" ? v : JSON.stringify(v);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export const exportAuditLog = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => schema.parse(d))
  .handler(async ({ data, context }) =>
    withSpan("audit.export", { userId: context.userId, maxRows: data.maxRows }, async () => {
      await requireAdmin(context);
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      let q = supabaseAdmin
        .from("audit_log")
        .select("at,actor,table_name,row_id,action,diff")
        .order("at", { ascending: false })
        .limit(data.maxRows);
      if (data.from) q = q.gte("at", `${data.from}T00:00:00.000Z`);
      if (data.to) q = q.lt("at", `${data.to}T23:59:59.999Z`);
      const { data: rows, error } = await q;
      if (error) throw new Error(error.message);
      const header = ["at", "actor", "table_name", "row_id", "action", "diff"];
      const lines = [header.join(",")];
      for (const r of rows ?? []) {
        lines.push(header.map((k) => csvEscape((r as Record<string, unknown>)[k])).join(","));
      }
      return {
        filename: `audit-log-${new Date().toISOString().slice(0, 10)}.csv`,
        csv: lines.join("\n"),
        rowCount: rows?.length ?? 0,
      };
    }),
  );