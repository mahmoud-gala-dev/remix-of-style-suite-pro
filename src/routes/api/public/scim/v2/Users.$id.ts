import { createFileRoute } from "@tanstack/react-router";
import { rateLimitByIp } from "@/lib/rate-limit";
import { withSpan } from "@/lib/tracing";

// P51 — Item-level SCIM 2.0 operations: GET, PATCH (active toggle), DELETE.

function scimError(status: number, detail: string) {
  return Response.json(
    { schemas: ["urn:ietf:params:scim:api:messages:2.0:Error"], detail, status: String(status) },
    { status, headers: { "Content-Type": "application/scim+json" } },
  );
}

function requireScimAuth(request: Request): Response | null {
  const expected = process.env.SCIM_BEARER_TOKEN;
  if (!expected) return scimError(503, "SCIM not configured (SCIM_BEARER_TOKEN missing)");
  if ((request.headers.get("authorization") ?? "") !== `Bearer ${expected}`) {
    return scimError(401, "Unauthorized");
  }
  return null;
}

type ScimUser = {
  schemas: string[];
  id: string;
  userName: string;
  active: boolean;
  emails: Array<{ value: string; primary: boolean }>;
  meta: { resourceType: "User"; lastModified?: string };
};

function toScim(u: { id: string; email?: string | null; banned_until?: string | null; updated_at?: string | null }): ScimUser {
  const email = u.email ?? "";
  const banned = !!u.banned_until && new Date(u.banned_until).getTime() > Date.now();
  return {
    schemas: ["urn:ietf:params:scim:schemas:core:2.0:User"],
    id: u.id,
    userName: email,
    active: !banned,
    emails: email ? [{ value: email, primary: true }] : [],
    meta: { resourceType: "User", lastModified: u.updated_at ?? undefined },
  };
}

export const Route = createFileRoute("/api/public/scim/v2/Users/$id")({
  server: {
    handlers: {
      GET: async ({ request, params }) =>
        withSpan("scim.users.get", { id: params.id }, async () => {
          const unauth = requireScimAuth(request);
          if (unauth) return unauth;
          try {
            await rateLimitByIp(request, "scim", { capacity: 60, refillPerMin: 60 });
          } catch (e) {
            if (e instanceof Response) return e;
          }
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { data, error } = await supabaseAdmin.auth.admin.getUserById(params.id);
          if (error || !data.user) return scimError(404, "User not found");
          return Response.json(toScim(data.user), {
            headers: { "Content-Type": "application/scim+json" },
          });
        }),
      PATCH: async ({ request, params }) =>
        withSpan("scim.users.patch", { id: params.id }, async () => {
          const unauth = requireScimAuth(request);
          if (unauth) return unauth;
          try {
            await rateLimitByIp(request, "scim", { capacity: 30, refillPerMin: 30 });
          } catch (e) {
            if (e instanceof Response) return e;
          }
          let body: { Operations?: Array<{ op: string; path?: string; value?: unknown }> };
          try {
            body = await request.json();
          } catch {
            return scimError(400, "Invalid SCIM PATCH body");
          }
          const op = body.Operations?.find((o) => (o.path ?? "").toLowerCase() === "active");
          if (!op) return scimError(400, "Only 'active' attribute is supported");
          const active = Boolean(op.value);
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          // Deactivate by setting ban_duration; reactivate by clearing it.
          const { data, error } = await supabaseAdmin.auth.admin.updateUserById(params.id, {
            ban_duration: active ? "none" : "876000h", // ~100 years
          } as unknown as Parameters<typeof supabaseAdmin.auth.admin.updateUserById>[1]);
          if (error || !data.user) return scimError(500, error?.message ?? "Update failed");
          return Response.json(toScim(data.user), {
            headers: { "Content-Type": "application/scim+json" },
          });
        }),
      DELETE: async ({ request, params }) =>
        withSpan("scim.users.delete", { id: params.id }, async () => {
          const unauth = requireScimAuth(request);
          if (unauth) return unauth;
          try {
            await rateLimitByIp(request, "scim", { capacity: 30, refillPerMin: 30 });
          } catch (e) {
            if (e instanceof Response) return e;
          }
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { error } = await supabaseAdmin.auth.admin.deleteUser(params.id);
          if (error) return scimError(500, error.message);
          return new Response(null, { status: 204 });
        }),
    },
  },
});