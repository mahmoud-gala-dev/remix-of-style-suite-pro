import { useEffect, useState } from "react";

// Tiny persisted-state hook. Saves to localStorage under `key` (versioned).
// Used for "saved filters" on list pages so users keep their last search/filter
// when navigating away and back.
export function usePersistedState<T>(key: string, initial: T): [T, (v: T) => void] {
  const storageKey = `lv:flt:${key}`;
  const [value, setValue] = useState<T>(() => {
    if (typeof window === "undefined") return initial;
    try {
      const raw = window.localStorage.getItem(storageKey);
      return raw == null ? initial : (JSON.parse(raw) as T);
    } catch {
      return initial;
    }
  });
  useEffect(() => {
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(value));
    } catch {
      /* quota or disabled — ignore */
    }
  }, [storageKey, value]);
  return [value, setValue];
}