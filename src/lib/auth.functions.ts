import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { z } from "zod";

// Records a sign-in attempt and throws when the recent failure count
// from the same IP+email exceeds the threshold (5 per 15 minutes).
export const checkAuthRateLimit = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ email: z.string().trim().email().max(255) }).parse(d))
  .handler(async ({ data }) => {
    const ip =
      getRequestHeader("cf-connecting-ip") ??
      getRequestHeader("x-forwarded-for")?.split(",")[0]?.trim() ??
      "unknown";
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.rpc("check_rate_limit", { p_ip: ip, p_email: data.email });
    if (error) {
      if (error.message?.includes("rate_limited")) {
        throw new Response("Too many attempts. Try again in 15 minutes.", { status: 429 });
      }
      throw new Error(error.message);
    }
    return { ok: true as const };
  });