import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type Lang = "en" | "ar";

type Dict = Record<string, { en: string; ar: string }>;

export const dict = {
  // nav
  dashboard: { en: "Dashboard", ar: "لوحة التحكم" },
  calendar: { en: "Calendar", ar: "التقويم" },
  bookings: { en: "Bookings", ar: "الحجوزات" },
  queue: { en: "Queue", ar: "قائمة الانتظار" },
  customers: { en: "Customers", ar: "العملاء" },
  services: { en: "Services", ar: "الخدمات" },
  employees: { en: "Employees", ar: "الموظفون" },
  branches: { en: "Branches", ar: "الفروع" },
  reports: { en: "Reports", ar: "التقارير" },
  settings: { en: "Settings", ar: "الإعدادات" },
  management: { en: "Management", ar: "الإدارة" },
  operations: { en: "Operations", ar: "العمليات" },
  finance: { en: "Finance", ar: "المالية" },
  memberships: { en: "Memberships", ar: "الاشتراكات" },
  coupons: { en: "Coupons", ar: "الكوبونات" },
  invoices: { en: "Invoices", ar: "الفواتير" },
  loyalty: { en: "Loyalty", ar: "الولاء" },
  docs: { en: "Documentation", ar: "التوثيق" },
  // generic
  search: { en: "Search", ar: "بحث" },
  add: { en: "Add", ar: "إضافة" },
  edit: { en: "Edit", ar: "تعديل" },
  delete: { en: "Delete", ar: "حذف" },
  cancel: { en: "Cancel", ar: "إلغاء" },
  save: { en: "Save", ar: "حفظ" },
  status: { en: "Status", ar: "الحالة" },
  active: { en: "Active", ar: "نشط" },
  inactive: { en: "Inactive", ar: "غير نشط" },
  branch: { en: "Branch", ar: "الفرع" },
  admin: { en: "Admin", ar: "مدير" },
  // dashboard
  todaysRevenue: { en: "Today's Revenue", ar: "إيرادات اليوم" },
  bookingsToday: { en: "Bookings Today", ar: "حجوزات اليوم" },
  inQueue: { en: "In Queue", ar: "في الانتظار" },
  avgWait: { en: "Avg. Wait Time", ar: "متوسط الانتظار" },
  todaysSchedule: { en: "Today's Schedule", ar: "جدول اليوم" },
  liveQueue: { en: "Live Queue", ar: "قائمة الانتظار المباشرة" },
  topPerforming: { en: "Top Performing Today", ar: "الأفضل أداءً اليوم" },
  callNext: { en: "Call Next", ar: "نداء التالي" },
  pending: { en: "Pending", ar: "قيد الانتظار" },
  waiting: { en: "Waiting", ar: "ينتظر" },
  inProgress: { en: "In Progress", ar: "قيد التنفيذ" },
  completed: { en: "Completed", ar: "مكتمل" },
  noShow: { en: "No Show", ar: "لم يحضر" },
  confirmed: { en: "Confirmed", ar: "مؤكد" },
  arrived: { en: "Arrived", ar: "وصل" },
  // customers
  customer: { en: "Customer", ar: "العميل" },
  phone: { en: "Phone", ar: "الهاتف" },
  email: { en: "Email", ar: "البريد" },
  visits: { en: "Visits", ar: "الزيارات" },
  spend: { en: "Spend", ar: "الإنفاق" },
  points: { en: "Points", ar: "النقاط" },
  lastVisit: { en: "Last visit", ar: "آخر زيارة" },
  // services
  duration: { en: "Duration", ar: "المدة" },
  price: { en: "Price", ar: "السعر" },
  category: { en: "Category", ar: "الفئة" },
  gender: { en: "Gender", ar: "النوع" },
  male: { en: "Male", ar: "ذكر" },
  female: { en: "Female", ar: "أنثى" },
  both: { en: "Both", ar: "الجميع" },
  // employees
  role: { en: "Role", ar: "الدور" },
  commission: { en: "Commission", ar: "العمولة" },
  // bookings
  newBooking: { en: "New Booking", ar: "حجز جديد" },
  date: { en: "Date", ar: "التاريخ" },
  time: { en: "Time", ar: "الوقت" },
  stylist: { en: "Stylist", ar: "المصفف" },
  // branch
  newBranch: { en: "New Branch", ar: "فرع جديد" },
  address: { en: "Address", ar: "العنوان" },
  chairs: { en: "Chairs", ar: "الكراسي" },
  workingHours: { en: "Working hours", ar: "ساعات العمل" },
  // settings
  language: { en: "Language", ar: "اللغة" },
  theme: { en: "Theme", ar: "السمة" },
  light: { en: "Light", ar: "فاتح" },
  dark: { en: "Dark", ar: "داكن" },
  // misc
  high: { en: "High traffic", ar: "ازدحام مرتفع" },
  noData: { en: "No data yet", ar: "لا توجد بيانات" },
  // webhooks
  webhooks: { en: "Webhooks", ar: "ويب هوكس" },
  webhooksSubtitle: { en: "Send events to Zapier, n8n, or any HTTPS URL", ar: "أرسل الأحداث إلى Zapier أو n8n أو أي رابط HTTPS" },
  event: { en: "Event", ar: "الحدث" },
  url: { en: "URL", ar: "الرابط" },
  enabled: { en: "Enabled", ar: "مفعّل" },
  disabled: { en: "Disabled", ar: "معطّل" },
  noWebhooks: { en: "No webhooks configured", ar: "لا توجد ويب هوكس مهيّأة" },
  webhookAdded: { en: "Webhook added", ar: "تمت إضافة الويب هوك" },
  removed: { en: "Removed", ar: "تم الحذف" },
  failed: { en: "Failed", ar: "فشل" },
  // tenants
  tenants: { en: "Tenants", ar: "المستأجرون" },
  tenant: { en: "Tenant", ar: "المستأجر" },
  allTenants: { en: "All tenants", ar: "كل المستأجرين" },
  switchTenant: { en: "Switch tenant", ar: "تبديل المستأجر" },
  // settings extras
  generalSettings: { en: "General settings", ar: "الإعدادات العامة" },
  defaultTaxPct: { en: "Default tax %", ar: "ضريبة افتراضية %" },
  refreshInterval: { en: "Refresh interval (s)", ar: "فاصل التحديث (ث)" },
  bookingOtpRequired: { en: "Require OTP for public booking", ar: "اشتراط OTP للحجز العام" },
  deliveries: { en: "Deliveries", ar: "التسليمات" },
  attempts: { en: "Attempts", ar: "المحاولات" },
  retryNow: { en: "Retry now", ar: "إعادة المحاولة الآن" },
  retrySuccess: { en: "Retry triggered", ar: "تم تشغيل إعادة المحاولة" },
  noDeliveries: { en: "No deliveries yet", ar: "لا توجد تسليمات" },
} satisfies Dict;

export type DictKey = keyof typeof dict;

type I18nState = {
  lang: Lang;
  setLang: (l: Lang) => void;
};

export const useI18n = create<I18nState>()(
  persist(
    (set) => ({
      lang: "en" as Lang,
      setLang: (lang) => set({ lang }),
    }),
    {
      name: "vanguard.lang",
      storage: createJSONStorage(() =>
        typeof window !== "undefined" ? localStorage : (undefined as never),
      ),
      skipHydration: typeof window === "undefined",
    },
  ),
);

export function useT() {
  const lang = useI18n((s) => s.lang);
  return (key: DictKey, fallback?: string) => dict[key]?.[lang] ?? fallback ?? key;
}

export function useDir(): "ltr" | "rtl" {
  return useI18n((s) => s.lang) === "ar" ? "rtl" : "ltr";
}
