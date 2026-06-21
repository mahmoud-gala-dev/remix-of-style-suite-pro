import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

// P79 — GDPR-style tenant data export. Returns a multi-section CSV bundle
// (one CSV per table) as a single text payload. Owner/admin only.

function toCsv(rows: Array<Record<string, unknown>>): string {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  const esc = (v: unknown) => {
    const s = v == null ? "" : typeof v === "object" ? JSON.stringify(v) : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const head = headers.join(",");
  const body = rows.map((r) => headers.map((h) => esc(r[h])).join(",")).join("\n");
  return `${head}\n${body}`;
}

export const exportTenantData = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ tenantId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    // Authorize: super_admin or admin of the tenant.
    const { data: isSuper } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "super_admin" });
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!isSuper && !isAdmin) throw new Response("Forbidden", { status: 403 });

    // RLS already constrains to caller's tenant; super_admin sees all.
    const { data: branches } = await context.supabase
      .from("branches").select("id").eq("tenant_id", data.tenantId);
    const branchIds = (branches ?? []).map((b) => b.id);
    if (!branchIds.length) throw new Response("No data for tenant", { status: 404 });

    const [tenants, branchesFull, customers, employees, services, bookings, invoices, payments, memberships] = await Promise.all([
      context.supabase.from("tenants").select("*").eq("id", data.tenantId),
      context.supabase.from("branches").select("*").in("id", branchIds),
      context.supabase.from("customers").select("*").in("branch_id", branchIds),
      context.supabase.from("employees").select("*").in("branch_id", branchIds),
      context.supabase.from("services").select("*").in("branch_id", branchIds),
      context.supabase.from("bookings").select("*").in("branch_id", branchIds),
      context.supabase.from("invoices").select("*").in("branch_id", branchIds),
      context.supabase.from("payments").select("*").in("branch_id", branchIds),
      context.supabase.from("customer_memberships").select("*").in("branch_id", branchIds),
    ]);

    const sections: Array<[string, Array<Record<string, unknown>>]> = [
      ["tenants", tenants.data ?? []],
      ["branches", branchesFull.data ?? []],
      ["customers", customers.data ?? []],
      ["employees", employees.data ?? []],
      ["services", services.data ?? []],
      ["bookings", bookings.data ?? []],
      ["invoices", invoices.data ?? []],
      ["payments", payments.data ?? []],
      ["customer_memberships", memberships.data ?? []],
    ];

    const bundle = sections
      .map(([name, rows]) => `# ${name} (${rows.length})\n${toCsv(rows as Array<Record<string, unknown>>)}`)
      .join("\n\n");

    return {
      filename: `tenant-${data.tenantId}-${new Date().toISOString().slice(0, 10)}.csv`,
      bundle,
      counts: Object.fromEntries(sections.map(([n, r]) => [n, r.length])),
    };
  });