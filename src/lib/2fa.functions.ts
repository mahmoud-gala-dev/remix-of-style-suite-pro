import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Enroll: create a fresh secret (replaces any existing pending one), return otpauth URI + QR data URL.
export const enroll2FA = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { authenticator } = await import("otplib");
    const QRCode = (await import("qrcode")).default;
    const secret = authenticator.generateSecret();
    const email = (context.claims as { email?: string })?.email ?? "user";
    const otpauth = authenticator.keyuri(email, "Vanguard Salon OS", secret);
    const qr = await QRCode.toDataURL(otpauth);
    const { error } = await context.supabase
      .from("user_2fa")
      .upsert({ user_id: context.userId, secret, enabled: false }, { onConflict: "user_id" });
    if (error) throw new Error(error.message);
    return { otpauth, qr };
  });

// Verify a TOTP code; on first success flips enabled=true.
export const verify2FA = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ code: z.string().trim().length(6).regex(/^\d{6}$/) }).parse(d))
  .handler(async ({ data, context }) => {
    const { authenticator } = await import("otplib");
    const { data: row, error } = await context.supabase
      .from("user_2fa")
      .select("secret, enabled")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("not_enrolled");
    authenticator.options = { window: 1 };
    const ok = authenticator.check(data.code, row.secret);
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
    const { authenticator } = await import("otplib");
    const { data: row, error } = await context.supabase
      .from("user_2fa")
      .select("secret")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("not_enrolled");
    authenticator.options = { window: 1 };
    if (!authenticator.check(data.code, row.secret)) throw new Error("invalid_code");
    const { error: delErr } = await context.supabase.from("user_2fa").delete().eq("user_id", context.userId);
    if (delErr) throw new Error(delErr.message);
    return { ok: true as const };
  });