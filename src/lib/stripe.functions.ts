import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requireAdmin } from "@/lib/require-admin";

const SETTINGS_KEY = "stripe_billing";

export type StripeSettings = {
  enabled: boolean;
  secret_key: string;
  publishable_key: string;
  webhook_secret: string;
  price_per_branch_usd: number; // e.g. 29
  success_url: string;
  cancel_url: string;
};

const DEFAULTS: StripeSettings = {
  enabled: false,
  secret_key: "",
  publishable_key: "",
  webhook_secret: "",
  price_per_branch_usd: 29,
  success_url: "/settings",
  cancel_url: "/settings",
};

function redact(cfg: StripeSettings): StripeSettings {
  return {
    ...cfg,
    secret_key: cfg.secret_key ? "••••••••" : "",
    webhook_secret: cfg.webhook_secret ? "••••••••" : "",
  };
}

async function loadConfig(): Promise<StripeSettings> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("app_settings")
    .select("value")
    .eq("key", SETTINGS_KEY)
    .maybeSingle();
  return { ...DEFAULTS, ...((data?.value as Partial<StripeSettings>) ?? {}) };
}

export const getStripeSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<StripeSettings> => {
    await requireAdmin(context);
    const cfg = await loadConfig();
    return redact(cfg);
  });

export const updateStripeSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      enabled: z.boolean(),
      secret_key: z.string().trim().max(256),
      publishable_key: z.string().trim().max(256),
      webhook_secret: z.string().trim().max(256),
      price_per_branch_usd: z.number().min(0).max(9999),
      success_url: z.string().trim().max(256),
      cancel_url: z.string().trim().max(256),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: existing } = await supabaseAdmin
      .from("app_settings")
      .select("value")
      .eq("key", SETTINGS_KEY)
      .maybeSingle();
    const prev = { ...DEFAULTS, ...((existing?.value as Partial<StripeSettings>) ?? {}) };
    const next: StripeSettings = {
      enabled: data.enabled,
      secret_key: data.secret_key ? data.secret_key : prev.secret_key,
      publishable_key: data.publishable_key || prev.publishable_key,
      webhook_secret: data.webhook_secret ? data.webhook_secret : prev.webhook_secret,
      price_per_branch_usd: data.price_per_branch_usd,
      success_url: data.success_url || prev.success_url,
      cancel_url: data.cancel_url || prev.cancel_url,
    };
    if (next.enabled && (!next.secret_key || !next.publishable_key)) {
      throw new Error("Secret Key and Publishable Key are required to enable Stripe billing.");
    }
    const { error } = await supabaseAdmin.from("app_settings").upsert({
      key: SETTINGS_KEY,
      value: next,
      updated_at: new Date().toISOString(),
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// Create a Stripe Checkout Session for the tenant's branch count
export const createStripeCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      tenant_id: z.string().uuid(),
      branch_count: z.number().int().min(1),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const cfg = await loadConfig();
    if (!cfg.enabled) throw new Error("Stripe billing is not enabled. Configure it in Settings.");

    // Count branches to verify
    const { data: branches } = await context.supabase
      .from("branches")
      .select("id")
      .eq("tenant_id", data.tenant_id);
    const count = (branches ?? []).length;
    const amount = Math.round(count * cfg.price_per_branch_usd * 100); // cents

    const origin = process.env.APP_URL || "http://localhost:8080";

    const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${cfg.secret_key}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        "mode": "subscription",
        "client_reference_id": data.tenant_id,
        "success_url": `${origin}${cfg.success_url}?session_id={CHECKOUT_SESSION_ID}`,
        "cancel_url": `${origin}${cfg.cancel_url}`,
        "line_items[0][price_data][currency]": "usd",
        "line_items[0][price_data][unit_amount]": String(amount),
        "line_items[0][price_data][product_data][name]": `Branch subscription (${count} branches × $${cfg.price_per_branch_usd}/mo)`,
        "line_items[0][quantity]": "1",
        "subscription_data[metadata][tenant_id]": data.tenant_id,
        "subscription_data[metadata][branch_count]": String(count),
      }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(`Stripe ${res.status}: ${json.error?.message ?? "checkout failed"}`);
    return { url: json.url as string, session_id: json.id as string };
  });

// Webhook handler helper — returns event type + object for the route to process
export const verifyStripeWebhook = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ payload: z.string(), signature: z.string() }).parse(d))
  .handler(async ({ data }) => {
    const cfg = await loadConfig();
    if (!cfg.enabled) return { skipped: true as const, reason: "disabled" as const };
    if (!cfg.webhook_secret) return { skipped: true as const, reason: "no webhook secret" as const };

    const { verifyHmacSignature } = await import("@/lib/stripe-verify");
    verifyHmacSignature(data.payload, data.signature, cfg.webhook_secret);
    const event = JSON.parse(data.payload);
    return {
      type: String(event.type ?? ""),
      object: JSON.stringify(event.data?.object ?? {}),
    };
  });
