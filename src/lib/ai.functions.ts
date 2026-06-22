// P4 #3 — AI suggestions: best booking time, no-show risk, service recommendations.
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { generateText, Output } from "ai";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";

const MODEL = "google/gemini-3-flash-preview";

function gateway() {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("Missing LOVABLE_API_KEY");
  return createLovableAiGatewayProvider(key);
}

// ---- Best time suggestion -------------------------------------------------
export const suggestBestTime = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      branchId: z.string().uuid(),
      serviceId: z.string().uuid().optional(),
      employeeId: z.string().uuid().optional(),
      horizonDays: z.number().int().min(1).max(14).default(7),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const fromIso = new Date().toISOString();
    const toIso = new Date(Date.now() + data.horizonDays * 86400_000).toISOString();
    const { data: bookings } = await context.supabase
      .from("bookings")
      .select("start_at,end_at,status,employee_id,service_id")
      .eq("branch_id", data.branchId)
      .gte("start_at", new Date(Date.now() - 30 * 86400_000).toISOString())
      .order("start_at", { ascending: true })
      .limit(500);

    // Bucket density by (weekday, hour)
    const density: Record<string, number> = {};
    for (const b of bookings ?? []) {
      const d = new Date(b.start_at);
      const key = `${d.getDay()}-${d.getHours()}`;
      density[key] = (density[key] ?? 0) + 1;
    }

    const provider = gateway();
    const { output } = await generateText({
      model: provider(MODEL),
      output: Output.object({
        schema: z.object({
          slots: z.array(z.object({
            day_offset: z.number().int().min(0).max(14),
            hour: z.number().int().min(0).max(23),
            reason: z.string(),
          })).min(1).max(3),
        }),
      }),
      prompt: `Given booking density by weekday-hour for a salon: ${JSON.stringify(density)}.
Horizon: ${data.horizonDays} days starting ${fromIso} (now). Return up to 3 best low-density appointment slots within working hours 9-21. Day offset 0 = today.`,
    });
    return { from: fromIso, to: toIso, ...output };
  });

// ---- No-show prediction ---------------------------------------------------
export const predictNoShow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ bookingId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: b, error } = await context.supabase
      .from("bookings")
      .select("id,customer_id,start_at,status")
      .eq("id", data.bookingId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!b?.customer_id) return { risk: 0, level: "low" as const, reason: "Walk-in / no customer" };

    const { data: cust } = await context.supabase
      .from("customers")
      .select("no_show_count,blocked")
      .eq("id", b.customer_id)
      .maybeSingle();
    const { data: history } = await context.supabase
      .from("bookings")
      .select("status,start_at")
      .eq("customer_id", b.customer_id)
      .order("start_at", { ascending: false })
      .limit(20);

    const total = history?.length ?? 0;
    const noShows = (history ?? []).filter((h) => h.status === "no_show").length;
    const completed = (history ?? []).filter((h) => h.status === "completed").length;
    const cancelled = (history ?? []).filter((h) => h.status === "cancelled").length;

    // Simple deterministic score 0-100
    const base = total === 0 ? 25 : Math.round((noShows / total) * 100);
    const trend = (cust?.no_show_count ?? 0) >= 2 ? 25 : 0;
    const risk = Math.min(100, base + trend);
    const level = risk >= 60 ? "high" : risk >= 30 ? "medium" : "low";
    const reason =
      total === 0
        ? "No prior history; new customer."
        : `History: ${completed} completed, ${noShows} no-shows, ${cancelled} cancelled out of ${total}.`;
    return { risk, level, reason, stats: { total, noShows, completed, cancelled, blocked: !!cust?.blocked } };
  });

// ---- Service recommendations ----------------------------------------------
export const suggestServices = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ customerId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: customer } = await context.supabase
      .from("customers")
      .select("id,branch_id,gender")
      .eq("id", data.customerId)
      .maybeSingle();
    if (!customer) throw new Response("Not found", { status: 404 });

    const { data: history } = await context.supabase
      .from("invoices")
      .select("invoice_items(service_id,services(name_en,name_ar))")
      .eq("customer_id", data.customerId)
      .limit(30);
    const pastServices = (history ?? []).flatMap((inv) =>
      (inv.invoice_items ?? []).map((it) => it.services),
    );

    const { data: catalog } = await context.supabase
      .from("services")
      .select("id,name_en,name_ar,price,duration_min")
      .eq("branch_id", customer.branch_id)
      .eq("active", true)
      .limit(50);

    const provider = gateway();
    const { output } = await generateText({
      model: provider(MODEL),
      output: Output.object({
        schema: z.object({
          recommendations: z.array(z.object({
            service_id: z.string(),
            name: z.string(),
            reason: z.string(),
          })).min(1).max(3),
        }),
      }),
      prompt: `Salon services catalog: ${JSON.stringify(catalog ?? [])}.
Customer past services: ${JSON.stringify(pastServices)}.
Customer gender: ${customer.gender ?? "unspecified"}.
Recommend up to 3 services from the catalog (use exact service_id from catalog). Brief practical reason each.`,
    });
    return output;
  });