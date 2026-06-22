import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Copy, Check, Database, ShieldCheck, Cloud, Link2 } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { isSetupComplete, createInitialAdmin } from "@/lib/setup.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";

export const Route = createFileRoute("/setup")({
  ssr: false,
  beforeLoad: async () => {
    try {
      const done = await isSetupComplete();
      if (done) throw redirect({ to: "/auth" });
    } catch (e) {
      if (e && typeof e === "object" && "to" in e) throw e;
    }
  },
  component: SetupWizard,
});

function genPassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  let out = "";
  const arr = new Uint32Array(14);
  crypto.getRandomValues(arr);
  for (const n of arr) out += chars[n % chars.length];
  return out + "!9";
}

function SetupWizard() {
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [dbMode, setDbMode] = useState<"cloud" | "external">("cloud");
  const [extUrl, setExtUrl] = useState("");
  const [extKey, setExtKey] = useState("");

  const [email, setEmail] = useState("admin@salon.local");
  const [password, setPassword] = useState(genPassword());
  const [pwMode, setPwMode] = useState<"auto" | "manual">("auto");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState<"email" | "password" | "all" | null>(null);
  const [savedAck, setSavedAck] = useState(false);

  const copy = async (text: string, key: "email" | "password" | "all") => {
    await navigator.clipboard.writeText(text);
    setCopied(key);
    toast.success("Copied");
    setTimeout(() => setCopied(null), 1500);
  };

  const onContinue = () => {
    if (dbMode === "external") {
      if (!extUrl || !extKey) {
        toast.error("Enter URL and key");
        return;
      }
      try {
        localStorage.setItem(
          "external_supabase",
          JSON.stringify({ url: extUrl.trim(), key: extKey.trim() }),
        );
      } catch {}
      toast.message("External database saved (reference only)", {
        description: "Backend remains on Lovable Cloud until env vars are updated.",
      });
    }
    setStep(2);
  };

  const onCreateAdmin = async () => {
    setBusy(true);
    try {
      const res = await createInitialAdmin({ data: { email, password } });
      if (!res.ok) {
        toast.error("Setup already completed");
        navigate({ to: "/auth" });
        return;
      }
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        toast.error(error.message);
        navigate({ to: "/auth" });
        return;
      }
      toast.success("Admin account created");
      setStep(3);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen grid place-items-center bg-background px-4 py-10">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <div className="font-display text-3xl uppercase tracking-tight text-primary">Vanguard</div>
          <div className="text-[10px] tracking-[0.2em] text-dim uppercase mt-1">Initial Setup</div>
        </div>

        <div className="flex items-center gap-2 mb-6 text-xs">
          <StepDot active={step === 1} done={step > 1} label="Database" n={1} />
          <div className="h-px flex-1 bg-border" />
          <StepDot active={step === 2} done={false} label="Admin Account" n={2} />
        </div>

        {step === 1 && (
          <Card className="p-6 space-y-5">
            <div className="flex items-center gap-2">
              <Database className="size-4 text-primary" />
              <h2 className="font-semibold">Choose database</h2>
            </div>

            <button
              type="button"
              onClick={() => setDbMode("cloud")}
              className={`w-full text-start rounded-lg border p-4 transition ${
                dbMode === "cloud" ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
              }`}
            >
              <div className="flex items-center gap-2 font-medium">
                <Cloud className="size-4" /> Lovable Cloud
                <span className="ms-auto text-[10px] uppercase tracking-wider text-primary">Recommended</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Managed database, auth, and storage. Tables are already initialized.
              </p>
            </button>

            <button
              type="button"
              onClick={() => setDbMode("external")}
              className={`w-full text-start rounded-lg border p-4 transition ${
                dbMode === "external" ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
              }`}
            >
              <div className="flex items-center gap-2 font-medium">
                <Link2 className="size-4" /> External Supabase
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Use your own project URL and publishable key.
              </p>
              {dbMode === "external" && (
                <div className="mt-3 space-y-2" onClick={(e) => e.stopPropagation()}>
                  <Input
                    placeholder="https://xxxx.supabase.co"
                    value={extUrl}
                    onChange={(e) => setExtUrl(e.target.value)}
                  />
                  <Input
                    placeholder="publishable / anon key"
                    value={extKey}
                    onChange={(e) => setExtKey(e.target.value)}
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Note: switching requires updating env variables; tables will auto-initialize on first connect.
                  </p>
                </div>
              )}
            </button>

            <div className="flex justify-end">
              <Button onClick={onContinue}>Continue</Button>
            </div>
          </Card>
        )}

        {step === 2 && (
          <Card className="p-6 space-y-5">
            <div className="flex items-center gap-2">
              <ShieldCheck className="size-4 text-primary" />
              <h2 className="font-semibold">Create default admin</h2>
            </div>
            <p className="text-xs text-muted-foreground">
              These credentials will be created and activated immediately. Copy them somewhere safe.
            </p>

            <div className="space-y-3">
              <FieldRow
                label="Email"
                value={email}
                onChange={setEmail}
                copied={copied === "email"}
                onCopy={() => copy(email, "email")}
              />
              <FieldRow
                label="Password"
                value={password}
                onChange={setPassword}
                copied={copied === "password"}
                onCopy={() => copy(password, "password")}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => copy(`Email: ${email}\nPassword: ${password}`, "all")}
                className="w-full"
              >
                {copied === "all" ? <Check className="size-3.5 me-1.5" /> : <Copy className="size-3.5 me-1.5" />}
                Copy both
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setPassword(genPassword())}
                className="w-full text-xs"
              >
                Regenerate password
              </Button>
            </div>

            <div className="flex justify-between pt-2">
              <Button variant="ghost" onClick={() => setStep(1)} disabled={busy}>
                Back
              </Button>
              <Button onClick={onCreateAdmin} disabled={busy}>
                {busy ? "Creating…" : "Create & sign in"}
              </Button>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

function StepDot({ n, label, active, done }: { n: number; label: string; active: boolean; done: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <div
        className={`size-6 rounded-full grid place-items-center text-[11px] font-semibold ${
          done ? "bg-primary text-primary-foreground" : active ? "bg-primary/15 text-primary border border-primary" : "bg-muted text-muted-foreground"
        }`}
      >
        {done ? <Check className="size-3.5" /> : n}
      </div>
      <span className={active || done ? "text-foreground" : "text-muted-foreground"}>{label}</span>
    </div>
  );
}

function FieldRow({
  label,
  value,
  onChange,
  copied,
  onCopy,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  copied: boolean;
  onCopy: () => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs uppercase tracking-wider text-muted-foreground">{label}</Label>
      <div className="flex gap-2">
        <Input value={value} onChange={(e) => onChange(e.target.value)} className="font-mono text-sm" />
        <Button type="button" variant="outline" size="icon" onClick={onCopy} aria-label={`Copy ${label}`}>
          {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
        </Button>
      </div>
    </div>
  );
}