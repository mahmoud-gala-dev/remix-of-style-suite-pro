import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";
import { useT } from "@/lib/i18n";

type BIPEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_KEY = "vanguard.pwa.dismissed";

export function PwaInstall() {
  const [evt, setEvt] = useState<BIPEvent | null>(null);
  const [open, setOpen] = useState(false);
  const t = useT();

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (localStorage.getItem(DISMISS_KEY)) return;
    const handler = (e: Event) => {
      e.preventDefault();
      setEvt(e as BIPEvent);
      setOpen(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  function dismiss() {
    setOpen(false);
    localStorage.setItem(DISMISS_KEY, "1");
  }

  async function install() {
    if (!evt) return;
    await evt.prompt();
    await evt.userChoice;
    dismiss();
  }

  if (!open || !evt) return null;
  return (
    <div className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-xl border border-border/60 bg-card px-4 py-3 shadow-lg">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Download className="h-4 w-4" />
        </div>
        <div className="text-sm">
          <div className="font-semibold">{t("dashboard", "Install Vanguard")}</div>
          <div className="text-xs text-muted-foreground">Add to home screen</div>
        </div>
        <button
          onClick={install}
          className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground"
        >
          Install
        </button>
        <button onClick={dismiss} className="text-muted-foreground hover:text-foreground">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}