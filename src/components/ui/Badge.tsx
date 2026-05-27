import type { OrderStatus, StageStatus } from "../../types";

type Tone =
  | "neutral"
  | "brand"
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "purple";

interface BadgeProps {
  children: React.ReactNode;
  tone?: Tone;
  dot?: boolean;
  className?: string;
}

const toneClasses: Record<Tone, string> = {
  neutral: "bg-white/5 text-ink-700 ring-1 ring-white/10",
  brand: "bg-brand-500/15 text-brand-300 ring-1 ring-brand-500/30",
  success: "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30",
  warning: "bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/30",
  danger: "bg-rose-500/15 text-rose-300 ring-1 ring-rose-500/30",
  info: "bg-sky-500/15 text-sky-300 ring-1 ring-sky-500/30",
  purple: "bg-violet-500/15 text-violet-300 ring-1 ring-violet-500/30",
};

const dotClasses: Record<Tone, string> = {
  neutral: "bg-ink-600",
  brand: "bg-brand-400",
  success: "bg-emerald-400",
  warning: "bg-amber-400",
  danger: "bg-rose-400",
  info: "bg-sky-400",
  purple: "bg-violet-400",
};

export default function Badge({ children, tone = "neutral", dot, className = "" }: BadgeProps) {
  return (
    <span className={`chip ${toneClasses[tone]} ${className}`}>
      {dot && <span className={`h-1.5 w-1.5 rounded-full ${dotClasses[tone]}`} />}
      {children}
    </span>
  );
}

export function orderStatusTone(status: OrderStatus): Tone {
  switch (status) {
    case "Новый":
      return "neutral";
    case "Раскрой":
      return "info";
    case "Пошив":
      return "brand";
    case "ОТК":
      return "purple";
    case "Упаковка":
      return "warning";
    case "Готово":
      return "success";
    case "Отгружено":
      return "success";
    case "Проблема":
      return "danger";
  }
}

export function stageStatusTone(status: StageStatus): Tone {
  switch (status) {
    case "Ожидает":
      return "neutral";
    case "В работе":
      return "brand";
    case "Завершено":
      return "success";
    case "Проблема":
      return "danger";
  }
}

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return (
    <Badge tone={orderStatusTone(status)} dot>
      {status}
    </Badge>
  );
}

export function StageStatusBadge({ status }: { status: StageStatus }) {
  return (
    <Badge tone={stageStatusTone(status)} dot>
      {status}
    </Badge>
  );
}
