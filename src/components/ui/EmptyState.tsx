import type { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export default function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      <div className="grid h-14 w-14 place-items-center rounded-2xl bg-panel-muted text-ink-600">
        <Icon className="h-6 w-6" />
      </div>
      <h4 className="mt-4 text-base font-semibold text-ink-900">{title}</h4>
      {description && (
        <p className="mt-1 max-w-xs text-sm text-ink-600">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
