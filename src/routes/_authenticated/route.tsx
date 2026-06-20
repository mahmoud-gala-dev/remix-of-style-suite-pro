import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useHydrate } from "@/lib/db/hydrate";
import { useProfilePrefs } from "@/lib/use-profile-prefs";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      throw redirect({ to: "/auth" });
    }
    return { user: data.user };
  },
  component: AuthedShell,
});

function AuthedShell() {
  useHydrate();
  useProfilePrefs();
  return <Outlet />;
}