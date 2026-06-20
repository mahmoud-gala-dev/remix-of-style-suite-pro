import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type RoleKind = "admin" | "user";

const ADMIN_ROLES = new Set(["super_admin", "admin"]);

export function useRole(): { role: RoleKind; isAdmin: boolean; loading: boolean } {
  const { data, isLoading } = useQuery({
    queryKey: ["current-role"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return "user" as RoleKind;
      const { data: rows } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", u.user.id);
      const isAdmin = (rows ?? []).some((r) => ADMIN_ROLES.has(r.role));
      return (isAdmin ? "admin" : "user") as RoleKind;
    },
    staleTime: 60_000,
  });
  return { role: data ?? "user", isAdmin: data === "admin", loading: isLoading };
}