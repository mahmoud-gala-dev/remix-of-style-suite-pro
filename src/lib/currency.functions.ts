import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const SUPPORTED_CURRENCIES = [
  { code: "SAR", symbol: "ر.س", name: "Saudi Riyal" },
  { code: "AED", symbol: "د.إ", name: "UAE Dirham" },
  { code: "USD", symbol: "$", name: "US Dollar" },
  { code: "EUR", symbol: "€", name: "Euro" },
  { code: "GBP", symbol: "£", name: "British Pound" },
  { code: "KWD", symbol: "د.ك", name: "Kuwaiti Dinar" },
  { code: "QAR", symbol: "ر.ق", name: "Qatari Riyal" },
  { code: "BHD", symbol: "د.ب", name: "Bahraini Dinar" },
  { code: "OMR", symbol: "ر.ع.", name: "Omani Rial" },
  { code: "EGP", symbol: "ج.م", name: "Egyptian Pound" },
] as const;

export type CurrencyCode = typeof SUPPORTED_CURRENCIES[number]["code"];

export function formatMoney(amount: number, currency: string = "SAR"): string {
  const sym = SUPPORTED_CURRENCIES.find((c) => c.code === currency)?.symbol ?? currency;
  return `${amount.toFixed(2)} ${sym}`;
}

export const getTenantCurrency = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ branchId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: b } = await context.supabase
      .from("branches").select("tenant_id").eq("id", data.branchId).single();
    if (!b?.tenant_id) return "SAR";
    const { data: t } = await context.supabase
      .from("tenants").select("default_currency").eq("id", b.tenant_id).single();
    return (t?.default_currency as string) ?? "SAR";
  });

export const setTenantCurrency = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    branchId: z.string().uuid(),
    currency: z.string().trim().min(3).max(8),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: b } = await context.supabase
      .from("branches").select("tenant_id").eq("id", data.branchId).single();
    if (!b?.tenant_id) throw new Error("Branch not found");
    const { error } = await context.supabase
      .from("tenants").update({ default_currency: data.currency }).eq("id", b.tenant_id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });