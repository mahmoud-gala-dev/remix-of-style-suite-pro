import { useEffect, useRef } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery } from "@tanstack/react-query";
import { getProfileLayoutPrefs, saveProfileLayoutPrefs } from "@/lib/profile-prefs.functions";
import { snapshotLayout, useLayout } from "@/lib/layout";

export function useProfilePrefs() {
  const loaded = useRef(false);
  const saveLayout = useServerFn(saveProfileLayoutPrefs);
  const getLayout = useServerFn(getProfileLayoutPrefs);
  const applyProfileLayout = useLayout((s) => s.applyProfileLayout);

  const query = useQuery({
    queryKey: ["profile-layout-prefs"],
    queryFn: () => getLayout(),
    staleTime: 60_000,
  });

  const saveMutation = useMutation({
    mutationFn: (layout: Parameters<typeof saveProfileLayoutPrefs>[0]["data"]) => saveLayout({ data: layout }),
  });

  useEffect(() => {
    if (!query.data || loaded.current) return;
    loaded.current = true;
    if (query.data.layout) applyProfileLayout(query.data.layout);
  }, [applyProfileLayout, query.data]);

  useEffect(() => {
    if (!loaded.current) return;
    return useLayout.subscribe((state) => {
      saveMutation.mutate(snapshotLayout(state));
    });
  }, [saveMutation]);

  return query;
}