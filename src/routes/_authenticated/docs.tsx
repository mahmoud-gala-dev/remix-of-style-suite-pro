import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { ArrowLeft, ExternalLink, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/docs")({
  component: DocsPage,
});

type Module = {
  id: string;
  title: string;
  category: "operations" | "management" | "finance" | "system";
  link?: string;
  table?: string;
  description: string;
  fields: string[];
  icon: ReactNode;
};

const C = {
  operations: { label: "العمليات اليومية", ring: "ring-sky-500/40", dot: "bg-sky-500", glow: "shadow-[0_0_30px_-8px] shadow-sky-500/40" },
  management: { label: "الإدارة", ring: "ring-violet-500/40", dot: "bg-violet-500", glow: "shadow-[0_0_30px_-8px] shadow-violet-500/40" },
  finance: { label: "المالية", ring: "ring-amber-500/40", dot: "bg-amber-500", glow: "shadow-[0_0_30px_-8px] shadow-amber-500/40" },
  system: { label: "النظام", ring: "ring-rose-500/40", dot: "bg-rose-500", glow: "shadow-[0_0_30px_-8px] shadow-rose-500/40" },
} as const;

const stroke = "stroke-current";
const svgBase = "w-14 h-14";

const Icons = {
  dashboard: (
    <svg viewBox="0 0 64 64" fill="none" className={svgBase}>
      <rect x="8" y="8" width="22" height="22" rx="4" className={stroke} strokeWidth="2" />
      <rect x="34" y="8" width="22" height="14" rx="4" className={stroke} strokeWidth="2" />
      <rect x="8" y="34" width="14" height="22" rx="4" className={stroke} strokeWidth="2" />
      <rect x="26" y="26" width="30" height="30" rx="4" className={stroke} strokeWidth="2" />
    </svg>
  ),
  calendar: (
    <svg viewBox="0 0 64 64" fill="none" className={svgBase}>
      <rect x="8" y="14" width="48" height="42" rx="4" className={stroke} strokeWidth="2" />
      <path d="M8 26h48" className={stroke} strokeWidth="2" />
      <path d="M20 8v12M44 8v12" className={stroke} strokeWidth="2" strokeLinecap="round" />
      <circle cx="20" cy="38" r="2" fill="currentColor" />
      <circle cx="32" cy="38" r="2" fill="currentColor" />
      <circle cx="44" cy="38" r="2" fill="currentColor" />
      <circle cx="20" cy="48" r="2" fill="currentColor" />
      <circle cx="32" cy="48" r="2" fill="currentColor" />
    </svg>
  ),
  bookings: (
    <svg viewBox="0 0 64 64" fill="none" className={svgBase}>
      <rect x="10" y="10" width="44" height="48" rx="4" className={stroke} strokeWidth="2" />
      <path d="M20 24h24M20 34h24M20 44h16" className={stroke} strokeWidth="2" strokeLinecap="round" />
      <circle cx="50" cy="14" r="6" fill="currentColor" />
    </svg>
  ),
  queue: (
    <svg viewBox="0 0 64 64" fill="none" className={svgBase}>
      <circle cx="14" cy="32" r="5" className={stroke} strokeWidth="2" />
      <circle cx="32" cy="32" r="5" className={stroke} strokeWidth="2" />
      <circle cx="50" cy="32" r="5" className={stroke} strokeWidth="2" />
      <path d="M19 32h8M37 32h8" className={stroke} strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
  customers: (
    <svg viewBox="0 0 64 64" fill="none" className={svgBase}>
      <circle cx="24" cy="22" r="8" className={stroke} strokeWidth="2" />
      <path d="M10 52c2-8 8-12 14-12s12 4 14 12" className={stroke} strokeWidth="2" strokeLinecap="round" />
      <circle cx="46" cy="26" r="6" className={stroke} strokeWidth="2" />
      <path d="M40 52c1-6 5-9 10-9s9 3 10 9" className={stroke} strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
  services: (
    <svg viewBox="0 0 64 64" fill="none" className={svgBase}>
      <circle cx="20" cy="20" r="8" className={stroke} strokeWidth="2" />
      <circle cx="20" cy="44" r="8" className={stroke} strokeWidth="2" />
      <path d="M26 26l28 22M26 38l28-22" className={stroke} strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
  employees: (
    <svg viewBox="0 0 64 64" fill="none" className={svgBase}>
      <circle cx="32" cy="20" r="8" className={stroke} strokeWidth="2" />
      <path d="M14 54c2-10 9-16 18-16s16 6 18 16" className={stroke} strokeWidth="2" strokeLinecap="round" />
      <path d="M40 28l4 4 8-8" className={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  branches: (
    <svg viewBox="0 0 64 64" fill="none" className={svgBase}>
      <path d="M10 28l22-16 22 16v26H10z" className={stroke} strokeWidth="2" strokeLinejoin="round" />
      <rect x="26" y="36" width="12" height="18" className={stroke} strokeWidth="2" />
      <path d="M10 28h44" className={stroke} strokeWidth="2" />
    </svg>
  ),
  reports: (
    <svg viewBox="0 0 64 64" fill="none" className={svgBase}>
      <path d="M10 54h44" className={stroke} strokeWidth="2" strokeLinecap="round" />
      <rect x="14" y="34" width="8" height="20" className={stroke} strokeWidth="2" />
      <rect x="28" y="22" width="8" height="32" className={stroke} strokeWidth="2" />
      <rect x="42" y="14" width="8" height="40" className={stroke} strokeWidth="2" />
    </svg>
  ),
  invoices: (
    <svg viewBox="0 0 64 64" fill="none" className={svgBase}>
      <path d="M14 8h28l8 8v40l-6-4-6 4-6-4-6 4-6-4-6 4z" className={stroke} strokeWidth="2" strokeLinejoin="round" />
      <path d="M22 24h20M22 34h20M22 44h12" className={stroke} strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
  memberships: (
    <svg viewBox="0 0 64 64" fill="none" className={svgBase}>
      <path d="M10 22l8 18 14-22 14 22 8-18-4 28H14z" className={stroke} strokeWidth="2" strokeLinejoin="round" />
      <circle cx="32" cy="46" r="3" fill="currentColor" />
    </svg>
  ),
  coupons: (
    <svg viewBox="0 0 64 64" fill="none" className={svgBase}>
      <path d="M6 20a4 4 0 014-4h44a4 4 0 014 4v8a4 4 0 000 8v8a4 4 0 01-4 4H10a4 4 0 01-4-4v-8a4 4 0 000-8z" className={stroke} strokeWidth="2" />
      <path d="M28 22v20" className={stroke} strokeWidth="2" strokeDasharray="3 3" />
    </svg>
  ),
  loyalty: (
    <svg viewBox="0 0 64 64" fill="none" className={svgBase}>
      <path d="M32 8l6 14 16 2-12 10 4 16-14-8-14 8 4-16L10 24l16-2z" className={stroke} strokeWidth="2" strokeLinejoin="round" />
    </svg>
  ),
  settings: (
    <svg viewBox="0 0 64 64" fill="none" className={svgBase}>
      <circle cx="32" cy="32" r="8" className={stroke} strokeWidth="2" />
      <path d="M32 4v8M32 52v8M4 32h8M52 32h8M12 12l6 6M46 46l6 6M52 12l-6 6M18 46l-6 6" className={stroke} strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
  setup: (
    <svg viewBox="0 0 64 64" fill="none" className={svgBase}>
      <path d="M12 20h40M12 32h40M12 44h40" className={stroke} strokeWidth="2" strokeLinecap="round" />
      <circle cx="20" cy="20" r="4" fill="currentColor" />
      <circle cx="40" cy="32" r="4" fill="currentColor" />
      <circle cx="28" cy="44" r="4" fill="currentColor" />
    </svg>
  ),
  auth: (
    <svg viewBox="0 0 64 64" fill="none" className={svgBase}>
      <rect x="14" y="28" width="36" height="28" rx="4" className={stroke} strokeWidth="2" />
      <path d="M22 28v-8a10 10 0 0120 0v8" className={stroke} strokeWidth="2" />
      <circle cx="32" cy="42" r="3" fill="currentColor" />
    </svg>
  ),
};

const modules: Module[] = [
  {
    id: "setup",
    title: "التهيئة الأولية",
    category: "system",
    link: "/setup",
    description:
      "معالج إعداد لمرة واحدة يظهر عند تشغيل البرنامج لأول مرة. يتيح اختيار قاعدة البيانات (Lovable Cloud أو رابط خارجي) وإنشاء حساب المدير الافتراضي مع إمكانية نسخ بيانات الدخول مباشرة، ثم تسجيل الدخول تلقائياً إلى لوحة التحكم.",
    fields: ["اختيار قاعدة البيانات", "إنشاء أول مدير", "نسخ بيانات الدخول"],
    icon: Icons.setup,
  },
  {
    id: "auth",
    title: "الحسابات والصلاحيات",
    category: "system",
    link: "/auth",
    table: "profiles, user_roles",
    description:
      "نظام مصادقة آمن عبر البريد وكلمة المرور أو حساب Google. الأدوار تُخزَّن في جدول مستقل (super_admin, admin, reception, staff) ويتم التحقق منها عبر دوال آمنة لمنع تصعيد الصلاحيات.",
    fields: ["البريد الإلكتروني", "كلمة المرور", "الدور", "الاسم المعروض", "الصورة"],
    icon: Icons.auth,
  },
  {
    id: "dashboard",
    title: "لوحة التحكم",
    category: "operations",
    link: "/",
    description:
      "نظرة شاملة على أداء اليوم: عدد الحجوزات، الإيرادات، الموظفون النشطون، والعملاء الجدد. تعرض مؤشرات سريعة ورسوماً بيانية لمتابعة الحركة لحظياً.",
    fields: ["إيرادات اليوم", "عدد الحجوزات", "نسب الإشغال", "أعلى الخدمات"],
    icon: Icons.dashboard,
  },
  {
    id: "calendar",
    title: "التقويم",
    category: "operations",
    link: "/calendar",
    description:
      "عرض زمني للحجوزات حسب اليوم والأسبوع لكل موظف، مع إمكانية السحب والإفلات لإعادة الجدولة، وتحديد الفترات المتاحة وحجبها بسهولة.",
    fields: ["وقت البدء", "وقت الانتهاء", "الموظف", "الفرع"],
    icon: Icons.calendar,
  },
  {
    id: "bookings",
    title: "الحجوزات",
    category: "operations",
    link: "/bookings",
    table: "bookings",
    description:
      "إدارة كاملة لحجوزات العملاء: إنشاء، تأكيد، بدء، إكمال، إلغاء، أو تسجيل عدم حضور. تدعم القائمة قائمة سياقية بالنقر بالزر الأيمن وتصدير CSV.",
    fields: ["العميل", "الموظف", "الخدمة", "وقت البدء", "السعر", "الحالة"],
    icon: Icons.bookings,
  },
  {
    id: "queue",
    title: "قائمة الانتظار",
    category: "operations",
    link: "/queue",
    table: "queue_items",
    description:
      "قائمة انتظار حية تعرض العملاء داخل الفرع وترتيبهم وحالتهم (ينتظر، قيد التنفيذ، اكتمل). تدعم التحديث الفوري لتنظيم تدفق الخدمة.",
    fields: ["العميل", "الموظف", "الترتيب", "الحالة"],
    icon: Icons.queue,
  },
  {
    id: "customers",
    title: "العملاء",
    category: "operations",
    link: "/customers",
    table: "customers",
    description:
      "قاعدة بيانات شاملة للعملاء تشمل التاريخ، عدد الزيارات، إجمالي الإنفاق، ونقاط الولاء. تتوفر أدوات الاتصال، واتساب، تعديل النقاط، التصدير CSV، وقائمة سياقية كاملة.",
    fields: ["الاسم", "الهاتف", "البريد", "الجنس", "الزيارات", "الإنفاق", "النقاط"],
    icon: Icons.customers,
  },
  {
    id: "services",
    title: "الخدمات",
    category: "management",
    link: "/services",
    table: "services",
    description:
      "كتالوج خدمات الصالون مع الأسعار والمدد الزمنية والفئات (شعر، لحية، علاج، تلوين...). يدعم التخصيص حسب الفرع والجنس.",
    fields: ["الاسم (عربي/إنجليزي)", "الفئة", "المدة", "السعر", "الفرع", "الجنس"],
    icon: Icons.services,
  },
  {
    id: "employees",
    title: "الموظفون",
    category: "management",
    link: "/employees",
    table: "employees",
    description:
      "إدارة فريق العمل: الحلاقون والمصممون، نسبة العمولة، التقييمات، والفرع التابع. أساس لتوزيع الحجوزات وحساب الرواتب.",
    fields: ["الاسم", "الهاتف", "الدور", "نسبة العمولة", "التقييم", "الفرع"],
    icon: Icons.employees,
  },
  {
    id: "branches",
    title: "الفروع",
    category: "management",
    link: "/branches",
    table: "branches",
    description:
      "بنية متعددة الفروع جاهزة لتوسعة الأعمال. يضم كل فرع عنوانه، ساعات العمل، عدد الكراسي، وأرقام التواصل، مع دعم التبديل بين الفروع.",
    fields: ["الاسم", "العنوان", "الهاتف", "عدد الكراسي", "ساعات العمل"],
    icon: Icons.branches,
  },
  {
    id: "reports",
    title: "التقارير",
    category: "management",
    link: "/reports",
    description:
      "تحليلات بصرية شاملة: اتجاه الإيرادات لآخر 30 يوم، ساعات الذروة، وترتيب أفضل الخدمات أداءً، مع رسوم بيانية تفاعلية.",
    fields: ["الإيرادات اليومية", "ساعات الذروة", "أعلى الخدمات", "أداء الموظفين"],
    icon: Icons.reports,
  },
  {
    id: "invoices",
    title: "الفواتير",
    category: "finance",
    link: "/invoices",
    table: "invoices, invoice_items, payments",
    description:
      "نظام فوترة احترافي يربط الحجوزات بالمدفوعات، يدعم الضرائب والخصومات وطرق الدفع المتعددة، مع بنود تفصيلية لكل خدمة أو منتج.",
    fields: ["رقم الفاتورة", "العميل", "الإجمالي", "الضريبة", "الخصم", "حالة الدفع"],
    icon: Icons.invoices,
  },
  {
    id: "memberships",
    title: "الاشتراكات",
    category: "finance",
    link: "/memberships",
    table: "membership_plans, customer_memberships",
    description:
      "خطط اشتراك شهرية أو سنوية تمنح العملاء امتيازات محددة (خصومات، خدمات مجانية، أولوية الحجز). متابعة كاملة لتواريخ الاستحقاق.",
    fields: ["اسم الخطة", "السعر", "المدة", "الامتيازات", "تاريخ البدء/الانتهاء"],
    icon: Icons.memberships,
  },
  {
    id: "coupons",
    title: "الكوبونات",
    category: "finance",
    link: "/coupons",
    table: "coupons",
    description:
      "إصدار وإدارة كوبونات الخصم (نسبة أو مبلغ ثابت)، مع تحديد الحد الأدنى للطلب، تاريخ الانتهاء، وعدد مرات الاستخدام المسموح بها.",
    fields: ["الكود", "نوع الخصم", "القيمة", "الحد الأدنى", "تاريخ الانتهاء", "حد الاستخدام"],
    icon: Icons.coupons,
  },
  {
    id: "loyalty",
    title: "برنامج الولاء",
    category: "finance",
    link: "/loyalty",
    table: "points_transactions",
    description:
      "نظام نقاط مكافآت يكسب العميل نقاطاً عند كل زيارة أو شراء، قابلة للاستبدال بخدمات أو خصومات. سجل كامل لكل عملية كسب واستبدال.",
    fields: ["العميل", "النقاط", "النوع (كسب/استبدال)", "المرجع", "التاريخ"],
    icon: Icons.loyalty,
  },
  {
    id: "settings",
    title: "الإعدادات",
    category: "system",
    link: "/settings",
    description:
      "ضبط الإعدادات العامة للنظام: اللغة (عربي/إنجليزي)، السمة (داكن/فاتح)، إعدادات الفرع الافتراضي، ومعلومات النشاط التجاري.",
    fields: ["اللغة", "السمة", "الفرع الافتراضي", "بيانات النشاط"],
    icon: Icons.settings,
  },
];

function DocsPage() {
  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return modules;
    return modules.filter(
      (m) =>
        m.title.toLowerCase().includes(s) ||
        m.description.toLowerCase().includes(s) ||
        (m.table?.toLowerCase().includes(s) ?? false),
    );
  }, [q]);

  return (
    <div dir="rtl" className="min-h-screen">
      {/* Hero */}
      <div className="relative overflow-hidden border-b border-border bg-gradient-to-bl from-primary/10 via-background to-background">
        <div className="absolute inset-0 opacity-30 [background-image:radial-gradient(circle_at_1px_1px,hsl(var(--primary))_1px,transparent_0)] [background-size:24px_24px]" />
        <div className="relative px-6 md:px-12 py-12 max-w-6xl mx-auto">
          <div className="text-[11px] tracking-[0.25em] text-primary uppercase font-semibold">Vanguard · Documentation</div>
          <h1 className="mt-3 font-display text-4xl md:text-5xl text-foreground">توثيق النظام الشامل</h1>
          <p className="mt-4 text-muted-foreground max-w-2xl leading-relaxed">
            دليل تفاعلي على شكل خط زمني تدريجي يستعرض كل وحدة وجدول داخل نظام إدارة الصالون، مع شرح كامل بالعربية، رابط مباشر للوحدة، ورمز توضيحي خاص بكل قسم.
          </p>
          <div className="mt-6 max-w-md relative">
            <Search className="absolute end-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="ابحث في الوحدات والجداول…"
              className="pe-10"
            />
          </div>
          <div className="mt-6 flex flex-wrap gap-2 text-xs">
            {(Object.keys(C) as (keyof typeof C)[]).map((k) => (
              <span key={k} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-border bg-card">
                <span className={`size-2 rounded-full ${C[k].dot}`} />
                {C[k].label}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="px-6 md:px-12 py-16 max-w-6xl mx-auto">
        <div className="relative">
          {/* vertical line */}
          <div className="absolute end-6 md:end-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-border to-transparent" />

          <div className="space-y-12">
            {filtered.map((m, i) => {
              const color = C[m.category];
              const onRight = i % 2 === 0;
              return (
                <div key={m.id} className="relative">
                  {/* dot */}
                  <div className="absolute end-6 md:end-1/2 translate-x-1/2 -top-1 z-10">
                    <div className={`size-4 rounded-full ${color.dot} ring-4 ring-background`} />
                    <div className={`absolute inset-0 size-4 rounded-full ${color.dot} animate-ping opacity-40`} />
                  </div>

                  {/* step number */}
                  <div className={`hidden md:block absolute top-0 ${onRight ? "start-1/2 ms-10" : "end-1/2 me-10 text-end"}`}>
                    <div className="font-display text-5xl text-muted-foreground/20 leading-none">
                      {String(i + 1).padStart(2, "0")}
                    </div>
                  </div>

                  {/* card */}
                  <div
                    className={`pe-14 md:pe-0 ${
                      onRight ? "md:ps-12 md:pe-[calc(50%+2rem)]" : "md:pe-12 md:ps-[calc(50%+2rem)]"
                    }`}
                  >
                    <Card
                      className={`p-6 ring-1 ${color.ring} ${color.glow} hover:-translate-y-0.5 transition-all duration-300 bg-card/80 backdrop-blur`}
                    >
                      <div className="flex items-start gap-4">
                        <div className={`shrink-0 size-16 rounded-xl border border-border grid place-items-center text-foreground bg-gradient-to-br from-background to-muted/40 ${color.glow}`}>
                          {m.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="outline" className="text-[10px] tracking-wider uppercase">
                              {color.label}
                            </Badge>
                            {m.table && (
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-muted text-muted-foreground">
                                {m.table}
                              </span>
                            )}
                          </div>
                          <h3 className="mt-2 font-display text-xl text-foreground">{m.title}</h3>
                          <p className="mt-2 text-sm leading-7 text-muted-foreground">{m.description}</p>

                          {m.fields.length > 0 && (
                            <div className="mt-4 flex flex-wrap gap-1.5">
                              {m.fields.map((f) => (
                                <span
                                  key={f}
                                  className="text-[11px] px-2 py-1 rounded-md bg-muted/60 text-foreground/80 border border-border/50"
                                >
                                  {f}
                                </span>
                              ))}
                            </div>
                          )}

                          {m.link && (
                            <Link
                              to={m.link}
                              className="mt-4 inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
                            >
                              فتح الوحدة
                              <ArrowLeft className="size-3.5" />
                              <ExternalLink className="size-3" />
                            </Link>
                          )}
                        </div>
                      </div>
                    </Card>
                  </div>
                </div>
              );
            })}
          </div>

          {filtered.length === 0 && (
            <div className="text-center text-muted-foreground py-12">لا توجد نتائج مطابقة</div>
          )}
        </div>

        <div className="mt-16 text-center text-xs text-muted-foreground">
          نظام Vanguard Salon OS — توثيق محدّث تلقائياً مع كل وحدة جديدة.
        </div>
      </div>
    </div>
  );
}