import { createFileRoute } from "@tanstack/react-router";
import { verifyApiKey } from "@/lib/api-key-auth.server";

export const Route = createFileRoute("/api/public/v1/services")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const auth = await verifyApiKey(request, "read");
        if (auth instanceof Response) return auth;
        const url = new URL(request.url);
        const branchId = url.searchParams.get("branch_id");
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        let q = supabaseAdmin
          .from("services")
          .select("id,branch_id,name,duration_min,price,active")
          .in(
            "branch_id",
            (
              await supabaseAdmin.from("branches").select("id").eq("tenant_id", auth.tenantId)
            ).data?.map((b: { id: string }) => b.id) ?? [],
          )
          .order("name", { ascending: true });
        if (branchId) q = q.eq("branch_id", branchId);
        const { data, error } = await q;
        if (error) return Response.json({ error: "server_error", detail: error.message }, { status: 500 });
        return Response.json({ data });
      },
    },
  },
});
*** End Patch