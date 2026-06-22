// A2 — Customer reviews. Submitted via the public manage-token portal; one
// review per booking. Aggregates exposed via getEmployeeRatings (public).
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { rateLimit } from "@/lib/rate-limit";

export const submitReview = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({
        token: z.string().uuid(),
        rating: z.number().int().min(1).max(5),
        comment: z.string().trim().max(1000).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    await rateLimit(`review:${data.token}`, { capacity: 3, refillPerMin: 3 });
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: b, error } = await supabaseAdmin
      .from("bookings")
      .select("id,branch_id,employee_id,customer_id,status")
      .eq("manage_token", data.token)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!b) throw new Response("Not found", { status: 404 });
    if (b.status !== "completed") {
      throw new Response("Review available after the appointment is completed", { status: 400 });
    }
    if (!b.customer_id) throw new Response("Booking has no linked customer", { status: 400 });

    const { error: insErr } = await supabaseAdmin.from("reviews").insert({
      booking_id: b.id,
      branch_id: b.branch_id,
      employee_id: b.employee_id,
      customer_id: b.customer_id,
      rating: data.rating,
      comment: data.comment ?? null,
    });
    if (insErr) {
      const code = (insErr as { code?: string }).code;
      if (code === "23505") throw new Response("Review already submitted for this booking", { status: 409 });
      throw new Error(insErr.message);
    }
    return { ok: true as const };
  });

export const getReviewForBooking = createServerFn({ method: "GET" })
  .inputValidator((d) => z.object({ token: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: b } = await supabaseAdmin
      .from("bookings").select("id").eq("manage_token", data.token).maybeSingle();
    if (!b) return null;
    const { data: r } = await supabaseAdmin
      .from("reviews").select("rating,comment,created_at").eq("booking_id", b.id).maybeSingle();
    return r;
  });

export const getEmployeeRatings = createServerFn({ method: "GET" })
  .inputValidator((d) => z.object({ employeeIds: z.array(z.string().uuid()).max(200) }).parse(d))
  .handler(async ({ data }) => {
    if (data.employeeIds.length === 0) return [] as { employee_id: string; avg: number; count: number }[];
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin
      .from("reviews").select("employee_id,rating").in("employee_id", data.employeeIds);
    if (error) throw new Error(error.message);
    const agg = new Map<string, { sum: number; count: number }>();
    for (const r of rows ?? []) {
      const v = agg.get(r.employee_id) ?? { sum: 0, count: 0 };
      v.sum += r.rating;
      v.count += 1;
      agg.set(r.employee_id, v);
    }
    return Array.from(agg.entries()).map(([employee_id, { sum, count }]) => ({
      employee_id,
      avg: count > 0 ? sum / count : 0,
      count,
    }));
  });

// P4 — Public branch reviews aggregator for /r/$branch reputation page.
// Returns anonymized comments + aggregate stats. No auth required.
export const getPublicBranchReviews = createServerFn({ method: "GET" })
  .inputValidator((d) => z.object({ branchId: z.string().uuid(), limit: z.number().int().min(1).max(50).default(20) }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: branch } = await supabaseAdmin
      .from("branches")
      .select("id,name_en,name_ar,address,phone,logo_url,active")
      .eq("id", data.branchId)
      .maybeSingle();
    if (!branch || !branch.active) throw new Response("Not found", { status: 404 });

    const { data: rows, error } = await supabaseAdmin
      .from("reviews")
      .select("rating,comment,created_at")
      .eq("branch_id", data.branchId)
      .order("created_at", { ascending: false })
      .limit(data.limit);
    if (error) throw new Error(error.message);

    const all = rows ?? [];
    const count = all.length;
    const avg = count > 0 ? all.reduce((s, r) => s + r.rating, 0) / count : 0;
    const distribution = [1, 2, 3, 4, 5].map((star) => ({
      star,
      count: all.filter((r) => r.rating === star).length,
    }));

    return {
      branch: {
        id: branch.id,
        name_en: branch.name_en,
        name_ar: branch.name_ar,
        address: branch.address,
        phone: branch.phone,
        logo_url: branch.logo_url,
      },
      avg,
      count,
      distribution,
      reviews: all.map((r) => ({
        rating: r.rating,
        comment: r.comment,
        created_at: r.created_at,
      })),
    };
  });