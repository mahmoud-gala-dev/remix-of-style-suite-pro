import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Surface } from "@/components/shell/page";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { getTwilioSettings, updateTwilioSettings, testTwilio } from "@/lib/twilio.functions";

export function SettingsTwilio() {
  const fetchCfg = useServerFn(getTwilioSettings);
  const saveCfg = useServerFn(updateTwilioSettings);
  const sendTest = useServerFn(testTwilio);
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["twilio-settings"], queryFn: () => fetchCfg() });

  const [enabled, setEnabled] = useState(false);
  const [sid, setSid] = useState("");
  const [token, setToken] = useState("");
  const [from, setFrom] = useState("");
  const [notifyBooking, setNotifyBooking] = useState(false);
  const [notifyReminders, setNotifyReminders] = useState(false);
  const [testTo, setTestTo] = useState("");

  useEffect(() => {
    if (q.data) {
      setEnabled(q.data.enabled);
      setSid(q.data.account_sid);
      setToken(""); // never preload
      setFrom(q.data.from_whatsapp);
      setNotifyBooking(q.data.notify_booking_created);
      setNotifyReminders(q.data.notify_reminders);
    }
  }, [q.data]);

  const save = useMutation({
    mutationFn: () => saveCfg({ data: {
      enabled, account_sid: sid, auth_token: token,
      from_whatsapp: from, notify_booking_created: notifyBooking,
      notify_reminders: notifyReminders,
    } }),
    onSuccess: () => {
      toast.success("Twilio settings saved");
      setToken("");
      qc.invalidateQueries({ queryKey: ["twilio-settings"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const test = useMutation({
    mutationFn: () => sendTest({ data: { to: testTo } }),
    onSuccess: (r) => toast.success(`Sent (SID: ${(r as { sid?: string }).sid ?? "ok"})`),
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Surface>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold uppercase tracking-widest">Twilio WhatsApp</h3>
        <div className="flex items-center gap-2">
          <span className="text-xs text-dim">{enabled ? "Enabled" : "Disabled"}</span>
          <Switch checked={enabled} onCheckedChange={setEnabled} />
        </div>
      </div>
      <p className="text-xs text-dim mb-4">
        Off by default. Enable to send WhatsApp confirmations and reminders via Twilio.
        Credentials are stored server-side and never exposed to the browser.
      </p>
      <div className="space-y-3">
        <div>
          <label className="block text-xs text-dim mb-1.5">Account SID</label>
          <Input value={sid} onChange={(e) => setSid(e.target.value)} placeholder="ACxxxxxxxx" />
        </div>
        <div>
          <label className="block text-xs text-dim mb-1.5">Auth Token</label>
          <Input type="password" value={token} onChange={(e) => setToken(e.target.value)}
            placeholder={q.data?.account_sid ? "•••••••• (leave blank to keep)" : "Auth token"} />
        </div>
        <div>
          <label className="block text-xs text-dim mb-1.5">From WhatsApp Number</label>
          <Input value={from} onChange={(e) => setFrom(e.target.value)}
            placeholder="whatsapp:+14155238886" />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={notifyBooking}
            onChange={(e) => setNotifyBooking(e.target.checked)} />
          Send on booking created
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={notifyReminders}
            onChange={(e) => setNotifyReminders(e.target.checked)} />
          Send appointment reminders
        </label>
        <Button onClick={() => save.mutate()} disabled={save.isPending}>
          {save.isPending ? "Saving…" : "Save"}
        </Button>

        <div className="pt-4 border-t border-border">
          <label className="block text-xs text-dim mb-1.5">Test send to (E.164)</label>
          <div className="flex gap-2">
            <Input value={testTo} onChange={(e) => setTestTo(e.target.value)} placeholder="+9665…" />
            <Button variant="outline" onClick={() => test.mutate()}
              disabled={!enabled || !testTo || test.isPending}>
              {test.isPending ? "Sending…" : "Send test"}
            </Button>
          </div>
        </div>
      </div>
    </Surface>
  );
}