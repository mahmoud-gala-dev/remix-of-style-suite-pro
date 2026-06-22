import type { ReactNode } from "react";
import { Icons } from "./-icons";

export type DocCategory = "operations" | "management" | "finance" | "system";

export type DocModule = {
  id: string;
  title: string;
  category: DocCategory;
  link?: string;
  table?: string;
  description: string;
  fields: string[];
  icon: ReactNode;
};

export const CATEGORIES: Record<DocCategory, { label: string; ring: string; dot: string; glow: string }> = {
  operations: { label: "العمليات اليومية", ring: "ring-sky-500/40", dot: "bg-sky-500", glow: "shadow-[0_0_30px_-8px] shadow-sky-500/40" },
  management: { label: "الإدارة", ring: "ring-violet-500/40", dot: "bg-violet-500", glow: "shadow-[0_0_30px_-8px] shadow-violet-500/40" },
  finance: { label: "المالية", ring: "ring-amber-500/40", dot: "bg-amber-500", glow: "shadow-[0_0_30px_-8px] shadow-amber-500/40" },
  system: { label: "النظام", ring: "ring-rose-500/40", dot: "bg-rose-500", glow: "shadow-[0_0_30px_-8px] shadow-rose-500/40" },
};

export const MODULES: DocModule[] = [
  { id: "setup", title: "التهيئة الأولية", category: "system", link: "/setup",
    description: "معالج إعداد لمرة واحدة يظهر عند تشغيل البرنامج لأول مرة. يتيح اختيار قاعدة البيانات (Lovable Cloud أو رابط خارجي) وإنشاء حساب المدير الافتراضي مع إمكانية نسخ بيانات الدخول مباشرة، ثم تسجيل الدخول تلقائياً إلى لوحة التحكم.",
    fields: ["اختيار قاعدة البيانات", "إنشاء أول مدير", "نسخ بيانات الدخول"], icon: Icons.setup },
  { id: "auth", title: "الحسابات والصلاحيات", category: "system", link: "/auth", table: "profiles, user_roles",
    description: "نظام مصادقة آمن عبر البريد وكلمة المرور أو حساب Google. الأدوار تُخزَّن في جدول مستقل (super_admin, admin, reception, staff) ويتم التحقق منها عبر دوال آمنة لمنع تصعيد الصلاحيات.",
    fields: ["البريد الإلكتروني", "كلمة المرور", "الدور", "الاسم المعروض", "الصورة"], icon: Icons.auth },
  { id: "dashboard", title: "لوحة التحكم", category: "operations", link: "/",
    description: "نظرة شاملة على أداء اليوم: عدد الحجوزات، الإيرادات، الموظفون النشطون، والعملاء الجدد. تعرض مؤشرات سريعة ورسوماً بيانية لمتابعة الحركة لحظياً.",
    fields: ["إيرادات اليوم", "عدد الحجوزات", "نسب الإشغال", "أعلى الخدمات"], icon: Icons.dashboard },
  { id: "calendar", title: "التقويم", category: "operations", link: "/calendar",
    description: "عرض زمني للحجوزات حسب اليوم والأسبوع لكل موظف، مع إمكانية السحب والإفلات لإعادة الجدولة، وتحديد الفترات المتاحة وحجبها بسهولة.",
    fields: ["وقت البدء", "وقت الانتهاء", "الموظف", "الفرع"], icon: Icons.calendar },
  { id: "bookings", title: "الحجوزات", category: "operations", link: "/bookings", table: "bookings",
    description: "إدارة كاملة لحجوزات العملاء: إنشاء، تأكيد، بدء، إكمال، إلغاء، أو تسجيل عدم حضور. تدعم القائمة قائمة سياقية بالنقر بالزر الأيمن وتصدير CSV.",
    fields: ["العميل", "الموظف", "الخدمة", "وقت البدء", "السعر", "الحالة"], icon: Icons.bookings },
  { id: "queue", title: "قائمة الانتظار", category: "operations", link: "/queue", table: "queue_items",
    description: "قائمة انتظار حية تعرض العملاء داخل الفرع وترتيبهم وحالتهم (ينتظر، قيد التنفيذ، اكتمل). تدعم التحديث الفوري لتنظيم تدفق الخدمة.",
    fields: ["العميل", "الموظف", "الترتيب", "الحالة"], icon: Icons.queue },
  { id: "customers", title: "العملاء", category: "operations", link: "/customers", table: "customers",
    description: "قاعدة بيانات شاملة للعملاء تشمل التاريخ، عدد الزيارات، إجمالي الإنفاق، ونقاط الولاء. تتوفر أدوات الاتصال، واتساب، تعديل النقاط، التصدير CSV، وقائمة سياقية كاملة.",
    fields: ["الاسم", "الهاتف", "البريد", "الجنس", "الزيارات", "الإنفاق", "النقاط"], icon: Icons.customers },
  { id: "services", title: "الخدمات", category: "management", link: "/services", table: "services",
    description: "كتالوج خدمات الصالون مع الأسعار والمدد الزمنية والفئات (شعر، لحية، علاج، تلوين...). يدعم التخصيص حسب الفرع والجنس.",
    fields: ["الاسم (عربي/إنجليزي)", "الفئة", "المدة", "السعر", "الفرع", "الجنس"], icon: Icons.services },
  { id: "employees", title: "الموظفون", category: "management", link: "/employees", table: "employees",
    description: "إدارة فريق العمل: الحلاقون والمصممون، نسبة العمولة، التقييمات، والفرع التابع. أساس لتوزيع الحجوزات وحساب الرواتب.",
    fields: ["الاسم", "الهاتف", "الدور", "نسبة العمولة", "التقييم", "الفرع"], icon: Icons.employees },
  { id: "branches", title: "الفروع", category: "management", link: "/branches", table: "branches",
    description: "بنية متعددة الفروع جاهزة لتوسعة الأعمال. يضم كل فرع عنوانه، ساعات العمل، عدد الكراسي، وأرقام التواصل، مع دعم التبديل بين الفروع.",
    fields: ["الاسم", "العنوان", "الهاتف", "عدد الكراسي", "ساعات العمل"], icon: Icons.branches },
  { id: "reports", title: "التقارير", category: "management", link: "/reports",
    description: "تحليلات بصرية شاملة: اتجاه الإيرادات لآخر 30 يوم، ساعات الذروة، وترتيب أفضل الخدمات أداءً، مع رسوم بيانية تفاعلية.",
    fields: ["الإيرادات اليومية", "ساعات الذروة", "أعلى الخدمات", "أداء الموظفين"], icon: Icons.reports },
  { id: "invoices", title: "الفواتير", category: "finance", link: "/invoices", table: "invoices, invoice_items, payments",
    description: "نظام فوترة احترافي يربط الحجوزات بالمدفوعات، يدعم الضرائب والخصومات وطرق الدفع المتعددة، مع بنود تفصيلية لكل خدمة أو منتج.",
    fields: ["رقم الفاتورة", "العميل", "الإجمالي", "الضريبة", "الخصم", "حالة الدفع"], icon: Icons.invoices },
  { id: "memberships", title: "الاشتراكات", category: "finance", link: "/memberships", table: "membership_plans, customer_memberships",
    description: "خطط اشتراك شهرية أو سنوية تمنح العملاء امتيازات محددة (خصومات، خدمات مجانية، أولوية الحجز). متابعة كاملة لتواريخ الاستحقاق.",
    fields: ["اسم الخطة", "السعر", "المدة", "الامتيازات", "تاريخ البدء/الانتهاء"], icon: Icons.memberships },
  { id: "coupons", title: "الكوبونات", category: "finance", link: "/coupons", table: "coupons",
    description: "إصدار وإدارة كوبونات الخصم (نسبة أو مبلغ ثابت)، مع تحديد الحد الأدنى للطلب، تاريخ الانتهاء، وعدد مرات الاستخدام المسموح بها.",
    fields: ["الكود", "نوع الخصم", "القيمة", "الحد الأدنى", "تاريخ الانتهاء", "حد الاستخدام"], icon: Icons.coupons },
  { id: "loyalty", title: "برنامج الولاء", category: "finance", link: "/loyalty", table: "points_transactions",
    description: "نظام نقاط مكافآت يكسب العميل نقاطاً عند كل زيارة أو شراء، قابلة للاستبدال بخدمات أو خصومات. سجل كامل لكل عملية كسب واستبدال.",
    fields: ["العميل", "النقاط", "النوع (كسب/استبدال)", "المرجع", "التاريخ"], icon: Icons.loyalty },
  { id: "settings", title: "الإعدادات", category: "system", link: "/settings",
    description: "ضبط الإعدادات العامة للنظام: اللغة (عربي/إنجليزي)، السمة (داكن/فاتح)، إعدادات الفرع الافتراضي، ومعلومات النشاط التجاري.",
    fields: ["اللغة", "السمة", "الفرع الافتراضي", "بيانات النشاط"], icon: Icons.settings },
];