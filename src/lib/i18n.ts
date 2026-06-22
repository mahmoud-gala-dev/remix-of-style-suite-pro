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
  waitlist: { en: "Waitlist", ar: "قائمة الانتظار للحجوزات" },
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
  inventory: { en: "Inventory", ar: "المخزون" },
  commissions: { en: "Commissions", ar: "العمولات" },
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
  newTenant: { en: "New tenant", ar: "مستأجر جديد" },
  tenantName: { en: "Tenant name", ar: "اسم المستأجر" },
  noTenants: { en: "No tenants yet", ar: "لا يوجد مستأجرون" },
  deleteTenantConfirm: { en: "Delete this tenant?", ar: "حذف هذا المستأجر؟" },
  // settings labels
  data: { en: "Data", ar: "البيانات" },
  footer: { en: "Footer", ar: "التذييل" },
  footerItems: { en: "Footer items", ar: "عناصر التذييل" },
  navigationLayout: { en: "Navigation Layout", ar: "تخطيط التنقل" },
  visibleModules: { en: "Visible modules", ar: "الوحدات الظاهرة" },
  configuringRole: { en: "Configuring role", ar: "ضبط الدور" },
  shellMode: { en: "Shell mode", ar: "وضع الواجهة" },
  sideMenu: { en: "Side menu", ar: "قائمة جانبية" },
  topToolbar: { en: "Top toolbar", ar: "شريط علوي" },
  visible: { en: "Visible", ar: "ظاهر" },
  hidden: { en: "Hidden", ar: "مخفي" },
  adminOnlyHidden: { en: "Admin-only modules are always hidden for the User role.", ar: "الوحدات الإدارية تبقى مخفية لدور المستخدم." },
  claimSuperAdmin: { en: "Claim super-admin", ar: "المطالبة بسوبر-أدمن" },
  loadDemoData: { en: "Load demo data", ar: "تحميل بيانات تجريبية" },
  resetLocal: { en: "Reset local", ar: "إعادة المحلي" },
  resetLocalConfirm: { en: "Reset local store?", ar: "إعادة المخزن المحلي؟" },
  resetLocalDescription: { en: "This restores local demo state on this device only.", ar: "يستعيد البيانات التجريبية المحلية على هذا الجهاز فقط." },
  reset: { en: "Reset", ar: "إعادة" },
  dataIntro: { en: "First-time setup: claim super-admin, then load demo data.", ar: "إعداد أولي: طالب بالسوبر-أدمن ثم حمّل البيانات التجريبية." },
  // billing
  billing: { en: "Billing", ar: "الفوترة" },
  selectTenantBilling: { en: "Select a tenant to view billing.", ar: "اختر مستأجراً لعرض الفوترة." },
  loading: { en: "Loading…", ar: "جارٍ التحميل…" },
  noSubscription: { en: "No subscription", ar: "لا يوجد اشتراك" },
  bookingsThisPeriod: { en: "Bookings this period", ar: "حجوزات هذه الفترة" },
  planLimitReached: { en: "Plan limit reached. Upgrade to keep creating bookings.", ar: "تم بلوغ حد الباقة. قم بالترقية لمواصلة إنشاء الحجوزات." },
  remaining: { en: "remaining", ar: "متبقٍ" },
  // notifications
  notifications: { en: "Notifications", ar: "الإشعارات" },
  provider: { en: "Provider", ar: "المزوّد" },
  providerOff: { en: "Off (no emails sent)", ar: "إيقاف (بدون إرسال بريد)" },
  providerLovable: { en: "Lovable Emails (built-in, requires scaffolding)", ar: "بريد Lovable (مدمج، يتطلب إعداد)" },
  providerResend: { en: "Resend (requires connector)", ar: "Resend (يتطلب رابطاً)" },
  providersOffByDefault: { en: "Both providers are OFF by default. Switch on to enable customer email notifications.", ar: "كلا المزوّدين مغلق افتراضياً. فعّل أحدهما لتشغيل إشعارات العملاء." },
  fromEmail: { en: "From email", ar: "البريد المُرسِل" },
  notifyOnBookingCreated: { en: "Send confirmation when a booking is created", ar: "إرسال تأكيد عند إنشاء حجز" },
  notificationsUpdated: { en: "Notifications updated", ar: "تم تحديث الإشعارات" },
  saving: { en: "Saving…", ar: "جارٍ الحفظ…" },
  // data extras
  exportTenantData: { en: "Export tenant data", ar: "تصدير بيانات المستأجر" },
  exportTenantDataTooltip: { en: "Download a CSV bundle of all tenant data (GDPR)", ar: "تنزيل حزمة CSV لكل بيانات المستأجر (GDPR)" },
  tenantDataExported: { en: "Tenant data exported", ar: "تم تصدير بيانات المستأجر" },
  noTenantSelected: { en: "No tenant selected", ar: "لم يتم اختيار مستأجر" },
  localStoreReset: { en: "Local store reset", ar: "تمت إعادة المخزن المحلي" },
  superAdminGranted: { en: "Super-admin granted.", ar: "تم منح السوبر-أدمن." },
  alreadySuperAdmin: { en: "You are already super-admin.", ar: "أنت سوبر-أدمن بالفعل." },
  alreadyClaimedByOther: { en: "Already claimed by another user.", ar: "تمت المطالبة بها من مستخدم آخر." },
  demoDataLoaded: { en: "Demo data loaded.", ar: "تم تحميل البيانات التجريبية." },
  branchesExistSkipped: { en: "Branches already exist — skipped.", ar: "الفروع موجودة بالفعل — تم التخطي." },
  // general extras
  saved: { en: "Saved", ar: "تم الحفظ" },
  otpHelp: { en: "When enabled, guests must verify their phone with a 6-digit code before a booking is accepted.", ar: "عند التفعيل، يجب على الزوار التحقق من هاتفهم بكود من 6 أرقام قبل قبول الحجز." },
  valuesSaveOnBlur: { en: "Values save on blur.", ar: "تُحفظ القيم عند مغادرة الحقل." },
  // network
  offline: { en: "You are offline. Changes will not sync until reconnected.", ar: "أنت غير متصل بالإنترنت. لن تتم المزامنة حتى تعود." },
  // 2FA
  twoFactorAuth: { en: "Two-Factor Authentication", ar: "المصادقة الثنائية" },
  twoFADescription: { en: "Add a one-time code from your authenticator app on top of your password.", ar: "أضف رمزًا لمرة واحدة من تطبيق المصادقة فوق كلمة المرور." },
  twoFAEnable: { en: "Enable 2FA", ar: "تفعيل المصادقة الثنائية" },
  twoFAEnabled: { en: "2FA Enabled", ar: "تم تفعيل المصادقة الثنائية" },
  twoFADisabled: { en: "2FA Disabled", ar: "تم تعطيل المصادقة الثنائية" },
  twoFAScanQR: { en: "Scan this QR with Google Authenticator / 1Password / Authy, then enter the 6-digit code.", ar: "امسح هذا الرمز بتطبيق المصادقة، ثم أدخل الكود المكون من 6 أرقام." },
  twoFAEnterCode: { en: "Enter 6-digit code", ar: "أدخل الكود (6 أرقام)" },
  twoFACurrentCode: { en: "Current 6-digit code", ar: "الكود الحالي (6 أرقام)" },
  twoFAVerify: { en: "Verify", ar: "تحقق" },
  twoFAInvalidCode: { en: "Invalid code. Try again.", ar: "كود غير صالح. حاول مرة أخرى." },
  disable: { en: "Disable", ar: "تعطيل" },
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

