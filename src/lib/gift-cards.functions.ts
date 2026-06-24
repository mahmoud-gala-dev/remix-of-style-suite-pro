import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

function generateCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 16; i++) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
    if (i === 3 || i === 7 || i === 11) out += "-";
  }
  return out;
}

async function tenantOfBranch(supabase: any, branchId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from("branches")
    .select("tenant_id")
    .eq("id", branchId)
    .single();
  if (error) throw new Error(error.message);
  return data?.tenant_id ?? null;
}

export const listGiftCards = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ branchId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("gift_cards")
      .select("id,code,initial_amount,balance,currency,status,issued_to_name,issued_to_phone,issued_to_email,message,expires_at,created_at")
      .eq("branch_id", data.branchId)
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const issueGiftCard = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      branchId: z.string().uuid(),
      amount: z.number().positive().max(1_000_000),
      currency: z.string().min(2).max(8).default("SAR"),
      recipientName: z.string().trim().max(120).optional(),
      recipientPhone: z.string().trim().max(40).optional(),
      recipientEmail: z.string().trim().max(160).optional(),
      message: z.string().trim().max(500).optional(),
      expiresAt: z.string().datetime().optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const tenantId = await tenantOfBranch(context.supabase, data.branchId);
    const code = generateCode();
    const { data: row, error } = await context.supabase
      .from("gift_cards")
      .insert({
        tenant_id: tenantId,
        branch_id: data.branchId,
        code,
        initial_amount: data.amount,
        balance: data.amount,
        currency: data.currency,
        status: "active",
        issued_to_name: data.recipientName ?? null,
        issued_to_phone: data.recipientPhone ?? null,
        issued_to_email: data.recipientEmail ?? null,
        message: data.message ?? null,
        expires_at: data.expiresAt ?? null,
        created_by: context.userId,
      })
      .select("id, code, balance")
      .single();
    if (error || !row) throw new Error(error?.message ?? "Failed to issue gift card");

    await context.supabase.from("gift_card_transactions").insert({
      gift_card_id: row.id,
      tenant_id: tenantId,
      kind: "issue",
      amount: data.amount,
      balance_after: data.amount,
      performed_by: context.userId,
    });

    return { ok: true as const, id: row.id, code: row.code };
  });

export const lookupGiftCard = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ code: z.string().trim().min(4).max(40) }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("gift_cards")
      .select("id,code,balance,currency,status,expires_at,initial_amount,issued_to_name")
      .eq("code", data.code.toUpperCase())
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("Gift card not found");
    return row;
  });

export const redeemGiftCard = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      id: z.string().uuid(),
      amount: z.number().positive(),
      invoiceId: z.string().uuid().optional(),
      note: z.string().max(500).optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: card, error } = await context.supabase
      .from("gift_cards")
      .select("id, tenant_id, balance, status, expires_at")
      .eq("id", data.id)
      .single();
    if (error || !card) throw new Error("Gift card not found");
    if (card.status !== "active") throw new Error(`Card is ${card.status}`);
    if (card.expires_at && new Date(card.expires_at) < new Date()) {
      throw new Error("Card has expired");
    }
    if (Number(card.balance) < data.amount) {
      throw new Error(`Insufficient balance (${card.balance})`);
    }
    const newBalance = Number(card.balance) - data.amount;
    const newStatus = newBalance <= 0 ? "redeemed" : "active";

    const { error: uErr } = await context.supabase
      .from("gift_cards")
      .update({ balance: newBalance, status: newStatus })
      .eq("id", data.id);
    if (uErr) throw new Error(uErr.message);

    await context.supabase.from("gift_card_transactions").insert({
      gift_card_id: data.id,
      tenant_id: card.tenant_id,
      kind: "redeem",
      amount: -data.amount,
      balance_after: newBalance,
      invoice_id: data.invoiceId ?? null,
      note: data.note ?? null,
      performed_by: context.userId,
    });
    return { ok: true as const, balance: newBalance, status: newStatus };
  });

export const cancelGiftCard = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: card, error } = await context.supabase
      .from("gift_cards")
      .select("id, tenant_id, balance")
      .eq("id", data.id)
      .single();
    if (error || !card) throw new Error("Gift card not found");
    const { error: uErr } = await context.supabase
      .from("gift_cards")
      .update({ status: "cancelled" })
      .eq("id", data.id);
    if (uErr) throw new Error(uErr.message);
    await context.supabase.from("gift_card_transactions").insert({
      gift_card_id: data.id,
      tenant_id: card.tenant_id,
      kind: "cancel",
      amount: 0,
      balance_after: Number(card.balance),
      performed_by: context.userId,
    });
    return { ok: true as const };
  });

export const listGiftCardTransactions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ giftCardId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("gift_card_transactions")
      .select("id,kind,amount,balance_after,note,invoice_id,created_at")
      .eq("gift_card_id", data.giftCardId)
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return rows ?? [];
  });