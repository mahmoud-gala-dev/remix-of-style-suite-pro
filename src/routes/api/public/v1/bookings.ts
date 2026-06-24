import { createFileRoute } from "@tanstack/react-router";
import { verifyApiKey } from "@/lib/api-key-auth.server";

export const Route = createFileRoute("/api/public/v1/bookings")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const auth = await verifyApiKey(request, "read");
        if (auth instanceof Response) return auth;
        const url = new URL(request.url);
        const from = url.searchParams.get("from");
        const to = url.searchParams.get("to");
        const limit = Math.min(Number(url.searchParams.get("limit") ?? 100), 500);
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const branchIds =
          (await supabaseAdmin.from("branches").select("id").eq("tenant_id", auth.tenantId)).data?.map(
            (b: { id: string }) => b.id,
          ) ?? [];
        let q = supabaseAdmin
          .from("bookings")
          .select("id,branch_id,customer_id,service_id,employee_id,start_at,end_at,status,total")
          .in("branch_id", branchIds)
          .order("start_at", { ascending: false })
          .limit(limit);
        if (from) q = q.gte("start_at", from);
        if (to) q = q.lte("start_at", to);
        const { data, error } = await q;
        if (error) return Response.json({ error: "server_error", detail: error.message }, { status: 500 });
        return Response.json({ data });
      },
    },
  },
});
