import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery } from "@tanstack/react-query";
import { getProfileLayoutPrefs, saveProfileLayoutPrefs } from "@/lib/profile-prefs.functions";
import { snapshotLayout, useLayout, type LayoutSnapshot } from "@/lib/layout";

function readLegacyLocalLayout(): LayoutSnapshot | null {
  try {
    const raw = window.localStorage.getItem("vanguard.layout");
    if (!raw) return null;
    const state = JSON.parse(raw)?.state;
    if (!state) return null;
    return snapshotLayout(state);
  } catch {
    return null;
  }
}

export function useProfilePrefs() {
  const loaded = useRef(false);
  const [ready, setReady] = useState(false);
  const saveLayout = useServerFn(saveProfileLayoutPrefs);
  const getLayout = useServerFn(getProfileLayoutPrefs);
  const applyProfileLayout = useLayout((s) => s.applyProfileLayout);

  const query = useQuery({
    queryKey: ["profile-layout-prefs"],
    queryFn: () => getLayout(),
    staleTime: 60_000,
  });

  const { mutate: saveProfileLayout } = useMutation({
    mutationFn: (layout: LayoutSnapshot) => saveLayout({ data: layout }),
  });

  useEffect(() => {
    if (!query.data || loaded.current) return;
    loaded.current = true;
    const initialLayout = query.data.layout ?? readLegacyLocalLayout();
    if (initialLayout) applyProfileLayout(initialLayout);
    setReady(true);
  }, [applyProfileLayout, query.data]);

  useEffect(() => {
    if (!ready) return;
    return useLayout.subscribe((state) => {
      saveProfileLayout(snapshotLayout(state));
    });
  }, [ready, saveProfileLayout]);

  return query;
}