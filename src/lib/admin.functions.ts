import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Claim super_admin role if no super_admin exists yet (bootstrap first owner).
export const claimSuperAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { count, error: countErr } = await supabaseAdmin
      .from("user_roles")
      .select("*", { count: "exact", head: true })
      .eq("role", "super_admin");
    if (countErr) throw new Error(countErr.message);
    if ((count ?? 0) > 0) {
      // Already claimed — only allow if caller is already super_admin.
      const { data: mine } = await supabaseAdmin
        .from("user_roles")
        .select("role")
        .eq("user_id", context.userId)
        .eq("role", "super_admin")
        .maybeSingle();
      if (!mine) throw new Error("Setup is already claimed by another super-admin.");
      return { ok: true, alreadyOwner: true };
    }
    const { error: insErr } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: context.userId, role: "super_admin" });
    if (insErr) throw new Error(insErr.message);
    return { ok: true, alreadyOwner: false };
  });

// Seed demo data. Super-admin only. Idempotent: skips if branches already exist.
export const seedDemoData = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "super_admin",
    });
    if (!isAdmin) throw new Error("Forbidden: super_admin required");

    const { count } = await supabaseAdmin
      .from("branches")
      .select("*", { count: "exact", head: true });
    if ((count ?? 0) > 0) return { ok: true, skipped: true as const };

    const uid = () => crypto.randomUUID();
    const at = (h: number, m = 0) => {
      const d = new Date();
      d.setHours(h, m, 0, 0);
      return d.toISOString();
    };

    const brDowntown = uid(), brMall = uid(), brVip = uid();
    const branches = [
      { id: brDowntown, name_en: "Downtown Studio", name_ar: "استوديو وسط المدينة", address: "12 Sheikh Zayed Rd, Dubai", phone: "+971 4 555 0101", chairs: 6, hours_open: "09:00", hours_close: "22:00", active: true },
      { id: brMall, name_en: "Mall Branch", name_ar: "فرع المول", address: "Mall of the Emirates, L2", phone: "+971 4 555 0202", chairs: 4, hours_open: "10:00", hours_close: "23:00", active: true },
      { id: brVip, name_en: "VIP Lounge", name_ar: "صالة كبار الشخصيات", address: "Marina Walk, Tower 3", phone: "+971 4 555 0303", chairs: 3, hours_open: "11:00", hours_close: "23:00", active: true },
    ];

    const sv1 = uid(), sv2 = uid(), sv3 = uid(), sv4 = uid(), sv5 = uid(), sv6 = uid(), sv7 = uid(), sv8 = uid();
    const services = [
      { id: sv1, branch_id: brDowntown, name_en: "Signature Beard Sculpt", name_ar: "نحت لحية", category: "Beard", duration_min: 30, price: 90, gender: "male", active: true },
      { id: sv2, branch_id: brDowntown, name_en: "Classic Fade", name_ar: "تدرج كلاسيكي", category: "Hair", duration_min: 45, price: 110, gender: "male", active: true },
      { id: sv3, branch_id: brDowntown, name_en: "Royal Shave", name_ar: "حلاقة ملكية", category: "Shave", duration_min: 40, price: 130, gender: "male", active: true },
      { id: sv4, branch_id: brDowntown, name_en: "Keratin Treatment", name_ar: "علاج الكيراتين", category: "Treatment", duration_min: 120, price: 480, gender: "female", active: true },
      { id: sv5, branch_id: brDowntown, name_en: "Highlights & Blowout", name_ar: "صبغة وتمليس", category: "Color", duration_min: 90, price: 320, gender: "female", active: true },
      { id: sv6, branch_id: brMall, name_en: "Kids Cut", name_ar: "قص أطفال", category: "Hair", duration_min: 25, price: 60, gender: "both", active: true },
      { id: sv7, branch_id: brMall, name_en: "Skin Fade", name_ar: "تدرج جلد", category: "Hair", duration_min: 40, price: 100, gender: "male", active: true },
      { id: sv8, branch_id: brVip, name_en: "Hot Towel Ritual", name_ar: "طقوس المنشفة الساخنة", category: "Premium", duration_min: 60, price: 220, gender: "male", active: true },
    ];

    const em1 = uid(), em2 = uid(), em3 = uid(), em4 = uid(), em5 = uid();
    const employees = [
      { id: em1, branch_id: brDowntown, name_en: "Alex Rivera", name_ar: "أليكس ريفيرا", phone: "+971 50 111 2233", role: "barber", commission_pct: 35, rating: 4.9, active: true },
      { id: em2, branch_id: brDowntown, name_en: "Elena Sokolova", name_ar: "إيلينا سوكولوفا", phone: "+971 50 222 3344", role: "stylist", commission_pct: 40, rating: 4.8, active: true },
      { id: em3, branch_id: brDowntown, name_en: "Marcus King", name_ar: "ماركوس كينج", phone: "+971 50 333 4455", role: "barber", commission_pct: 30, rating: 4.7, active: true },
      { id: em4, branch_id: brMall, name_en: "Yusra Haddad", name_ar: "يسرى حداد", phone: "+971 50 444 5566", role: "stylist", commission_pct: 35, rating: 4.6, active: true },
      { id: em5, branch_id: brVip, name_en: "Omar Farouk", name_ar: "عمر فاروق", phone: "+971 50 555 6677", role: "barber", commission_pct: 45, rating: 5.0, active: true },
    ];

    const cu1 = uid(), cu2 = uid(), cu3 = uid(), cu4 = uid(), cu5 = uid(), cu6 = uid(), cu7 = uid();
    const customers = [
      { id: cu1, branch_id: brDowntown, name: "Julian O'Connor", phone: "+971 55 100 0001", email: "julian@example.com", gender: "male", visits: 12, total_spend: 1320, points: 240, last_visit: at(-1) },
      { id: cu2, branch_id: brDowntown, name: "Layla Hassan / ليلى حسن", phone: "+971 55 100 0002", gender: "female", visits: 6, total_spend: 2200, points: 180, last_visit: at(-3) },
      { id: cu3, branch_id: brDowntown, name: "Michael Thorne", phone: "+971 55 100 0003", gender: "male", visits: 18, total_spend: 1980, points: 360, last_visit: at(0) },
      { id: cu4, branch_id: brDowntown, name: "Sarah Jenkins", phone: "+971 55 100 0004", gender: "female", visits: 4, total_spend: 1640, points: 95, last_visit: at(-5) },
      { id: cu5, branch_id: brDowntown, name: "Omar Mansour / عمر منصور", phone: "+971 55 100 0005", gender: "male", visits: 9, total_spend: 990, points: 200, last_visit: at(-2) },
      { id: cu6, branch_id: brMall, name: "Aisha Karim / عائشة كريم", phone: "+971 55 100 0006", gender: "female", visits: 3, total_spend: 420, points: 60, last_visit: at(-7) },
      { id: cu7, branch_id: brVip, name: "Khalid Al-Sayed", phone: "+971 55 100 0007", gender: "male", visits: 24, total_spend: 5280, points: 720, last_visit: at(-1) },
    ];

    const bookings = [
      { branch_id: brDowntown, customer_id: cu1, employee_id: em1, service_id: sv1, start_at: at(10), end_at: at(10, 30), status: "completed", price: 90 },
      { branch_id: brDowntown, customer_id: cu2, employee_id: em2, service_id: sv5, start_at: at(10, 45), end_at: at(12, 15), status: "completed", price: 320 },
      { branch_id: brDowntown, customer_id: cu3, employee_id: em1, service_id: sv2, start_at: at(11, 30), end_at: at(12, 15), status: "in_progress", price: 110 },
      { branch_id: brDowntown, customer_id: cu4, employee_id: em2, service_id: sv4, start_at: at(13), end_at: at(15), status: "confirmed", price: 480 },
      { branch_id: brDowntown, customer_id: cu5, employee_id: em3, service_id: sv3, start_at: at(14, 30), end_at: at(15, 10), status: "confirmed", price: 130 },
      { branch_id: brDowntown, customer_id: cu1, employee_id: em1, service_id: sv1, start_at: at(16), end_at: at(16, 30), status: "pending", price: 90 },
      { branch_id: brMall, customer_id: cu6, employee_id: em4, service_id: sv6, start_at: at(11), end_at: at(11, 25), status: "confirmed", price: 60 },
      { branch_id: brVip, customer_id: cu7, employee_id: em5, service_id: sv8, start_at: at(12), end_at: at(13), status: "confirmed", price: 220 },
    ];

    const queue = [
      { branch_id: brDowntown, customer_id: cu3, employee_id: em1, service_id: sv2, status: "in_progress", position: 0 },
      { branch_id: brDowntown, customer_id: cu5, status: "waiting", position: 1 },
      { branch_id: brDowntown, customer_id: cu1, status: "waiting", position: 2 },
      { branch_id: brDowntown, customer_id: cu4, status: "waiting", position: 3 },
    ];

    const { insertDynamic } = await import("@/lib/dynamic-table.server");
    const ins = async (table: string, rows: unknown) => {
      const { error } = await insertDynamic(supabaseAdmin, table, rows);
      if (error) throw new Error(`${table}: ${error.message}`);
    };
    await ins("branches", branches);
    await ins("services", services);
    await ins("employees", employees);
    await ins("customers", customers);
    await ins("bookings", bookings);
    await ins("queue_items", queue);
    return { ok: true, skipped: false as const };
  });