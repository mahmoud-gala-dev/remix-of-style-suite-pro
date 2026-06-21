import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const enroll2FA = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { OTP } = await import("otplib");
    const QRCode = (await import("qrcode")).default;
    const otp = new OTP({ strategy: "totp" });
    const secret = otp.generateSecret();
    const email = (context.claims as { email?: string })?.email ?? "user";
    const otpauth = otp.generateURI({ issuer: "Vanguard Salon OS", label: email, secret });
    const qr = await QRCode.toDataURL(otpauth);
    const { error } = await context.supabase
      .from("user_2fa")
      .upsert({ user_id: context.userId, secret, enabled: false }, { onConflict: "user_id" });
    if (error) throw new Error(error.message);
    return { otpauth, qr };
  });

export const verify2FA = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ code: z.string().trim().length(6).regex(/^\d{6}$/) }).parse(d))
  .handler(async ({ data, context }) => {
    const { OTP } = await import("otplib");
    const { data: row, error } = await context.supabase
      .from("user_2fa")
      .select("secret, enabled")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("not_enrolled");
    const otp = new OTP({ strategy: "totp" });
    const result = await otp.verify({ secret: row.secret, token: data.code, epochTolerance: 30 });
    const ok = (result as { valid?: boolean }).valid !== false && !!result;
    if (!ok) throw new Error("invalid_code");
    await context.supabase
      .from("user_2fa")
      .update({ enabled: true, last_verified_at: new Date().toISOString() })
      .eq("user_id", context.userId);
    return { ok: true as const };
  });

export const get2FAStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("user_2fa")
      .select("enabled, enrolled_at, last_verified_at")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return { enabled: !!data?.enabled, enrolledAt: data?.enrolled_at ?? null, lastVerifiedAt: data?.last_verified_at ?? null };
  });

export const disable2FA = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ code: z.string().trim().length(6).regex(/^\d{6}$/) }).parse(d))
  .handler(async ({ data, context }) => {
    const { OTP } = await import("otplib");
    const { data: row, error } = await context.supabase
      .from("user_2fa")
      .select("secret")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("not_enrolled");
    const otp = new OTP({ strategy: "totp" });
    const result = await otp.verify({ secret: row.secret, token: data.code, epochTolerance: 30 });
    if (!result) throw new Error("invalid_code");
    const { error: delErr } = await context.supabase.from("user_2fa").delete().eq("user_id", context.userId);
    if (delErr) throw new Error(delErr.message);
    return { ok: true as const };
  });