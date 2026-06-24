import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Sparkles, ChevronRight, ChevronLeft, X } from "lucide-react";
import { useT, type DictKey } from "@/lib/i18n";

const STORAGE_KEY = "vanguard_tour_done_v1";

type Step = { titleKey: DictKey; bodyKey: DictKey };

const STEPS: Step[] = [
  { titleKey: "tour_s1_title", bodyKey: "tour_s1_body" },
  { titleKey: "tour_s2_title", bodyKey: "tour_s2_body" },
  { titleKey: "tour_s3_title", bodyKey: "tour_s3_body" },
  { titleKey: "tour_s4_title", bodyKey: "tour_s4_body" },
  { titleKey: "tour_s5_title", bodyKey: "tour_s5_body" },
];

export function ProductTour() {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [i, setI] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      if (!localStorage.getItem(STORAGE_KEY)) {
        const id = setTimeout(() => setOpen(true), 600);
        return () => clearTimeout(id);
      }
    } catch {
      /* ignore */
    }
  }, []);

  function close() {
    try {
      localStorage.setItem(STORAGE_KEY, new Date().toISOString());
    } catch {
      /* ignore */
    }
    setOpen(false);
  }

  if (!open) return null;
  const step = STEPS[i];
  const isLast = i === STEPS.length - 1;

  return (
    <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center bg-background/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card text-card-foreground shadow-2xl">
        <div className="flex items-center justify-between px-5 pt-5">
          <div className="flex items-center gap-2 text-primary">
            <Sparkles className="size-5" />
            <span className="text-xs font-medium uppercase tracking-wider">
              {t("tour_label")} · {i + 1}/{STEPS.length}
            </span>
          </div>
          <button
            type="button"
            onClick={close}
            className="rounded-full p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label={t("skip")}
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="px-5 pt-3 pb-4">
          <h3 className="text-lg font-semibold">{t(step.titleKey)}</h3>
          <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{t(step.bodyKey)}</p>
        </div>
        <div className="flex h-1 gap-1 px-5">
          {STEPS.map((_, idx) => (
            <div
              key={idx}
              className={`h-1 flex-1 rounded-full ${idx <= i ? "bg-primary" : "bg-muted"}`}
            />
          ))}
        </div>
        <div className="flex items-center justify-between gap-2 px-5 pt-4 pb-5">
          <button
            type="button"
            onClick={close}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            {t("skip")}
          </button>
          <div className="flex items-center gap-2">
            {i > 0 && (
              <button
                type="button"
                onClick={() => setI((v) => v - 1)}
                className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-muted"
              >
                <ChevronLeft className="size-4 rtl:rotate-180" />
                {t("tour_back")}
              </button>
            )}
            {isLast ? (
              <Link
                to="/onboarding"
                onClick={close}
                className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-90"
              >
                {t("tour_finish")}
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => setI((v) => v + 1)}
                className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-90"
              >
                {t("next")}
                <ChevronRight className="size-4 rtl:rotate-180" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}