// P9 — i18n for server / Supabase error codes.
// Map known error strings to translated, user-friendly messages.
const errDict: Record<string, { en: string; ar: string }> = {
  rate_limited: { en: "Too many attempts. Try again later.", ar: "محاولات كثيرة. حاول لاحقًا." },
  invalid_credentials: { en: "Invalid email or password.", ar: "بريد أو كلمة مرور غير صحيحة." },
  "Invalid login credentials": { en: "Invalid email or password.", ar: "بريد أو كلمة مرور غير صحيحة." },
  email_not_confirmed: { en: "Please confirm your email first.", ar: "يرجى تأكيد بريدك أولًا." },
  user_already_exists: { en: "An account with this email already exists.", ar: "يوجد حساب بهذا البريد بالفعل." },
  weak_password: { en: "Password is too weak.", ar: "كلمة المرور ضعيفة." },
  invalid_code: { en: "Invalid code. Try again.", ar: "كود غير صالح. حاول مرة أخرى." },
  not_enrolled: { en: "Two-factor authentication is not enrolled.", ar: "المصادقة الثنائية غير مُفعّلة." },
  network_error: { en: "Network error. Check your connection.", ar: "خطأ في الشبكة. تحقق من الاتصال." },
  unauthorized: { en: "You are not authorized to perform this action.", ar: "ليست لديك صلاحية لتنفيذ هذا الإجراء." },
  not_found: { en: "Item not found.", ar: "العنصر غير موجود." },
};

export function translateError(raw: unknown, lang: Lang = "en"): string {
  const msg = raw instanceof Error ? raw.message : typeof raw === "string" ? raw : "";
  if (!msg) return errDict.network_error[lang];
  // exact key match
  if (errDict[msg]) return errDict[msg][lang];
  // scan known substrings
  for (const key of Object.keys(errDict)) {
    if (msg.toLowerCase().includes(key.toLowerCase())) return errDict[key][lang];
  }
  return msg;
}

export function useErrT() {
  const lang = useI18n((s) => s.lang);
  return (raw: unknown) => translateError(raw, lang);
}
