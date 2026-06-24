import { createFileRoute } from "@tanstack/react-router";
import { verifyApiKey } from "@/lib/api-key-auth.server";

export const Route = createFileRoute("/api/public/v1/branches")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const auth = await verifyApiKey(request, "read");
        if (auth instanceof Response) return auth;
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data, error } = await supabaseAdmin
          .from("branches")
          .select("id,name,timezone,created_at")
          .eq("tenant_id", auth.tenantId)
          .order("name", { ascending: true });
        if (error) return Response.json({ error: "server_error", detail: error.message }, { status: 500 });
        return Response.json({ data });
      },
    },
  },
});
*** End Patch