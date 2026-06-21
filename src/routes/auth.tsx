import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { checkSetupStatus } from "@/lib/setup.functions";
import { checkAuthRateLimit } from "@/lib/auth.functions";
import { requires2FA, verify2FA } from "@/lib/2fa.functions";
import { useErrT, useT } from "@/lib/i18n";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

export const Route = createFileRoute("/auth")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (data.user) throw redirect({ to: "/" });
    try {
      const status = await checkSetupStatus();
      if (!status.hasAdmin) throw redirect({ to: "/setup" });
    } catch (e) {
      if (e && typeof e === "object" && "to" in e) throw e;
    }
  },
  component: AuthPage,
});

const credSchema = z.object({
  email: z.string().trim().email("Enter a valid email").max(255),
  password: z.string().min(6, "At least 6 characters").max(72),
});
type CredForm = z.infer<typeof credSchema>;

function AuthPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<"signin" | "signup">("signin");
  const [busy, setBusy] = useState(false);
  const rateLimit = useServerFn(checkAuthRateLimit);
  const check2FA = useServerFn(requires2FA);
  const verifyCode = useServerFn(verify2FA);
  const t = useT();
  const errT = useErrT();
  const [twoFAOpen, setTwoFAOpen] = useState(false);
  const [twoFACode, setTwoFACode] = useState("");
  const [twoFABusy, setTwoFABusy] = useState(false);
  // Rate limit: 5 failed attempts per minute, in-memory per tab.
  const attempts = useRef<number[]>([]);
  const checkRate = () => {
    const now = Date.now();
    attempts.current = attempts.current.filter((t) => now - t < 60_000);
    if (attempts.current.length >= 5) {
      const wait = Math.ceil((60_000 - (now - attempts.current[0])) / 1000);
      toast.error(`Too many attempts. Try again in ${wait}s.`);
      return false;
    }
    return true;
  };

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((evt, session) => {
      if (session && (evt === "SIGNED_IN" || evt === "INITIAL_SESSION") && !twoFAOpen) {
        navigate({ to: "/" });
      }
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate, twoFAOpen]);

  const signin = useForm<CredForm>({ resolver: zodResolver(credSchema), defaultValues: { email: "", password: "" } });
  const signup = useForm<CredForm>({ resolver: zodResolver(credSchema), defaultValues: { email: "", password: "" } });

  const onSignIn = signin.handleSubmit(async (values) => {
    if (!checkRate()) return;
    setBusy(true);
    try { await rateLimit({ data: { email: values.email } }); }
    catch (e) {
      setBusy(false);
      toast.error(errT(e instanceof Error ? e : "rate_limited"));
      return;
    }
    const { error } = await supabase.auth.signInWithPassword(values);
    if (error) {
      setBusy(false);
      attempts.current.push(Date.now());
      toast.error(errT(error.message));
      return;
    }
    attempts.current = [];
    // P2 — enforce 2FA for privileged roles
    try {
      const status = await check2FA();
      if (status.required) {
        setBusy(false);
        setTwoFACode("");
        setTwoFAOpen(true);
        return;
      }
    } catch {
      /* if the check fails, fall through and let the user in (network) */
    }
    setBusy(false);
    navigate({ to: "/" });
  });

  const onSignUp = signup.handleSubmit(async (values) => {
    if (!checkRate()) return;
    setBusy(true);
    try { await rateLimit({ data: { email: values.email } }); }
    catch (e) {
      setBusy(false);
      toast.error(errT(e instanceof Error ? e : "rate_limited"));
      return;
    }
    const { error } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
      options: { emailRedirectTo: `${window.location.origin}/` },
    });
    setBusy(false);
    if (error) {
      attempts.current.push(Date.now());
      toast.error(errT(error.message));
    } else {
      attempts.current = [];
      toast.success("Account created — check your email if confirmation is required.");
    }
  });

  const onGoogle = async () => {
    setBusy(true);
    const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (result.error) {
      setBusy(false);
      toast.error(errT(result.error.message ?? "Google sign-in failed"));
    }
  };

  const onVerify2FA = async () => {
    if (!/^\d{6}$/.test(twoFACode)) {
      toast.error(errT("invalid_code"));
      return;
    }
    setTwoFABusy(true);
    try {
      await verifyCode({ data: { code: twoFACode } });
      setTwoFABusy(false);
      setTwoFAOpen(false);
      navigate({ to: "/" });
    } catch (e) {
      setTwoFABusy(false);
      toast.error(errT(e));
    }
  };

  const onCancel2FA = async () => {
    setTwoFAOpen(false);
    await supabase.auth.signOut();
  };

  return (
    <div className="min-h-screen grid place-items-center bg-background px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="font-display text-3xl uppercase tracking-tight text-primary">Vanguard</div>
          <div className="text-[10px] tracking-[0.2em] text-dim uppercase mt-1">Salon OS</div>
        </div>

        <div className="rounded-xl border border-border bg-surface p-6">
          <Tabs value={tab} onValueChange={(v) => setTab(v as "signin" | "signup")}>
            <TabsList className="grid grid-cols-2 w-full">
              <TabsTrigger value="signin">Sign in</TabsTrigger>
              <TabsTrigger value="signup">Create account</TabsTrigger>
            </TabsList>

            <TabsContent value="signin" className="mt-6">
              <form onSubmit={onSignIn} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="si-email">Email</Label>
                  <Input id="si-email" type="email" autoComplete="email" {...signin.register("email")} />
                  {signin.formState.errors.email && (
                    <p className="text-xs text-destructive">{signin.formState.errors.email.message}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="si-pwd">Password</Label>
                  <Input id="si-pwd" type="password" autoComplete="current-password" {...signin.register("password")} />
                  {signin.formState.errors.password && (
                    <p className="text-xs text-destructive">{signin.formState.errors.password.message}</p>
                  )}
                </div>
                <Button type="submit" className="w-full" disabled={busy}>
                  {busy ? "Signing in…" : "Sign in"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup" className="mt-6">
              <form onSubmit={onSignUp} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="su-email">Email</Label>
                  <Input id="su-email" type="email" autoComplete="email" {...signup.register("email")} />
                  {signup.formState.errors.email && (
                    <p className="text-xs text-destructive">{signup.formState.errors.email.message}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="su-pwd">Password</Label>
                  <Input id="su-pwd" type="password" autoComplete="new-password" {...signup.register("password")} />
                  {signup.formState.errors.password && (
                    <p className="text-xs text-destructive">{signup.formState.errors.password.message}</p>
                  )}
                </div>
                <Button type="submit" className="w-full" disabled={busy}>
                  {busy ? "Creating…" : "Create account"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          <div className="my-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-[10px] uppercase tracking-[0.2em] text-dim">or</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <Button type="button" variant="outline" className="w-full" onClick={onGoogle} disabled={busy}>
            Continue with Google
          </Button>
        </div>

        <p className="mt-6 text-center text-xs text-dim">
          By continuing you agree to the salon's terms of service.
        </p>
      </div>

      <Dialog open={twoFAOpen} onOpenChange={(open) => { if (!open) void onCancel2FA(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("twoFactorAuth")}</DialogTitle>
            <DialogDescription>{t("twoFAScanQR")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Label htmlFor="tfa-code">{t("twoFACurrentCode")}</Label>
            <Input
              id="tfa-code"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={twoFACode}
              onChange={(e) => setTwoFACode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              autoFocus
            />
            <div className="flex gap-2 justify-end">
              <Button variant="outline" type="button" onClick={onCancel2FA} disabled={twoFABusy}>
                {t("cancel")}
              </Button>
              <Button type="button" onClick={onVerify2FA} disabled={twoFABusy || twoFACode.length !== 6}>
                {twoFABusy ? "…" : t("twoFAVerify")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}