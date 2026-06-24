import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

function generateCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 8; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)];
  return out;
}

async function tenantOfBranch(supabase: any, branchId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from("branches").select("tenant_id").eq("id", branchId).single();
  if (error) throw new Error(error.message);
  return data?.tenant_id ?? null;
}

export const listReferralCodes = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ branchId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("referral_codes")
      .select("id,customer_id,code,referrer_reward,referee_reward,reward_type,uses_count,max_uses,active,created_at")
      .eq("branch_id", data.branchId)
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const issueReferralCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    branchId: z.string().uuid(),
    customerId: z.string().uuid(),
    referrerReward: z.number().nonnegative().default(20),
    refereeReward: z.number().nonnegative().default(10),
    rewardType: z.enum(["credit","points","discount_pct"]).default("credit"),
    maxUses: z.number().int().positive().optional(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const tenantId = await tenantOfBranch(context.supabase, data.branchId);
    let code = "", attempts = 0;
    while (attempts++ < 6) {
      code = generateCode();
      const { data: existing } = await context.supabase
        .from("referral_codes").select("id").eq("code", code).maybeSingle();
      if (!existing) break;
    }
    const { data: row, error } = await context.supabase.from("referral_codes").insert({
      tenant_id: tenantId,
      branch_id: data.branchId,
      customer_id: data.customerId,
      code,
      referrer_reward: data.referrerReward,
      referee_reward: data.refereeReward,
      reward_type: data.rewardType,
      max_uses: data.maxUses ?? null,
      active: true,
    }).select("id, code").single();
    if (error || !row) throw new Error(error?.message ?? "Failed to issue referral code");
    return { ok: true as const, id: row.id, code: row.code };
  });

export const redeemReferralCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    code: z.string().trim().min(4).max(40),
    refereeCustomerId: z.string().uuid(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: rc, error } = await context.supabase
      .from("referral_codes")
      .select("id, tenant_id, branch_id, customer_id, referrer_reward, referee_reward, reward_type, uses_count, max_uses, active")
      .eq("code", data.code.toUpperCase())
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!rc) throw new Error("Referral code not found");
    if (!rc.active) throw new Error("Referral code is inactive");
    if (rc.customer_id === data.refereeCustomerId) throw new Error("Cannot refer yourself");
    if (rc.max_uses != null && rc.uses_count >= rc.max_uses) throw new Error("Referral code exhausted");

    const { data: existing } = await context.supabase
      .from("referrals").select("id")
      .eq("referral_code_id", rc.id)
      .eq("referee_customer_id", data.refereeCustomerId)
      .maybeSingle();
    if (existing) throw new Error("This customer has already used this code");

    const { data: row, error: iErr } = await context.supabase.from("referrals").insert({
      tenant_id: rc.tenant_id,
      branch_id: rc.branch_id,
      referral_code_id: rc.id,
      referrer_customer_id: rc.customer_id,
      referee_customer_id: data.refereeCustomerId,
      status: "pending",
      referrer_reward: rc.referrer_reward,
      referee_reward: rc.referee_reward,
      reward_type: rc.reward_type,
    }).select("id").single();
    if (iErr || !row) throw new Error(iErr?.message ?? "Failed to register referral");

    await context.supabase.from("referral_codes")
      .update({ uses_count: rc.uses_count + 1 }).eq("id", rc.id);

    return { ok: true as const, referralId: row.id };
  });

export const completeReferral = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("referrals")
      .update({ status: "completed", completed_at: new Date().toISOString() })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const listReferrals = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ branchId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("referrals")
      .select("id,referrer_customer_id,referee_customer_id,status,referrer_reward,referee_reward,reward_type,completed_at,created_at")
      .eq("branch_id", data.branchId)
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) throw new Error(error.message);
    return rows ?? [];
  });