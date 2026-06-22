import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const SETTINGS_KEY = "saml_sso";

export type SAMLSettings = {
  enabled: boolean;
  metadata_url: string;
  domains: string[]; // e.g. ["example.com"]
};

const DEFAULTS: SAMLSettings = {
  enabled: false,
  metadata_url: "",
  domains: [],
};

async function assertAdmin(ctx: { supabase: any; userId: string }) {
  const [a, s] = await Promise.all([
    ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "admin" }),
    ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "super_admin" }),
  ]);
  if (!a.data && !s.data) throw new Response("Forbidden", { status: 403 });
}

export const getSAMLSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<SAMLSettings> => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("app_settings")
      .select("value")
      .eq("key", SETTINGS_KEY)
      .maybeSingle();
    return { ...DEFAULTS, ...((data?.value as Partial<SAMLSettings>) ?? {}) };
  });

export const updateSAMLSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      enabled: z.boolean(),
      metadata_url: z.string().trim().max(512),
      domains: z.array(z.string().trim().max(128)).max(20),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    if (data.enabled && !data.metadata_url) {
      throw new Error("Metadata URL is required to enable SAML SSO.");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("app_settings").upsert({
      key: SETTINGS_KEY,
      value: { enabled: data.enabled, metadata_url: data.metadata_url, domains: data.domains },
      updated_at: new Date().toISOString(),
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
