import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Surface } from "@/components/shell/page";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  getNotificationSettings,
  updateNotificationSettings,
  type NotificationProvider,
} from "@/lib/notifications.functions";

export function SettingsNotifications() {
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
      toast.success("Notifications updated");
      qc.invalidateQueries({ queryKey: ["notification-settings"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Surface>
      <h3 className="text-sm font-bold uppercase tracking-widest mb-4">Notifications</h3>
      <div className="space-y-4">
        <div>
          <label className="block text-xs text-dim mb-1.5">Provider</label>
          <select
            value={provider}
            onChange={(e) => setProvider(e.target.value as NotificationProvider)}
            className="h-9 w-full rounded-md border bg-bg-2 px-3 text-sm"
          >
            <option value="off">Off (no emails sent)</option>
            <option value="lovable">Lovable Emails (built-in, requires scaffolding)</option>
            <option value="resend">Resend (requires connector)</option>
          </select>
          <p className="text-[10px] text-dim mt-1">
            Both providers are OFF by default. Switch on to enable customer email notifications.
          </p>
        </div>
        <div>
          <label className="block text-xs text-dim mb-1.5">From email</label>
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
          Send confirmation when a booking is created
        </label>
        <Button onClick={() => save.mutate()} disabled={save.isPending}>
          {save.isPending ? "Saving…" : "Save"}
        </Button>
      </div>
    </Surface>
  );
}