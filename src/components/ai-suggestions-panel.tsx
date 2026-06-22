import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { suggestBestTime, predictNoShow } from "@/lib/ai.functions";

type BestTime = Awaited<ReturnType<typeof suggestBestTime>>;
type NoShow = Awaited<ReturnType<typeof predictNoShow>>;

export function AiSuggestionsPanel({ branchId, bookingId }: { branchId?: string; bookingId?: string }) {
  const bestTime = useServerFn(suggestBestTime);
  const predict = useServerFn(predictNoShow);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [slots, setSlots] = useState<BestTime | null>(null);
  const [risk, setRisk] = useState<NoShow | null>(null);

  const run = async () => {
    setLoading(true);
    setError(null);
    try {
      const results = await Promise.all([
        branchId ? bestTime({ data: { branchId, horizonDays: 7 } }) : Promise.resolve(null),
        bookingId ? predict({ data: { bookingId } }) : Promise.resolve(null),
      ]);
      setSlots(results[0]);
      setRisk(results[1]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "AI request failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-xl border border-border p-4 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Sparkles size={14} className="text-amber-400" /> AI Suggestions
        </div>
        <Button size="sm" variant="outline" onClick={run} disabled={loading || (!branchId && !bookingId)}>
          {loading ? <Loader2 size={14} className="animate-spin" /> : "Run"}
        </Button>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
      {slots && (
        <div>
          <div className="text-[11px] uppercase tracking-wider text-dim mb-1">Best times (next 7d)</div>
          <ul className="text-xs space-y-1">
            {slots.slots.map((s, i) => (
              <li key={i} className="flex justify-between gap-3">
                <span>+{s.day_offset}d @ {String(s.hour).padStart(2, "0")}:00</span>
                <span className="text-dim truncate">{s.reason}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {risk && (
        <div>
          <div className="text-[11px] uppercase tracking-wider text-dim mb-1">No-show risk</div>
          <div className="flex items-center gap-2 text-xs">
            <span
              className={
                risk.level === "high"
                  ? "rounded-full bg-destructive/15 text-destructive px-2 py-0.5"
                  : risk.level === "medium"
                    ? "rounded-full bg-amber-500/15 text-amber-500 px-2 py-0.5"
                    : "rounded-full bg-emerald-500/15 text-emerald-500 px-2 py-0.5"
              }
            >
              {risk.level.toUpperCase()} · {risk.risk}%
            </span>
            <span className="text-dim">{risk.reason}</span>
          </div>
        </div>
      )}
    </div>
  );
}