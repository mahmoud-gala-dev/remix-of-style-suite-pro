import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requireAdmin } from "@/lib/require-admin";
import { withSpan } from "@/lib/tracing";

// P1 (cycle #6) — No-show deposit hold via Stripe PaymentIntents with
// capture_method=manual (authorization hold). The card is authorized at
// booking time and captured only on no-show, or released on attendance.
//
// Reuses the BYOK Stripe key already stored in app_settings.stripe_billing.

type StripeCfg = { enabled: boolean; secret_key: string };

async function loadStripeKey(): Promise<string> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("app_settings").select("value").eq("key", "stripe_billing").maybeSingle();
  const cfg = (data?.value ?? {}) as Partial<StripeCfg>;
  if (!cfg.enabled || !cfg.secret_key) throw new Error("Stripe is not configured");
  return cfg.secret_key;
}

function form(body: Record<string, string | number | undefined>): string {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(body)) if (v !== undefined) p.set(k, String(v));
  return p.toString();
}

async function stripeFetch<T = unknown>(
  path: string,
  key: string,
  body?: Record<string, string | number | undefined>,
): Promise<T> {
  const res = await fetch(`https://api.stripe.com/v1${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body ? form(body) : undefined,
  });
  const json = (await res.json()) as T & { error?: { message?: string } };
  if (!res.ok) throw new Error(json.error?.message ?? `Stripe ${res.status}`);
  return json;
}

// Create an authorization hold for an existing booking.
// Caller passes a Stripe payment_method id (collected client-side via
// Stripe Elements / Checkout in setup mode).
export const holdBookingDeposit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      bookingId: z.string().uuid(),
      amountCents: z.number().int().min(50).max(1_000_000),
      currency: z.string().trim().min(3).max(8).default("usd"),
      paymentMethodId: z.string().trim().min(3),
      customerEmail: z.string().email().optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) =>
    withSpan("deposit.hold", { bookingId: data.bookingId }, async () => {
      await requireAdmin(context);
      const key = await loadStripeKey();
      const intent = await stripeFetch<{ id: string; status: string }>(
        "/payment_intents",
        key,
        {
          amount: data.amountCents,
          currency: data.currency.toLowerCase(),
          capture_method: "manual",
          confirm: "true",
          payment_method: data.paymentMethodId,
          "automatic_payment_methods[enabled]": "true",
          "automatic_payment_methods[allow_redirects]": "never",
          "metadata[booking_id]": data.bookingId,
          "metadata[purpose]": "no_show_hold",
          receipt_email: data.customerEmail,
        },
      );
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      await supabaseAdmin.from("bookings").update({
        deposit_amount_cents: data.amountCents,
        deposit_currency: data.currency.toLowerCase(),
        deposit_intent_id: intent.id,
        deposit_status: intent.status === "requires_capture" ? "authorized" : "failed",
        deposit_held_at: new Date().toISOString(),
      } as never).eq("id", data.bookingId);
      return { ok: true as const, intentId: intent.id, status: intent.status };
    }),
  );

export const captureBookingDeposit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ bookingId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) =>
    withSpan("deposit.capture", { bookingId: data.bookingId }, async () => {
      await requireAdmin(context);
      const key = await loadStripeKey();
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: row } = await supabaseAdmin
        .from("bookings").select("deposit_intent_id, deposit_status")
        .eq("id", data.bookingId).maybeSingle();
      const r = row as { deposit_intent_id: string | null; deposit_status: string | null } | null;
      if (!r?.deposit_intent_id) throw new Error("No deposit hold on this booking");
      if (r.deposit_status !== "authorized") throw new Error(`Cannot capture (${r.deposit_status})`);
      await stripeFetch(`/payment_intents/${r.deposit_intent_id}/capture`, key);
      await supabaseAdmin.from("bookings").update({
        deposit_status: "captured",
        deposit_settled_at: new Date().toISOString(),
      } as never).eq("id", data.bookingId);
      return { ok: true as const };
    }),
  );

export const releaseBookingDeposit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ bookingId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) =>
    withSpan("deposit.release", { bookingId: data.bookingId }, async () => {
      await requireAdmin(context);
      const key = await loadStripeKey();
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: row } = await supabaseAdmin
        .from("bookings").select("deposit_intent_id, deposit_status")
        .eq("id", data.bookingId).maybeSingle();
      const r = row as { deposit_intent_id: string | null; deposit_status: string | null } | null;
      if (!r?.deposit_intent_id) throw new Error("No deposit hold on this booking");
      if (r.deposit_status !== "authorized") throw new Error(`Cannot release (${r.deposit_status})`);
      await stripeFetch(`/payment_intents/${r.deposit_intent_id}/cancel`, key);
      await supabaseAdmin.from("bookings").update({
        deposit_status: "released",
        deposit_settled_at: new Date().toISOString(),
      } as never).eq("id", data.bookingId);
      return { ok: true as const };
    }),
  );