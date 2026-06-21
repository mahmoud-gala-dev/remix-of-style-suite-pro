import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// P12 — Bulk import of customers with server-side dedupe per branch.
// Phones are normalised (digits only) before comparing against existing
// customers in the same branch, so the same number written as
// "+966 50 123 4567" and "0501234567" collapses to one row.
const rowSchema = z.object({
  name: z.string().trim().min(1).max(120),
  phone: z.string().trim().min(3).max(40),
  email: z.string().trim().email().max(255).optional().or(z.literal("")),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
});

const inputSchema = z.object({
  branchId: z.string().uuid(),
  rows: z.array(rowSchema).min(1).max(2000),
});

const normalisePhone = (p: string) => p.replace(/\D/g, "");

export const bulkImportCustomers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => inputSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { data: existing, error: selErr } = await context.supabase
      .from("customers")
      .select("phone")
      .eq("branch_id", data.branchId);
    if (selErr) throw new Error(selErr.message);
    const seen = new Set((existing ?? []).map((r) => normalisePhone(r.phone ?? "")));

    const toInsert: Array<{
      branch_id: string;
      name: string;
      phone: string;
      email: string | null;
      notes: string | null;
    }> = [];
    let skipped = 0;
    for (const r of data.rows) {
      const norm = normalisePhone(r.phone);
      if (!norm || seen.has(norm)) {
        skipped++;
        continue;
      }
      seen.add(norm);
      toInsert.push({
        branch_id: data.branchId,
        name: r.name,
        phone: r.phone,
        email: r.email ? r.email : null,
        notes: r.notes ? r.notes : null,
      });
    }

    let added = 0;
    if (toInsert.length) {
      // Insert in chunks of 500 to keep request size reasonable.
      for (let i = 0; i < toInsert.length; i += 500) {
        const chunk = toInsert.slice(i, i + 500);
        const { error } = await context.supabase.from("customers").insert(chunk);
        if (error) throw new Error(error.message);
        added += chunk.length;
      }
    }

    return { added, skipped, total: data.rows.length };
  });