import { Skeleton } from "@/components/ui/skeleton";

type Props = { rows?: number; rowClassName?: string };

export function SkeletonList({ rows = 5, rowClassName = "h-12" }: Props) {
  return (
    <div className="space-y-2" aria-busy="true" aria-live="polite">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className={rowClassName} />
      ))}
    </div>
  );
}