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
  // common actions
  start: { en: "Start", ar: "ابدأ" },
  confirm: { en: "Confirm", ar: "تأكيد" },
  complete: { en: "Complete", ar: "إنهاء" },
  call: { en: "Call", ar: "اتصال" },
  view: { en: "View", ar: "عرض" },
  clear: { en: "Clear", ar: "مسح" },
  prev: { en: "Prev", ar: "السابق" },
  next: { en: "Next", ar: "التالي" },
  back: { en: "Back", ar: "رجوع" },
  forward: { en: "Forward", ar: "تقدّم" },
  refresh: { en: "Refresh", ar: "تحديث" },
  actions: { en: "Actions", ar: "إجراءات" },
  total: { en: "Total", ar: "الإجمالي" },
  totalCount: { en: "{n} total", ar: "الإجمالي: {n}" },
  reason: { en: "Reason", ar: "السبب" },
  description: { en: "Description", ar: "الوصف" },
  name: { en: "Name", ar: "الاسم" },
  qty: { en: "Qty", ar: "الكمية" },
  unit: { en: "Unit", ar: "الوحدة" },
  whatsapp: { en: "WhatsApp", ar: "واتساب" },
  deleted: { en: "Deleted", ar: "تم الحذف" },
  recorded: { en: "Recorded", ar: "تم التسجيل" },
  service: { en: "Service", ar: "الخدمة" },
  employee: { en: "Employee", ar: "الموظف" },
  preferred: { en: "Preferred", ar: "المفضّل" },
  createdAt: { en: "Created", ar: "تاريخ الإنشاء" },
  from: { en: "From", ar: "من" },
  to: { en: "To", ar: "إلى" },
  fromDate: { en: "From date", ar: "من تاريخ" },
  toDate: { en: "To date", ar: "إلى تاريخ" },
  // queue/waitlist
  nextCustomer: { en: "Next customer", ar: "العميل التالي" },
  pleaseComeIn: { en: "Please come in", ar: "يرجى الدخول" },
  callingNext: { en: "Calling next customer", ar: "نداء العميل التالي" },
  startedMinAgo: { en: "Started {n}m ago", ar: "بدأ منذ {n} دقيقة" },
  waitlistEntries: { en: "{n} entries", ar: "{n} سجل" },
  markNotified: { en: "Mark notified", ar: "تم الإشعار" },
  converted: { en: "Converted", ar: "تم التحويل" },
  // loyalty
  loyaltySubtitle: { en: "{tx} transactions · {pts} pts awarded", ar: "{tx} معاملة · {pts} نقطة ممنوحة" },
  awardPoints: { en: "Award points", ar: "منح نقاط" },
  topEarners: { en: "Top earners", ar: "الأعلى نقاطًا" },
  awardRedeemPoints: { en: "Award / redeem points", ar: "منح / استرداد نقاط" },
  pointsDelta: { en: "Points (+/-)", ar: "النقاط (+/-)" },
  addTenPoints: { en: "+10 points", ar: "+10 نقاط" },
  // inventory
  inventorySubtitle: { en: "Products & stock tracking", ar: "المنتجات وتتبع المخزون" },
  newProduct: { en: "New product", ar: "منتج جديد" },
  editProduct: { en: "Edit product", ar: "تعديل منتج" },
  sku: { en: "SKU", ar: "الرمز" },
  cost: { en: "Cost", ar: "التكلفة" },
  stock: { en: "Stock", ar: "المخزون" },
  noProductsYet: { en: "No products yet.", ar: "لا توجد منتجات بعد." },
  lowStockAt: { en: "Low stock @", ar: "حد المخزون المنخفض" },
  moveStock: { en: "Move stock", ar: "تحريك المخزون" },
  stockPurchase: { en: "Purchase (+)", ar: "شراء (+)" },
  stockSale: { en: "Sale (−)", ar: "بيع (−)" },
  stockUsage: { en: "Usage on service (−)", ar: "استخدام في الخدمة (−)" },
  stockAdjustment: { en: "Adjustment (±)", ar: "تعديل (±)" },
  stockWaste: { en: "Waste (−)", ar: "هدر (−)" },
  stockQtyLabel: { en: "Quantity (negative for decrease)", ar: "الكمية (سالب للتخفيض)" },
  // commissions
  commissionsSummary: { en: "{n} lines · {total} total", ar: "{n} سجل · الإجمالي: {total}" },
  paid: { en: "Paid", ar: "مدفوعة" },
  unpaid: { en: "Unpaid", ar: "غير مدفوعة" },
  partial: { en: "Partial", ar: "جزئية" },
  all: { en: "All", ar: "الكل" },
  allEmployees: { en: "All employees", ar: "كل الموظفين" },
  allBranches: { en: "All branches", ar: "كل الفروع" },
  allStatuses: { en: "All statuses", ar: "كل الحالات" },
  markPaid: { en: "Mark paid", ar: "تحديد كمدفوعة" },
  markAllPaid: { en: "Mark all paid", ar: "تحديد الكل كمدفوعة" },
  markedPaid: { en: "Marked paid", ar: "تم التحديد كمدفوعة" },
  servicePrice: { en: "Service price", ar: "سعر الخدمة" },
  rate: { en: "Rate", ar: "النسبة" },
  noCommissions: { en: "No commissions in this view.", ar: "لا توجد عمولات في هذا العرض." },
  commissionsFootnote: { en: "Commissions are auto-generated when a booking is marked completed.", ar: "تُنشأ العمولات تلقائيًا عند اكتمال الحجز." },
  // reports
  reportsSubtitle: { en: "Cross-branch performance from database", ar: "الأداء متعدد الفروع من قاعدة البيانات" },
  exportCsv: { en: "Export CSV", ar: "تصدير CSV" },
  exportExcel: { en: "Export Excel", ar: "تصدير Excel" },
  exportPdf: { en: "Export PDF", ar: "تصدير PDF" },
  print: { en: "Print", ar: "طباعة" },
  exportFailed: { en: "Export failed", ar: "فشل التصدير" },
  pdfExportFailed: { en: "PDF export failed", ar: "فشل تصدير PDF" },
  revenue: { en: "Revenue", ar: "الإيرادات" },
  activeBranches: { en: "Active branches", ar: "الفروع النشطة" },
  comparePrevPeriod: { en: "Compare vs previous period", ar: "مقارنة مع الفترة السابقة" },
  revenueChartTitle: { en: "Revenue · selected period", ar: "الإيرادات · الفترة المحددة" },
  revenueByBranch: { en: "Revenue by branch", ar: "الإيرادات حسب الفرع" },
  bookingsByStatus: { en: "Bookings by status", ar: "الحجوزات حسب الحالة" },
  // invoices
  newInvoice: { en: "New invoice", ar: "فاتورة جديدة" },
  invoiceNumber: { en: "Number", ar: "الرقم" },
  taxInvoice: { en: "Tax invoice", ar: "فاتورة ضريبية" },
  billedTo: { en: "Billed to", ar: "فُوتر إلى" },
  subtotal: { en: "Subtotal", ar: "المجموع الفرعي" },
  taxLabel: { en: "Tax", ar: "الضريبة" },
  taxPct: { en: "Tax %", ar: "الضريبة %" },
  estimatedTotal: { en: "Estimated total", ar: "الإجمالي المقدّر" },
  discount: { en: "Discount", ar: "الخصم" },
  couponCode: { en: "Coupon code (optional)", ar: "كود الخصم (اختياري)" },
  createInvoice: { en: "Create invoice", ar: "إنشاء فاتورة" },
  // bookings / booking dialog
  bookingsSummary: { en: "{n} total · {today} today", ar: "الإجمالي: {n} · اليوم: {today}" },
  repeat: { en: "Repeat", ar: "التكرار" },
  noRepeat: { en: "No repeat", ar: "بدون تكرار" },
  everyWeek: { en: "Every week", ar: "أسبوعيًا" },
  everyTwoWeeks: { en: "Every 2 weeks", ar: "كل أسبوعين" },
  everyMonth: { en: "Every month", ar: "شهريًا" },
  occurrences: { en: "Occurrences", ar: "عدد المرات" },
  pickService: { en: "Please pick a service", ar: "يرجى اختيار خدمة" },
  seriesCreated: { en: "Created {n} bookings in series", ar: "تم إنشاء {n} حجز في السلسلة" },
  deleteBookingConfirm: { en: "Delete this booking?", ar: "حذف هذا الحجز؟" },
  deleteBookingDesc: { en: "This removes the booking from the current list.", ar: "سيُزال هذا الحجز من القائمة الحالية." },
  // customers
  importBtn: { en: "Import", ar: "استيراد" },
  importFailed: { en: "Import failed", ar: "فشل الاستيراد" },
  importNoValidRows: { en: "No valid rows (need name + phone)", ar: "لا توجد صفوف صالحة (الاسم والهاتف مطلوبان)" },
  importResult: { en: "Imported {ok}, skipped {skip} of {total}", ar: "تم استيراد {ok}، تم تخطي {skip} من {total}" },
  deleteCustomerConfirm: { en: "Delete {name}?", ar: "حذف {name}؟" },
  deleteCustomerDesc: { en: "This removes the customer from the current list.", ar: "سيُزال هذا العميل من القائمة الحالية." },
  // shared
  newBookingShort: { en: "New booking", ar: "حجز جديد" },
  newProductShort: { en: "New product", ar: "منتج جديد" },
  noProducts: { en: "No products yet.", ar: "لا توجد منتجات بعد." },
  kind: { en: "Kind", ar: "النوع" },
  note: { en: "Note", ar: "ملاحظة" },
  quantityNeg: { en: "Quantity (use negative for adjustment down)", ar: "الكمية (سالب للتخفيض)" },
  stockMovementTitle: { en: "Stock movement — {name}", ar: "حركة مخزون — {name}" },
  // invoices page
  invoiceCount: { en: "{n} total · {amt} on page", ar: "الإجمالي: {n} · {amt} في الصفحة" },
  invoiceNumberCol: { en: "Number", ar: "الرقم" },
  pageOf: { en: "Page {p} / {t}", ar: "الصفحة {p} / {t}" },
  // services dialog
  nameEn: { en: "Name (EN)", ar: "الاسم (إنجليزي)" },
  nameAr: { en: "Name (AR)", ar: "الاسم (عربي)" },
  durationMin: { en: "Duration (min)", ar: "المدة (دقيقة)" },
  addService: { en: "Add service", ar: "إضافة خدمة" },
  // employees
  onStaff: { en: "{n} on staff", ar: "{n} في الفريق" },
  // misc i18n round 3
  newCustomer: { en: "New customer", ar: "عميل جديد" },
  newEmployee: { en: "New employee", ar: "موظف جديد" },
  newCoupon: { en: "New coupon", ar: "كوبون جديد" },
  newMembershipPlan: { en: "New membership plan", ar: "خطة اشتراك جديدة" },
  configurePreferences: { en: "Configure preferences and data.", ar: "تهيئة التفضيلات والبيانات." },
  accessControl: { en: "Access Control", ar: "التحكم بالوصول" },
  assignBranchesToStaff: { en: "Assign branches to each staff member", ar: "تعيين الفروع لكل موظف" },
  auditLog: { en: "Audit Log", ar: "سجل التدقيق" },
  auditSubtitle: { en: "Sensitive changes across roles, bookings, and invoices", ar: "التغييرات الحساسة عبر الأدوار والحجوزات والفواتير" },
  actorUserId: { en: "Actor user id", ar: "معرف المستخدم" },
  allTables: { en: "All tables", ar: "كل الجداول" },
  allActions: { en: "All actions", ar: "كل الإجراءات" },
  typeCommandOrSearch: { en: "Type a command or search…", ar: "اكتب أمراً أو ابحث…" },
  dismiss: { en: "Dismiss", ar: "تجاهل" },
  dismissAlert: { en: "Dismiss alert", ar: "تجاهل التنبيه" },
  signOut: { en: "Sign out", ar: "تسجيل الخروج" },
  english: { en: "English", ar: "الإنجليزية" },
  arabic: { en: "العربية", ar: "العربية" },
  keyboardShortcuts: { en: "Keyboard Shortcuts", ar: "اختصارات لوحة المفاتيح" },
  close: { en: "Close", ar: "إغلاق" },
  test: { en: "Test", ar: "اختبار" },
  fixedAmount: { en: "Fixed amount", ar: "مبلغ ثابت" },
  percentDiscount: { en: "Percent", ar: "نسبة مئوية" },
  barber: { en: "Barber", ar: "حلاق" },
  receptionRole: { en: "Reception", ar: "استقبال" },
  silver: { en: "Silver", ar: "فضي" },
  gold: { en: "Gold", ar: "ذهبي" },
  vip: { en: "VIP", ar: "VIP" },
  plan: { en: "Plan", ar: "الخطة" },
  expires: { en: "Expires", ar: "ينتهي" },
  couponCodeOptional: { en: "Coupon code (optional)", ar: "رمز الكوبون (اختياري)" },
  birthday: { en: "Birthday", ar: "تاريخ الميلاد" },
  opens: { en: "Opens", ar: "يفتح" },
  closes: { en: "Closes", ar: "يغلق" },
  tier: { en: "Tier", ar: "المستوى" },
  validityDays: { en: "Validity (days)", ar: "الصلاحية (أيام)" },
  codeLabel: { en: "Code", ar: "الرمز" },
  valueLabel: { en: "Value", ar: "القيمة" },
  maxUsesOptional: { en: "Max uses (optional)", ar: "الحد الأقصى للاستخدام (اختياري)" },
  validUntil: { en: "Valid until", ar: "صالح حتى" },
  tax: { en: "Tax", ar: "الضريبة" },
  noAuditEvents: { en: "No audit events for this filter", ar: "لا توجد أحداث تدقيق لهذا الفلتر" },
  noStaffAccounts: { en: "No staff accounts yet", ar: "لا توجد حسابات موظفين بعد" },
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

// Dev-only: warn once per missing i18n key to catch untranslated strings.
const _missingKeysWarned = new Set<string>();
export function warnMissingKey(key: string) {
  if (import.meta.env.DEV && !_missingKeysWarned.has(key)) {
    _missingKeysWarned.add(key);
    console.warn(`[i18n] missing key: "${key}"`);
  }
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
