import type { LucideIcon } from "lucide-react";
import { TrendingDown, TrendingUp } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string;
  icon: LucideIcon;
  iconTone?: "brand" | "success" | "warning" | "danger" | "purple" | "neutral";
  trend?: { value: string; positive: boolean; subtle?: string };
  hint?: string;
}

const iconBg: Record<NonNullable<StatCardProps["iconTone"]>, string> = {
  brand: "bg-brand-500/15 text-brand-300 ring-1 ring-brand-500/30",
  success: "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30",
  warning: "bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/30",
  danger: "bg-rose-500/15 text-rose-300 ring-1 ring-rose-500/30",
  purple: "bg-violet-500/15 text-violet-300 ring-1 ring-violet-500/30",
  neutral: "bg-white/5 text-ink-700 ring-1 ring-white/10",
};

export default function StatCard({
  label,
  value,
  icon: Icon,
  iconTone = "brand",
  trend,
  hint,
}: StatCardProps) {
  return (
    <div className="card p-5 transition hover:border-panel-hover hover:shadow-soft">
      <div className="flex items-start justify-between">
        <div className={`grid h-10 w-10 place-items-center rounded-xl ${iconBg[iconTone]}`}>
          <Icon className="h-5 w-5" strokeWidth={2} />
        </div>
        {trend && (
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ${
              trend.positive
                ? "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30"
                : "bg-rose-500/15 text-rose-300 ring-rose-500/30"
            }`}
          >
            {trend.positive ? (
              <TrendingUp className="h-3 w-3" />
            ) : (
              <TrendingDown className="h-3 w-3" />
            )}
            {trend.value}
          </span>
        )}
      </div>
      <div className="mt-4">
        <p className="text-sm text-ink-600">{label}</p>
        <p className="mt-1 text-2xl font-bold tracking-tight text-ink-900">{value}</p>
        {hint && <p className="mt-1 text-xs text-ink-600">{hint}</p>}
      </div>
    </div>
  );
}
