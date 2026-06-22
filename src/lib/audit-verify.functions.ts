import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requireAdmin } from "@/lib/require-admin";
import { withSpan } from "@/lib/tracing";

// P52 (E) — Admin-only tamper-evidence check for the audit_log hash chain.
// Calls the verify_audit_chain() SQL fn (added in migration). Returns the
// list of offending rows; an empty list means the chain is intact.
export const verifyAuditChain = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) =>
    withSpan("audit.verify_chain", { userId: context.userId }, async () => {
      await requireAdmin(context);
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data, error } = await supabaseAdmin.rpc("verify_audit_chain", { p_limit: 10000 });
      if (error) throw new Error(error.message);
      const rows = (data ?? []) as Array<{ id: string; at: string; reason: string }>;
      return { ok: rows.length === 0, offenders: rows, checkedAt: new Date().toISOString() };
    }),
  );