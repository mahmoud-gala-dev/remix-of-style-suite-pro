import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";
import { useT } from "@/lib/i18n";

export function OfflineBanner() {
  const t = useT();
  const [online, setOnline] = useState(true);

  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  if (online) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      data-no-print
      className="fixed inset-x-0 top-0 z-[60] flex items-center justify-center gap-2 bg-destructive text-destructive-foreground px-4 py-1.5 text-xs font-medium tracking-wide shadow-md"
    >
      <WifiOff className="size-3.5" />
      <span>{t("offline", "You are offline. Changes will not sync until reconnected.")}</span>
    </div>
  );
}