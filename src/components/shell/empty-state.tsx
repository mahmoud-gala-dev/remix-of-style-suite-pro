import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

type Props = {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
};

export function EmptyState({ icon: Icon, title, description, action, className }: Props) {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center gap-3 py-12 px-6 rounded-lg border border-dashed border-border bg-surface-2/30 ${className ?? ""}`}
    >
      {Icon && (
        <div className="grid place-items-center size-12 rounded-full bg-primary/10 text-primary">
          <Icon className="size-6" />
        </div>
      )}
      <h3 className="text-sm font-bold uppercase tracking-widest">{title}</h3>
      {description && (
        <p className="text-xs text-dim max-w-sm">{description}</p>
      )}
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}