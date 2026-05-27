interface ProgressBarProps {
  value: number;
  tone?: "brand" | "success" | "warning" | "danger";
  size?: "sm" | "md";
  showLabel?: boolean;
  className?: string;
}

const toneClasses = {
  brand: "bg-brand-600",
  success: "bg-emerald-500",
  warning: "bg-amber-500",
  danger: "bg-rose-500",
};

export default function ProgressBar({
  value,
  tone = "brand",
  size = "sm",
  showLabel,
  className = "",
}: ProgressBarProps) {
  const pct = Math.max(0, Math.min(100, value));
  const h = size === "sm" ? "h-1.5" : "h-2.5";
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className={`relative w-full rounded-full bg-panel-muted ${h}`}>
        <div
          className={`absolute left-0 top-0 ${h} rounded-full transition-all ${toneClasses[tone]}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {showLabel && (
        <span className="text-xs font-medium text-ink-600 tabular-nums">{pct}%</span>
      )}
    </div>
  );
}
