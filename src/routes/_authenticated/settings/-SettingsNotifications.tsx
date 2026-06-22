import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Surface } from "@/components/shell/page";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useT } from "@/lib/i18n";
import {
  getNotificationSettings,
  updateNotificationSettings,
  type NotificationProvider,
} from "@/lib/notifications.functions";

export function SettingsNotifications() {
  const t = useT();
  const fetchCfg = useServerFn(getNotificationSettings);
  const saveCfg = useServerFn(updateNotificationSettings);
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["notification-settings"], queryFn: () => fetchCfg() });
  const [provider, setProvider] = useState<NotificationProvider>("off");
  const [fromEmail, setFromEmail] = useState("");
  const [notifyBooking, setNotifyBooking] = useState(false);

  useEffect(() => {
    if (q.data) {
      setProvider(q.data.provider);
      setFromEmail(q.data.from_email);
      setNotifyBooking(q.data.notify_booking_created);
    }
  }, [q.data]);

  const save = useMutation({
    mutationFn: () => saveCfg({ data: {
      provider, from_email: fromEmail, notify_booking_created: notifyBooking,
    } }),
    onSuccess: () => {
      toast.success(t("notificationsUpdated"));
      qc.invalidateQueries({ queryKey: ["notification-settings"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Surface>
      <h3 className="text-sm font-bold uppercase tracking-widest mb-4">{t("notifications")}</h3>
      <div className="space-y-4">
        <div>
          <label className="block text-xs text-dim mb-1.5">{t("provider")}</label>
          <select
            value={provider}
            onChange={(e) => setProvider(e.target.value as NotificationProvider)}
            className="h-9 w-full rounded-md border bg-bg-2 px-3 text-sm"
          >
            <option value="off">{t("providerOff")}</option>
            <option value="lovable">{t("providerLovable")}</option>
            <option value="resend">{t("providerResend")}</option>
          </select>
          <p className="text-[10px] text-dim mt-1">
            {t("providersOffByDefault")}
          </p>
        </div>
        <div>
          <label className="block text-xs text-dim mb-1.5">{t("fromEmail")}</label>
          <Input
            type="email"
            placeholder="bookings@example.com"
            value={fromEmail}
            onChange={(e) => setFromEmail(e.target.value)}
          />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={notifyBooking}
            onChange={(e) => setNotifyBooking(e.target.checked)}
          />
          {t("notifyOnBookingCreated")}
        </label>
        <Button onClick={() => save.mutate()} disabled={save.isPending}>
          {save.isPending ? t("saving") : t("save")}
        </Button>
      </div>
    </Surface>
  );
}