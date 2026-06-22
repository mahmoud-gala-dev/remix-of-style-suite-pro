import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requireAdmin } from "@/lib/require-admin";
import { rateLimit } from "@/lib/rate-limit";

// Public — read whether the booking flow requires OTP.
export const getBookingOtpEnabled = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin.from("app_settings").select("value").eq("key", "booking_otp_required").maybeSingle();
  return { enabled: data?.value === true };
});

// Admin — toggle OTP requirement.
export const setBookingOtpEnabled = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ enabled: z.boolean() }).parse(d))
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("app_settings")
      .upsert({ key: "booking_otp_required", value: data.enabled, updated_at: new Date().toISOString() });
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const requestOtp = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ phone: z.string().trim().min(6).max(40) }).parse(d))
  .handler(async ({ data }) => {
    // P1 — flood / brute-force protection: 5 codes per 10 minutes per phone.
    await rateLimit(`otp:request:${data.phone}`, { capacity: 5, refillPerMin: 0.5 });
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: code, error } = await supabaseAdmin.rpc("request_otp", { p_phone: data.phone });
    if (error) throw new Error(error.message);
    // Try delivering via Twilio WhatsApp (if admin enabled it in Settings).
    const { sendWhatsappInternal } = await import("@/lib/twilio.functions");
    const send = await sendWhatsappInternal(
      data.phone,
      `Vanguard verification code: ${code}`,
    );
    // In production never leak the code; expose only when Twilio isn't
    // delivering (dev preview, or tests with EXPOSE_OTP_FOR_TESTS=1).
    const exposeCode =
      !send.sent &&
      (process.env.NODE_ENV !== "production" || process.env.EXPOSE_OTP_FOR_TESTS === "1");
    return exposeCode
      ? { ok: true as const, sent: send.sent, code: code as string }
      : { ok: true as const, sent: send.sent };
  });

// Public — verify a 6-digit OTP for a phone.
export const verifyOtp = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ phone: z.string().trim().min(6).max(40), code: z.string().trim().length(6) }).parse(d))
  .handler(async ({ data }) => {
    // P1 — brute-force protection on verification attempts.
    await rateLimit(`otp:verify:${data.phone}`, { capacity: 10, refillPerMin: 1 });
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: ok, error } = await supabaseAdmin.rpc("verify_otp", { p_phone: data.phone, p_code: data.code });
    if (error) throw new Error(error.message);
    return { ok: Boolean(ok) };
  });