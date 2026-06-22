import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { rateLimitByIp } from "@/lib/rate-limit";
import { withSpan } from "@/lib/tracing";

// P51 — Minimal SCIM 2.0 /Users endpoint for enterprise IdP provisioning.
// Auth: `Authorization: Bearer <SCIM_BEARER_TOKEN>`.
// Supports: GET list (with optional ?filter=userName eq "x"), POST create.
// Item-level GET/PATCH/DELETE live in `Users.$id.ts`.

function scimError(status: number, detail: string) {
  return Response.json(
    { schemas: ["urn:ietf:params:scim:api:messages:2.0:Error"], detail, status: String(status) },
    { status, headers: { "Content-Type": "application/scim+json" } },
  );
}

function requireScimAuth(request: Request): Response | null {
  const expected = process.env.SCIM_BEARER_TOKEN;
  if (!expected) return scimError(503, "SCIM not configured (SCIM_BEARER_TOKEN missing)");
  const got = request.headers.get("authorization") ?? "";
  if (got !== `Bearer ${expected}`) return scimError(401, "Unauthorized");
  return null;
}

type ScimUser = {
  schemas: string[];
  id: string;
  userName: string;
  active: boolean;
  emails: Array<{ value: string; primary: boolean }>;
  meta: { resourceType: "User"; created?: string; lastModified?: string };
};

function toScimUser(u: {
  id: string;
  email?: string | null;
  banned_until?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}): ScimUser {
  const email = u.email ?? "";
  const banned = !!u.banned_until && new Date(u.banned_until).getTime() > Date.now();
  return {
    schemas: ["urn:ietf:params:scim:schemas:core:2.0:User"],
    id: u.id,
    userName: email,
    active: !banned,
    emails: email ? [{ value: email, primary: true }] : [],
    meta: {
      resourceType: "User",
      created: u.created_at ?? undefined,
      lastModified: u.updated_at ?? undefined,
    },
  };
}

const createSchema = z.object({
  userName: z.string().email(),
  password: z.string().min(8).optional(),
  active: z.boolean().optional(),
});

export const Route = createFileRoute("/api/public/scim/v2/Users")({
  server: {
    handlers: {
      GET: async ({ request }) =>
        withSpan("scim.users.list", {}, async () => {
          const unauth = requireScimAuth(request);
          if (unauth) return unauth;
          try {
            await rateLimitByIp(request, "scim", { capacity: 60, refillPerMin: 60 });
          } catch (e) {
            if (e instanceof Response) return e;
          }
          const url = new URL(request.url);
          const filter = url.searchParams.get("filter") ?? "";
          const m = filter.match(/userName\s+eq\s+"([^"]+)"/i);
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const list = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 });
          if (list.error) return scimError(500, list.error.message);
          const filtered = m ? list.data.users.filter((u) => u.email === m[1]) : list.data.users;
          return Response.json(
            {
              schemas: ["urn:ietf:params:scim:api:messages:2.0:ListResponse"],
              totalResults: filtered.length,
              startIndex: 1,
              itemsPerPage: filtered.length,
              Resources: filtered.map((u) => toScimUser(u)),
            },
            { headers: { "Content-Type": "application/scim+json" } },
          );
        }),
      POST: async ({ request }) =>
        withSpan("scim.users.create", {}, async () => {
          const unauth = requireScimAuth(request);
          if (unauth) return unauth;
          try {
            await rateLimitByIp(request, "scim", { capacity: 30, refillPerMin: 30 });
          } catch (e) {
            if (e instanceof Response) return e;
          }
          let parsed;
          try {
            parsed = createSchema.parse(await request.json());
          } catch {
            return scimError(400, "Invalid SCIM user payload");
          }
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { data, error } = await supabaseAdmin.auth.admin.createUser({
            email: parsed.userName,
            password: parsed.password ?? crypto.randomUUID(),
            email_confirm: true,
          });
          if (error || !data.user) return scimError(409, error?.message ?? "Could not create user");
          return Response.json(toScimUser(data.user), {
            status: 201,
            headers: { "Content-Type": "application/scim+json" },
          });
        }),
    },
  },
});