import { MessageCircle } from "lucide-react";
import { Surface } from "@/components/shell/page";
import { useT, useI18n } from "@/lib/i18n";
import { useData, useCurrentBranch } from "@/lib/store";
import { waLink, buildReminderMsg } from "@/lib/whatsapp";

// N2 default — staff-driven WhatsApp reminders. Lists bookings starting in
// the next 24-36h that the staff can click to send a wa.me message. Works
// without any external API; toggles off automatically once a real WhatsApp
// Business API is wired up (whatsapp_api_enabled).
export function RemindersWidget() {
  const t = useT();
  const lang = useI18n((s) => s.lang);
  const branch = useCurrentBranch();
  const bookings = useData((s) => s.bookings);
  const customers = useData((s) => s.customers);
  const services = useData((s) => s.services);

  const now = Date.now();
  const horizonStart = now + 12 * 3600_000; // 12h ahead
  const horizonEnd = now + 36 * 3600_000;   // 36h ahead

  const upcoming = bookings
    .filter((b) => b.branchId === branch.id)
    .filter((b) => b.status === "confirmed" || b.status === "pending")
    .filter((b) => {
      const t = new Date(b.start).getTime();
      return t >= horizonStart && t <= horizonEnd;
    })
    .slice(0, 8);

  if (upcoming.length === 0) return null;

  const origin = typeof window !== "undefined" ? window.location.origin : "";

  return (
    <Surface>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-dim">
          {lang === "ar" ? "تذكيرات الغد" : "Tomorrow's reminders"}
        </h3>
        <span className="text-[10px] text-dim">{upcoming.length}</span>
      </div>
      <div className="space-y-2">
        {upcoming.map((b) => {
          const cust = customers.find((c) => c.id === b.customerId);
          const svc = services.find((s) => s.id === b.serviceId);
          if (!cust || !svc) return null;
          const msg = buildReminderMsg({
            customerName: cust.name,
            serviceName: lang === "ar" ? svc.nameAr : svc.nameEn,
            branchName: lang === "ar" ? branch.nameAr : branch.nameEn,
            startAt: b.start,
            manageUrl: `${origin}/my/${b.id}`,
            lang,
          });
          const when = new Date(b.start).toLocaleString(lang === "ar" ? "ar-SA" : "en-US", {
            weekday: "short",
            hour: "2-digit",
            minute: "2-digit",
          });
          return (
            <div key={b.id} className="flex items-center justify-between gap-2 rounded-md border border-border/60 bg-surface-2/40 px-3 py-2">
              <div className="min-w-0">
                <div className="text-sm font-medium truncate">{cust.name}</div>
                <div className="text-[10px] text-dim truncate">
                  {when} · {lang === "ar" ? svc.nameAr : svc.nameEn}
                </div>
              </div>
              <a
                href={waLink(cust.phone, msg)}
                target="_blank"
                rel="noreferrer"
                aria-label={t("send" as never) || "Send WhatsApp"}
                className="inline-flex items-center gap-1 rounded-md bg-whatsapp text-whatsapp-foreground px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-widest hover:opacity-90"
              >
                <MessageCircle className="size-3" />
                {lang === "ar" ? "إرسال" : "Send"}
              </a>
            </div>
          );
        })}
      </div>
      <p className="mt-3 text-[10px] text-dim">
        {lang === "ar"
          ? "النقر يفتح واتساب برسالة جاهزة. فعّل WhatsApp Business API من الإعدادات للإرسال التلقائي."
          : "Click to open WhatsApp with a pre-filled message. Enable WhatsApp Business API in Settings for automation."}
      </p>
    </Surface>
  );
}