import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Cycle #25 — CRM Timeline
// Unified per-customer activity feed aggregated from bookings, invoices,
// reviews and loyalty point transactions. Read-only; no new tables.

export type TimelineEvent = {
  id: string;
  type: "booking" | "invoice" | "review" | "points";
  at: string;
  title: string;
  subtitle?: string | null;
  amount?: number | null;
  status?: string | null;
};

export const getCustomerTimeline = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ customerId: z.string().uuid(), limit: z.number().int().min(1).max(500).optional() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { customerId } = data;
    const limit = data.limit ?? 100;

    const [custR, bookR, invR, revR, ptsR] = await Promise.all([
      context.supabase.from("customers").select("*").eq("id", customerId).maybeSingle(),
      context.supabase
        .from("bookings")
        .select("id,start_at,end_at,status,created_at,service_id,employee_id")
        .eq("customer_id", customerId)
        .order("start_at", { ascending: false })
        .limit(limit),
      context.supabase
        .from("invoices")
        .select("id,number,issued_at,status,total,subtotal,tax,discount")
        .eq("customer_id", customerId)
        .order("issued_at", { ascending: false })
        .limit(limit),
      context.supabase
        .from("reviews")
        .select("id,rating,comment,created_at,booking_id")
        .eq("customer_id", customerId)
        .order("created_at", { ascending: false })
        .limit(limit),
      context.supabase
        .from("points_transactions")
        .select("id,delta,reason,created_at")
        .eq("customer_id", customerId)
        .order("created_at", { ascending: false })
        .limit(limit),
    ]);

    if (custR.error) throw new Error(custR.error.message);

    const events: TimelineEvent[] = [];
    for (const b of bookR.data ?? []) {
      events.push({
        id: `b:${b.id}`,
        type: "booking",
        at: b.start_at ?? b.created_at,
        title: "Booking",
        subtitle: b.start_at ? new Date(b.start_at).toLocaleString() : null,
        status: b.status,
      });
    }
    for (const i of invR.data ?? []) {
      events.push({
        id: `i:${i.id}`,
        type: "invoice",
        at: i.issued_at,
        title: `Invoice #${i.number}`,
        amount: Number(i.total ?? 0),
        status: i.status,
      });
    }
    for (const r of revR.data ?? []) {
      events.push({
        id: `r:${r.id}`,
        type: "review",
        at: r.created_at,
        title: `Review · ${r.rating}/5`,
        subtitle: r.comment,
      });
    }
    for (const p of ptsR.data ?? []) {
      events.push({
        id: `p:${p.id}`,
        type: "points",
        at: p.created_at,
        title: `${p.delta > 0 ? "+" : ""}${p.delta} pts`,
        subtitle: p.reason,
      });
    }
    events.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

    const totalSpend = (invR.data ?? [])
      .filter((i) => i.status === "paid")
      .reduce((s, i) => s + Number(i.total ?? 0), 0);
    const bookingCount = (bookR.data ?? []).length;
    const noShowCount = (bookR.data ?? []).filter((b) => b.status === "no_show").length;
    const avgRating = (() => {
      const arr = revR.data ?? [];
      if (!arr.length) return null;
      return arr.reduce((s, r) => s + (r.rating ?? 0), 0) / arr.length;
    })();

    return {
      customer: custR.data,
      events,
      stats: { totalSpend, bookingCount, noShowCount, avgRating },
    };
  });

export const listBranchCustomers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ branchId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("customers")
      .select("id,name,phone,email,last_visit")
      .eq("branch_id", data.branchId)
      .order("name", { ascending: true })
      .limit(500);
    if (error) throw new Error(error.message);
    return rows ?? [];
  });