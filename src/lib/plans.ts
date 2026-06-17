import type { PaidPlan, Plan } from "../types";

export interface PlanInfo {
  code: PaidPlan;
  name: string;
  monthlyPrice: number;          // сом / мес
  shortDesc: string;
  features: string[];
}

export const PLANS: Record<PaidPlan, PlanInfo> = {
  start: {
    code: "start",
    name: "Tigim Start",
    monthlyPrice: 1500,
    shortDesc: "Для маленьких цехов и старта",
    features: [
      "До 5 активных заказов",
      "Базовый учёт заказов",
      "Дашборд",
      "Поддержка по email",
    ],
  },
  pro: {
    code: "pro",
    name: "Tigim Pro",
    monthlyPrice: 5000,
    shortDesc: "Для активных цехов",
    features: [
      "Неограниченные заказы",
      "Склад материалов",
      "Учёт брака",
      "Сотрудники и зарплаты",
      "Финансовая аналитика",
    ],
  },
  factory: {
    code: "factory",
    name: "Tigim Factory",
    monthlyPrice: 9000,
    shortDesc: "Для крупных производств",
    features: [
      "Несколько участков",
      "Роли сотрудников",
      "Расширенная аналитика",
      "Приоритетная поддержка",
      "Индивидуальная настройка",
    ],
  },
};

export const PLAN_LABEL: Record<Plan, string> = {
  trial: "Trial",
  start: "Start",
  pro: "Pro",
  factory: "Factory",
};

// Сколько дней осталось до даты (отрицательное = просрочка).
export function daysUntil(isoDate: string | null): number {
  if (!isoDate) return 0;
  const target = new Date(isoDate);
  target.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}

// Дата конца периода после оплаты на N месяцев.
// Если paidUntil ещё в будущем — продлеваем от него. Иначе от сегодня.
export function nextPeriodEnd(paidUntil: string | null, months: number): string {
  const base = paidUntil && new Date(paidUntil) > new Date() ? new Date(paidUntil) : new Date();
  base.setMonth(base.getMonth() + months);
  return base.toISOString().slice(0, 10);
}
