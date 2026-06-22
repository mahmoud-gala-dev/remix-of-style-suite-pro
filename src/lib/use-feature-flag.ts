import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

// Deterministic 0-99 hash from a string (for stable rollout buckets per user/session).
function hashBucket(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h) % 100;
}

let cache: Record<string, { enabled: boolean; rollout_percent: number }> | null = null;
let inflight: Promise<void> | null = null;

async function loadFlags(): Promise<void> {
  if (cache) return;
  if (inflight) return inflight;
  inflight = (async () => {
    const { data } = await supabase
      .from("feature_flags")
      .select("key, enabled, rollout_percent");
    cache = Object.fromEntries(
      (data ?? []).map((f) => [f.key, { enabled: f.enabled, rollout_percent: f.rollout_percent }]),
    );
  })();
  await inflight;
  inflight = null;
}

export function clearFeatureFlagCache(): void {
  cache = null;
}

/**
 * Returns whether a feature flag is enabled for the current user.
 * Honors `rollout_percent` via a deterministic hash of the user/session id,
 * so the same user always lands in the same bucket.
 */
export function useFeatureFlag(key: string, fallback = false): boolean {
  const [enabled, setEnabled] = useState<boolean>(fallback);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      await loadFlags();
      const flag = cache?.[key];
      if (!flag || !flag.enabled) { if (!cancelled) setEnabled(false); return; }
      if (flag.rollout_percent >= 100) { if (!cancelled) setEnabled(true); return; }
      const { data } = await supabase.auth.getUser();
      const seed = data.user?.id ?? "anon";
      const bucket = hashBucket(`${key}:${seed}`);
      if (!cancelled) setEnabled(bucket < flag.rollout_percent);
    })();
    return () => { cancelled = true; };
  }, [key]);
  return enabled;
}