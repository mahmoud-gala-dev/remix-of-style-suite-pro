import type { ReactNode } from "react";
import { Inbox } from "lucide-react";

type Props = {
  title?: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
};

export function EmptyState({ title = "No data yet", description, icon, action }: Props) {
  return (
    <div className="rounded-xl border border-border bg-surface p-10 text-center flex flex-col items-center gap-3">
      <div className="text-dim">{icon ?? <Inbox className="size-8" aria-hidden />}</div>
      <p className="text-sm font-medium text-foreground">{title}</p>
      {description && <p className="text-xs text-dim max-w-sm">{description}</p>}
      {action}
    </div>
  );
}