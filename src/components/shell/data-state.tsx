import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";

type Props = {
  loading?: boolean;
  error?: unknown;
  empty?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  retry?: () => void;
  children?: ReactNode;
  skeleton?: ReactNode;
};

// Unified Loading / Empty / Error wrapper for authenticated pages.
// Usage: <DataState loading={q.isLoading} error={q.error} empty={!rows.length} retry={() => q.refetch()}>{ui}</DataState>
export function DataState({ loading, error, empty, emptyTitle = "No data yet", emptyDescription, retry, children, skeleton }: Props) {
  if (loading) {
    return (
      <div className="space-y-3" aria-busy="true">
        {skeleton ?? (
          <>
            <div className="h-8 w-1/3 animate-pulse rounded bg-muted" />
            <div className="h-24 animate-pulse rounded bg-muted" />
            <div className="h-24 animate-pulse rounded bg-muted" />
          </>
        )}
      </div>
    );
  }
  if (error) {
    const msg = error instanceof Error ? error.message : "Something went wrong";
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-center">
        <p className="text-sm font-medium text-destructive">{msg}</p>
        {retry && (
          <Button variant="outline" size="sm" className="mt-3" onClick={retry}>
            Try again
          </Button>
        )}
      </div>
    );
  }
  if (empty) {
    return (
      <div className="rounded-xl border border-border bg-surface p-10 text-center">
        <p className="text-sm font-medium text-foreground">{emptyTitle}</p>
        {emptyDescription && <p className="mt-1 text-xs text-dim">{emptyDescription}</p>}
      </div>
    );
  }
  return <>{children}</>;
}