import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  Check,
  ChevronRight,
  ChevronLeft,
  MapPin,
  Scissors,
  User,
  Calendar as CalIcon,
  Sparkles,
  MessageCircle,
} from "lucide-react";

import { useI18n, useT, useDir } from "@/lib/i18n";
import { fmtMoney } from "@/lib/format";
import { cn } from "@/lib/utils";
import { PwaInstall } from "@/components/pwa-install";
import { createBooking, getPublicBookingCatalog } from "@/lib/bookings.functions";
import type { Booking, Branch, Employee, Service } from "@/types/domain";

export const Route = createFileRoute("/book")({
  head: () => ({
    meta: [
      { title: "Book your appointment — Vanguard Salon" },
      {
        name: "description",
        content: "Reserve your next haircut, color, or beauty service in seconds.",
      },
      { property: "og:title", content: "Book your appointment — Vanguard Salon" },
      {
        property: "og:description",
        content: "Reserve your next haircut, color, or beauty service in seconds.",
      },
    ],
  }),
  component: BookPage,
});

type Step = 0 | 1 | 2 | 3 | 4 | 5;

const ANY_EMPLOYEE = "__any__";

function BookPage() {
  const fetchCatalog = useServerFn(getPublicBookingCatalog);
  const createBookingFn = useServerFn(createBooking);
  const catalog = useQuery({ queryKey: ["public-booking-catalog"], queryFn: () => fetchCatalog() });
  const branches = catalog.data?.branches ?? [];
  const services = catalog.data?.services ?? [];
  const employees = catalog.data?.employees ?? [];
  const bookings = catalog.data?.bookings ?? [];

  const lang = useI18n((s) => s.lang);
  const setLang = useI18n((s) => s.setLang);
  const dir = useDir();
  const t = useT();

  const [step, setStep] = useState<Step>(0);
  const [branchId, setBranchId] = useState<string | null>(null);
  const [serviceId, setServiceId] = useState<string | null>(null);
  const [employeeId, setEmployeeId] = useState<string>(ANY_EMPLOYEE);
  const [date, setDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [time, setTime] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [confirmedId, setConfirmedId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const branch = branches.find((b) => b.id === branchId) ?? null;
  const service = services.find((s) => s.id === serviceId) ?? null;
  const branchServices = useMemo(
    () => services.filter((s) => s.active && s.branchId === branchId),
    [services, branchId],
  );
  const branchEmployees = useMemo(
    () => employees.filter((e) => e.active && e.branchId === branchId),
    [employees, branchId],
  );

  const slots = useMemo(() => {
    if (!branch || !service) return [];
    return buildSlots({
      date,
      open: branch.hoursOpen,
      close: branch.hoursClose,
      durationMin: service.durationMin,
      bookings: bookings.filter(
        (b) =>
          b.branchId === branch.id &&
          (employeeId === ANY_EMPLOYEE || b.employeeId === employeeId) &&
          b.status !== "cancelled" &&
          b.status !== "noShow",
      ),
      chairs: branch.chairs,
      anyEmployee: employeeId === ANY_EMPLOYEE,
    });
  }, [branch, service, date, employeeId, bookings]);

  const canNext =
    (step === 0 && branchId) ||
    (step === 1 && serviceId) ||
    step === 2 ||
    (step === 3 && time) ||
    (step === 4 && name.trim().length > 1 && phone.trim().length > 5 && !submitting);

  function next() {
    if (step < 5) setStep((s) => (s + 1) as Step);
  }
  function back() {
    if (step > 0) setStep((s) => (s - 1) as Step);
  }

  async function confirm() {
    if (!branch || !service || !time) return;
    const start = new Date(`${date}T${time}:00`);
    const end = new Date(start.getTime() + service.durationMin * 60_000);
    const empId =
      employeeId === ANY_EMPLOYEE
        ? pickAvailableEmployee(branchEmployees, bookings, start, end)
        : employeeId;
    if (!empId) return;
    setSubmitting(true);
    try {
      const res = await createBookingFn({
        data: {
          branchId: branch.id,
          employeeId: empId,
          serviceId: service.id,
          customerName: name.trim(),
          customerPhone: phone.trim(),
          startAt: start.toISOString(),
          endAt: end.toISOString(),
          price: service.price,
        },
      });
      setConfirmedId(res.id);
      setStep(5);
      await catalog.refetch();
    } catch (error) {
      toast.error(error instanceof Error && error.message ? error.message : "Slot taken — choose another time.");
      setTime(null);
      await catalog.refetch();
    } finally {
      setSubmitting(false);
    }
  }

  const steps = [
    { label: lang === "ar" ? "الفرع" : "Branch", icon: MapPin },
    { label: lang === "ar" ? "الخدمة" : "Service", icon: Scissors },
    { label: lang === "ar" ? "الموظف" : "Staff", icon: User },
    { label: lang === "ar" ? "الموعد" : "Time", icon: CalIcon },
    { label: lang === "ar" ? "التأكيد" : "Details", icon: Sparkles },
  ];

  return (
    <div dir={dir} className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <Link to="/" className="font-display text-lg tracking-tight">
            Vanguard
          </Link>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setLang(lang === "en" ? "ar" : "en")}
              className="rounded-full border border-border/60 px-3 py-1 text-xs font-medium hover:bg-accent"
            >
              {lang === "en" ? "العربية" : "EN"}
            </button>
          </div>
        </div>
        {step < 5 && (
          <div className="mx-auto max-w-3xl px-4 pb-3">
            <Stepper steps={steps} current={step} />
          </div>
        )}
      </header>

      <main className="mx-auto max-w-3xl px-4 pb-32 pt-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.18 }}
          >
            {step === 0 && (
              <Section
                title={lang === "ar" ? "اختر فرعك" : "Choose your branch"}
                subtitle={
                  lang === "ar"
                    ? "اختر الموقع الأقرب إليك."
                    : "Pick the location closest to you."
                }
              >
                <div className="grid gap-3 sm:grid-cols-2">
                  {branches.map((b) => (
                    <Card
                      key={b.id}
                      selected={branchId === b.id}
                      onClick={() => setBranchId(b.id)}
                    >
                      <div className="font-semibold">{lang === "ar" ? b.nameAr : b.nameEn}</div>
                      <div className="mt-1 text-xs text-muted-foreground">{b.address}</div>
                      <div className="mt-3 text-xs text-muted-foreground">
                        {b.hoursOpen} – {b.hoursClose}
                      </div>
                    </Card>
                  ))}
                </div>
              </Section>
            )}

            {step === 1 && (
              <Section
                title={lang === "ar" ? "اختر الخدمة" : "Choose a service"}
                subtitle={
                  lang === "ar"
                    ? "اختر الخدمة المطلوبة لحجزك."
                    : "Pick the service you'd like to book."
                }
              >
                <div className="grid gap-3 sm:grid-cols-2">
                  {branchServices.map((s) => (
                    <Card
                      key={s.id}
                      selected={serviceId === s.id}
                      onClick={() => setServiceId(s.id)}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="font-semibold">
                          {lang === "ar" ? s.nameAr : s.nameEn}
                        </div>
                        <div className="font-display text-sm">
                          {fmtMoney(s.price)}
                        </div>
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {s.category} · {s.durationMin} min
                      </div>
                    </Card>
                  ))}
                  {branchServices.length === 0 && (
                    <p className="col-span-full text-sm text-muted-foreground">
                      {t("noData")}
                    </p>
                  )}
                </div>
              </Section>
            )}

            {step === 2 && (
              <Section
                title={lang === "ar" ? "اختر الاختصاصي" : "Choose your stylist"}
                subtitle={
                  lang === "ar"
                    ? "أو دعنا نختار أول متاح."
                    : "Or let us pick the next available."
                }
              >
                <div className="grid gap-3 sm:grid-cols-2">
                  <Card
                    selected={employeeId === ANY_EMPLOYEE}
                    onClick={() => setEmployeeId(ANY_EMPLOYEE)}
                  >
                    <div className="font-semibold">
                      {lang === "ar" ? "أي موظف متاح" : "Any available stylist"}
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {lang === "ar" ? "أسرع توفر" : "Fastest availability"}
                    </div>
                  </Card>
                  {branchEmployees.map((e) => (
                    <Card
                      key={e.id}
                      selected={employeeId === e.id}
                      onClick={() => setEmployeeId(e.id)}
                    >
                      <div className="font-semibold">
                        {lang === "ar" ? e.nameAr : e.nameEn}
                      </div>
                      <div className="mt-1 text-xs capitalize text-muted-foreground">
                        {e.role} · ★ {e.rating.toFixed(1)}
                      </div>
                    </Card>
                  ))}
                </div>
              </Section>
            )}

            {step === 3 && (
              <Section
                title={lang === "ar" ? "اختر الموعد" : "Choose date & time"}
                subtitle={
                  lang === "ar"
                    ? "المواعيد متاحة بناءً على جدول الموظفين."
                    : "Slots calculated from live availability."
                }
              >
                <div className="mb-5">
                  <label className="mb-2 block text-xs font-medium text-muted-foreground">
                    {lang === "ar" ? "التاريخ" : "Date"}
                  </label>
                  <input
                    type="date"
                    value={date}
                    min={new Date().toISOString().slice(0, 10)}
                    onChange={(e) => {
                      setDate(e.target.value);
                      setTime(null);
                    }}
                    className="w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
                  />
                </div>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {slots.map((s) => (
                    <button
                      key={s}
                      onClick={() => setTime(s)}
                      className={cn(
                        "rounded-md border px-3 py-2 text-sm transition",
                        time === s
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border/60 hover:border-primary/60 hover:bg-accent",
                      )}
                    >
                      {s}
                    </button>
                  ))}
                  {slots.length === 0 && (
                    <p className="col-span-full text-sm text-muted-foreground">
                      {lang === "ar"
                        ? "لا توجد مواعيد متاحة في هذا اليوم."
                        : "No slots available on this day."}
                    </p>
                  )}
                </div>
              </Section>
            )}

            {step === 4 && (
              <Section
                title={lang === "ar" ? "بياناتك" : "Your details"}
                subtitle={
                  lang === "ar"
                    ? "سنرسل إليك التأكيد عبر واتساب."
                    : "We'll send your confirmation via WhatsApp."
                }
              >
                <div className="space-y-3">
                  <Field
                    label={lang === "ar" ? "الاسم الكامل" : "Full name"}
                    value={name}
                    onChange={setName}
                    placeholder={lang === "ar" ? "محمد علي" : "Jane Doe"}
                  />
                  <Field
                    label={lang === "ar" ? "رقم الجوال" : "Mobile number"}
                    value={phone}
                    onChange={setPhone}
                    placeholder="+20 1xx xxx xxxx"
                  />
                </div>

                <Summary
                  lang={lang}
                  branch={branch}
                  service={service}
                  date={date}
                  time={time}
                />
              </Section>
            )}

            {step === 5 && (
              <ConfirmedView
                lang={lang}
                branch={branch}
                service={service}
                date={date}
                time={time}
                bookingId={confirmedId}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {step < 5 && (
        <footer className="fixed inset-x-0 bottom-0 z-30 border-t border-border/60 bg-background/95 backdrop-blur">
          <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3">
            <button
              onClick={back}
              disabled={step === 0}
              className="inline-flex items-center gap-1 rounded-md border border-border/60 px-4 py-2 text-sm font-medium disabled:opacity-40"
            >
              {dir === "rtl" ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
              {lang === "ar" ? "السابق" : "Back"}
            </button>
            <button
              onClick={step === 4 ? confirm : next}
              disabled={!canNext}
              className="inline-flex flex-1 items-center justify-center gap-1 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition disabled:opacity-40"
            >
              {step === 4
                ? lang === "ar"
                  ? "تأكيد الحجز"
                  : "Confirm booking"
                : lang === "ar"
                  ? "التالي"
                  : "Continue"}
              {step !== 4 &&
                (dir === "rtl" ? (
                  <ChevronLeft className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                ))}
            </button>
          </div>
        </footer>
      )}
      <PwaInstall />
    </div>
  );
}

function Stepper({
  steps,
  current,
}: {
  steps: { label: string; icon: React.ComponentType<{ className?: string }> }[];
  current: number;
}) {
  return (
    <ol className="flex items-center gap-2">
      {steps.map((s, i) => {
        const done = i < current;
        const active = i === current;
        const Icon = s.icon;
        return (
          <li key={s.label} className="flex flex-1 items-center gap-2">
            <div
              className={cn(
                "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-medium transition",
                done
                  ? "border-primary bg-primary text-primary-foreground"
                  : active
                    ? "border-primary text-primary"
                    : "border-border/60 text-muted-foreground",
              )}
            >
              {done ? <Check className="h-3.5 w-3.5" /> : <Icon className="h-3.5 w-3.5" />}
            </div>
            {i < steps.length - 1 && (
              <div
                className={cn(
                  "h-px flex-1 transition",
                  done ? "bg-primary" : "bg-border/60",
                )}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h1 className="font-display text-3xl tracking-tight">{title}</h1>
      {subtitle && (
        <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>
      )}
      <div className="mt-6">{children}</div>
    </section>
  );
}

function Card({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group relative w-full rounded-xl border bg-card px-4 py-4 text-start transition",
        selected
          ? "border-primary ring-2 ring-primary/30"
          : "border-border/60 hover:border-primary/40 hover:bg-accent/40",
      )}
    >
      {selected && (
        <span className="absolute end-3 top-3 inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <Check className="h-3 w-3" />
        </span>
      )}
      {children}
    </button>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-muted-foreground">
        {label}
      </span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
      />
    </label>
  );
}

function Summary({
  lang,
  branch,
  service,
  date,
  time,
}: {
  lang: "en" | "ar";
  branch: Branch | null;
  service: Service | null;
  date: string;
  time: string | null;
}) {
  if (!branch || !service || !time) return null;
  return (
    <div className="mt-6 rounded-xl border border-border/60 bg-card p-4">
      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {lang === "ar" ? "ملخص الحجز" : "Booking summary"}
      </div>
      <div className="mt-3 space-y-2 text-sm">
        <Row label={lang === "ar" ? "الفرع" : "Branch"} value={lang === "ar" ? branch.nameAr : branch.nameEn} />
        <Row label={lang === "ar" ? "الخدمة" : "Service"} value={lang === "ar" ? service.nameAr : service.nameEn} />
        <Row label={lang === "ar" ? "التاريخ" : "Date"} value={`${date} · ${time}`} />
        <Row
          label={lang === "ar" ? "الإجمالي" : "Total"}
          value={fmtMoney(service.price)}
          strong
        />
      </div>
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className={strong ? "font-display text-base" : "font-medium"}>{value}</span>
    </div>
  );
}

function ConfirmedView({
  lang,
  branch,
  service,
  date,
  time,
  bookingId,
}: {
  lang: "en" | "ar";
  branch: Branch | null;
  service: Service | null;
  date: string;
  time: string | null;
  bookingId: string | null;
}) {
  return (
    <div className="py-10 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Check className="h-8 w-8" />
      </div>
      <h1 className="mt-6 font-display text-3xl tracking-tight">
        {lang === "ar" ? "تم تأكيد حجزك" : "You're booked"}
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {lang === "ar"
          ? "سنرسل تذكيراً قبل موعدك."
          : "We'll send you a reminder before your appointment."}
      </p>
      {branch && service && time && (
        <div className="mx-auto mt-8 max-w-md rounded-xl border border-border/60 bg-card p-5 text-start">
          <Row label={lang === "ar" ? "الفرع" : "Branch"} value={lang === "ar" ? branch.nameAr : branch.nameEn} />
          <div className="my-2 border-t border-border/40" />
          <Row label={lang === "ar" ? "الخدمة" : "Service"} value={lang === "ar" ? service.nameAr : service.nameEn} />
          <div className="my-2 border-t border-border/40" />
          <Row label={lang === "ar" ? "الموعد" : "When"} value={`${date} · ${time}`} />
          {bookingId && (
            <>
              <div className="my-2 border-t border-border/40" />
              <Row label="ID" value={bookingId.toUpperCase()} />
            </>
          )}
        </div>
      )}
      <div className="mt-8">
        <div className="flex flex-wrap items-center justify-center gap-2">
        {branch && service && time && (
          <a
            href={waLink({ branch: lang === "ar" ? branch.nameAr : branch.nameEn, phone: branch.phone, service: lang === "ar" ? service.nameAr : service.nameEn, date, time, lang })}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-md bg-[#25D366] px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
          >
            <MessageCircle className="h-4 w-4" />
            {lang === "ar" ? "إرسال عبر واتساب" : "Send via WhatsApp"}
          </a>
        )}
        <Link
          to="/book"
          reloadDocument
          className="inline-flex items-center justify-center rounded-md border border-border/60 px-4 py-2 text-sm font-medium hover:bg-accent"
        >
          {lang === "ar" ? "حجز آخر" : "Book another"}
        </Link>
        </div>
      </div>
    </div>
  );
}

function waLink({
  branch,
  phone,
  service,
  date,
  time,
  lang,
}: {
  branch: string;
  phone: string;
  service: string;
  date: string;
  time: string;
  lang: "en" | "ar";
}) {
  const msg =
    lang === "ar"
      ? `مرحباً ${branch}، أود تأكيد حجزي:\nالخدمة: ${service}\nالموعد: ${date} ${time}`
      : `Hi ${branch}, please confirm my booking:\nService: ${service}\nWhen: ${date} ${time}`;
  const num = phone.replace(/[^\d]/g, "");
  return `https://wa.me/${num}?text=${encodeURIComponent(msg)}`;
}

function buildSlots({
  date,
  open,
  close,
  durationMin,
  bookings,
  chairs,
  anyEmployee,
}: {
  date: string;
  open: string;
  close: string;
  durationMin: number;
  bookings: { start: string; end: string }[];
  chairs: number;
  anyEmployee: boolean;
}): string[] {
  const slots: string[] = [];
  const [oh, om] = open.split(":").map(Number);
  const [ch, cm] = close.split(":").map(Number);
  const dayStart = new Date(`${date}T00:00:00`);
  const startMs = dayStart.getTime() + (oh * 60 + om) * 60_000;
  const endMs = dayStart.getTime() + (ch * 60 + cm) * 60_000;
  const step = 30 * 60_000;
  const now = Date.now();
  const capacity = anyEmployee ? Math.max(chairs, 1) : 1;

  for (let t = startMs; t + durationMin * 60_000 <= endMs; t += step) {
    if (t < now) continue;
    const slotEnd = t + durationMin * 60_000;
    const overlap = bookings.filter((b) => {
      const bs = new Date(b.start).getTime();
      const be = new Date(b.end).getTime();
      return bs < slotEnd && be > t;
    }).length;
    if (overlap < capacity) {
      const d = new Date(t);
      slots.push(
        `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`,
      );
    }
  }
  return slots;
}

function pickAvailableEmployee(
  employees: Pick<Employee, "id">[],
  bookings: Array<Pick<Booking, "employeeId" | "start" | "end"> & { status: string }>,
  start: Date,
  end: Date,
) {
  const startMs = start.getTime();
  const endMs = end.getTime();
  return employees.find((employee) =>
    !bookings.some((booking) => {
      if (booking.employeeId !== employee.id || booking.status === "cancelled" || booking.status === "noShow") return false;
      return new Date(booking.start).getTime() < endMs && new Date(booking.end).getTime() > startMs;
    })
  )?.id;
}