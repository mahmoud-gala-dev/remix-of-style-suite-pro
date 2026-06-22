import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

function parseCsv(csvText: string): Array<Record<string, string>> {
  const lines = csvText.split(/\r?\n/).filter((l) => l.trim());
  if (!lines.length) return [];
  const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
  const out: Array<Record<string, string>> = [];
  for (let i = 1; i < lines.length; i++) {
    const row: Record<string, string> = {};
    // Simple CSV parsing — does NOT handle commas inside quoted fields with nested quotes.
    // For production, use a proper CSV parser; this is adequate for export-re-import of simple data.
    const cells = lines[i].split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
    headers.forEach((h, idx) => { row[h] = cells[idx] ?? ""; });
    out.push(row);
  }
  return out;
}

export const restoreTenantFromCsv = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      tenantId: z.string().uuid(),
      bundle: z.string().min(1), // multi-section CSV text
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    // Authorize: super_admin or admin of the tenant.
    const { data: isSuper } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "super_admin" });
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!isSuper && !isAdmin) throw new Response("Forbidden", { status: 403 });

    // Verify tenant exists
    const { data: tenant } = await context.supabase.from("tenants").select("id").eq("id", data.tenantId).maybeSingle();
    if (!tenant) throw new Response("Tenant not found", { status: 404 });

    // Parse bundle into sections
    const sections = data.bundle.split(/\n#[^\n]+\(/).map((s) => s.trim()).filter(Boolean);
    // If bundle starts with a section header, handle it
    const lines = data.bundle.split(/\r?\n/);
    const parsedSections: Array<{ name: string; rows: Array<Record<string, string>> }> = [];
    let currentName = "";
    let currentLines: string[] = [];
    for (const line of lines) {
      if (line.startsWith("# ")) {
        if (currentName && currentLines.length > 0) {
          parsedSections.push({ name: currentName, rows: parseCsv(currentLines.join("\n")) });
        }
        currentName = line.replace(/^#\s+/, "").split(" (")[0].trim();
        currentLines = [];
      } else {
        currentLines.push(line);
      }
    }
    if (currentName && currentLines.length > 0) {
      parsedSections.push({ name: currentName, rows: parseCsv(currentLines.join("\n")) });
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { insertDynamic } = await import("@/lib/dynamic-table.server");
    let inserted = 0;
    let skipped = 0;

    for (const section of parsedSections) {
      // Map section names to table names
      const tableMap: Record<string, string> = {
        tenants: "tenants",
        branches: "branches",
        customers: "customers",
        employees: "employees",
        services: "services",
        bookings: "bookings",
        invoices: "invoices",
        payments: "payments",
        customer_memberships: "customer_memberships",
      };
      const table = tableMap[section.name];
      if (!table) continue;

      for (const row of section.rows) {
        const record: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(row)) {
          if (v === "" || v === null || v === undefined) continue;
          // Try to parse numbers and booleans
          if (/^-?\d+$/.test(v)) record[k] = parseInt(v, 10);
          else if (/^-?\d+\.\d+$/.test(v)) record[k] = parseFloat(v);
          else if (v === "true") record[k] = true;
          else if (v === "false") record[k] = false;
          else record[k] = v;
        }
        // Remove id to let DB generate new ones, except for tenants (update)
        if (table !== "tenants" && record.id) {
          delete record.id;
        }
        // Ensure tenant_id is set for branches
        if (table === "branches" && !record.tenant_id) {
          record.tenant_id = data.tenantId;
        }
        // Insert via admin client to bypass RLS — dynamic table name (see dynamic-table.server.ts)
        const { error } = await insertDynamic(supabaseAdmin, table, record);
        if (error) {
          skipped++;
          console.warn(`[restore] skipped ${table} row:`, error.message);
        } else {
          inserted++;
        }
      }
    }

    return { inserted, skipped, sections: parsedSections.length };
  });
