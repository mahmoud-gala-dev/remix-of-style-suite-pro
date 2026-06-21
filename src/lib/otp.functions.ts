import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

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
    const [admin, superAdmin] = await Promise.all([
      context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" }),
      context.supabase.rpc("has_role", { _user_id: context.userId, _role: "super_admin" }),
    ]);
    if (!admin.data && !superAdmin.data) throw new Response("Forbidden", { status: 403 });
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("app_settings")
      .upsert({ key: "booking_otp_required", value: data.enabled, updated_at: new Date().toISOString() });
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

// Public — request a 6-digit OTP for a phone. Returns the code for now
// (SMS provider hookup pending). In production this would only return {ok}.
export const requestOtp = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ phone: z.string().trim().min(6).max(40) }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: code, error } = await supabaseAdmin.rpc("request_otp", { p_phone: data.phone });
    if (error) throw new Error(error.message);
    return { ok: true as const, code: code as string };
  });

// Public — verify a 6-digit OTP for a phone.
export const verifyOtp = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ phone: z.string().trim().min(6).max(40), code: z.string().trim().length(6) }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: ok, error } = await supabaseAdmin.rpc("verify_otp", { p_phone: data.phone, p_code: data.code });
    if (error) throw new Error(error.message);
    return { ok: Boolean(ok) };
  });