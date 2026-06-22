import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Surface } from "@/components/shell/page";
import { useRole } from "@/lib/use-role";
import {
  listMyTenants,
  updateTenantSalonType,
  seedServiceTemplates,
  SALON_TYPES,
  type SalonType,
} from "@/lib/salon-type.functions";

const LABELS: Record<SalonType, { ar: string; en: string; desc: string }> = {
  barbershop: { ar: "صالون رجالي", en: "Barbershop", desc: "حلاقة + لحية + شيف" },
  women_salon: { ar: "صالون حريمي", en: "Women's Salon", desc: "صبغة + قص + مكياج + أظافر (صور الموظفات خاصة افتراضياً)" },
  unisex: { ar: "مختلط", en: "Unisex", desc: "خدمات للجنسين" },
  spa: { ar: "سبا", en: "Spa", desc: "مساج + علاجات الجسم والوجه" },
};

export function SettingsSalonType() {
  const { isAdmin } = useRole();
  const qc = useQueryClient();
  const fetchTenants = useServerFn(listMyTenants);
  const saveType = useServerFn(updateTenantSalonType);
  const seedTpl = useServerFn(seedServiceTemplates);

  const tenantsQ = useQuery({
    queryKey: ["my-tenants-salon"],
    queryFn: () => fetchTenants(),
    enabled: isAdmin,
  });

  const [selected, setSelected] = useState<string | null>(null);
  const tenant = useMemo(() => {
    const list = tenantsQ.data ?? [];
    return list.find((t) => t.id === selected) ?? list[0] ?? null;
  }, [tenantsQ.data, selected]);

  const saveMut = useMutation({
    mutationFn: (v: { salon_type: SalonType; staff_photos_public?: boolean }) =>
      saveType({ data: { tenant_id: tenant!.id, ...v } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-tenants-salon"] });
      toast.success("تم الحفظ");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const seedMut = useMutation({
    mutationFn: () => seedTpl({ data: { tenant_id: tenant!.id } }),
    onSuccess: (r) => toast.success(`تم إضافة ${r.inserted} خدمة افتراضية`),
    onError: (e: Error) => toast.error(e.message),
  });

  if (!isAdmin) return null;

  return (
    <Surface>
      <div className="mb-4">
        <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-dim">نوع الصالون</h3>
        <p className="text-xs text-dim mt-1">
          يحدد قوالب الخدمات الافتراضية، إعدادات الخصوصية، وتحليلات القطاع.
        </p>
      </div>

      {tenantsQ.isLoading && <p className="text-xs text-dim">جارٍ التحميل…</p>}

      {tenantsQ.data && tenantsQ.data.length > 1 && (
        <label className="block mb-4 space-y-1.5 text-xs">
          <span className="text-dim">الفرع/المؤسسة</span>
          <select
            value={tenant?.id ?? ""}
            onChange={(e) => setSelected(e.target.value)}
            className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
          >
            {tenantsQ.data.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </label>
      )}

      {tenant && (
        <>
          <div className="grid gap-2 sm:grid-cols-2 mb-4">
            {SALON_TYPES.map((type) => {
              const active = tenant.salon_type === type;
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => saveMut.mutate({ salon_type: type })}
                  disabled={saveMut.isPending}
                  className={`text-start p-3 rounded-md border transition ${
                    active
                      ? "border-primary bg-primary/10"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <div className="text-sm font-bold">{LABELS[type].ar}</div>
                  <div className="text-xs text-dim mt-1">{LABELS[type].desc}</div>
                </button>
              );
            })}
          </div>

          <div className="border-t border-border pt-3 flex items-center justify-between mb-3">
            <div>
              <h4 className="text-xs font-bold uppercase tracking-[0.2em] text-dim">
                صور الموظفين عامة
              </h4>
              <p className="text-xs text-dim mt-1">
                إذا كان صالوناً حريمياً، يُنصح بإبقائها خاصة.
              </p>
            </div>
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <span className="text-xs text-dim">
                {tenant.staff_photos_public ? "عامة" : "خاصة"}
              </span>
              <input
                type="checkbox"
                checked={tenant.staff_photos_public}
                disabled={saveMut.isPending}
                onChange={(e) =>
                  saveMut.mutate({
                    salon_type: tenant.salon_type,
                    staff_photos_public: e.target.checked,
                  })
                }
                className="size-4 accent-primary"
              />
            </label>
          </div>

          <div className="border-t border-border pt-3 flex items-center justify-between">
            <div>
              <h4 className="text-xs font-bold uppercase tracking-[0.2em] text-dim">
                قوالب الخدمات الافتراضية
              </h4>
              <p className="text-xs text-dim mt-1">
                أضف قائمة خدمات مناسبة لنوع الصالون إلى الفرع الأول (لن يكرر الموجود).
              </p>
            </div>
            <button
              type="button"
              onClick={() => seedMut.mutate()}
              disabled={seedMut.isPending}
              className="px-4 py-2 rounded-md text-xs font-bold uppercase tracking-widest border border-primary text-primary hover:bg-primary hover:text-primary-foreground transition disabled:opacity-50"
            >
              {seedMut.isPending ? "…" : "إضافة"}
            </button>
          </div>
        </>
      )}
    </Surface>
  );
}