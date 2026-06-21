// F1 — WhatsApp link helpers (no external SMS provider required).
// Generates wa.me deep links + localized message templates that staff or
// cron jobs can hand to users without needing a paid SMS gateway.

export function waLink(phone: string, message: string): string {
  const num = phone.replace(/\D/g, "");
  return `https://wa.me/${num}?text=${encodeURIComponent(message)}`;
}

function formatWhen(iso: string, lang: "ar" | "en"): string {
  return new Date(iso).toLocaleString(lang === "ar" ? "ar-SA" : "en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export interface BookingMsgOpts {
  customerName: string;
  serviceName: string;
  branchName: string;
  startAt: string;
  manageUrl: string;
  lang?: "ar" | "en";
}

export function buildBookingConfirmMsg(o: BookingMsgOpts): string {
  const lang = o.lang ?? "en";
  const when = formatWhen(o.startAt, lang);
  if (lang === "ar") {
    return `مرحباً ${o.customerName}،\nتم تأكيد حجزك في ${o.branchName} لخدمة ${o.serviceName} بتاريخ ${when}.\nلإدارة الحجز: ${o.manageUrl}`;
  }
  return `Hi ${o.customerName},\nYour booking at ${o.branchName} for ${o.serviceName} is confirmed for ${when}.\nManage: ${o.manageUrl}`;
}

export function buildReminderMsg(o: BookingMsgOpts): string {
  const lang = o.lang ?? "en";
  const when = formatWhen(o.startAt, lang);
  if (lang === "ar") {
    return `تذكير: لديك حجز ${o.serviceName} في ${o.branchName} يوم ${when}.\n${o.manageUrl}`;
  }
  return `Reminder: Your ${o.serviceName} booking at ${o.branchName} is on ${when}.\n${o.manageUrl}`;
}

export function buildWaitlistOpenSlotMsg(o: {
  customerName: string;
  branchName: string;
  serviceName: string;
  bookingUrl: string;
  lang?: "ar" | "en";
}): string {
  if ((o.lang ?? "en") === "ar") {
    return `${o.customerName}، توفر موعد لخدمة ${o.serviceName} في ${o.branchName}. احجزي الآن: ${o.bookingUrl}`;
  }
  return `${o.customerName}, a slot just opened for ${o.serviceName} at ${o.branchName}. Book now: ${o.bookingUrl}`;
}